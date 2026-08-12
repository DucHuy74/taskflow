// lib/components/common/common_decorations.dart

import 'package:flutter/material.dart';

InputDecoration commonInputDecoration(
  String label, {
  IconData? suffixIcon,
  bool isPassword = false,
  bool isObscure = true,     
  VoidCallback? onToggle,     t
}) {
  return InputDecoration(
    labelText: label,
    labelStyle: const TextStyle(color: Color(0xFF5E6C84), fontSize: 14),
    filled: true,
    fillColor: const Color(0xFFFAFBFC),
    
    suffixIcon: isPassword
        ? IconButton(
            icon: Icon(
              isObscure ? Icons.visibility_off : Icons.visibility,
              color: const Color(0xFF5E6C84),
              size: 20,
            ),
            onPressed: onToggle,
          )
        : (suffixIcon != null
            ? Icon(suffixIcon, color: const Color(0xFF5E6C84), size: 20)
            : null),
            
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(4),
      borderSide: const BorderSide(color: Color(0xFFDFE1E6)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(4),
      borderSide: const BorderSide(color: Color(0xFFDFE1E6)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(4),
      borderSide: const BorderSide(color: Color(0xFF0079BF), width: 2),
    ),
    
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
  );
}