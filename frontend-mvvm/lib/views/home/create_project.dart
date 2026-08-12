import 'package:flutter/material.dart';
import '../../viewmodels/home/create_project_view_model.dart';
import 'invite_to_project_page.dart';

class CreateProjectPage extends StatefulWidget {
  final Map<String, dynamic> selectedTemplate;

  const CreateProjectPage({Key? key, required this.selectedTemplate})
    : super(key: key);

  @override
  State<CreateProjectPage> createState() => _CreateProjectPageState();
}

class _CreateProjectPageState extends State<CreateProjectPage> {
  final _viewModel = CreateProjectViewModel();
  final _nameController = TextEditingController();

  String _selectedManagement = 'Team-managed';
  String _selectedAccess = 'Open';

  bool _isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 1200;

  @override
  void dispose() {
    _nameController.dispose();
    _viewModel.dispose();
    super.dispose();
  }

  // Hàm xử lý sự kiện bấm nút
  Future<void> _onNextPressed() async {
    // Validate UI đơn giản
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a project name'),
          backgroundColor: Color(0xFFDE350B),
        ),
      );
      return;
    }

    // Gọi ViewModel
    final response = await _viewModel.createProject(
      name: _nameController.text.trim(),
      managementUiValue: _selectedManagement,
      accessUiValue: _selectedAccess,
    );

    if (!mounted) return;

    if (response != null && response.code == 1000) {
      final newWorkspaceId = response.result?.id ?? '';

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => InviteToProjectPage(
            workspaceId: newWorkspaceId,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            response?.message ??
                'Failed to create workspace. Please check connection.',
          ),
          backgroundColor: const Color(0xFFDE350B),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, child) {
        final isMobile = _isMobile(context);
        final isLoading = _viewModel.isLoading;

        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF172B4D)),
              onPressed: isLoading ? null : () => Navigator.pop(context),
            ),
            title: const Text(
              'Back to project templates',
              style: TextStyle(
                fontSize: 15,
                color: Color(0xFF5E6C84),
                fontWeight: FontWeight.w500,
              ),
            ),
            centerTitle: false,
          ),
          body: SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: isMobile ? 24 : 80,
                vertical: 40,
              ),
              child: isMobile ? _buildMobileLayout() : _buildDesktopLayout(),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMobileLayout() {
    return Column(
      children: [
        _buildForm(),
        const SizedBox(height: 40),
        SizedBox(height: 500, child: _buildPreview()),
      ],
    );
  }

  Widget _buildDesktopLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(flex: 5, child: _buildForm()),
        const SizedBox(width: 60),
        Expanded(flex: 6, child: SizedBox(height: 600, child: _buildPreview())),
      ],
    );
  }

  Widget _buildForm() {
    // final template = widget.selectedTemplate;
    final isLoading = _viewModel.isLoading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Create project',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: Color(0xFF172B4D),
          ),
        ),
        const SizedBox(height: 32),

        RichText(
          text: const TextSpan(
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF172B4D),
              fontWeight: FontWeight.w600,
            ),
            children: [
              TextSpan(text: 'Name '),
              TextSpan(
                text: '*',
                style: TextStyle(color: Color(0xFFDE350B)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _nameController,
          enabled: !isLoading, // Disable khi loading
          onChanged: (val) {
            setState(() {});
          },
          decoration: InputDecoration(
            hintText: 'Try a team name, project goal, milestone...',
            hintStyle: const TextStyle(color: Color(0xFF5E6C84)),
            filled: true,
            fillColor: const Color(0xFFFAFBFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: const BorderSide(color: Color(0xFFDFE1E6)),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Management Dropdown
        const Text(
          'How your space is managed',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF172B4D),
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedManagement,
          onChanged: isLoading
              ? null
              : (val) => setState(() => _selectedManagement = val!),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFFAFBFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(4)),
            contentPadding: const EdgeInsets.all(12),
          ),
          items: ['Team-managed', 'Company-managed'].map((String value) {
            return DropdownMenuItem<String>(value: value, child: Text(value));
          }).toList(),
        ),
        const SizedBox(height: 24),

        // Access Dropdown
        const Text(
          'Access',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF172B4D),
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedAccess,
          onChanged: isLoading
              ? null
              : (val) => setState(() => _selectedAccess = val!),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFFAFBFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(4)),
            contentPadding: const EdgeInsets.all(12),
          ),
          items: ['Open', 'Private', 'Limited'].map((String value) {
            return DropdownMenuItem<String>(value: value, child: Text(value));
          }).toList(),
        ),
        const SizedBox(height: 24),

        // Buttons
        const SizedBox(height: 40),
        Row(
          children: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: const Text(
                'Cancel',
                style: TextStyle(color: Color(0xFF5E6C84)),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                onPressed: isLoading ? null : _onNextPressed,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0052CC),
                  disabledBackgroundColor: const Color(
                    0xFF0052CC,
                  ).withOpacity(0.5),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Next', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPreview() {
    final template = widget.selectedTemplate;
    final projectName = _nameController.text.trim().isEmpty
        ? 'Untitled space'
        : _nameController.text;

    return Stack(
      children: [
        // Blue circle decoration
        Positioned(
          top: -100,
          right: -200,
          child: Container(
            width: 600,
            height: 600,
            decoration: BoxDecoration(
              color: template['color1'].withOpacity(0.1),
              shape: BoxShape.circle,
            ),
          ),
        ),

        // Board preview card
        Positioned(
          top: 80,
          left: 20,
          right: 20,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 24,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: template['color1'],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Icon(
                        template['icon'],
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      projectName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF172B4D),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Action buttons mock
                Row(
                  children: [
                    _buildMockButton(),
                    const SizedBox(width: 8),
                    _buildMockButton(),
                    const SizedBox(width: 8),
                    _buildMockButton(),
                    const SizedBox(width: 8),
                    _buildMockButton(),
                  ],
                ),
                const SizedBox(height: 20),

                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _buildKanbanColumn([1, 2], template['color1']),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildKanbanColumn([3, 4], template['color1']),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildKanbanColumn([5], template['color1']),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Footer
                Text(
                  '$_selectedManagement space',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF5E6C84),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMockButton() {
    return Container(
      width: 60,
      height: 24,
      decoration: BoxDecoration(
        color: const Color(0xFFEBECF0),
        borderRadius: BorderRadius.circular(3),
      ),
    );
  }

  Widget _buildKanbanColumn(List<int> cards, Color accentColor) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F5F7),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            height: 6,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: accentColor.withOpacity(0.4),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          ...cards.map(
            (num) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _buildKanbanCard('KEY-$num'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKanbanCard(String key) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            height: 8,
            decoration: BoxDecoration(
              color: const Color(0xFFEBECF0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFDFE1E6),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }
}
