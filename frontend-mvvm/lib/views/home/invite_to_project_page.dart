import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../viewmodels/home/invite_to_project_view_model.dart';
import 'home_page.dart';

class InviteToProjectPage extends StatelessWidget {
  final String workspaceId;

  const InviteToProjectPage({Key? key, required this.workspaceId})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => InviteViewModel(),
      child: _InviteView(workspaceId: workspaceId),
    );
  }
}

// Widget này là UI thực tế
class _InviteView extends StatefulWidget {
  final String workspaceId;

  const _InviteView({Key? key, required this.workspaceId}) : super(key: key);

  @override
  State<_InviteView> createState() => _InviteViewState();
}

class _InviteViewState extends State<_InviteView> {
  final _emailController = TextEditingController();
  final FocusNode _emailFocusNode = FocusNode();
  bool _isInputFocused = false;

  static const primaryColor = Color(0xFF0052CC);
  static const textDark = Color(0xFF172B4D);
  static const textGrey = Color(0xFF5E6C84);
  static const borderGrey = Color(0xFFDFE1E6);

  final List<Map<String, String>> _roleDescriptions = [
    {'title': 'Administrator', 'description': 'Admins can do most things...'},
    {'title': 'Member', 'description': 'Members are part of the team...'},
    {'title': 'Viewer', 'description': 'Viewers can search and view...'},
  ];

  @override
  void initState() {
    super.initState();
    _emailFocusNode.addListener(() {
      setState(() => _isInputFocused = _emailFocusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _emailFocusNode.dispose();
    super.dispose();
  }

  String _getRoleDescription(String selectedRole) {
    return _roleDescriptions.firstWhere(
      (e) => e['title'] == selectedRole,
      orElse: () => {'description': ''},
    )['description']!;
  }

  @override
  Widget build(BuildContext context) {
    final viewModel = context.watch<InviteViewModel>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: textDark),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Back to project setup',
          style: TextStyle(color: textGrey, fontSize: 15),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Bring your team along',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: textDark,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Collaborate instantly...',
                    style: TextStyle(fontSize: 16, color: textGrey),
                  ),
                  const SizedBox(height: 32),

                  // --- INPUT EMAIL ---
                  const Text(
                    'Email addresses',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _isInputFocused ? primaryColor : borderGrey,
                        width: _isInputFocused ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (viewModel.invitedMembers.isNotEmpty)
                          Wrap(
                            spacing: 8,
                            children: viewModel.invitedMembers
                                .map(
                                  (email) => InputChip(
                                    label: Text(email),
                                    onDeleted: () => viewModel.removeMember(
                                      email,
                                    ), // Gọi ViewModel
                                    backgroundColor: const Color(0xFFEBECF0),
                                  ),
                                )
                                .toList(),
                          ),
                        TextField(
                          controller: _emailController,
                          focusNode: _emailFocusNode,
                          decoration: const InputDecoration(
                            hintText: 'e.g., name@company.com',
                            border: InputBorder.none,
                            isDense: true,
                          ),
                          onSubmitted: (value) {
                            viewModel.addMember(value.trim()); // Gọi ViewModel
                            _emailController.clear();
                            _emailFocusNode.requestFocus();
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // --- ROLE SELECTION ---
                  const Text(
                    'Role',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: borderGrey),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: ButtonTheme(
                        alignedDropdown: true,
                        child: DropdownButton<String>(
                          value: viewModel
                              .selectedRole, // Lấy dữ liệu từ ViewModel
                          isExpanded: true,
                          items: _roleDescriptions
                              .map(
                                (role) => DropdownMenuItem(
                                  value: role['title'],
                                  child: Text(role['title']!),
                                ),
                              )
                              .toList(),
                          onChanged: (val) =>
                              viewModel.setRole(val), // Gọi ViewModel
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Description Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDEEBFF).withOpacity(0.5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.admin_panel_settings_outlined,
                          color: primaryColor,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _getRoleDescription(viewModel.selectedRole),
                            style: const TextStyle(color: Color(0xFF0049B0)),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 48),

                  // --- ACTIONS ---
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () {
                          Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const HomePage(),
                            ),
                            (route) => false,
                          );
                        },
                        child: const Text('Skip for now'),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 16,
                          ),
                        ),
                        onPressed: viewModel.isLoading
                            ? null
                            : () async {
                                final currentText = _emailController.text;

                                bool success = await viewModel
                                    .submitInvitations(
                                      widget.workspaceId,
                                      currentInputEmail: currentText,
                                    );

                                if (!context.mounted) return;

                                if (success) {
                                  _emailController.clear();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Invites sent successfully!',
                                      ),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                } else if (viewModel.errorMessage != null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(viewModel.errorMessage!),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              },
                        child: viewModel.isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'Invite and continue',
                                style: TextStyle(color: Colors.white),
                              ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
