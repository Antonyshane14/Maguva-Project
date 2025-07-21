import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../voip_service.dart';

class CallScreen extends StatefulWidget {
  final String callId;
  final bool isCaller;
  final String peerId;

  const CallScreen({
    super.key,
    required this.callId,
    required this.isCaller,
    required this.peerId,
  });

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final VoIPService _voip = VoIPService();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();

  StreamSubscription? _callStatusSubscription;
  String _callStatus = 'Ringing...';
  Timer? _timer;
  int _seconds = 0;
  bool _micMuted = false;
  // --- FIX: Default speakerphone to ON ---
  bool _speakerOn = true;

  @override
  void initState() {
    super.initState();
    _remoteRenderer.initialize();

    // --- FIX: Immediately enable the speakerphone ---
    _voip.toggleSpeaker(true);

    _voip.remoteStreamNotifier.addListener(_onRemoteStream);

    _callStatusSubscription = _voip.callStatusStream.listen((status) {
      if (!mounted) return;
      setState(() {
        if (status == 'connected') {
          _callStatus = 'In Call';
          _startTimer();
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
    // Turn speaker off when leaving the screen
    if (_speakerOn) {
      _voip.toggleSpeaker(false);
    }
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) setState(() => _seconds++);
    });
  }

  void _toggleMute() {
    setState(() => _micMuted = !_micMuted);
    _voip.toggleMicrophone();
  }

  void _toggleSpeaker() {
    setState(() => _speakerOn = !_speakerOn);
    _voip.toggleSpeaker(_speakerOn);
  }

  void _hangUpAndPop() {
    _timer?.cancel();
    if (mounted && Navigator.canPop(context)) {
      Navigator.of(context).pop();
    }
  }

  void _hangUp() {
    VoIPService().endCall();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  String get _formattedDuration {
    final int minutes = _seconds ~/ 60;
    final int seconds = _seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_callStatus),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: Stack(
        children: [
          SizedBox.shrink(child: RTCVideoView(_remoteRenderer)),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Column(
                    children: [
                      const SizedBox(height: 60),
                      const Icon(
                        Icons.account_circle,
                        size: 120,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        widget.peerId,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _formattedDuration,
                        style: const TextStyle(
                          fontSize: 18,
                          color: Colors.black54,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      FloatingActionButton(
                        heroTag: 'speaker_button',
                        onPressed: _toggleSpeaker,
                        backgroundColor: Colors.blueGrey,
                        child: Icon(
                          _speakerOn ? Icons.volume_up : Icons.volume_down,
                          color: Colors.white,
                        ),
                      ),
                      FloatingActionButton(
                        heroTag: 'mute_button',
                        onPressed: _toggleMute,
                        backgroundColor: _micMuted
                            ? Colors.red
                            : Colors.blueGrey,
                        child: Icon(
                          _micMuted ? Icons.mic_off : Icons.mic,
                          color: Colors.white,
                        ),
                      ),
                      FloatingActionButton(
                        heroTag: 'hangup_button',
                        onPressed: _hangUp,
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
}
