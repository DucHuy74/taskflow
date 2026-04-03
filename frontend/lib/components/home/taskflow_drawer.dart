import 'package:flutter/material.dart';

class TaskFlowDrawer extends StatelessWidget {
  final String selectedMenu;
  final Function(String) onMenuSelected;

  const TaskFlowDrawer({
    Key? key,
    required this.selectedMenu,
    required this.onMenuSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: Color(0xFF0052CC)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'TaskFlow',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Project Management',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
          _buildMenuItem('For you', Icons.person_outline),
          _buildMenuItem('Recent', Icons.access_time),
          _buildMenuItem('Starred', Icons.star_border),
          _buildMenuItem('Apps', Icons.apps),
          _buildMenuItem('Plans', Icons.calendar_today_outlined),
          const Divider(),
          _buildMenuItem('Spaces', Icons.dashboard_outlined),
          _buildMenuItem('Filters', Icons.filter_list),
          _buildMenuItem('Dashboards', Icons.dashboard),
        ],
      ),
    );
  }

  Widget _buildMenuItem(String title, IconData icon) {
    final isSelected = selectedMenu == title;
    return ListTile(
      leading: Icon(
        icon,
        size: 20,
        color: isSelected ? const Color(0xFF0052CC) : const Color(0xFF5E6C84),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          color: isSelected ? const Color(0xFF0052CC) : const Color(0xFF172B4D),
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
      selected: isSelected,
      selectedTileColor: const Color(0xFFDEEBFF),
      onTap: () => onMenuSelected(title),
    );
  }
}
