import 'package:flutter/material.dart';
import '../common/common_decorations.dart';

class RegisterStep1 extends StatelessWidget {
  final TextEditingController firstNameController;
  final TextEditingController lastNameController;

  const RegisterStep1({
    Key? key,
    required this.firstNameController,
    required this.lastNameController,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'What\'s your name?',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF172B4D),
          ),
        ),
        const SizedBox(height: 24),
        TextFormField(
          controller: firstNameController,
          autofocus: true,
          decoration: commonInputDecoration('First name'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: lastNameController,
          decoration: commonInputDecoration('Last name'),
        ),
      ],
    );
  }
}
