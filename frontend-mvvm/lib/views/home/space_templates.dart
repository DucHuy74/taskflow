import 'package:flutter/material.dart';
import 'create_project.dart'; 

class SpaceTemplatesPage extends StatefulWidget {
  const SpaceTemplatesPage({Key? key}) : super(key: key);

  @override
  State<SpaceTemplatesPage> createState() => _SpaceTemplatesPageState();
}

class _SpaceTemplatesPageState extends State<SpaceTemplatesPage> {
  String _selectedCategory = 'Made for you';
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  final List<String> _categories = [
    'Made for you',
    'Custom templates',
    'Software development',
    'Service management',
    'Work management',
    'Product management',
    'Marketing',
    'Human resources',
    'Finance',
    'Design',
    'Personal',
    'Operations',
    'Legal',
  ];

  final List<Map<String, dynamic>> _templates = [
    {
      'name': 'Scrum',
      'description':
          'Plan, track, and execute work using sprints and a backlog.',
      'color1': const Color(0xFF0052CC),
      'color2': const Color(0xFF36B37E),
      'icon': Icons.view_list,
      'badge': 'LAST CREATED',
    },
    {
      'name': 'General service',
      'description':
          'Create one place to collect and manage any type of request.',
      'color1': const Color(0xFF0052CC),
      'color2': const Color(0xFFFFC400),
      'icon': Icons.confirmation_number_outlined,
      'badge': 'RECOMMENDED',
    },
    {
      'name': 'Product roadmap',
      'description':
          'Create custom roadmaps and share your plans with everyone.',
      'color1': const Color(0xFF6554C0),
      'color2': const Color(0xFFFFC400),
      'icon': Icons.timeline,
      'badge': null,
    },
    {
      'name': 'Top-level planning',
      'description': 'Plan and track large initiatives across teams.',
      'color1': const Color(0xFF36B37E),
      'color2': const Color(0xFF0052CC),
      'icon': Icons.dashboard_outlined,
      'badge': 'PREMIUM',
    },
  ];

  bool _isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 900;

