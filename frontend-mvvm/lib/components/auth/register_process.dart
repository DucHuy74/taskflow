import 'package:flutter/material.dart';

class RegisterProcess extends StatelessWidget {
  final int currentStep;
  const RegisterProcess({Key? key, required this.currentStep})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'Step ${currentStep + 1} of 4',
          style: const TextStyle(fontSize: 16, color: Color(0xFF5E6C84)),
        ),
        const SizedBox(height: 16),
        Row(
          children: List.generate(4, (index) {
            final isActive = index <= currentStep;
            return Expanded(
              child: Container(
                margin: EdgeInsets.only(right: index < 3 ? 8 : 0),
                height: 4,
                decoration: BoxDecoration(
                  color: isActive
                      ? const Color(0xFF0079BF)
                      : const Color(0xFFDFE1E6),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
