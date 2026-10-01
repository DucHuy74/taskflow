import 'package:flutter/material.dart';

import '../theme/graph_theme.dart';

class StartSprintPanel extends StatelessWidget {
  final int selectedNodesCount;
  final int selectedVerbsCount;
  final GraphTheme theme;
  final VoidCallback onStartSprint;
  final VoidCallback onClose;

  const StartSprintPanel({
    Key? key,
    required this.selectedNodesCount,
    required this.selectedVerbsCount,
    required this.theme,
    required this.onStartSprint,
    required this.onClose,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: theme.panelBg,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: theme.verbBorder, width: 2),
        boxShadow: [
          BoxShadow(
            color: theme.verbBorder.withOpacity(0.3),
            blurRadius: 20,
            spreadRadius: 2,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$selectedNodesCount Nodes Selected ($selectedVerbsCount Actions)',
            style: TextStyle(
              color: theme.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(width: 20),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.verbBorder,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            onPressed: onStartSprint,
            child: const Text(
              'Start Sprint',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(Icons.close, color: theme.textSecondary),
            onPressed: onClose,
          ),
        ],
      ),
    );
  }
}
