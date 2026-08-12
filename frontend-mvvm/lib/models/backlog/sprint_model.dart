class SprintModel {
  final String id;
  final String name;
  final String status;
  final String? startDate;
  final String? endDate;

  SprintModel({
    required this.id,
    required this.name,
    required this.status,
    this.startDate,
    this.endDate,
  });

  factory SprintModel.fromJson(Map<String, dynamic> json) {
    return SprintModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      status: json['status'] ?? 'ToDo',
      startDate: json['startDate'],
      endDate: json['endDate'],
    );
  }
}