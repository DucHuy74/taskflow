import 'package:flutter/material.dart';

class AuthHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final String logoPath;

  const AuthHeader({
    Key? key,
    this.title = 'TaskFlow',
    required this.subtitle,
    this.logoPath = '',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0079BF), Color(0xFF0067A3)],
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0079BF).withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Icon(
            Icons.dashboard_rounded,
            size: 45,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 24),

        // --- APP NAME ---
        Text(
          title,
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            color: Color(0xFF172B4D),
            letterSpacing: -0.5,
          ),
        ),

        const SizedBox(height: 8),

        Text(
          subtitle,
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF5E6C84),
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }
}