  @override
  Widget build(BuildContext context) {
    final isMobile = _isMobile(context);

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: Colors.white,
      appBar: isMobile
          ? AppBar(
              backgroundColor: Colors.white,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.menu, color: Color(0xFF172B4D)),
                onPressed: () => _scaffoldKey.currentState?.openDrawer(),
              ),
              title: const Text(
                'Space templates',
                style: TextStyle(color: Color(0xFF172B4D), fontSize: 18),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF172B4D)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            )
          : null,
      drawer: isMobile ? Drawer(child: _buildSidebar(isMobile: true)) : null,
      body: isMobile
          ? _buildContent()
          : Row(
              children: [
                _buildSidebar(isMobile: false),
                Expanded(child: _buildContent()),
              ],
            ),
    );
  }

  Widget _buildSidebar({required bool isMobile}) {
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(right: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                if (!isMobile) ...[
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 16),
                ],
                const Text(
                  'Categories',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF172B4D),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: _categories.map((category) {
                final isSelected = category == _selectedCategory;
                final showBadge = category == 'Custom templates';

                return ListTile(
                  dense: true,
                  selected: isSelected,
                  selectedTileColor: const Color(0xFFDEEBFF),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          category,
                          style: TextStyle(
                            fontSize: 14,
                            color: isSelected
                                ? const Color(0xFF0052CC)
                                : const Color(0xFF172B4D),
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (showBadge)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFF5E6C84)),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: const Text(
                            'ENTERPRISE',
                            style: TextStyle(
                              color: Color(0xFF5E6C84),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                  onTap: () {
                    setState(() => _selectedCategory = category);
                    if (isMobile) {
                      Navigator.pop(context);
                    }
                  },
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!_isMobile(context)) ...[
                  const Text(
                    'Space templates',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF172B4D),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                const Text(
                  'Templates for you based on how similar teams work.',
                  style: TextStyle(fontSize: 14, color: Color(0xFF5E6C84)),
                ),
                const SizedBox(height: 32),
                Wrap(
                  spacing: 24,
                  runSpacing: 24,
                  children: _templates.map((template) {
                    return _buildTemplateCard(template);
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- HÀM NÀY GIỜ CHỈ GỌI WIDGET CON TemplateCardItem ---
  Widget _buildTemplateCard(Map<String, dynamic> template) {
    final isMobile = _isMobile(context);
    final cardWidth = isMobile ? double.infinity : 300.0;

    return TemplateCardItem(
      template: template,
      width: cardWidth,
      onTap: () {
        // Chuyển trang khi click
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => CreateProjectPage(selectedTemplate: template),
          ),
        );
      },
    );
  }
}

// ==========================================================
// CLASS RIÊNG ĐỂ XỬ LÝ HIỆU ỨNG HOVER (ANIMATION)
// ==========================================================
class TemplateCardItem extends StatefulWidget {
  final Map<String, dynamic> template;
  final double width;
  final VoidCallback onTap;

  const TemplateCardItem({
    Key? key,
    required this.template,
    required this.width,
    required this.onTap,
  }) : super(key: key);

  @override
  State<TemplateCardItem> createState() => _TemplateCardItemState();
}

class _TemplateCardItemState extends State<TemplateCardItem> {
  // Biến trạng thái: Có đang di chuột vào không?
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      // Bắt sự kiện chuột vào
      onEnter: (_) => setState(() => _isHovered = true),
      // Bắt sự kiện chuột ra
      onExit: (_) => setState(() => _isHovered = false),
      // Đổi icon chuột thành bàn tay
      cursor: SystemMouseCursors.click,

      child: GestureDetector(
        onTap: widget.onTap,
        // AnimatedContainer giúp chuyển đổi mượt mà các thuộc tính
        child: AnimatedContainer(
          duration: const Duration(
            milliseconds: 200,
          ), // Thời gian animation: 0.2s
          curve: Curves.easeOut, // Kiểu chuyển động
          width: widget.width,

          // 1. Hiệu ứng nhấc lên: Nếu hover thì dịch Y lên -6 đơn vị
          transform: _isHovered
              ? Matrix4.translationValues(0, -6, 0)
              : Matrix4.identity(),

          decoration: BoxDecoration(
            color: Colors.white, // Thêm màu nền trắng để tránh trong suốt
            border: Border.all(
              // Đổi màu viền khi hover
              color: _isHovered
                  ? const Color(0xFF0052CC)
                  : const Color(0xFFDFE1E6),
            ),
            borderRadius: BorderRadius.circular(8),
            // 2. Hiệu ứng đổ bóng: Nếu hover thì thêm bóng
            boxShadow: _isHovered
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 15,
                      offset: const Offset(0, 10),
                    ),
                  ]
                : [],
          ),

          // Nội dung bên trong Card
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 180,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      widget.template['color1'],
                      widget.template['color2'],
                    ],
                  ),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(7), // Trừ 1px để khớp viền
                    topRight: Radius.circular(7),
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: 20,
                      left: 20,
                      right: 20,
                      bottom: 20,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  widget.template['icon'],
                                  size: 16,
                                  color: widget.template['color1'],
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    widget.template['name'],
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            _buildMockItem(widget.template['color1']),
                            const SizedBox(height: 8),
                            _buildMockItem(widget.template['color2']),
                            const SizedBox(height: 8),
                            _buildMockItem(Colors.grey.shade300),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.template['name'],
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF172B4D),
                            ),
                          ),
                        ),
                        if (widget.template['badge'] != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDEEBFF),
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Text(
                              widget.template['badge'],
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0052CC),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.template['description'],
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF5E6C84),
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Hàm vẽ các thanh giả lập nhỏ
  Widget _buildMockItem(Color color) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            height: 8,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          width: 40,
          height: 8,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ],
    );
  }
}
