import 'package:flutter/material.dart';

class SelectUserScreen extends StatelessWidget {
  const SelectUserScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Deprecated: Use dialer in HomeScreen instead
    return Scaffold(
      appBar: AppBar(title: const Text('Select User to Call (Deprecated)')),
      body: const Center(child: Text('Use the dialer on the Home screen to call by User ID.')),
    );
  }
}
