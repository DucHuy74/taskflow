import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/home/workspace_model.dart';
import '../../viewmodels/home/invite_to_project_view_model.dart';
import 'workspace_member_stack.dart';

class WorkspaceHeader extends StatelessWidget {
  final WorkspaceModel workspace;
  final String activeTab;
  final ValueChanged<String> onTabSelected;

  const WorkspaceHeader({
    Key? key,
    required this.workspace,
    required this.activeTab,
    required this.onTabSelected,
  }) : super(key: key);

  Color _getAvatarColor(String name) {
    final colors = [
      const Color(0xFF0052CC),
      const Color(0xFFDE350B),
      const Color(0xFF008DA6),
      const Color(0xFF403294),
      const Color(0xFFFF991F),
    ];
    return colors[name.hashCode % colors.length];
  }

  void _showAddPeopleDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AddPeopleDialog(
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTopRow(context),
          const SizedBox(height: 20),
          _buildTabs(),
        ],
      ),
    );
  }

  Widget _buildTopRow(BuildContext context) {
    final String initial = workspace.name.isNotEmpty
        ? workspace.name[0].toUpperCase()
        : "W";

    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: _getAvatarColor(workspace.name),
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          child: Text(
            initial,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          workspace.name.isNotEmpty ? workspace.name : "Workspace",
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: Color(0xFF172B4D),
          ),
        ),
        const SizedBox(width: 12),

        IconButton(
          icon: const Icon(Icons.people_outline, size: 20),
          tooltip: 'View Members',
          onPressed: () {
            showDialog(
              context: context,
              builder: (context) => WorkspaceMembersDialog(
                workspaceId: workspace.id,
                workspaceName: workspace.name,
              ),
            );
          },
        ),
        IconButton(
          icon: const Icon(Icons.star_border, size: 20),
          onPressed: () {},
        ),
        _buildMoreOptionsMenu(context),
        const Spacer(),
        IconButton(
          icon: const Icon(Icons.share_outlined, size: 20),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.flash_on_outlined, size: 20),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.fullscreen, size: 20),
          onPressed: () {},
        ),
      ],
    );
  }

  Widget _buildMoreOptionsMenu(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        popupMenuTheme: PopupMenuThemeData(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
            side: BorderSide(color: Colors.grey.shade300),
          ),
          elevation: 4,
        ),
      ),
      child: PopupMenuButton<String>(
        icon: Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFF0052CC).withOpacity(0.5)),
            borderRadius: BorderRadius.circular(4),
            color: const Color(0xFFDEEBFF).withOpacity(0.3),
          ),
          child: const Icon(
            Icons.more_horiz,
            size: 20,
            color: Color(0xFF0052CC),
          ),
        ),
        offset: const Offset(0, 36),
        onSelected: (value) {
          if (value == 'people') {
            _showAddPeopleDialog(context);
          }
        },
        itemBuilder: (context) => [
          _buildPopupMenuItem('star', Icons.star_border, 'Add to starred'),
          _buildPopupMenuItem('people', Icons.person_outline, 'Add people'),
          _buildPopupMenuItem(
            'template',
            Icons.space_dashboard_outlined,
            'Save as template',
            badgeText: 'ENTERPRISE',
          ),
          _buildPopupMenuItem(
            'background',
            Icons.format_color_fill_outlined,
            'Set space background',
            showTrailingArrow: true,
          ),
          _buildPopupMenuItem(
            'settings',
            Icons.settings_outlined,
            'Space settings',
          ),
          const PopupMenuDivider(),
          _buildPopupMenuItem(
            'archive',
            Icons.archive_outlined,
            'Archive space',
            badgeText: 'PREMIUM',
          ),
          _buildPopupMenuItem(
            'delete',
            Icons.delete_outline,
            'Delete space',
            isDestructive: true,
          ),
          const PopupMenuDivider(),
          PopupMenuItem<String>(
            value: 'software_space',
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.flight_takeoff,
                  size: 20,
                  color: Color(0xFF0052CC),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Software space',
                      style: TextStyle(fontSize: 14, color: Color(0xFF172B4D)),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Team-managed',
                      style: TextStyle(fontSize: 12, color: Color(0xFF5E6C84)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  PopupMenuItem<String> _buildPopupMenuItem(
    String value,
    IconData icon,
    String text, {
    String? badgeText,
    bool showTrailingArrow = false,
    bool isDestructive = false,
  }) {
    final color = isDestructive
        ? const Color(0xFFDE350B)
        : const Color(0xFF42526E);
    final textColor = isDestructive
        ? const Color(0xFFDE350B)
        : const Color(0xFF172B4D);

    return PopupMenuItem<String>(
      value: value,
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 12),
          Text(text, style: TextStyle(fontSize: 14, color: textColor)),
          if (badgeText != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFF8777D9)),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text(
                badgeText,
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF403294),
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
          if (showTrailingArrow) ...[
            const Spacer(),
            const Icon(Icons.chevron_right, size: 20, color: Color(0xFF42526E)),
          ],
        ],
      ),
    );
  }

  Widget _buildTabs() {
    final tabs = {
      'Summary': Icons.summarize_outlined,
      'Timeline': Icons.timeline_outlined,
      'Backlog': Icons.view_list,
      'Graph': Icons.hub_outlined,
      'Board': Icons.dashboard_outlined,
      'Calendar': Icons.calendar_today_outlined,
      'List': Icons.list_alt,
      'Forms': Icons.assignment_outlined,
      'Development': Icons.code,
      'Code': Icons.integration_instructions,
    };

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          ...tabs.entries.map((e) => _buildTabItem(e.key, e.value)),
          TextButton(
            onPressed: () {},
            child: const Text(
              'More',
              style: TextStyle(color: Color(0xFF5E6C84)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem(String title, IconData icon) {
    bool isActive = activeTab == title;
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: () => onTabSelected(title),
        borderRadius: BorderRadius.circular(4),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFFDEEBFF) : Colors.transparent,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: isActive
                    ? const Color(0xFF0052CC)
                    : const Color(0xFF42526E),
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  color: isActive
                      ? const Color(0xFF0052CC)
                      : const Color(0xFF42526E),
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// 1. CLASS WRAPPER: Bọc Provider
// =============================================================================
class AddPeopleDialog extends StatelessWidget {
  final String? workspaceId;
  final String? workspaceName;

  const AddPeopleDialog({
    Key? key,
    required this.workspaceId,
    required this.workspaceName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => InviteViewModel(),
      child: _AddPeopleDialogContent(
        workspaceId: workspaceId,
        workspaceName: workspaceName,
      ),
    );
  }
}

// =============================================================================
// 2. CLASS CONTENT: Giao diện và Logic chính
// =============================================================================
class _AddPeopleDialogContent extends StatefulWidget {
  final String? workspaceId;
  final String? workspaceName;

  const _AddPeopleDialogContent({
    Key? key,
    required this.workspaceId,
    required this.workspaceName,
  }) : super(key: key);

  @override
  State<_AddPeopleDialogContent> createState() =>
      _AddPeopleDialogContentState();
}

class _AddPeopleDialogContentState extends State<_AddPeopleDialogContent> {
  final TextEditingController _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<InviteViewModel>();

    final safeWorkspaceName = widget.workspaceName ?? 'Workspace';
    final safeWorkspaceId = widget.workspaceId ?? '';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      elevation: 0,
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(4),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- HEADER ---
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Add people to $safeWorkspaceName',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF172B4D),
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.more_horiz,
                          color: Color(0xFF42526E),
                        ),
                        onPressed: () {},
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFF42526E)),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // --- INPUT EMAIL ---
              const Text(
                'Names or emails *',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF42526E),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF0052CC), width: 2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    ...vm.invitedMembers.map(
                      (email) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDEEBFF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              email,
                              style: const TextStyle(
                                color: Color(0xFF172B4D),
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () => vm.removeMember(email),
                              child: const Icon(
                                Icons.close,
                                size: 14,
                                color: Color(0xFF42526E),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 320,
                      child: TextField(
                        controller: _emailController,
                        decoration: const InputDecoration(
                          hintText: 'e.g., Maria, maria@company.com',
                          hintStyle: TextStyle(
                            color: Color(0xFF5E6C84),
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(vertical: 6),
                        ),
                        onSubmitted: (value) {
                          vm.addMember(value);
                          _emailController.clear();
                        },
                      ),
                    ),
                  ],
                ),
              ),

              if (vm.errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    vm.errorMessage!,
                    style: const TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ),

              const SizedBox(height: 16),
              const Text(
                'or add from',
                style: TextStyle(fontSize: 12, color: Color(0xFF5E6C84)),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildIntegrationButton('Google', Colors.red),
                  const SizedBox(width: 8),
                  _buildIntegrationButton('Slack', Colors.purple),
                  const SizedBox(width: 8),
                  _buildIntegrationButton('Microsoft', Colors.blue),
                ],
              ),

              const SizedBox(height: 16),

              const Text(
                'Role *',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF42526E),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                  borderRadius: BorderRadius.circular(4),
                  color: const Color(0xFFFAFBFC),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: vm.selectedRole,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down),
                    items: ['Administrator', 'Member', 'Viewer']
                        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                        .toList(),
                    onChanged: (val) => vm.setRole(val),
                  ),
                ),
              ),

              const SizedBox(height: 24),
              const Text(
                'This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.',
                style: TextStyle(fontSize: 11, color: Color(0xFF6B778C)),
              ),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        color: Color(0xFF172B4D),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: vm.isLoading
                        ? null
                        : () async {
                            final success = await vm.submitInvitations(
                              safeWorkspaceId,
                              currentInputEmail: _emailController.text,
                            );
                            if (success && mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Invitations sent successfully!',
                                  ),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0052CC),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    child: vm.isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Add',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIntegrationButton(String name, Color color) {
    return OutlinedButton.icon(
      onPressed: () {},
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF172B4D),
        side: BorderSide(color: Colors.grey.shade300),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      icon: Icon(Icons.circle, color: color, size: 16),
      label: Text(
        name,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      ),
    );
  }
}
