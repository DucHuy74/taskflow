import 'package:flutter/material.dart';

class GraphTheme {
  final Color bgColor;
  final Color subjectFill;
  final Color subjectBorder;
  final Color verbFill;
  final Color verbBorder;
  final Color objectFill;
  final Color objectBorder;
  final Color lineColor;
  final Color highlightLine;
  final Color textPrimary;
  final Color textSecondary;
  final Color doneColor;
  final Color inProgressColor;
  final Color panelBg;
  final Color panelBorder;
  final Color tooltipShadow;
  final Color lassoColor;
  final Color selectionBorder;

  GraphTheme({
    required this.bgColor,
    required this.subjectFill,
    required this.subjectBorder,
    required this.verbFill,
    required this.verbBorder,
    required this.objectFill,
    required this.objectBorder,
    required this.lineColor,
    required this.highlightLine,
    required this.textPrimary,
    required this.textSecondary,
    required this.doneColor,
    required this.inProgressColor,
    required this.panelBg,
    required this.panelBorder,
    required this.tooltipShadow,
    required this.lassoColor,
    required this.selectionBorder,
  });

  factory GraphTheme.of(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? GraphTheme.dark() : GraphTheme.light();
  }

  factory GraphTheme.dark() => GraphTheme(
    bgColor: const Color(0xFF0D1117),
    subjectFill: const Color(0xFF161B22),
    subjectBorder: const Color(0xFF58A6FF),
    verbFill: const Color(0xFF1A1040),
    verbBorder: const Color(0xFF7C3AED),
    objectFill: const Color(0xFF0D1117),
    objectBorder: const Color(0xFF22D3EE),
    lineColor: const Color(0x556E7FBF),
    highlightLine: const Color(0xFF818CF8),
    textPrimary: const Color(0xFFE6EDF3),
    textSecondary: const Color(0xFF8B949E),
    doneColor: const Color(0xFF238636),
    inProgressColor: const Color(0xFFD29922),
    panelBg: const Color(0xFF161B22),
    panelBorder: const Color(0xFF30363D),
    tooltipShadow: Colors.black.withOpacity(0.5),
    lassoColor: Colors.white70,
    selectionBorder: Colors.white,
  );

  factory GraphTheme.light() => GraphTheme(
    bgColor: const Color(0xFFF4F5F7),
    subjectFill: Colors.white,
    subjectBorder: const Color(0xFF0052CC),
    verbFill: const Color(0xFFEAE6FF),
    verbBorder: const Color(0xFF5243AA),
    objectFill: Colors.white,
    objectBorder: const Color(0xFF00B8D9),
    lineColor: const Color(0xFFDFE1E6),
    highlightLine: const Color(0xFF0052CC),
    textPrimary: const Color(0xFF172B4D),
    textSecondary: const Color(0xFF5E6C84),
    doneColor: const Color(0xFF00875A),
    inProgressColor: const Color(0xFFFF991F),
    panelBg: Colors.white,
    panelBorder: const Color(0xFFDFE1E6),
    tooltipShadow: const Color(0xFF091E42).withOpacity(0.15),
    lassoColor: const Color(0xFF0052CC).withOpacity(0.7),
    selectionBorder: const Color(0xFF172B4D),
  );
}
