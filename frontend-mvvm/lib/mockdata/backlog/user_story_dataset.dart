import '../../models/backlog/user_story_model.dart';

class UserStoryDataset {
  static List<UserStoryModel> userStories = [
    UserStoryModel(
      id: "us-1",
      storyText: "Là người dùng, tôi muốn đăng nhập vào hệ thống",
      status: "Done",
    ),
    UserStoryModel(
      id: "us-2",
      storyText: "Là người dùng, tôi muốn xem danh sách dự án",
      status: "In Progress",
    ),
    UserStoryModel(
      id: "us-3",
      storyText: "Là admin, tôi muốn thêm thành viên vào workspace",
      status: "ToDo",
    ),
  ];
}
