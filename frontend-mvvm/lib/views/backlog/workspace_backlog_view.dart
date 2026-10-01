// lib/views/backlog/workspace_backlog_view.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import '../../models/home/workspace_model.dart';
import '../../models/backlog/sprint_model.dart';
import '../../viewmodels/backlog/backlog_view_model.dart';
import '../../views/home/workspace_header.dart';
import 'sprint_section.dart';
import '../../components/home/backlog_section.dart';
import 'backlog_graph_screen.dart';
import 'sprint_graph_screen.dart';
import 'summary_view.dart';

class WorkspaceBacklogView extends StatefulWidget {
  final WorkspaceModel workspace;

  const WorkspaceBacklogView({Key? key, required this.workspace})
    : super(key: key);

  @override
  State<WorkspaceBacklogView> createState() => _WorkspaceBacklogViewState();
}

class _WorkspaceBacklogViewState extends State<WorkspaceBacklogView> {
  final BacklogViewModel _viewModel = BacklogViewModel();

  final TextEditingController _sprintInputController = TextEditingController();
  final FocusNode _sprintInputFocusNode = FocusNode();

  String _activeTab = 'Backlog';
  bool _isGraphHovered = false;

  String? _activeSprintId;
  String? _activeSprintName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchBacklog(widget.workspace.id);
      _viewModel.fetchSprints(widget.workspace.id);
    });
  }

  @override
  void dispose() {
    _sprintInputController.dispose();
    _sprintInputFocusNode.dispose();
    super.dispose();
  }

  void _onSprintCreated() {
    _viewModel.fetchSprints(widget.workspace.id);
  }

  void _handleCreateStory(String text) async {
    if (text.trim().isEmpty) return;

    List<String> validStories = [];

    // Thử parse nếu nội dung là một mảng JSON từ Postman
    try {
      final parsed = jsonDecode(text.trim());
      if (parsed is List) {
        for (var item in parsed) {
          if (item is Map && item.containsKey('storyText')) {
            String st = item['storyText'].toString().trim();
            if (st.isNotEmpty) validStories.add(st);
          }
        }
      }
    } catch (_) {
      // Bỏ qua lỗi parse, tiếp tục với cách tách dòng bình thường
    }

    // Nếu không phải JSON hợp lệ hoặc mảng trống, fallback về cách chia dòng (newline hoặc comma)
    if (validStories.isEmpty) {
      List<String> rawStories = text.split(RegExp(r'\n+'));
      if (rawStories.length == 1 && text.contains(', As a')) {
        rawStories = text.split(RegExp(r',\s*(?=As a)'));
      }
      for (String raw in rawStories) {
        String storyText = raw.trim();
        if (storyText.isNotEmpty) {
          validStories.add(storyText);
        }
      }
    }

    if (validStories.isEmpty) return;

    // Gửi toàn bộ story texts xuống backend trong 1 request
    final allSuccess = await _viewModel.createMultipleStories(
      widget.workspace.id,
      validStories,
    );

    if (mounted) {
      if (allSuccess) {
        _sprintInputController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã tạo User Story thành công!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Có lỗi khi tạo một số User Story'),
            backgroundColor: Colors.red,
          ),
        );
      }
      _viewModel.fetchBacklog(widget.workspace.id);
    }
  }

  void _handleMoveStoryToSprint(String sprintId, String storyId) async {
    final success = await _viewModel.addStoryToSprint(
      sprintId: sprintId,
      userStoryId: storyId,
    );
    if (success) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Moved story to sprint!'),
            backgroundColor: Colors.green,
            duration: Duration(milliseconds: 700),
          ),
        );
      _viewModel.fetchBacklog(widget.workspace.id);
      _viewModel.fetchSprints(widget.workspace.id);
    } else {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to move'),
            backgroundColor: Colors.red,
          ),
        );
    }
  }

  Widget _buildBacklogTab() {
    return SingleChildScrollView(
      physics: _isGraphHovered
          ? const NeverScrollableScrollPhysics()
          : const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(left: 24, right: 24, bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          MouseRegion(
            onEnter: (_) => setState(() => _isGraphHovered = true),
            onExit: (_) => setState(() => _isGraphHovered = false),
            child: Container(
              height: 500,
              clipBehavior: Clip.hardEdge,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: BacklogGraphScreen(
                workspaceId: widget.workspace.id,
                backlogId: widget.workspace.backlog?.id ?? "",
                backlogName: widget.workspace.backlog?.name ?? "",
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (_viewModel.sprintList.isNotEmpty) ...[
            SprintSection(
              controller: _sprintInputController,
              onCreateStory: _handleCreateStory,
              sprints: _viewModel.sprintList,
              onMoveStoryToSprint: _handleMoveStoryToSprint,
              onSprintStarted: (sprintId, sprintName) {
                setState(() {
                  _activeSprintId = sprintId;
                  _activeSprintName = sprintName;
                  _activeTab = 'Graph';
                });
              },
            ),
            const SizedBox(height: 24),
          ],
          BacklogSection(
            onCreateStory: _handleCreateStory,
            backlogList: _viewModel.backlogList,
            workspaceId: widget.workspace.id,
            onSprintCreated: _onSprintCreated,
          ),
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    switch (_activeTab) {
      case 'Backlog':
        return _buildBacklogTab();

      case 'Graph':
        // TỰ ĐỘNG TÌM SPRINT ĐANG INPROGRESS (Nếu lỡ F5 web mất _activeSprintId)
        SprintModel? autoDetectedSprint;
        try {
          autoDetectedSprint = _viewModel.sprintList.firstWhere(
            (s) => s.status?.replaceAll('_', '').toUpperCase() == 'INPROGRESS',
          );
        } catch (e) {
          autoDetectedSprint = null;
        }

        final displaySprintId = _activeSprintId ?? autoDetectedSprint?.id;
        final displaySprintName = _activeSprintName ?? autoDetectedSprint?.name;

        if (displaySprintId != null && displaySprintName != null) {
          // GỌI GRAPHQL SPRINT GRAPH (sprint_graph_screen.dart)
          return SprintGraphScreen(
            sprintId: displaySprintId,
            sprintName: displaySprintName,
          );
        } else {
          return const Center(
            child: Text(
              'Chưa có Sprint nào đang In Progress.\nVui lòng Start một Sprint từ tab Backlog để xem đồ thị.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 16),
            ),
          );
        }

      case 'Summary':
        return SummaryView(workspace: widget.workspace, viewModel: _viewModel);

      default:
        return Center(
          child: Text(
            "Content for $_activeTab is under development",
            style: const TextStyle(color: Colors.grey),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _viewModel,
      builder: (context, child) {
        return Stack(
          children: [
            Column(
              children: [
                WorkspaceHeader(
                  workspace: widget.workspace,
                  activeTab: _activeTab,
                  onTabSelected: (tab) {
                    setState(() {
                      _activeTab = tab;
                    });
                    if (tab == 'Backlog') {
                      _viewModel.fetchBacklog(widget.workspace.id);
                      _viewModel.fetchSprints(
                        widget.workspace.id,
                      ); // Nên fetch lại sprint list luôn
                    }
                  },
                ),
                Expanded(
                  child: Container(
                    color: const Color(0xFFF4F5F7),
                    child: _buildMainContent(),
                  ),
                ),
              ],
            ),
            if (_viewModel.isLoading)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Color(0xFF0052CC),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
