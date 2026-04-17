import 'package:flutter/material.dart';
import '../../viewmodels/backlog/sprint_view_model.dart';

class StartSprintDialog extends StatefulWidget {
  final String workspaceId;
  final VoidCallback onSuccess;

  const StartSprintDialog({
    Key? key,
    required this.workspaceId,
    required this.onSuccess,
  }) : super(key: key);

  @override
  State<StartSprintDialog> createState() => _StartSprintDialogState();
}

class _StartSprintDialogState extends State<StartSprintDialog> {
  final TextEditingController _nameController = TextEditingController();
  final SprintViewModel _viewModel = SprintViewModel();
  
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 14)); 

  @override
  void initState() {
    super.initState();
    _nameController.text = "Sprint 1";
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_startDate.isAfter(_endDate)) {
            _endDate = _startDate.add(const Duration(days: 14));
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  void _handleStart() async {
    if (_nameController.text.isEmpty) return;

    final success = await _viewModel.createSprint(
      workspaceId: widget.workspaceId,
      name: _nameController.text,
      startDate: _startDate,
      endDate: _endDate,
    );

    if (success && mounted) {
      Navigator.of(context).pop();
      widget.onSuccess();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sprint created successfully!'), backgroundColor: Colors.green),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to create sprint'), backgroundColor: Colors.red),
      );
    }
  }

  String _formatDateDisplay(DateTime date) {
    return "${date.day}/${date.month}/${date.year}";
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Start Sprint", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                )
              ],
            ),
            const SizedBox(height: 24),
            
            // Sprint Name
            const Text("Sprint name *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF42526E))),
            const SizedBox(height: 6),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
            ),
            const SizedBox(height: 16),
            
            // Duration & Dates Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Start date *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF42526E))),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () => _selectDate(context, true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(border: Border.all(color: Colors.grey), borderRadius: BorderRadius.circular(4)),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [Text(_formatDateDisplay(_startDate)), const Icon(Icons.calendar_today, size: 16)],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("End date *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF42526E))),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () => _selectDate(context, false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(border: Border.all(color: Colors.grey), borderRadius: BorderRadius.circular(4)),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [Text(_formatDateDisplay(_endDate)), const Icon(Icons.calendar_today, size: 16)],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            
            ListenableBuilder(
              listenable: _viewModel,
              builder: (context, child) {
                return Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text("Cancel"),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _viewModel.isLoading ? null : _handleStart,
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0052CC)),
                      child: _viewModel.isLoading 
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text("Start", style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                );
              }
            )
          ],
        ),
      ),
    );
  }
}