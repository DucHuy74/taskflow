import 'package:flutter/material.dart';

import '../../components/home/taskflow_appbar.dart';
import '../../components/home/taskflow_drawer.dart';
import '../../components/home/taskflow_sidebar.dart';
import '../../components/home/taskflow_main_content.dart';

import '../../models/home/workspace_model.dart';
import '../../viewmodels/home/home_view_model.dart';

import 'space_templates.dart';
import '../backlog/workspace_backlog_view.dart';

class HomePage extends StatefulWidget {
  final String? newWorkspaceName;

  const HomePage({Key? key, this.newWorkspaceName}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _selectedMenu = 'For you';

  final HomeViewModel _viewModel = HomeViewModel();

  @override
  void initState() {
    super.initState();
    if (widget.newWorkspaceName != null) {
      _selectedMenu = widget.newWorkspaceName!;
    }
    _viewModel.fetchWorkspaces();
  }

  // _loadWorkspaces function deleted due to MVVM refactor

  bool _isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 768;

  void _onMenuSelected(String menu) {
    setState(() => _selectedMenu = menu);

    // Nếu đang ở mobile và mở drawer thì đóng lại sau khi chọn
    if (_isMobile(context) && Scaffold.of(context).isDrawerOpen) {
      Navigator.pop(context);
    }
  }

  void _showCreateDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SpaceTemplatesPage()),
    );
  }

  Widget _buildMainContent() {
    WorkspaceModel? selectedWorkspace;
    try {
      selectedWorkspace = _viewModel.workspaces.firstWhere(
        (ws) => ws.name == _selectedMenu,
      );
    } catch (e) {
      selectedWorkspace = null;
    }

    if (selectedWorkspace != null) {
      return WorkspaceBacklogView(
        key: ValueKey(selectedWorkspace.id),
        workspace: selectedWorkspace,
      );
    }

    return TaskFlowMainContent(onCreate: _showCreateDialog);
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = _isMobile(context);

    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, child) {
        return Scaffold(
          backgroundColor: isDarkMode ? const Color(0xFF22272B) : Colors.white,

          appBar: TaskFlowAppBar(isMobile: isMobile, onCreate: _showCreateDialog),

          drawer: isMobile
              ? TaskFlowDrawer(
                  selectedMenu: _selectedMenu,
                  onMenuSelected: _onMenuSelected,
                )
              : null,

          body: Row(
            children: [
              if (!isMobile)
                TaskFlowSidebar(
                  selectedMenu: _selectedMenu,
                  onMenuSelected: _onMenuSelected,
                  onCreate: _showCreateDialog,
                  workspaces: _viewModel.workspaces,
                ),

              Expanded(child: _buildMainContent()),
            ],
          ),
        );
      },
    );
  }
}
