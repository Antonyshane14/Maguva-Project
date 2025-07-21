import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:math';

class VoIPService {
  static final VoIPService _instance = VoIPService._internal();
  factory VoIPService() => _instance;
  VoIPService._internal();

  // Class Members and Notifiers...
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  String? _callId;
  String? _currentUserId;
  final ValueNotifier<MediaStream?> remoteStreamNotifier = ValueNotifier(null);
  final StreamController<String> _callStatusController =
      StreamController.broadcast();
  Stream<String> get callStatusStream => _callStatusController.stream;
  StreamSubscription<DocumentSnapshot>? _callSubscription;
  StreamSubscription<QuerySnapshot>? _candidatesSubscription;
  StreamSubscription<QuerySnapshot>? _incomingCallSubscription;
  String? get userId => _currentUserId;
  void Function(String callId)? onIncomingCall;
  final Map<String, dynamic> constraints = {'audio': true, 'video': false};

  // --- FIX: This is the only method that changes ---
  Future<void> _createPeerConnection(bool isCaller) async {
    final Map<String, dynamic> configuration = {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {
          'urls': 'turn:openrelay.metered.ca:80',
          'username': 'openrelayproject',
          'credential': 'openrelayproject',
        },
        {
          'urls': 'turn:openrelay.metered.ca:443',
          'username': 'openrelayproject',
          'credential': 'openrelayproject',
        },
      ],
    };

    _peerConnection = await createPeerConnection(configuration);

    // --- ADD THIS LINE ---
    // Explicitly add a transceiver for two-way audio.
    // This is a robust way to ensure the audio channel is properly negotiated.
    await _peerConnection!.addTransceiver(
      kind: RTCRtpMediaType.RTCRtpMediaTypeAudio,
      init: RTCRtpTransceiverInit(direction: TransceiverDirection.SendRecv),
    );
    // ----------------------

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
      print('[DIAGNOSTIC] Remote track received!');
      if (event.streams.isNotEmpty &&
          event.streams[0].getAudioTracks().isNotEmpty) {
        print(
          '[DIAGNOSTIC] Remote audio track enabled: ${event.streams[0].getAudioTracks()[0].enabled}',
        );
      }
      if (event.streams.isNotEmpty) {
        remoteStreamNotifier.value = event.streams[0];
      }
    };
  }

  // --- All other methods remain the same ---

  Future<void> initializeUserId() async {
    final prefs = await SharedPreferences.getInstance();
    String? savedUserId = prefs.getString('user_id');
    if (savedUserId != null && savedUserId.length != 4) {
      await prefs.remove('user_id');
      savedUserId = null;
    }
    if (savedUserId == null) {
      var random = Random();
      savedUserId = (1000 + random.nextInt(9000)).toString();
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
    final offer = await _peerConnection!.createOffer({
      'offerToReceiveAudio': true,
    });
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
    final answer = await _peerConnection!.createAnswer({
      'offerToReceiveAudio': true,
    });
    await _peerConnection!.setLocalDescription(answer);
    await callDoc.update({'answer': answer.toMap(), 'status': 'connected'});
    _listenToCall(_callId!);
    _listenForCandidates('callerCandidates');
  }

  Future<void> _getUserMedia() async {
    try {
      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (_localStream != null && _localStream!.getAudioTracks().isNotEmpty) {
        print(
          '[DIAGNOSTIC] Local microphone stream created. Audio track enabled: ${_localStream!.getAudioTracks()[0].enabled}',
        );
      }
    } catch (e) {
      print('Error getting user media: $e');
      rethrow;
    }
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
