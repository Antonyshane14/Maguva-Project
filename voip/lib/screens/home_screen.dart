import 'package:flutter/material.dart';
import '../voip_service.dart';
import 'call_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String get _userId => VoIPService().userId ?? '';
  final _dialerController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // This method needs to be added to your service
    // VoIPService().setOnlineStatus(online: true); // Method removed
    // FIX: Removed redundant call. This is handled in main.dart's initialization.
  }

  @override
  void dispose() {
    // VoIPService().setOnlineStatus(online: false); // Method removed
    _dialerController.dispose();
    super.dispose();
  }

  // FIX: Created an async function to handle the entire call setup process.
  Future<void> _startCall() async {
    final peerId = _dialerController.text.trim();
    if (peerId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a User ID to call.')),
      );
      return;
    }

    // Show a loading dialog while connecting
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    // Get the real callId from the service
    final callId = await VoIPService().startCall(peerId);

    if (mounted) Navigator.pop(context); // Close the loading dialog

    if (callId != null && mounted) {
      // Navigate only after a valid callId is received
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CallScreen(
            callId: callId, // Pass the REAL callId
            isCaller: true,
            peerId: peerId,
          ),
        ),
      );
    } else if (mounted) {
       ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to start call. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('VoIP App')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Your User ID',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            SelectableText(
              _userId.isNotEmpty ? _userId : 'Initializing...',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 40),
            TextField(
              controller: _dialerController,
              decoration: const InputDecoration(
                labelText: 'Enter User ID to Call',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.text,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _startCall, // Use the new async handler
              child: const Text('Dial & Call'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/analysis'),
              child: const Text('View Last Analysis'),
            ),
          ],
        ),
      ),
    );
  }
}