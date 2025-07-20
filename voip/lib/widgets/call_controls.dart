import 'package:flutter/material.dart';

class CallControls extends StatelessWidget {
  final bool isMuted;
  final bool isAnalyzing;
  final VoidCallback onMute;
  final VoidCallback onAnalyze;
  final VoidCallback onEnd;

  const CallControls({
    required this.isMuted,
    required this.isAnalyzing,
    required this.onMute,
    required this.onAnalyze,
    required this.onEnd,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        IconButton(
          icon: Icon(
            isMuted ? Icons.mic_off : Icons.mic,
            color: Colors.white,
            size: 32,
          ),
          onPressed: onMute,
        ),
        ElevatedButton.icon(
          onPressed: onAnalyze,
          icon: Icon(
            isAnalyzing ? Icons.stop : Icons.psychology,
            color: Colors.white,
          ),
          label: Text(isAnalyzing ? 'Stop Analyze' : 'Analyze Call'),
          style: ElevatedButton.styleFrom(
            backgroundColor: isAnalyzing ? Colors.red : Colors.purple,
            foregroundColor: Colors.white,
            textStyle: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.call_end, color: Colors.red, size: 40),
          onPressed: onEnd,
        ),
      ],
    );
  }
}
