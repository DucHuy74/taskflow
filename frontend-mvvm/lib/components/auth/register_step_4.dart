import 'package:flutter/material.dart';
import '../common/common_decorations.dart';

class RegisterStep4 extends StatelessWidget {
  final TextEditingController passwordController;
  final bool obscurePassword;
  final VoidCallback onTogglePassword;
  final Color strengthColor;
  final String strengthText;

  const RegisterStep4({
    Key? key,
    required this.passwordController,
    required this.obscurePassword,
    required this.onTogglePassword,
    required this.strengthColor,
    required this.strengthText,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Create a password', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Color(0xFF172B4D))),
        const SizedBox(height: 24),
        TextFormField(
          controller: passwordController,
          obscureText: obscurePassword,
          decoration: commonInputDecoration(
            'Password',
            isPassword: true,
            isObscure: obscurePassword,
            onToggle: onTogglePassword,
          ),
        ),
        const SizedBox(height: 16),
        if (passwordController.text.isNotEmpty)
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(color: strengthColor, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(width: 12),
              Text(strengthText, style: TextStyle(fontSize: 12, color: strengthColor, fontWeight: FontWeight.w500)),
            ],
          ),
      ],
    );
  }
}