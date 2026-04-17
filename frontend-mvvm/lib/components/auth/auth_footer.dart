import 'package:flutter/material.dart';

class AuthFooter extends StatelessWidget {
  final VoidCallback onSignUp;

  const AuthFooter({Key? key, required this.onSignUp}) : super(key: key);

  Widget _buildFooterLink(String text) {
    return GestureDetector(
      onTap: () {},
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFF5E6C84),
          fontSize: 12,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "Don't have an account? ",
              style: TextStyle(color: Color(0xFF5E6C84), fontSize: 14),
            ),
            GestureDetector(
              onTap: onSignUp,
              child: const Text(
                'Sign up',
                style: TextStyle(
                  color: Color(0xFF0079BF),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            _buildFooterLink('Privacy Policy'),
            _buildFooterLink('Terms of Service'),
            _buildFooterLink('Help'),
          ],
        ),
      ],
    );
  }
}
