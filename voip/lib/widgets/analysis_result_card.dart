import 'package:flutter/material.dart';

class AnalysisResultCard extends StatelessWidget {
  final Map<String, dynamic> result;
  const AnalysisResultCard({required this.result, super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Risk Score: ${result['risk_score'] ?? 'N/A'}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (result['highlighted_phrases'] != null)
              ...List<Widget>.from(
                (result['highlighted_phrases'] as List).map(
                  (p) => Text('• $p', style: const TextStyle(fontSize: 16)),
                ),
              ),
            Text(
              'Voice Impersonation: ${result['impersonation_likelihood'] ?? 'N/A'}',
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
