import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';

class SignalingService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  StreamSubscription? _callSubscription;

  Future<void> initAudioCall(
    String roomId, {
    Function(Map<String, dynamic>)? onOffer,
    Function(Map<String, dynamic>)? onAnswer,
    Function(Map<String, dynamic>)? onIceCandidate,
  }) async {
    // Get user media (audio only)
    _localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': false,
    });
    _peerConnection = await createPeerConnection({
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
      ],
    });
    _peerConnection?.addStream(_localStream!);
    // Listen for signaling changes
    _callSubscription = _firestore
        .collection('calls')
        .doc(roomId)
        .snapshots()
        .listen((snapshot) {
          final data = snapshot.data();
          if (data == null) return;
          if (data['offer'] != null && onOffer != null) {
            onOffer(data['offer']);
          }
          if (data['answer'] != null && onAnswer != null) {
            onAnswer(data['answer']);
          }
          if (data['ice'] != null && onIceCandidate != null) {
            onIceCandidate(data['ice']);
          }
        });
  }

  Future<void> createOffer(String roomId) async {
    var offer = await _peerConnection?.createOffer();
    await _peerConnection?.setLocalDescription(offer!);
    await _firestore.collection('calls').doc(roomId).set({
      'offer': offer?.toMap(),
    }, SetOptions(merge: true));
  }

  Future<void> createAnswer(String roomId) async {
    var answer = await _peerConnection?.createAnswer();
    await _peerConnection?.setLocalDescription(answer!);
    await _firestore.collection('calls').doc(roomId).set({
      'answer': answer?.toMap(),
    }, SetOptions(merge: true));
  }

  Future<void> setRemoteDescription(Map<String, dynamic> sdp) async {
    var desc = RTCSessionDescription(sdp['sdp'], sdp['type']);
    await _peerConnection?.setRemoteDescription(desc);
  }

  Future<void> addIceCandidate(Map<String, dynamic> candidate) async {
    var ice = RTCIceCandidate(
      candidate['candidate'],
      candidate['sdpMid'],
      candidate['sdpMLineIndex'],
    );
    await _peerConnection?.addCandidate(ice);
  }

  Future<void> sendIceCandidate(
    String roomId,
    RTCIceCandidate candidate,
  ) async {
    await _firestore.collection('calls').doc(roomId).set({
      'ice': {
        'candidate': candidate.candidate,
        'sdpMid': candidate.sdpMid,
        'sdpMLineIndex': candidate.sdpMLineIndex,
      },
    }, SetOptions(merge: true));
  }

  Future<void> endCall(String roomId) async {
    await _peerConnection?.close();
    _peerConnection = null;
    _localStream?.dispose();
    _localStream = null;
    await _callSubscription?.cancel();
    await _firestore.collection('calls').doc(roomId).delete();
  }

  MediaStream? get localStream => _localStream;
  RTCPeerConnection? get peerConnection => _peerConnection;
}
