import 'package:flutter/material.dart';
import '../../models/home/workspace_model.dart';

class TaskFlowSidebar extends StatelessWidget {
  final String selectedMenu;
  final Function(String) onMenuSelected;
  final VoidCallback onCreate;
  final List<WorkspaceModel> workspaces;

  const TaskFlowSidebar({
    Key? key,
    required this.selectedMenu,
    required this.onMenuSelected,
    required this.onCreate,
    this.workspaces = const [],
  }) : super(key: key);

  String _getInitials(String name) {
    if (name.trim().isEmpty) return "";
    return name.trim()[0].toUpperCase();
  }

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

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDarkMode ? const Color(0xFF1D2125) : const Color(0xFFFAFBFC);
    final borderColor = isDarkMode ? const Color(0xFF38414A) : Colors.grey.shade200;
    final sectionTitleColor = isDarkMode ? const Color(0xFF8C9BAB) : const Color(0xFF5E6C84);

    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(right: BorderSide(color: borderColor)),
      ),
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          _buildMenuItem('For you', Icons.person_outline, true, isDarkMode: isDarkMode),
          _buildMenuItem('Recent', Icons.access_time, true, isDarkMode: isDarkMode),
          _buildMenuItem('Starred', Icons.star_border, true, isDarkMode: isDarkMode),
          _buildMenuItem('Apps', Icons.apps, true, isDarkMode: isDarkMode),
          _buildMenuItem('Plans', Icons.calendar_today_outlined, true, isDarkMode: isDarkMode),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Divider(height: 1, color: borderColor),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Spaces',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: sectionTitleColor,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.add, size: 18, color: sectionTitleColor),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: onCreate,
                ),
              ],
            ),
          ),

          if (workspaces.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Text(
                "No workspaces found",
                style: TextStyle(
                  fontSize: 13,
                  color: isDarkMode ? const Color(0xFF8C9BAB) : Colors.grey,
                  fontStyle: FontStyle.italic,
                ),
              ),
            )
          else
            ...workspaces.map((ws) => _buildWorkspaceItem(ws, isDarkMode)).toList(),

          _buildMenuItem(
            'More spaces',
            Icons.chevron_right,
            true,
            indent: true,
            isDarkMode: isDarkMode,
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Divider(height: 1, color: borderColor),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Recommended',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: sectionTitleColor,
              ),
            ),
          ),
          _buildMenuItem(
            'Create a roadmap',
            Icons.timeline,
            true,
            badge: 'TRY',
            indent: true,
            isDarkMode: isDarkMode,
          ),
          _buildMenuItem('Filters', Icons.filter_list, true, indent: true, isDarkMode: isDarkMode),
          _buildMenuItem('Dashboards', Icons.dashboard, true, indent: true, isDarkMode: isDarkMode),
          _buildMenuItem(
            'Operations',
            Icons.build_outlined,
            true,
            indent: true,
            isDarkMode: isDarkMode,
          ),
          _buildMenuItem('Customers', Icons.people_outline, true, indent: true, isDarkMode: isDarkMode),
          _buildMenuItem(
            'Customer experiences',
            Icons.headset_mic_outlined,
            true,
            indent: true,
            isDarkMode: isDarkMode,
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Divider(height: 1, color: borderColor),
          ),

          _buildMenuItem(
            'Assets',
            Icons.extension_outlined,
            true,
            external: true,
            indent: true,
            isDarkMode: isDarkMode,
          ),
          _buildMenuItem(
            'Teams',
            Icons.groups_outlined,
            true,
            external: true,
            indent: true,
            isDarkMode: isDarkMode,
          ),
          _buildMenuItem(
            'Give feedback on the new...',
            Icons.feedback_outlined,
            true,
            indent: true,
            isDarkMode: isDarkMode,
          ),
        ],
      ),
    );
  }

  Widget _buildWorkspaceItem(WorkspaceModel ws, bool isDarkMode) {
    final isSelected = selectedMenu == ws.name; 
    
    final selectedColor = isDarkMode ? const Color(0xFF579DFF) : const Color(0xFF0052CC);
    final unselectedTextColor = isDarkMode ? const Color(0xFFB6C2CF) : const Color(0xFF172B4D);
    final selectedTileBg = isDarkMode ? const Color(0xFF1C2B41) : const Color(0xFFDEEBFF);

    return Container(
      margin: const EdgeInsets.only(left: 12),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.only(left: 0, right: 12),
        leading: Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: _getAvatarColor(ws.name),
            borderRadius: BorderRadius.circular(4),
          ),
          alignment: Alignment.center,
          child: Text(
            _getInitials(ws.name),
            style: const TextStyle(
              color: Colors.white, // Avatar text luôn trắng cho nổi
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          ws.name,
          style: TextStyle(
            fontSize: 14,
            color: isSelected ? selectedColor : unselectedTextColor,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        selected: isSelected,
        selectedTileColor: selectedTileBg,
        onTap: () => onMenuSelected(ws.name),
      ),
    );
  }

  Widget _buildMenuItem(
    String title,
    IconData? icon,
    bool showText, {
    bool indent = false,
    String? badge,
    bool external = false,
    required bool isDarkMode, // Bắt buộc truyền vào
  }) {
    final isSelected = selectedMenu == title;
    
    final selectedColor = isDarkMode ? const Color(0xFF579DFF) : const Color(0xFF0052CC);
    final unselectedIconColor = isDarkMode ? const Color(0xFF8C9BAB) : const Color(0xFF5E6C84);
    final unselectedTextColor = isDarkMode ? const Color(0xFFB6C2CF) : const Color(0xFF172B4D);
    final selectedTileBg = isDarkMode ? const Color(0xFF1C2B41) : const Color(0xFFDEEBFF);

    return Container(
      margin: EdgeInsets.only(left: indent ? 24 : 0),
      child: ListTile(
        dense: true,
        leading: icon != null
            ? Icon(
                icon,
                size: 20,
                color: isSelected ? selectedColor : unselectedIconColor,
              )
            : null,
        title: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  color: isSelected ? selectedColor : unselectedTextColor,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: selectedColor, // Nền badge thay đổi theo theme
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Text(
                  badge,
                  style: TextStyle(
                    color: isDarkMode ? const Color(0xFF1D2125) : Colors.white, // Chữ trong badge
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            if (external)
               Icon(Icons.open_in_new, size: 14, color: unselectedIconColor),
          ],
        ),
        trailing: title == 'Recent' || title == 'Starred'
            ? Icon(
                Icons.chevron_right,
                size: 18,
                color: unselectedIconColor,
              )
            : null,
        selected: isSelected,
        selectedTileColor: selectedTileBg,
        onTap: () => onMenuSelected(title),
      ),
    );
  }
}