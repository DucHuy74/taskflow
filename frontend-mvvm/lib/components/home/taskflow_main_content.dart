import 'package:flutter/material.dart';

class TaskFlowMainContent extends StatelessWidget {
  final VoidCallback onCreate;

  const TaskFlowMainContent({
    Key? key,
    required this.onCreate,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final titleColor = isDarkMode ? const Color(0xFFB6C2CF) : const Color(0xFF172B4D);
    final subtitleColor = isDarkMode ? const Color(0xFF8C9BAB) : const Color(0xFF5E6C84);
    
    final btnBgColor = isDarkMode ? const Color(0xFF579DFF) : const Color(0xFF0052CC);
    final btnTextColor = isDarkMode ? const Color(0xFF1D2125) : Colors.white;
    final linkColor = isDarkMode ? const Color(0xFF579DFF) : const Color(0xFF0052CC);

    final lockIconColor = isDarkMode ? const Color(0xFF1D2125) : const Color(0xFF172B4D);
    final keyBgColor = isDarkMode ? const Color(0xFF579DFF) : const Color(0xFF0052CC);
    final keyIconColor = isDarkMode ? const Color(0xFF1D2125) : Colors.white;

    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 600),
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFC400), // Màu vàng của Jira giữ nguyên vì nó nổi trên cả 2 nền
                    shape: BoxShape.circle,
                  ),
                ),
                Icon(
                  Icons.lock_outline,
                  size: 60,
                  color: lockIconColor, // Đổi màu icon ổ khóa
                ),
                Positioned(
                  right: 15,
                  top: 20,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: keyBgColor, // Đổi màu nền chìa khóa
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.vpn_key,
                      size: 18,
                      color: keyIconColor, // Đổi màu icon chìa khóa
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            Text(
              'Space not found',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w600,
                color: titleColor, // Đổi màu tiêu đề
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'You tried to access a space that doesn\'t exist, or that you don\'t have permission to access. Speak to your TaskFlow admin or space admin to get access.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: subtitleColor, // Đổi màu nội dung chữ
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: onCreate,
              style: ElevatedButton.styleFrom(
                backgroundColor: btnBgColor, // Nền nút
                foregroundColor: btnTextColor, // Chữ của nút
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Create your first scrum board',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () {},
              child: Text(
                'Go back to home',
                style: TextStyle(
                  color: linkColor, // Đổi màu chữ link
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}