import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/home_screen.dart';
import 'screens/analysis_result_screen.dart';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'voip_service.dart';

// NOTE: The 'VoIPService' and screen imports ('home_screen.dart', etc.)
// are assumed to exist elsewhere in your project.

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    runApp(const MyApp());
  } catch (e) {
    runApp(MaterialApp(
      home: Scaffold(
        body: Center(
          // BUG FIX: Used '$e' for correct string interpolation.
          child: Text('Firebase init error: $e'),
        ),
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
    // LOGIC FIX: Assign the handler BEFORE starting the listener to prevent a race condition.
    VoIPService().onIncomingCall = (callId) async {
      final navigator = navigatorKey.currentState;
      if (navigator == null) return;

      String peerId = 'Unknown Caller'; // Default value in case of an error

      try {
        final doc = await FirebaseFirestore.instance.collection('calls').doc(callId).get();
        final data = doc.data();
        if (data != null && data['callerId'] != null) {
          peerId = data['callerId'];
        }
      } catch (e) {
        // BUG FIX: Used '$e' for correct string interpolation.
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
                // Pop the dialog before pushing the new screen
                navigator.pop();
                navigator.push( // Use push instead of pushReplacement to keep home screen in stack
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
        // Note: The '/call' and '/analysis' routes use hardcoded data for testing.
        '/call': (context) => CallScreen(
          callId: 'demo',
          isCaller: true,
          peerId: 'peer_user_id',
        ),
        '/analysis': (context) => AnalysisResultScreen(
          result: {
            'summary': 'No scam detected. Call is safe.',
            'details': [
              {'label': 'Risk Score', 'value': 'Low'},
              {'label': 'Impersonation Likelihood', 'value': 'Minimal'},
              {'label': 'Highlighted Phrases', 'value': 'None'},
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
  _CallScreenState createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  int _seconds = 0;
  Timer? _timer;
  bool _micMuted = false;
  bool _speakerOn = true;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _seconds++;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _toggleMute() {
    setState(() {
      _micMuted = !_micMuted;
    });
    VoIPService().toggleMicrophone();
  }

  void _toggleSpeaker() {
    setState(() {
      _speakerOn = !_speakerOn;
    });
    VoIPService().toggleSpeaker(_speakerOn);
  }

  void _hangUp() {
    VoIPService().endCall();
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
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
        title: Text(widget.isCaller ? 'Calling...' : 'In Call with ${widget.peerId}'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildControlButton(
                    onPressed: _toggleMute,
                    icon: _micMuted ? Icons.mic_off : Icons.mic,
                    backgroundColor: _micMuted ? Colors.red : Colors.blueGrey,
                  ),
                  _buildControlButton(
                    onPressed: _toggleSpeaker,
                    icon: _speakerOn ? Icons.volume_up : Icons.volume_off,
                    backgroundColor: _speakerOn ? Colors.blueGrey : Colors.red,
                  ),
                   _buildControlButton(
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
    required VoidCallback onPressed,
    required IconData icon,
    required Color backgroundColor,
  }) {
    return FloatingActionButton(
      onPressed: onPressed,
      backgroundColor: backgroundColor,
      child: Icon(icon, color: Colors.white, size: 30),
    );
  }
}