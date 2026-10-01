import 'package:flutter/material.dart';
import '../../models/home/workspace_model.dart';

class TaskFlowDrawer extends StatelessWidget {
  final String selectedMenu;
  final Function(String) onMenuSelected;
  final List<WorkspaceModel> workspaces;

  const TaskFlowDrawer({
    Key? key,
    required this.selectedMenu,
    required this.onMenuSelected,
    required this.workspaces,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: isDarkMode ? const Color(0xFF1D2125) : Colors.white,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: isDarkMode
                  ? const Color(0xFF22272B)
                  : const Color(0xFF0052CC),
              border: Border(
                bottom: BorderSide(
                  color: isDarkMode
                      ? const Color(0xFF38414A)
                      : Colors.transparent,
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TaskFlow',
                  style: TextStyle(
                    color: isDarkMode ? const Color(0xFFB6C2CF) : Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Project Management',
                  style: TextStyle(
                    color: isDarkMode
                        ? const Color(0xFF8C9BAB)
                        : Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          _buildMenuItem('For you', Icons.person_outline, isDarkMode),
          _buildMenuItem('Recent', Icons.access_time, isDarkMode),
          _buildMenuItem('Starred', Icons.star_border, isDarkMode),
          _buildMenuItem('Apps', Icons.apps, isDarkMode),
          _buildMenuItem('Plans', Icons.calendar_today_outlined, isDarkMode),
          Divider(
            color: isDarkMode ? const Color(0xFF38414A) : Colors.grey.shade200,
          ),
          _buildMenuItem('Spaces', Icons.dashboard_outlined, isDarkMode),

          if (workspaces.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'No workspaces found',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
            )
          else
            ...workspaces
                .map((w) => _buildWorkspaceItem(w, isDarkMode))
                .toList(),

          const SizedBox(height: 8),
          _buildMenuItem('Filters', Icons.filter_list, isDarkMode),
          _buildMenuItem('Dashboards', Icons.dashboard, isDarkMode),
        ],
      ),
    );
  }

  Widget _buildMenuItem(String title, IconData icon, bool isDarkMode) {
    final isSelected = selectedMenu == title;

    final selectedColor = isDarkMode
        ? const Color(0xFF579DFF)
        : const Color(0xFF0052CC);
    final unselectedIconColor = isDarkMode
        ? const Color(0xFF8C9BAB)
        : const Color(0xFF5E6C84);
    final unselectedTextColor = isDarkMode
        ? const Color(0xFFB6C2CF)
        : const Color(0xFF172B4D);
    final selectedTileBg = isDarkMode
        ? const Color(0xFF1C2B41)
        : const Color(0xFFDEEBFF);

    return ListTile(
      leading: Icon(
        icon,
        size: 20,
        color: isSelected ? selectedColor : unselectedIconColor,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          color: isSelected ? selectedColor : unselectedTextColor,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
      selected: isSelected,
      selectedTileColor: selectedTileBg,
      onTap: () => onMenuSelected(title),
    );
  }

  Widget _buildWorkspaceItem(WorkspaceModel workspace, bool isDarkMode) {
    final isSelected = selectedMenu == workspace.name;
    final selectedColor = isDarkMode
        ? const Color(0xFF579DFF)
        : const Color(0xFF0052CC);
    final unselectedTextColor = isDarkMode
        ? const Color(0xFFB6C2CF)
        : const Color(0xFF172B4D);
    final selectedTileBg = isDarkMode
        ? const Color(0xFF1C2B41)
        : const Color(0xFFDEEBFF);

    return ListTile(
      leading: Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: const Color(0xFFFF5630),
          borderRadius: BorderRadius.circular(4),
        ),
        alignment: Alignment.center,
        child: Text(
          workspace.name.substring(0, 1).toUpperCase(),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      title: Text(
        workspace.name,
        style: TextStyle(
          fontSize: 14,
          color: isSelected ? selectedColor : unselectedTextColor,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      selected: isSelected,
      selectedTileColor: selectedTileBg,
      onTap: () => onMenuSelected(workspace.name),
    );
  }
}
