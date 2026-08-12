import 'package:flutter/material.dart';
import '../../viewmodels/auth/auth_view_model.dart';
import 'package:frontend/auth/auth_gate.dart';
import '../../views/home/home_page.dart';
import '../../views/home/notification_popup.dart';
import '../../views/home/profile_view.dart';
import '../../main.dart';

class TaskFlowAppBar extends StatelessWidget implements PreferredSizeWidget {
  final bool isMobile;
  final VoidCallback onCreate;

  const TaskFlowAppBar({
    Key? key,
    required this.isMobile,
    required this.onCreate,
  }) : super(key: key);

  @override
  Size get preferredSize => const Size.fromHeight(56);

  // --- HÀM MỞ POPUP NOTIFICATION ---
  void _showNotificationMenu(BuildContext context) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Stack(
          children: [
            Positioned(
              top: 56.0,
              right: 120.0,
              child: NotificationPopup(
                onClose: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(opacity: animation, child: child);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final appBarColor = isDarkMode
        ? const Color(0xFF1D2125)
        : const Color(0xFF0052CC);
    final searchBgColor = isDarkMode
        ? const Color(0xFF22272B)
        : const Color(0xFF0747A6);
    final createBtnBg = isDarkMode ? const Color(0xFF579DFF) : Colors.white;
    final createBtnText = isDarkMode
        ? const Color(0xFF1D2125)
        : const Color(0xFF0052CC);

    return AppBar(
      backgroundColor: appBarColor, 
      elevation: 0,
      leading: isMobile
          ? null
          : Padding(
              padding: const EdgeInsets.all(12),
              child: Container(
                decoration: BoxDecoration(
                  color: isDarkMode ? const Color(0xFF2C333A) : Colors.white,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Icon(
                  Icons.dashboard,
                  color: isDarkMode
                      ? const Color(0xFF579DFF)
                      : const Color(0xFF0052CC),
                  size: 20,
                ),
              ),
            ),
      title: Row(
        children: [
          if (!isMobile)
            const Text(
              'TaskFlow',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          if (!isMobile) const SizedBox(width: 24),
          Expanded(
            child: Container(
              height: 36,
              decoration: BoxDecoration(
                color: searchBgColor, 
                borderRadius: BorderRadius.circular(4),
                border: isDarkMode
                    ? Border.all(
                        color: const Color(0xFF738496).withOpacity(0.3),
                      )
                    : null,
              ),
              child: TextField(
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search',
                  hintStyle: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 14,
                  ),
                  prefixIcon: Icon(
                    Icons.search,
                    color: Colors.white.withOpacity(0.7),
                    size: 20,
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  isDense: true,
                ),
              ),
            ),
          ),
        ],
      ),
      actions: [
        ElevatedButton.icon(
          onPressed: onCreate,
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Create', style: TextStyle(fontSize: 14)),
          style: ElevatedButton.styleFrom(
            backgroundColor: createBtnBg,
            foregroundColor: createBtnText,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(width: 12),
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: Colors.white),
          onPressed: () => _showNotificationMenu(context),
        ),
        IconButton(
          icon: const Icon(Icons.help_outline, color: Colors.white),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.settings_outlined, color: Colors.white),
          onPressed: () {},
        ),
        const SizedBox(width: 8),
        _buildUserMenu(context, isDarkMode),
      ],
    );
  }

  Widget _buildUserMenu(BuildContext context, bool isDarkMode) {
    final menuIconColor = isDarkMode ? Colors.white70 : const Color(0xFF172B4D);

    return PopupMenuButton<int>(
      offset: const Offset(0, 48),
      child: Padding(
        padding: const EdgeInsets.only(right: 16),
        child: CircleAvatar(
          radius: 16,
          backgroundColor: const Color(0xFF6554C0),
          child: const Text(
            'U',
            style: TextStyle(color: Colors.white, fontSize: 14),
          ),
        ),
      ),
      onSelected: (value) async {
        if (value == 0) {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (context) => const ProfilePage()));
        } else if (value == 1) {
          _showThemeDialog(context);
        } else if (value == 2) {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Confirm logout'),
              content: const Text('Do you want to logout?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(false),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  child: const Text('Logout'),
                ),
              ],
            ),
          );

          if (confirmed == true) {
            final authViewModel = AuthViewModel();
            await authViewModel.logout();
            if (context.mounted) {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(
                  builder: (context) => const AuthGate(child: HomePage()),
                ),
                (route) => false,
              );
            }
          }
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem<int>(
          value: 0,
          child: Row(
            children: [
              Icon(Icons.person_outline, color: menuIconColor),
              const SizedBox(width: 8),
              const Text('My Profile'),
            ],
          ),
        ),
        PopupMenuItem<int>(
          value: 1,
          child: Row(
            children: [
              Icon(Icons.contrast, color: menuIconColor),
              const SizedBox(width: 8),
              const Text('Theme'),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<int>(
          value: 2,
          child: Row(
            children: [
              Icon(Icons.logout, color: menuIconColor),
              const SizedBox(width: 8),
              const Text('Logout'),
            ],
          ),
        ),
      ],
    );
  }

  void _showThemeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text(
            'Select Theme',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.light_mode_outlined),
                title: const Text('Light'),
                onTap: () {
                  themeNotifier.value = ThemeMode.light; 
                  Navigator.pop(dialogContext);
                },
              ),
              ListTile(
                leading: const Icon(Icons.dark_mode_outlined),
                title: const Text('Dark'),
                onTap: () {
                  themeNotifier.value = ThemeMode.dark; 
                  Navigator.pop(dialogContext);
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
