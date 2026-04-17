import 'package:flutter/material.dart';
import 'backlog_common.dart';
import '../../models/backlog/user_story_model.dart';
import '../../views/backlog/start_sprint_dialog.dart';

class BacklogSection extends StatefulWidget {
  final Function(String) onCreateStory;
  final List<UserStoryModel> backlogList;
  final String workspaceId; 
  final VoidCallback onSprintCreated; 

  const BacklogSection({
    Key? key,
    required this.onCreateStory,
    required this.backlogList,
    required this.workspaceId,
    required this.onSprintCreated,
  }) : super(key: key);

  @override
  State<BacklogSection> createState() => _BacklogSectionState();
}

class _BacklogSectionState extends State<BacklogSection> {
  bool _isCreating = false;
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleSubmit(String text) {
    if (text.trim().isEmpty) {
      setState(() => _isCreating = false);
      return;
    }
    widget.onCreateStory(text);
    _controller.clear();
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
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
      child: Column(
        children: [
          _buildHeader(widget.backlogList.length),
          if (widget.backlogList.isEmpty && !_isCreating)
            _buildEmptyState()
          else
            _buildBacklogList(),
          _buildCreateArea(),
        ],
      ),
    );
  }

  Widget _buildCreateArea() {
    return _isCreating ? _buildCreateInput() : _buildCreateButton();
  }

  Widget _buildCreateInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFEBECF0))),
        color: Color(0xFFFAFBFC),
      ),
      child: Row(
        children: [
          const Icon(Icons.add, size: 20, color: Color(0xFF5E6C84)),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              onSubmitted: _handleSubmit,
              decoration: const InputDecoration(
                hintText: 'Create issue (Press Enter to save)',
                hintStyle: TextStyle(color: Color(0xFF5E6C84), fontWeight: FontWeight.w500),
                border: InputBorder.none,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send, color: Color(0xFF0052CC), size: 20),
            onPressed: () => _handleSubmit(_controller.text),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.grey, size: 20),
            onPressed: () {
              setState(() {
                _isCreating = false;
                _controller.clear();
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCreateButton() {
    return InkWell(
      onTap: () {
        setState(() {
          _isCreating = true;
        });
        Future.delayed(Duration.zero, () {
          _focusNode.requestFocus();
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFFEBECF0))),
          color: Color(0xFFFAFBFC),
        ),
        child: Row(
          children: const [
            Icon(Icons.add, size: 20, color: Color(0xFF5E6C84)),
            SizedBox(width: 12),
            Text(
              'Create issue',
              style: TextStyle(color: Color(0xFF5E6C84), fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBacklogList() {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: widget.backlogList.length,
      separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFEBECF0)),
      itemBuilder: (context, index) {
        final story = widget.backlogList[index];
        
        return Draggable<String>(
          data: story.id, 
          
          feedback: Material(
            elevation: 4.0,
            borderRadius: BorderRadius.circular(4),
            color: Colors.transparent,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.85, 
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10)
                ]
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_box_outline_blank, size: 20, color: Color(0xFFDFE1E6)),
                  const SizedBox(width: 12),
                  Expanded(child: Text(story.storyText, style: const TextStyle(fontSize: 14, color: Color(0xFF172B4D)))),
                ],
              ),
            ),
          ),
          
          childWhenDragging: Opacity(
            opacity: 0.3,
            child: _buildStoryItem(story),
          ),
          
          child: _buildStoryItem(story),
        );
      },
    );
  }

  Widget _buildStoryItem(UserStoryModel story) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Icon(Icons.check_box_outline_blank, size: 20, color: Color(0xFFDFE1E6)),
          const SizedBox(width: 12),
          Expanded(child: Text(story.storyText, style: const TextStyle(fontSize: 14, color: Color(0xFF172B4D)))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFFDFE1E6), borderRadius: BorderRadius.circular(4)),
            child: Text(story.status, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      child: Column(
        children: [
          const Icon(Icons.inbox, size: 48, color: Color(0xFFDFE1E6)),
          const SizedBox(height: 16),
          const Text('Your backlog is empty.', style: TextStyle(fontSize: 14, color: Color(0xFF5E6C84))),
        ],
      ),
    );
  }

  Widget _buildHeader(int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFEBECF0))),
      ),
      child: Row(
        children: [
          const Icon(Icons.keyboard_arrow_down, size: 20, color: Color(0xFF42526E)),
          const SizedBox(width: 8),
          const Text('Backlog', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF172B4D))),
          const Spacer(),
          StatusBadge(count: count.toString(), bgColor: const Color(0xFFDFE1E6), textColor: const Color(0xFF42526E)),
          const SizedBox(width: 16),
          ElevatedButton(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => StartSprintDialog(
                  workspaceId: widget.workspaceId,
                  onSuccess: widget.onSprintCreated,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF4F5F7),
              foregroundColor: const Color(0xFF42526E),
              elevation: 0,
              side: const BorderSide(color: Color(0xFFDFE1E6)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: const Text('Create sprint', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}