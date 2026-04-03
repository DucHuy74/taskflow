import 'package:flutter/material.dart';
import '../../models/home/workspace_model.dart';
import '../../models/backlog/sprint_model.dart';
import '../../viewmodels/backlog/backlog_view_model.dart';
import '../../services/backlog/sprint_service.dart';
import '../../components/home/workspace_header.dart';
import '../../components/home/backlog_common.dart';
import '../../components/home/sprint_section.dart';
import '../../components/home/backlog_section.dart';
import '../../components/home/sprint_graph_screen.dart';

class WorkspaceBacklogView extends StatefulWidget {
  final WorkspaceModel workspace;

  const WorkspaceBacklogView({Key? key, required this.workspace})
    : super(key: key);

  @override
  State<WorkspaceBacklogView> createState() => _WorkspaceBacklogViewState();
}

class _WorkspaceBacklogViewState extends State<WorkspaceBacklogView> {
  final BacklogViewModel _viewModel = BacklogViewModel();
  final SprintService _sprintService = SprintService();

  final TextEditingController _sprintInputController = TextEditingController();
  final FocusNode _sprintInputFocusNode = FocusNode();

  String _activeTab = 'Backlog';

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
    if (text.isEmpty) return;
    final success = await _viewModel.createStory(widget.workspace.id, text);
    if (mounted) {
      if (success) {
        _sprintInputController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('User story created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to create user story'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _handleMoveStoryToSprint(String sprintId, String storyId) async {
    final success = await _sprintService.addStoryToSprint(
      sprintId: sprintId,
      userStoryId: storyId,
    );

    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Moved story to sprint successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(milliseconds: 700),
          ),
        );
      }
      _viewModel.fetchBacklog(widget.workspace.id);
      _viewModel.fetchSprints(widget.workspace.id);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to move story'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Widget hiển thị đồ thị (Dùng cho cả tab Graph và Calendar với Mock Data)
  Widget _buildGraphView() {
    return const SprintGraphScreen(
      sprintId: "mock_id",
      sprintName: "User Story Relationship (Mock)",
    );
  }

  // Widget hiển thị danh sách Backlog thông thường
  Widget _buildBacklogTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BacklogSearchBar(),
          const SizedBox(height: 24),
          SprintSection(
            controller: _sprintInputController,
            onCreateStory: _handleCreateStory,
            sprints: _viewModel.sprintList,
            onMoveStoryToSprint: _handleMoveStoryToSprint,
          ),
          const SizedBox(height: 24),
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

  // Hàm điều hướng hiển thị nội dung theo Tab
  Widget _buildMainContent() {
    switch (_activeTab) {
      case 'Graph':
      case 'Calendar':
        return _buildGraphView();
      case 'Backlog':
        return _buildBacklogTab();
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
                    // Refresh dữ liệu nếu chuyển về tab Backlog
                    if (tab == 'Backlog') {
                      _viewModel.fetchBacklog(widget.workspace.id);
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
            // Hiển thị vòng xoay loading khi ViewModel đang xử lý
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
