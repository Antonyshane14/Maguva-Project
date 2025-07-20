import 'package:flutter/material.dart';
import '../voip_service.dart';


class CallScreen extends StatefulWidget {
  final String callId;
  final bool isCaller;
  final String peerId; // This is the user ID entered in dialer
  const CallScreen({super.key, required this.callId, required this.isCaller, required this.peerId});
  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  bool _micMuted = false;
  int _seconds = 0;
  bool? _isCaller;
  String? _callId;
  String? _peerId;
  String _callStatus = 'connecting'; // connecting, ringing, in-call, ended
  var _timer;
  VoIPService? _voip;


  @override
  void initState() {
    super.initState();
    // _userId removed (unused)
    _isCaller = widget.isCaller;
    _callId = widget.callId;
    _peerId = widget.peerId;
    _voip = VoIPService();
    _startTimer();
    // Do NOT start call automatically. Caller must press button.
  }

  void _toggleMute() {
    setState(() {
      _micMuted = !_micMuted;
    });
    _voip?.toggleMicrophone();
  }

  void _endCall() async {
    if (_callId != null) {
      await _voip?.endCall();
    }
    setState(() {
      _callStatus = 'ended';
    });
    _timer?.cancel();
    Future.delayed(const Duration(seconds: 2), () => Navigator.pop(context));
  }

  String _formatTime(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  void _startTimer() {
    _timer = Stream.periodic(const Duration(seconds: 1), (i) => i).listen((i) {
      setState(() {
        _seconds++;
      });
    });
  }


  Future<void> _initCall() async {
    if (_isCaller == true) {
      setState(() { _callStatus = 'ringing'; });
      await _voip?.startCall(_peerId!);
      // After starting the call, get the callId from VoIPService
      setState(() {
        _callId = _voip?.callId;
        _callStatus = 'in-call';
      });
    } else {
      setState(() { _callStatus = 'ringing'; });
      _voip?.listenForIncomingCalls();
      // Accept/reject handled by buttons below
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Call')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_isCaller == true ? 'Calling $_peerId...' : 'Incoming call from $_peerId', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text('Status: $_callStatus', style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 16),
            if (_isCaller == true && _callStatus == 'connecting')
              ElevatedButton.icon(
                icon: const Icon(Icons.call),
                label: const Text('Start Call'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                onPressed: () async {
                  await _initCall();
                },
              ),
            if (_callStatus == 'in-call')
              Text(_formatTime(_seconds), style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            if (_callStatus == 'ended')
              Text('Call ended', style: const TextStyle(fontSize: 22, color: Colors.red)),
            const SizedBox(height: 32),
            if (_callStatus == 'ringing' && _isCaller == false)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton.icon(
                    icon: const Icon(Icons.call),
                    label: const Text('Accept'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () async {
                      await _voip?.acceptIncomingCall(_callId!);
                      setState(() { _callStatus = 'in-call'; });
                    },
                  ),
                  const SizedBox(width: 24),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.call_end),
                    label: const Text('Reject'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () async {
                      await _voip?.rejectIncomingCall(_callId!);
                      setState(() { _callStatus = 'ended'; });
                      Future.delayed(const Duration(seconds: 2), () => Navigator.pop(context));
                    },
                  ),
                ],
              ),
            if (_callStatus == 'in-call')
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: Icon(_micMuted ? Icons.mic_off : Icons.mic),
                    onPressed: _toggleMute,
                    color: _micMuted ? Colors.red : Colors.green,
                    iconSize: 36,
                  ),
                  const SizedBox(width: 32),
                  IconButton(
                    icon: const Icon(Icons.call_end),
                    onPressed: _endCall,
                    color: Colors.red,
                    iconSize: 36,
                  ),
                ],
              ),
          ],
        ),
      ),
    );
}
}
