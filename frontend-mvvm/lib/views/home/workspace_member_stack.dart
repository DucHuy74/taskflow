import 'package:flutter/material.dart';
import '../../models/backlog/member_model.dart';
import '../../viewmodels/home/workspace_member_view_model.dart';

class WorkspaceMembersDialog extends StatefulWidget {
  final String workspaceId;
  final String workspaceName;

  const WorkspaceMembersDialog({
    Key? key,
    required this.workspaceId,
    required this.workspaceName,
  }) : super(key: key);

  @override
  State<WorkspaceMembersDialog> createState() => _WorkspaceMembersDialogState();
}

class _WorkspaceMembersDialogState extends State<WorkspaceMembersDialog> {
  final WorkspaceMemberViewModel _viewModel = WorkspaceMemberViewModel();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchMembers(widget.workspaceId);
    });
  }

  Color _getAvatarColor(String email) {
    final colors = [
      const Color(0xFF0052CC),
      const Color(0xFFDE350B),
      const Color(0xFF008DA6),
      const Color(0xFF403294),
      const Color(0xFFFF991F),
      const Color(0xFF36B37E),
    ];
    return colors[email.hashCode % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final safeWorkspaceName = widget.workspaceName.isNotEmpty
        ? widget.workspaceName
        : 'Workspace';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      elevation: 0,
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
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
                    'Members of $safeWorkspaceName',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF172B4D),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF42526E)),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1, color: Color(0xFFDFE1E6)),
              const SizedBox(height: 16),

              // --- CONTENT ---
              Expanded(
                child: ListenableBuilder(
                  listenable: _viewModel,
                  builder: (context, child) {
                    if (_viewModel.isLoading) {
                      return const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Color(0xFF0052CC),
                          ),
                        ),
                      );
                    }
                    if (_viewModel.members.isEmpty) {
                      return const Center(
                        child: Text(
                          'No members found.',
                          style: TextStyle(color: Color(0xFF5E6C84)),
                        ),
                      );
                    }
                    return ListView.separated(
                        shrinkWrap: true,
                        itemCount: _viewModel.members.length,
                        separatorBuilder: (context, index) =>
                            const Divider(height: 16, color: Color(0xFFEBECF0)),
                        itemBuilder: (context, index) {
                          final member = _viewModel.members[index];
                          final initial = member.email.isNotEmpty
                              ? member.email[0].toUpperCase()
                              : '?';

                          return Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: _getAvatarColor(member.email),
                                child: Text(
                                  initial,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  member.email,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF172B4D),
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDEEBFF),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: Text(
                                  member.role,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0052CC),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      );
                  }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WorkspaceMemberStack extends StatefulWidget {
  final String workspaceId;

  const WorkspaceMemberStack({Key? key, required this.workspaceId})
    : super(key: key);

  @override
  State<WorkspaceMemberStack> createState() => _WorkspaceMemberStackState();
}

class _WorkspaceMemberStackState extends State<WorkspaceMemberStack> {
  final WorkspaceMemberViewModel _viewModel = WorkspaceMemberViewModel();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchMembers(widget.workspaceId);
    });
  }

  Color _getAvatarColor(String email) {
    final colors = [
      const Color(0xFF0052CC),
      const Color(0xFFDE350B),
      const Color(0xFF008DA6),
      const Color(0xFF403294),
      const Color(0xFFFF991F),
      const Color(0xFF36B37E),
    ];
    return colors[email.hashCode % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, child) {
        if (_viewModel.isLoading) {
          return const SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          );
        }

        if (_viewModel.members.isEmpty) return const SizedBox.shrink();

        const int maxDisplay = 3;
        final int displayCount = _viewModel.members.length > maxDisplay
            ? maxDisplay
            : _viewModel.members.length;
        final int extraCount = _viewModel.members.length > maxDisplay
            ? _viewModel.members.length - maxDisplay
            : 0;

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (int i = 0; i < displayCount; i++)
              Align(
                widthFactor: 0.7,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: CircleAvatar(
                    radius: 14,
                    backgroundColor: _getAvatarColor(_viewModel.members[i].email),
                    child: Text(
                      _viewModel.members[i].email.isNotEmpty
                          ? _viewModel.members[i].email[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            if (extraCount > 0)
              Align(
                widthFactor: 0.7,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: CircleAvatar(
                    radius: 14,
                    backgroundColor: Colors.grey.shade300,
                    child: Text(
                      '+$extraCount',
                      style: const TextStyle(
                        color: Color(0xFF42526E),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      });
  }
}
