import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class VoIPService {
  static final VoIPService _instance = VoIPService._internal();
  factory VoIPService() => _instance;
  VoIPService._internal();

  // --- Class Members ---
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  String? _callId;
  String? _currentUserId;

  // --- UI Notifiers and Streams ---
  final ValueNotifier<MediaStream?> remoteStreamNotifier = ValueNotifier(null);
  final StreamController<String> _callStatusController =
      StreamController.broadcast();
  Stream<String> get callStatusStream => _callStatusController.stream;

  // --- Subscriptions ---
  StreamSubscription<DocumentSnapshot>? _callSubscription;
  StreamSubscription<QuerySnapshot>? _candidatesSubscription;
  StreamSubscription<QuerySnapshot>? _incomingCallSubscription;

  // --- Public Getters & Callbacks ---
  String? get userId => _currentUserId;
  void Function(String callId)? onIncomingCall;

  // --- Constraints ---
  final Map<String, dynamic> constraints = {'audio': true, 'video': false};

  // --- Methods ---

  Future<void> initializeUserId() async {
    final prefs = await SharedPreferences.getInstance();
    String? savedUserId = prefs.getString('user_id');

    if (savedUserId == null) {
      savedUserId = const Uuid().v4();
      await prefs.setString('user_id', savedUserId);
    }

    _currentUserId = savedUserId;
    listenForIncomingCalls();
  }

  void listenForIncomingCalls() {
    if (_currentUserId == null) return;

    _incomingCallSubscription?.cancel();
    _incomingCallSubscription = _firestore
        .collection('calls')
        .where('calleeId', isEqualTo: _currentUserId)
        .where('status', isEqualTo: 'ringing')
        .snapshots()
        .listen((snapshot) {
          if (snapshot.docs.isNotEmpty) {
            final callDoc = snapshot.docs.first;
            final callId = callDoc.id;
            if (callDoc.data()['answer'] == null) {
              onIncomingCall?.call(callId);
            }
          }
        });
  }

  void _listenToCall(String callId) {
    _callSubscription?.cancel();
    _callSubscription = _firestore
        .collection('calls')
        .doc(callId)
        .snapshots()
        .listen((snapshot) async {
          final data = snapshot.data();
          if (data == null) return;

          final status = data['status'];
          _callStatusController.add(status);

          if (data['answer'] != null &&
              _peerConnection?.getRemoteDescription() == null) {
            final answer = RTCSessionDescription(
              data['answer']['sdp'],
              data['answer']['type'],
            );
            await _peerConnection!.setRemoteDescription(answer);
          }
        });
  }

  Future<String?> startCall(String calleeId) async {
    if (_currentUserId == null) return null;

    await _getUserMedia();
    await _createPeerConnection(true);

    final callDoc = _firestore.collection('calls').doc();
    _callId = callDoc.id;

    final offer = await _peerConnection!.createOffer();
    await _peerConnection!.setLocalDescription(offer);

    await callDoc.set({
      'callerId': _currentUserId,
      'calleeId': calleeId,
      'offer': offer.toMap(),
      'status': 'ringing',
    });

    _listenToCall(_callId!);
    _listenForCandidates('calleeCandidates');
    return _callId;
  }

  Future<void> answerCall(String callId) async {
    _callId = callId;

    await _getUserMedia();
    await _createPeerConnection(false);

    final callDoc = _firestore.collection('calls').doc(callId);
    final snapshot = await callDoc.get();

    if (!snapshot.exists || snapshot.data()?['offer'] == null) return;

    final offerData = snapshot.data()!['offer'];
    final offer = RTCSessionDescription(offerData['sdp'], offerData['type']);
    await _peerConnection!.setRemoteDescription(offer);

    final answer = await _peerConnection!.createAnswer();
    await _peerConnection!.setLocalDescription(answer);

    await callDoc.update({'answer': answer.toMap(), 'status': 'connected'});

    _listenToCall(_callId!);
    _listenForCandidates('callerCandidates');
  }

  Future<void> _getUserMedia() async {
    try {
      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      print('Error getting user media: $e');
      rethrow;
    }
  }

  Future<void> _createPeerConnection(bool isCaller) async {
    _peerConnection = await createPeerConnection({
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
      ],
    });

    _localStream?.getTracks().forEach((track) {
      _peerConnection?.addTrack(track, _localStream!);
    });

    _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      if (_callId != null) {
        final candidatesCollection = isCaller
            ? 'callerCandidates'
            : 'calleeCandidates';
        _firestore
            .collection('calls')
            .doc(_callId)
            .collection(candidatesCollection)
            .add(candidate.toMap());
      }
    };

    _peerConnection!.onTrack = (RTCTrackEvent event) {
      if (event.streams.isNotEmpty) {
        remoteStreamNotifier.value = event.streams[0];
      }
    };
  }

  void _listenForCandidates(String collectionName) {
    _candidatesSubscription?.cancel();
    _candidatesSubscription = _firestore
        .collection('calls')
        .doc(_callId)
        .collection(collectionName)
        .snapshots()
        .listen((snapshot) {
          for (var change in snapshot.docChanges) {
            if (change.type == DocumentChangeType.added) {
              final data = change.doc.data();
              if (data != null) {
                _peerConnection?.addCandidate(
                  RTCIceCandidate(
                    data['candidate'],
                    data['sdpMid'],
                    data['sdpMLineIndex'],
                  ),
                );
              }
            }
          }
        });
  }

  Future<void> hangup() async {
    try {
      if (_callId != null) {
        final callDoc = _firestore.collection('calls').doc(_callId!);
        if ((await callDoc.get()).exists) {
          await callDoc.update({'status': 'ended'});
        }
      }
      _localStream?.getTracks().forEach((track) => track.stop());
      await _localStream?.dispose();
      _localStream = null;

      remoteStreamNotifier.value?.getTracks().forEach((track) => track.stop());
      await remoteStreamNotifier.value?.dispose();
      remoteStreamNotifier.value = null;

      await _peerConnection?.close();
      _peerConnection = null;
      _callSubscription?.cancel();
      _candidatesSubscription?.cancel();
      _callId = null;
    } catch (e) {
      print('Error during hangup: $e');
    }
  }

  Future<void> acceptIncomingCall(String callId) async {
    await answerCall(callId);
  }

  Future<void> rejectIncomingCall(String callId) async {
    final callDoc = _firestore.collection('calls').doc(callId);
    if ((await callDoc.get()).exists) {
      await callDoc.update({'status': 'rejected'});
    }
  }

  void toggleMicrophone() {
    if (_localStream != null && _localStream!.getAudioTracks().isNotEmpty) {
      final audioTrack = _localStream!.getAudioTracks().first;
      audioTrack.enabled = !audioTrack.enabled;
    }
  }

  void toggleSpeaker(bool isSpeakerOn) {
    Helper.setSpeakerphoneOn(isSpeakerOn);
  }

  Future<void> endCall() async {
    await hangup();
  }

  void dispose() {
    _incomingCallSubscription?.cancel();
    _callStatusController.close();
  }
}
