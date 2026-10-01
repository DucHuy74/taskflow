class GraphDataset {
  static const Map<String, dynamic> mockWorkspaceGraph = {
    'nodes': [
      // Chủ ngữ (Subjects / Actors)
      {
        'id': 'sub-user',
        'label': 'Người dùng',
        'type': 'Subject',
        'priority': 0.9,
      },
      {'id': 'sub-admin', 'label': 'Admin', 'type': 'Subject', 'priority': 0.8},

      // Động từ (Verbs / Actions)
      {
        'id': 'verb-login',
        'label': 'đăng nhập',
        'type': 'Verb',
        'priority': 0.9,
      },
      {'id': 'verb-view', 'label': 'xem', 'type': 'Verb', 'priority': 0.7},
      {'id': 'verb-add', 'label': 'thêm', 'type': 'Verb', 'priority': 0.8},

      // Tân ngữ (Objects / Targets)
      {
        'id': 'obj-system',
        'label': 'hệ thống',
        'type': 'Object',
        'priority': 0.8,
      },
      {
        'id': 'obj-projects',
        'label': 'danh sách dự án',
        'type': 'Object',
        'priority': 0.6,
      },
      {
        'id': 'obj-members',
        'label': 'thành viên',
        'type': 'Object',
        'priority': 0.7,
      },
    ],
    'edges': [
      // Người dùng -> đăng nhập -> hệ thống
      {
        'from': 'sub-user',
        'to': 'verb-login',
        'type': 'PERFORM',
        'score': 0.9,
        'confidence': 0.9,
        'lift': 1.0,
      },
      {
        'from': 'verb-login',
        'to': 'obj-system',
        'type': 'TARGET',
        'score': 0.9,
        'confidence': 0.9,
        'lift': 1.0,
      },

      // Người dùng -> xem -> danh sách dự án
      {
        'from': 'sub-user',
        'to': 'verb-view',
        'type': 'PERFORM',
        'score': 0.7,
        'confidence': 0.8,
        'lift': 1.0,
      },
      {
        'from': 'verb-view',
        'to': 'obj-projects',
        'type': 'TARGET',
        'score': 0.7,
        'confidence': 0.8,
        'lift': 1.0,
      },

      // Admin -> thêm -> thành viên
      {
        'from': 'sub-admin',
        'to': 'verb-add',
        'type': 'PERFORM',
        'score': 0.8,
        'confidence': 0.8,
        'lift': 1.0,
      },
      {
        'from': 'verb-add',
        'to': 'obj-members',
        'type': 'TARGET',
        'score': 0.8,
        'confidence': 0.8,
        'lift': 1.0,
      },
    ],
  };
}
