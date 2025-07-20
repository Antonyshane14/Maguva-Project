import 'package:flutter/material.dart';

class AnalysisResultScreen extends StatelessWidget {
  final Map<String, dynamic> result;

  const AnalysisResultScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scam Analysis Result')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Analysis Summary:',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text(result['summary'] ?? 'No summary available.'),
            const SizedBox(height: 24),
            Text('Details:', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: (result['details'] as List?)?.length ?? 0,
                itemBuilder: (context, index) {
                  final detail = result['details'][index];
                  return ListTile(
                    title: Text(detail['label'] ?? ''),
                    subtitle: Text(detail['value']?.toString() ?? ''),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
