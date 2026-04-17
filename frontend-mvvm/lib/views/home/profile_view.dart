// profile_view.dart

import 'package:flutter/material.dart';
import '../../models/home/user_profile_model.dart';
import '../../viewmodels/home/profile_view_model.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({Key? key}) : super(key: key);

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final ProfileViewModel _viewModel = ProfileViewModel();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchUserProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final backgroundColor = isDarkMode
        ? const Color(0xFF1E1F22)
        : const Color(0xFFF4F5F7);
    final cardColor = isDarkMode ? const Color(0xFF2B2D31) : Colors.white;
    final textColor = isDarkMode ? Colors.white : const Color(0xFF172B4D);
    final subTextColor = isDarkMode
        ? const Color(0xFFA0A0A0)
        : const Color(0xFF5E6C84);
    final shadowColor = isDarkMode
        ? Colors.black.withOpacity(0.2)
        : Colors.black.withOpacity(0.06);
    final appBarIconColor = isDarkMode ? Colors.white : const Color(0xFF172B4D);

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        title: Text(
          'My Profile',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 20,
            color: textColor, 
          ),
        ),
        centerTitle: true,
        backgroundColor: backgroundColor,
        elevation: 0,
        iconTheme: IconThemeData(color: appBarIconColor), 
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, child) {
          if (_viewModel.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF0052CC)),
            );
          } else if (_viewModel.errorMessage != null) {
            return Center(
              child: Text(
                '${_viewModel.errorMessage}',
                style: const TextStyle(color: Colors.redAccent),
              ),
            );
          } else if (_viewModel.userProfile != null) {
            final profile = _viewModel.userProfile!;
            final fullName = '${profile.lastName} ${profile.firstName}';
            final displayUsername = '@${profile.username}';

            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 32.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // --- AVATAR & TÊN ---
                  Center(
                    child: Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Color(0xFF0052CC),
                            shape: BoxShape.circle,
                          ),
                          child: CircleAvatar(
                            radius: 50,
                            backgroundColor: cardColor,
                            child: Text(
                              profile.firstName.isNotEmpty
                                  ? profile.firstName[0].toUpperCase()
                                  : 'U',
                              style: TextStyle(
                                fontSize: 40,
                                color:
                                    textColor, 
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0C070),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: backgroundColor, 
                              width: 3,
                            ),
                          ),
                          child: const Icon(
                            Icons.edit,
                            size: 16,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  Text(
                    fullName,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    displayUsername,
                    style: const TextStyle(
                      color: Color(0xFFF0C070),
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),

                  const SizedBox(height: 40),

                  // --- THÔNG TIN CHI TIẾT (DẠNG CARD) ---
                  Container(
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: shadowColor,
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        _buildInfoTile(
                          icon: Icons.badge_outlined,
                          label: 'Full Name',
                          value: fullName,
                          isDarkMode: isDarkMode,
                          textColor: textColor,
                          subTextColor: subTextColor,
                        ),
                        _buildDivider(isDarkMode),
                        _buildInfoTile(
                          icon: Icons.alternate_email,
                          label: 'Username',
                          value: profile.username,
                          isDarkMode: isDarkMode,
                          textColor: textColor,
                          subTextColor: subTextColor,
                        ),
                        _buildDivider(isDarkMode),
                        _buildInfoTile(
                          icon: Icons.email_outlined,
                          label: 'Email',
                          value: profile.email,
                          isDarkMode: isDarkMode,
                          textColor: textColor,
                          subTextColor: subTextColor,
                        ),
                        _buildDivider(isDarkMode),
                        _buildInfoTile(
                          icon: Icons.calendar_today_outlined,
                          label: 'Date of Birth',
                          value: profile.dob,
                          isDarkMode: isDarkMode,
                          textColor: textColor,
                          subTextColor: subTextColor,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildDivider(bool isDarkMode) {
    return Divider(
      color: isDarkMode ? Colors.white12 : const Color(0xFFEBECF0),
      height: 1,
      indent: 56,
      endIndent: 16,
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String label,
    required String value,
    required bool isDarkMode,
    required Color textColor,
    required Color subTextColor,
  }) {
    final iconBgColor = isDarkMode
        ? Colors.white.withOpacity(0.05)
        : const Color(0xFFDEEBFF);
    final iconColor = isDarkMode ? Colors.white70 : const Color(0xFF0052CC);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: iconBgColor,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(label, style: TextStyle(color: subTextColor, fontSize: 13)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4.0),
        child: Text(
          value,
          style: TextStyle(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
