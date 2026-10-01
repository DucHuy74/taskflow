import 'package:flutter/material.dart';

// Widget hiển thị số lượng trạng thái (Status Badge)
class StatusBadge extends StatelessWidget {
  final String count;
  final Color bgColor;
  final Color textColor;

  const StatusBadge({
    Key? key,
    required this.count,
    required this.bgColor,
    required this.textColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        count,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: textColor,
        ),
      ),
    );
  }
}
