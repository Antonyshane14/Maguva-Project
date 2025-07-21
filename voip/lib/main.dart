import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';


import 'screens/home_screen.dart';
import 'screens/analysis_result_screen.dart';
import 'voip_service.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart'; // <-- Add this import

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // --- FIX: Add this block to disable hardware-specific audio features ---
  await WebRTC.initialize(
    options: <String, dynamic>{
      'androidUseHardwareAcousticEchoCanceler': false,
      'androidUseHardwareNoiseSuppressor': false,
    },
  );
  // ----------------------------------------------------------------------

  try {
    await Firebase.initializeApp();
    runApp(const MyApp());
  } catch (e) {
    runApp(MaterialApp(
      home: Scaffold(
        body: Center(child: Text('Firebase init error: $e')),
      ),
    ));
  }
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    _initializeVoIP();
  }

  void _initializeVoIP() {
    // Assign the handler BEFORE starting the listener to prevent a race condition.
    VoIPService().onIncomingCall = (callId) async {
      final navigator = navigatorKey.currentState;
      if (navigator == null) return;

      String peerId = 'Unknown Caller'; // Default value in case of an error
      try {
        final doc = await FirebaseFirestore.instance.collection('calls').doc(callId).get();
        final data = doc.data();
        if (data != null && data['callerId'] != null) {
          // In a real app, you might want to fetch the peer's name from a 'users' collection
          peerId = data['callerId'];
        }
      } catch (e) {
        debugPrint('Failed to fetch peerId: $e');
        // The call will still be shown, but with 'Unknown Caller'.
      }

      // Show the incoming call dialog
      showDialog(
        context: navigator.overlay!.context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Incoming Call'),
          content: Text('You have an incoming call from $peerId.'),
          actions: [
            TextButton(
              onPressed: () {
                VoIPService().acceptIncomingCall(callId);
                navigator.pop(); // Pop the dialog before pushing the new screen
                navigator.push( // Use push to navigate to the call screen
                  MaterialPageRoute(
                    builder: (_) => CallScreen(
                      callId: callId,
                      isCaller: false,
                      peerId: peerId,
                    ),
                  ),
                );
              },
              child: const Text('Accept'),
            ),
            TextButton(
              onPressed: () {
                VoIPService().rejectIncomingCall(callId);
                navigator.pop();
              },
              child: const Text('Decline'),
            ),
          ],
        ),
      );
    };

    // Listen for incoming calls after the first frame has been rendered.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      VoIPService().listenForIncomingCalls();
    });
  }


  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'VoIP Scam Protection',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.deepPurple,
          foregroundColor: Colors.white,
          elevation: 2,
          titleTextStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 22),
        ),
      ),
      home: FutureBuilder(
        future: VoIPService().initializeUserId(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return const HomeScreen();
        },
      ),
      routes: {
        '/home': (context) => const HomeScreen(),
        // Note: The '/analysis' route uses hardcoded data.
        '/analysis': (context) => AnalysisResultScreen(
          result: const {
            'summary': 'This is a sample analysis result.',
            'details': [
              {'label': 'Risk Score', 'value': 'High'},
              {'label': 'Urgency Detected', 'value': 'Yes'},
              {'label': 'Impersonation Likelihood', 'value': 'Moderate'},
              {'label': 'Highlighted Phrases', 'value': '"account suspended", "immediate action required"'},
            ],
          },
        ),
      },
    );
  }
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

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
  Timer? _timer;
  int _seconds = 0;
  bool _micMuted = false;
  bool _speakerOn = false; // Default to earpiece

  @override
  void initState() {
    super.initState();
    // Start the timer now, as this screen represents an active call
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() => _seconds++);
      }
    });
  }

  void _toggleMute() {
    setState(() => _micMuted = !_micMuted);
    VoIPService().toggleMicrophone();
  }

  void _toggleSpeaker() {
    setState(() => _speakerOn = !_speakerOn);
    VoIPService().toggleSpeaker(_speakerOn);
  }

  void _hangUp() {
    VoIPService().endCall();
    if(mounted) {
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
        title: Text(widget.isCaller ? 'Calling ${widget.peerId}' : 'In Call with ${widget.peerId}'),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
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
                     _formattedDuration,
                     style: const TextStyle(fontSize: 18, color: Colors.black54),
                   ),
                ],
              ),

              // Call Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildControlButton(
                    heroTag: 'speaker_button',
                    onPressed: _toggleSpeaker,
                    icon: _speakerOn ? Icons.volume_up : Icons.volume_down,
                    backgroundColor: Colors.blueGrey,
                  ),
                  _buildControlButton(
                    heroTag: 'mute_button',
                    onPressed: _toggleMute,
                    icon: _micMuted ? Icons.mic_off : Icons.mic,
                    backgroundColor: _micMuted ? Colors.red : Colors.blueGrey,
                  ),
                  _buildControlButton(
                    heroTag: 'hangup_button',
                    onPressed: _hangUp,
                    icon: Icons.call_end,
                    backgroundColor: Colors.red,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildControlButton({
    required String heroTag,
    required VoidCallback onPressed,
    required IconData icon,
    required Color backgroundColor,
  }) {
    return FloatingActionButton(
      heroTag: heroTag,
      onPressed: onPressed,
      backgroundColor: backgroundColor,
      child: Icon(icon, color: Colors.white, size: 30),
    );
  }
}