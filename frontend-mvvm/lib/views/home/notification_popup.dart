import 'package:flutter/material.dart';
// ĐIỀU CHỈNH LẠI CÁC ĐƯỜNG DẪN NÀY THEO PROJECT CỦA BẠN
import '../../models/home/notification_model.dart';
import '../../models/home/notification_model.dart';
import '../../models/home/invitation_model.dart';
import '../../viewmodels/home/notification_view_model.dart';

class NotificationPopup extends StatefulWidget {
  final VoidCallback onClose;

  const NotificationPopup({Key? key, required this.onClose}) : super(key: key);

  @override
  State<NotificationPopup> createState() => _NotificationPopupState();
}

class _NotificationPopupState extends State<NotificationPopup> {
  final NotificationViewModel _viewModel = NotificationViewModel();

  // Tab
  String _activeTab = 'Direct';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchNotifications();
      _viewModel.fetchInvitations();
    });
  }

  // API Calls and View actions have been moved to NotificationViewModel

  Future<void> _handleAcceptInvitation(String invitationId, int index) async {
    bool success = await _viewModel.acceptInvitation(invitationId, index);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Joined workspace successfully!')),
      );
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to accept invitation.')),
      );
    }
  }

  Future<void> _handleDenyInvitation(String invitationId, int index) async {
    bool success = await _viewModel.denyInvitation(invitationId, index);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Declined workspace invitation.')),
      );
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to decline invitation.')),
      );
    }
  }

  // --- UTILS ---
  String _getTimeAgo(DateTime date) {
    final difference = DateTime.now().difference(date);
    if (difference.inDays > 7) {
      return '${difference.inDays ~/ 7} weeks ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} days ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hours ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} mins ago';
    } else {
      return 'Just now';
    }
  }

  // --- BUILD UI ---
  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDarkMode ? const Color(0xFF282E33) : Colors.white;
    final borderColor = isDarkMode
        ? const Color(0xFF38414A)
        : Colors.grey.shade300;
    final titleColor = isDarkMode
        ? const Color(0xFFB6C2CF)
        : const Color(0xFF172B4D);
    final iconColor = isDarkMode
        ? const Color(0xFF8C9BAB)
        : const Color(0xFF42526E);
    final dividerColor = isDarkMode
        ? const Color(0xFF38414A)
        : const Color(0xFFDFE1E6);
    final activeBrandColor = isDarkMode
        ? const Color(0xFF579DFF)
        : const Color(0xFF0052CC);

    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, child) {
        return Material(
          color: Colors.transparent,
          child: Container(
            width: 420, // Tăng width nhẹ một chút để đủ không gian cho Tab
            height: 500,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(4),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDarkMode ? 0.5 : 0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // HEADER
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 16, 12),
                  child: Row(
                    children: [
                      Text(
                        'Notifications',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: titleColor,
                        ),
                      ),
                      const Spacer(),
                      if (_viewModel.notifications.isNotEmpty && _activeTab == 'Direct')
                        IconButton(
                          icon: Icon(Icons.done_all, size: 20, color: iconColor),
                          onPressed: () => _viewModel.markAllAsRead(),
                          tooltip: 'Mark all as read',
                        ),
                      IconButton(
                        icon: Icon(Icons.open_in_new, size: 20, color: iconColor),
                        onPressed: () {},
                        tooltip: 'Open in full page',
                      ),
                      IconButton(
                        icon: Icon(Icons.more_vert, size: 20, color: iconColor),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),

                // TABS
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      _buildTab('Direct', isDarkMode),
                      const SizedBox(width: 16),
                      _buildTab(
                        'Invitations',
                        isDarkMode,
                        badgeCount: _viewModel.pendingInvitations.length,
                      ),
                      const SizedBox(width: 16),
                      _buildTab('Watching', isDarkMode),
                    ],
                  ),
                ),
                Divider(height: 1, color: dividerColor),

                // NỘI DUNG CHÍNH
                Expanded(
                  child: _activeTab == 'Direct'
                      ? (_viewModel.isLoading
                            ? _buildLoader(activeBrandColor)
                            : _buildNotificationList(isDarkMode))
                      : _activeTab == 'Invitations'
                      ? (_viewModel.isLoadingInvitations
                            ? _buildLoader(activeBrandColor)
                            : _buildInvitationList(isDarkMode))
                      : Center(
                          child: Text(
                            'No watching items',
                            style: TextStyle(
                              color: isDarkMode
                                  ? const Color(0xFF8C9BAB)
                                  : const Color(0xFF5E6C84),
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        );
      }
    );
  }

  // --- WIDGETS ---
  Widget _buildLoader(Color color) {
    return Center(
      child: CircularProgressIndicator(
        valueColor: AlwaysStoppedAnimation<Color>(color),
      ),
    );
  }

  Widget _buildTab(String title, bool isDarkMode, {int badgeCount = 0}) {
    final isActive = _activeTab == title;
    final activeColor = isDarkMode
        ? const Color(0xFF579DFF)
        : const Color(0xFF0052CC);
    final inactiveColor = isDarkMode
        ? const Color(0xFF8C9BAB)
        : const Color(0xFF5E6C84);

    return GestureDetector(
      onTap: () => setState(() => _activeTab = title),
      child: Container(
        padding: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isActive ? activeColor : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? activeColor : inactiveColor,
              ),
            ),
            if (badgeCount > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isDarkMode
                      ? const Color(0xFF1C2B41)
                      : const Color(0xFFDEEBFF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badgeCount.toString(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: activeColor,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // DANH SÁCH THÔNG BÁO GỐC (Direct)
  Widget _buildNotificationList(bool isDarkMode) {
    final emptyTitleColor = isDarkMode
        ? const Color(0xFFB6C2CF)
        : const Color(0xFF172B4D);
    final emptySubColor = isDarkMode
        ? const Color(0xFF8C9BAB)
        : const Color(0xFF5E6C84);
    final unreadBgColor = isDarkMode
        ? const Color(0xFF1C2B41)
        : const Color(0xFFE9F2FF).withOpacity(0.5);
    final unreadDotColor = isDarkMode
        ? const Color(0xFF579DFF)
        : const Color(0xFF0052CC);

    if (_viewModel.notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_off_outlined,
              size: 48,
              color: isDarkMode
                  ? const Color(0xFF5A6978)
                  : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              "You're all caught up!",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: emptyTitleColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "You have no unread notifications.",
              style: TextStyle(fontSize: 14, color: emptySubColor),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _viewModel.notifications.length,
      itemBuilder: (context, index) {
        final notif = _viewModel.notifications[index];
        final timeAgo = _getTimeAgo(notif.createdAt);

        return InkWell(
          onTap: () => _viewModel.markAsRead(index),
          child: Container(
            color: notif.read ? Colors.transparent : unreadBgColor,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDarkMode ? const Color(0xFF22272B) : Colors.white,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: isDarkMode
                          ? const Color(0xFF38414A)
                          : Colors.grey.shade200,
                    ),
                  ),
                  child: Icon(
                    Icons.assignment_ind,
                    size: 20,
                    color: unreadDotColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          style: TextStyle(
                            fontSize: 14,
                            color: emptyTitleColor,
                          ),
                          children: [
                            TextSpan(
                              text: notif.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextSpan(
                              text: '  $timeAgo',
                              style: TextStyle(
                                color: emptySubColor,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notif.content,
                        style: TextStyle(fontSize: 14, color: emptyTitleColor),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'View details',
                        style: TextStyle(fontSize: 13, color: emptySubColor),
                      ),
                    ],
                  ),
                ),
                if (!notif.read)
                  Container(
                    margin: const EdgeInsets.only(top: 6, left: 8),
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: unreadDotColor,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  // DANH SÁCH INVITATIONS
  Widget _buildInvitationList(bool isDarkMode) {
    final emptyTitleColor = isDarkMode
        ? const Color(0xFFB6C2CF)
        : const Color(0xFF172B4D);
    final emptySubColor = isDarkMode
        ? const Color(0xFF8C9BAB)
        : const Color(0xFF5E6C84);
    final unreadDotColor = isDarkMode
        ? const Color(0xFF579DFF)
        : const Color(0xFF0052CC);

    if (_viewModel.pendingInvitations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.mark_email_read_outlined,
              size: 48,
              color: isDarkMode
                  ? const Color(0xFF5A6978)
                  : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              "No pending invitations",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: emptyTitleColor,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _viewModel.pendingInvitations.length,
      itemBuilder: (context, index) {
        final invite = _viewModel.pendingInvitations[index];

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isDarkMode
                    ? const Color(0xFF38414A)
                    : Colors.grey.shade200,
              ),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDarkMode ? const Color(0xFF22272B) : Colors.white,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: isDarkMode
                        ? const Color(0xFF38414A)
                        : Colors.grey.shade200,
                  ),
                ),
                child: Icon(Icons.mail, size: 20, color: unreadDotColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'You have been invited to join a Workspace',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: emptyTitleColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Workspace ID: ${invite.workspaceId}', // Mẹo: Cập nhật Backend để trả về Tên Workspace sau này
                      style: TextStyle(fontSize: 13, color: emptySubColor),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: unreadDotColor,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(80, 32),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            elevation: 0,
                          ),
                          onPressed: () =>
                              _handleAcceptInvitation(invite.id, index),
                          child: const Text(
                            'Accept',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: emptyTitleColor,
                            minimumSize: const Size(80, 32),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            side: BorderSide(
                              color: isDarkMode
                                  ? const Color(0xFF38414A)
                                  : Colors.grey.shade300,
                            ),
                          ),
                          onPressed: () =>
                              _handleDenyInvitation(invite.id, index),
                          child: const Text(
                            'Deny',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
