import 'package:flutter/material.dart';
import '../common/common_decorations.dart';

class RegisterStep2 extends StatelessWidget {
  final TextEditingController dobController;

  const RegisterStep2({Key? key, required this.dobController})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'When were you born?',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF172B4D),
          ),
        ),
        const SizedBox(height: 24),
        TextFormField(
          controller: dobController,
          readOnly: true,
          decoration: commonInputDecoration(
            'Date of birth',
            suffixIcon: Icons.calendar_today,
          ),
          onTap: () async {
            DateTime? picked = await showDatePicker(
              context: context,
              initialDate: DateTime(2000),
              firstDate: DateTime(1900),
              lastDate: DateTime.now(),
              builder: (ctx, child) => Theme(
                data: Theme.of(ctx).copyWith(
                  colorScheme: const ColorScheme.light(
                    primary: Color(0xFF0079BF),
                  ),
                ),
                child: child!,
              ),
            );
            if (picked != null) {
              dobController.text = picked.toIso8601String().split('T')[0];
            }
          },
        ),
      ],
    );
  }
}
