// File: lib/models/sprint_status.dart

enum SprintStatus {
  ToDo,       
  InProgress, 
  Done        
}

extension SprintStatusExtension on SprintStatus {
  String get jsonValue {
    return name; 
  }
}