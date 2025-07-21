import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart'; // Import WebRTC
import '../voip_service.dart';

class CallScreen extends StatefulWidget {
  final String callId;
  final bool isCaller;
  final String peerId;

  const CallScreen({super.key, required this.callId, required this.isCaller, required this.peerId});
  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final VoIPService _voip = VoIPService();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer(); // For audio playback

  StreamSubscription? _callStatusSubscription;
  String _callStatus = 'Ringing...'; // Default status
  Timer? _timer;
  int _seconds = 0;
  bool _micMuted = false;

  @override
  void initState() {
    super.initState();
    _remoteRenderer.initialize();

    // Listen to the remote stream from the service
    _voip.remoteStreamNotifier.addListener(_onRemoteStream);

    // Listen to call status changes from the service
    _callStatusSubscription = _voip.callStatusStream.listen((status) {
      if (!mounted) return;
      setState(() {
        if (status == 'connected') {
          _callStatus = 'In Call';
          _startTimer(); // Start timer only when connected
        } else if (status == 'ringing') {
          _callStatus = 'Ringing...';
        }
      });
      if (status == 'ended' || status == 'rejected') {
        _hangUpAndPop();
      }
    });
  }

  void _onRemoteStream() {
    if (mounted) {
      setState(() {
        _remoteRenderer.srcObject = _voip.remoteStreamNotifier.value;
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _callStatusSubscription?.cancel();
    _remoteRenderer.dispose();
    _voip.remoteStreamNotifier.removeListener(_onRemoteStream);
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel(); // Ensure no multiple timers
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) setState(() => _seconds++);
    });
  }

  void _toggleMute() {
    setState(() => _micMuted = !_micMuted);
    _voip.toggleMicrophone();
  }

  void _hangUpAndPop() {
    _timer?.cancel();
    // No need to call _voip.endCall() here if the event came from the stream
    if(mounted && Navigator.canPop(context)) {
      Navigator.of(context).pop();
    }
  }

  // The rest of the UI build method remains similar, but now driven by the new state
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // --- Hidden renderer for audio playback ---
      body: Stack(
        children: [
          SizedBox.shrink(
            child: RTCVideoView(_remoteRenderer),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Caller Info Display
                  Column(
                    children: [
                      const SizedBox(height: 60),
                      const Icon(Icons.account_circle, size: 120, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(
                        widget.peerId,
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _callStatus,
                        style: const TextStyle(fontSize: 18, color: Colors.black54),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _formattedDuration,
                        style: const TextStyle(fontSize: 18, color: Colors.black54),
                      ),
                    ],
                  ),
                  // Call Controls
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Mute Button
                      FloatingActionButton(
                        heroTag: 'mute_button',
                        onPressed: _toggleMute,
                        backgroundColor: _micMuted ? Colors.red : Colors.blueGrey,
                        child: Icon(_micMuted ? Icons.mic_off : Icons.mic, color: Colors.white),
                      ),
                      // End Call Button
                      FloatingActionButton(
                        heroTag: 'end_call_button',
                        onPressed: _hangUpAndPop,
                        backgroundColor: Colors.red,
                        child: const Icon(Icons.call_end, color: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String get _formattedDuration {
    final int minutes = _seconds ~/ 60;
    final int seconds = _seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
}