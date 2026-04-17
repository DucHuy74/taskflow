import 'package:flutter/material.dart';
import '../common/common_decorations.dart';

class RegisterStep3 extends StatelessWidget {
  final TextEditingController usernameController;
  final TextEditingController emailController;

  const RegisterStep3({Key? key, required this.usernameController, required this.emailController}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Create your account', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Color(0xFF172B4D))),
        const SizedBox(height: 24),
        TextFormField(
          controller: usernameController,
          decoration: commonInputDecoration('Username'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: commonInputDecoration('Email'),
        ),
      ],
    );
  }
}