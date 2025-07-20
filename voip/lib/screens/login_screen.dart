import 'package:flutter/material.dart';
// Deprecated: LoginScreen is no longer used. Registration is now via phone and name.
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Login is deprecated. Please use RegistrationScreen.')),
    );
  }
}
