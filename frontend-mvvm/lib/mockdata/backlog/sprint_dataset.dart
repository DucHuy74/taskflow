import '../../models/backlog/sprint_model.dart';

class SprintDataset {
  static List<SprintModel> sprints = [
    SprintModel(
      id: "sp-1",
      name: "Sprint 1: Khởi tạo",
      status: "Active",
      startDate: "2023-10-01",
      endDate: "2023-10-14",
    ),
    SprintModel(
      id: "sp-2",
      name: "Sprint 2: Phát triển Core",
      status: "ToDo",
      startDate: "2023-10-15",
      endDate: "2023-10-28",
    ),
    SprintModel(
      id: "sp-3",
      name: "Sprint 3: Hoàn thiện UI",
      status: "ToDo",
      startDate: "2023-10-29",
      endDate: "2023-11-11",
    ),
  ];
}
