import 'package:flutter/material.dart';

class AnalysisScreen extends StatelessWidget {
  final Map<String, dynamic> result;
  const AnalysisScreen({required this.result, super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scam Analysis Results')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Risk Score: ${result['risk_score'] ?? 'N/A'}',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (result['highlighted_phrases'] != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Highlighted Phrases:',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  ...List<Widget>.from(
                    (result['highlighted_phrases'] as List).map(
                      (p) => Text('• $p', style: const TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 16),
            Text(
              'Voice Impersonation Likelihood: ${result['impersonation_likelihood'] ?? 'N/A'}',
              style: const TextStyle(fontSize: 18),
            ),
            // TODO: Add more interactive UI as needed
          ],
        ),
      ),
    );
  }
}
