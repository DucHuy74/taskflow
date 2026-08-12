// lib/components/home/sprint_section.dart
import 'package:flutter/material.dart';
import '../../models/backlog/sprint_model.dart';
import '../../models/backlog/user_story_model.dart';
import '../../viewmodels/backlog/sprint_view_model.dart';

class SprintSection extends StatefulWidget {
  final TextEditingController controller;
  final Function(String) onCreateStory;
  final List<SprintModel> sprints;
  final Function(String sprintId, String storyId) onMoveStoryToSprint;
  final Function(String sprintId, String sprintName) onSprintStarted;

  const SprintSection({
    Key? key,
    required this.controller,
    required this.onCreateStory,
    required this.sprints,
    required this.onMoveStoryToSprint,
    required this.onSprintStarted,
  }) : super(key: key);

  @override
  State<SprintSection> createState() => _SprintSectionState();
}

class _SprintSectionState extends State<SprintSection> {
  bool _showCompletedSprints = false;

  @override
  Widget build(BuildContext context) {
    if (widget.sprints.isEmpty) {
      return _buildEmptySprintState();
    }

    List<SprintModel> activeSprints = [];
    List<SprintModel> todoSprints = [];
    List<SprintModel> doneSprints = [];

    for (var sprint in widget.sprints) {
      String status =
          sprint.status?.replaceAll('_', '').toUpperCase() ?? 'TODO';
      if (status == 'INPROGRESS' || status == 'ACTIVE') {
        activeSprints.add(sprint);
      } else if (status == 'DONE' || status == 'COMPLETED') {
        doneSprints.add(sprint);
      } else {
        todoSprints.add(sprint);
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // --- 1. NHÓM ACTIVE SPRINT ---
        if (activeSprints.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(bottom: 8.0, left: 4),
            child: Text(
              "ACTIVE SPRINT",
              style: TextStyle(
                color: Color(0xFF5E6C84),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...activeSprints.map(
            (sprint) => SprintContainer(
              sprint: sprint,
              isCompleted: false,
              onMoveStoryToSprint: widget.onMoveStoryToSprint,
              onSprintStarted: widget.onSprintStarted,
            ),
          ),
          const SizedBox(height: 16),
        ],

        // --- 2. NHÓM TODO SPRINTS ---
        if (todoSprints.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(bottom: 8.0, left: 4),
            child: Text(
              "PLANNED SPRINTS",
              style: TextStyle(
                color: Color(0xFF5E6C84),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...todoSprints.map(
            (sprint) => SprintContainer(
              sprint: sprint,
              isCompleted: false,
              onMoveStoryToSprint: widget.onMoveStoryToSprint,
              onSprintStarted: widget.onSprintStarted,
            ),
          ),
          const SizedBox(height: 16),
        ],

        // --- 3. NHÓM COMPLETED SPRINTS (COLLAPSED MẶC ĐỊNH) ---
        if (doneSprints.isNotEmpty) ...[
          GestureDetector(
            onTap: () =>
                setState(() => _showCompletedSprints = !_showCompletedSprints),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
              child: Row(
                children: [
                  Icon(
                    _showCompletedSprints
                        ? Icons.keyboard_arrow_down
                        : Icons.keyboard_arrow_right,
                    size: 20,
                    color: const Color(0xFF5E6C84),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    "COMPLETED SPRINTS (${doneSprints.length})",
                    style: const TextStyle(
                      color: Color(0xFF5E6C84),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_showCompletedSprints) ...[
            const SizedBox(height: 8),
            ...doneSprints.map(
              (sprint) => SprintContainer(
                sprint: sprint,
                isCompleted: true, 
                onMoveStoryToSprint: widget.onMoveStoryToSprint,
                onSprintStarted: widget.onSprintStarted,
              ),
            ),
          ],
        ],
      ],
    );
  }

  Widget _buildEmptySprintState() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFFDEEBFF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.assignment_outlined,
                size: 32,
                color: Color(0xFF0052CC),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Plan your sprint',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF172B4D),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Drag work items from the Backlog section or create new ones.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Color(0xFF5E6C84)),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// SPRINT CONTAINER (Chứa giao diện của 1 Sprint cụ thể)
// =============================================================================
class SprintContainer extends StatefulWidget {
  final SprintModel sprint;
  final bool isCompleted;
  final Function(String sprintId, String storyId) onMoveStoryToSprint;
  final Function(String sprintId, String sprintName) onSprintStarted;

  const SprintContainer({
    Key? key,
    required this.sprint,
    required this.isCompleted,
    required this.onMoveStoryToSprint,
    required this.onSprintStarted,
  }) : super(key: key);

  @override
  State<SprintContainer> createState() => _SprintContainerState();
}

class _SprintContainerState extends State<SprintContainer> {
  final SprintViewModel _viewModel = SprintViewModel();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _viewModel.fetchStoriesInSprint(widget.sprint.id);
    });
  }

  @override
  void didUpdateWidget(covariant SprintContainer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sprint != widget.sprint) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _viewModel.fetchStoriesInSprint(widget.sprint.id);
      });
    }
  }

  void _handleStartSprint() async {
    bool success = await _viewModel.startSprint(widget.sprint.id);

    if (mounted) {
      if (success) {
        widget.onSprintStarted(widget.sprint.id, widget.sprint.name);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to start sprint. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return "";
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return "${date.day} ${months[date.month - 1]}";
    } catch (e) {
      return "";
    }
  }

  Widget _buildHeader(String dateRange) {
    String currentStatus =
        widget.sprint.status?.replaceAll('_', '').toUpperCase() ?? '';
    bool isSprintActive =
        currentStatus == 'INPROGRESS' || currentStatus == 'ACTIVE';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Color(0xFFFAFBFC),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(8),
          topRight: Radius.circular(8),
        ),
        border: Border(bottom: BorderSide(color: Color(0xFFEBECF0))),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.view_week_outlined,
            size: 18,
            color: Color(0xFF42526E),
          ),
          const SizedBox(width: 8),

          Row(
            children: [
              Text(
                widget.sprint.name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF172B4D),
                ),
              ),

              if (isSprintActive) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Text(
                    'IN PROGRESS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ),
              ],

              if (widget.isCompleted) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Text(
                    'DONE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.green.shade700,
                    ),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(width: 12),
          if (dateRange.isNotEmpty)
            Text(
              dateRange,
              style: const TextStyle(fontSize: 13, color: Color(0xFF5E6C84)),
            ),
          const Spacer(),

          // LOGIC ẨN/HIỆN NÚT BẤM
          if (!widget.isCompleted)
            ElevatedButton(
              onPressed: isSprintActive
                  ? () =>
                        widget.onSprintStarted(
                          widget.sprint.id,
                          widget.sprint.name,
                        ) 
                  : (_viewModel.isLoading
                        ? null
                        : _handleStartSprint), 
              style: ElevatedButton.styleFrom(
                backgroundColor: isSprintActive
                    ? const Color(0xFF0052CC)
                    : const Color(0xFFF4F5F7),
                foregroundColor: isSprintActive
                    ? Colors.white
                    : const Color(0xFF42526E),
                elevation: 0,
                side: BorderSide(
                  color: isSprintActive
                      ? Colors.transparent
                      : const Color(0xFFDFE1E6),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 0,
                ),
                minimumSize: const Size(0, 32),
              ),
              child: _viewModel.isLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      isSprintActive ? 'View Graph' : 'Start sprint',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),

          IconButton(
            icon: const Icon(
              Icons.more_horiz,
              size: 20,
              color: Color(0xFF42526E),
            ),
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    String dateRange = "";
    if (widget.sprint.startDate != null && widget.sprint.endDate != null) {
      dateRange =
          "${_formatDate(widget.sprint.startDate)} - ${_formatDate(widget.sprint.endDate)}";
    }

    return DragTarget<String>(
      onWillAccept: (data) => data != null && !widget.isCompleted,
      onAccept: (storyId) {
        widget.onMoveStoryToSprint(widget.sprint.id, storyId);
      },
      builder: (context, candidateData, rejectedData) {
        final isHovering = candidateData.isNotEmpty && !widget.isCompleted;
        return Container(
          margin: const EdgeInsets.only(bottom: 24),
          decoration: BoxDecoration(
            color: isHovering ? const Color(0xFFE3FCEF) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: isHovering
                ? Border.all(color: Colors.green, width: 2)
                : Border.all(color: Colors.transparent),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.06),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildHeader(dateRange),
              if (!widget.isCompleted) ...[
                ListenableBuilder(
                  listenable: _viewModel,
                  builder: (context, child) {
                    if (_viewModel.isLoading && _viewModel.stories.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.all(20),
                        child: Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      );
                    }
                    final stories = _viewModel.stories;
                    if (stories.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(20),
                        alignment: Alignment.center,
                        child: const Text(
                          "Plan a sprint by dragging work items into it.",
                          style: TextStyle(
                            color: Color(0xFFC1C7D0),
                            fontStyle: FontStyle.italic,
                            fontSize: 13,
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: stories.length,
                      separatorBuilder: (context, index) =>
                          const Divider(height: 1, color: Color(0xFFEBECF0)),
                      itemBuilder: (context, index) {
                        final story = stories[index];
                        return Draggable<String>(
                          data: story.id,
                          feedback: Material(
                            elevation: 4,
                            borderRadius: BorderRadius.circular(4),
                            child: Container(
                              width: 300,
                              padding: const EdgeInsets.all(12),
                              color: Colors.white,
                              child: Text(story.storyText),
                            ),
                          ),
                          childWhenDragging: Opacity(
                            opacity: 0.3,
                            child: _buildSprintTaskItem(story),
                          ),
                          child: _buildSprintTaskItem(story),
                        );
                      },
                    );
                  },
                ),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    vertical: 8,
                    horizontal: 16,
                  ),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFAFBFC),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                  ),
                  child: const Icon(
                    Icons.add,
                    color: Colors.transparent,
                    size: 20,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildSprintTaskItem(UserStoryModel story) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          const Icon(
            Icons.check_box_outline_blank,
            size: 18,
            color: Color(0xFFDFE1E6),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              story.storyText,
              style: const TextStyle(fontSize: 14, color: Color(0xFF172B4D)),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFDFE1E6),
              borderRadius: BorderRadius.circular(3),
            ),
            child: Text(
              story.status.toUpperCase(),
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Color(0xFF42526E),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
