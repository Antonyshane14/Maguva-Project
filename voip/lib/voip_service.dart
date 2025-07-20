// FIX: Added requested import
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';

class VoIPService {
  static final VoIPService _instance = VoIPService._internal();
  factory VoIPService() => _instance;
  VoIPService._internal();

  // --- Class Members ---
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  String? _callId;
  String? get callId => _callId;
  String? _currentUserId;

  String? get userId => _currentUserId;

  // --- Stream Subscriptions ---
  StreamSubscription<DocumentSnapshot>? _callSubscription;
  StreamSubscription<QuerySnapshot>? _candidatesSubscription;
  StreamSubscription<QuerySnapshot>? _incomingCallSubscription;

  // --- Public callback for incoming calls ---
  void Function(String callId)? onIncomingCall;

  final Map<String, dynamic> constraints = {'audio': true, 'video': false};

  void setOnlineStatus({required bool online}) {
    // In a real app, this would update a 'users' collection in Firestore
    // to show presence information to other users.
    if (_currentUserId != null) {
      print(
        '[Presence] User $_currentUserId is now ${online ? "online" : "offline"}.',
      );
      // Example Firestore update:
      // _firestore.collection('users').doc(_currentUserId).update({'isOnline': online});
    }
  }

  Future<void> initializeUserId() async {
    // In a real app, you would get the logged-in user's ID here.
    _currentUserId = 'user_A'; // Example User ID
    print('[VoIP] Service initialized for user: $_currentUserId');
    listenForIncomingCalls();
  }

  void listenForIncomingCalls() {
    if (_currentUserId == null) return;
    print('[VoIP] Listening for incoming calls...');
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
            print('[VoIP] Incoming call detected with ID: $callId');
            onIncomingCall?.call(callId);
          }
        });
  }

  Future<void> acceptIncomingCall(String callId) async {
    print('[VoIP] Accepting call: $callId');
    await answerCall(callId);
  }

  Future<void> rejectIncomingCall(String callId) async {
    print('[VoIP] Rejecting call: $callId');
    final callDoc = _firestore.collection('calls').doc(callId);
    await callDoc.update({'status': 'rejected'});
  }

  void toggleMicrophone() {
    if (_localStream != null) {
      final audioTrack = _localStream!.getAudioTracks().first;
      audioTrack.enabled = !audioTrack.enabled;
      print('[VoIP] Microphone muted: ${!audioTrack.enabled}');
    }
  }

  void toggleSpeaker(bool isSpeakerOn) {
    print('[VoIP] Toggling speakerphone: $isSpeakerOn');
    Helper.setSpeakerphoneOn(isSpeakerOn);
  }

  Future<void> endCall() async {
    await hangup();
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
      print('[VoIP] Remote track received.');
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams[0];
      }
    };
  }

  Future<String?> startCall(String calleeId) async {
    if (_currentUserId == null) {
      print('Error: VoIPService not initialized with a userId.');
      return null;
    }

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

    _callSubscription = callDoc.snapshots().listen((snapshot) async {
      final data = snapshot.data();
      if (data != null &&
          data['answer'] != null &&
          _peerConnection?.getRemoteDescription() == null) {
        final answer = RTCSessionDescription(
          data['answer']['sdp'],
          data['answer']['type'],
        );
        await _peerConnection!.setRemoteDescription(answer);
      }
    });

    _listenForCandidates('calleeCandidates');
    return _callId;
  }

  Future<void> answerCall(String callId) async {
    _callId = callId;

    await _getUserMedia();
    await _createPeerConnection(false);

    final callDoc = _firestore.collection('calls').doc(callId);
    final snapshot = await callDoc.get();

    if (!snapshot.exists || snapshot.data()?['offer'] == null) {
      return;
    }

    final offerData = snapshot.data()!['offer'];
    final offer = RTCSessionDescription(offerData['sdp'], offerData['type']);
    await _peerConnection!.setRemoteDescription(offer);

    final answer = await _peerConnection!.createAnswer();
    await _peerConnection!.setLocalDescription(answer);

    await callDoc.update({'answer': answer.toMap(), 'status': 'connected'});

    _listenForCandidates('callerCandidates');
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
      await _remoteStream?.dispose();
      _remoteStream = null;
      await _peerConnection?.close();
      _peerConnection = null;
      _callSubscription?.cancel();
      _candidatesSubscription?.cancel();
      _incomingCallSubscription?.cancel();
      _callId = null;

      print('[VoIP] Hangup complete and resources cleaned up.');
    } catch (e) {
      print('Error during hangup: $e');
    }
  }
}
