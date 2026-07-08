import 'package:flutter/material.dart';
import '../../models/home/workspace_model.dart';
import '../../viewmodels/backlog/backlog_view_model.dart';

class SummaryView extends StatelessWidget {
  final WorkspaceModel workspace;
  final BacklogViewModel viewModel;

  const SummaryView({
    Key? key,
    required this.workspace,
    required this.viewModel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final totalSprints = viewModel.sprintList.length;
    final activeSprints = viewModel.sprintList
        .where((s) => s.status == 'Active' || s.status == 'INPROGRESS')
        .length;
    final totalStories = viewModel.backlogList.length;

    // Tính toán số lượng stories theo trạng thái (chỉ lấy trong backlog list)
    final doneStories = viewModel.backlogList
        .where((s) => s.status.toLowerCase() == 'done')
        .length;
    final inProgressStories = viewModel.backlogList
        .where((s) => s.status.toLowerCase() == 'in progress')
        .length;
    final todoStories = totalStories - doneStories - inProgressStories;

    double progress = totalStories == 0 ? 0 : doneStories / totalStories;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFF0052CC),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.analytics_outlined,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Project Summary",
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF172B4D),
                      ),
                    ),
                    Text(
                      "Tổng quan về không gian làm việc: ${workspace.name}",
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF5E6C84),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Top Cards Row
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 600) {
                return Column(
                  children: [
                    _buildStatCard(
                      title: "Total Sprints",
                      value: totalSprints.toString(),
                      icon: Icons.run_circle_outlined,
                      color: Colors.purple,
                    ),
                    const SizedBox(height: 16),
                    _buildStatCard(
                      title: "Active Sprints",
                      value: activeSprints.toString(),
                      icon: Icons.directions_run,
                      color: Colors.green,
                    ),
                    const SizedBox(height: 16),
                    _buildStatCard(
                      title: "Total Userstories",
                      value: totalStories.toString(),
                      icon: Icons.list_alt,
                      color: Colors.blue,
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      title: "Total Sprints",
                      value: totalSprints.toString(),
                      icon: Icons.run_circle_outlined,
                      color: Colors.purple,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: _buildStatCard(
                      title: "Active Sprints",
                      value: activeSprints.toString(),
                      icon: Icons.directions_run,
                      color: Colors.green,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: _buildStatCard(
                      title: "Total Userstories",
                      value: totalStories.toString(),
                      icon: Icons.list_alt,
                      color: Colors.blue,
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 32),

          // Progress Section
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Tiến độ",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF172B4D),
                  ),
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 12,
                    backgroundColor: const Color(0xFFDFE1E6),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Colors.green,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  alignment: WrapAlignment.spaceBetween,
                  children: [
                    _buildProgressLegend(
                      "To Do",
                      todoStories,
                      const Color(0xFFDFE1E6),
                    ),
                    _buildProgressLegend(
                      "In Progress",
                      inProgressStories,
                      Colors.blue,
                    ),
                    _buildProgressLegend("Done", doneStories, Colors.green),
                    Text(
                      "${(progress * 100).toStringAsFixed(1)}% Hoàn thành",
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
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

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border(bottom: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF5E6C84),
                ),
              ),
              Icon(icon, color: color.withOpacity(0.7)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF172B4D),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressLegend(String label, int count, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(
          "$label ($count)",
          style: const TextStyle(fontSize: 14, color: Color(0xFF5E6C84)),
        ),
      ],
    );
  }
}
