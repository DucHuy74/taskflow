import '../../models/home/notification_model.dart';

class NotificationDataset {
  static List<NotificationModel> notifications = [
    NotificationModel(
      id: "n-1",
      title: "Cập nhật dự án",
      content: "Có một thay đổi mới trong dự án phần mềm.",
      type: "update",
      referenceId: "ws-1",
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      read: false,
    ),
    NotificationModel(
      id: "n-2",
      title: "Lời mời tham gia",
      content: "Bạn đã được mời vào Công việc thiết kế.",
      type: "invite",
      referenceId: "ws-2",
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      read: true,
    ),
  ];
}
