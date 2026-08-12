import 'package:flutter/material.dart';
import '../../models/home/notification_model.dart';
import '../../services/home/notification_service.dart';
import '../../models/home/invitation_model.dart';
import '../../services/home/invite_to_project_service.dart';

class NotificationViewModel extends ChangeNotifier {
  final NotificationService _notificationService = NotificationService();
  final InvitationService _invitationService = InvitationService();

  List<NotificationModel> _notifications = [];
  List<NotificationModel> get notifications => _notifications;

  List<InvitationModel> _pendingInvitations = [];
  List<InvitationModel> get pendingInvitations => _pendingInvitations;

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  bool _isLoadingInvitations = true;
  bool get isLoadingInvitations => _isLoadingInvitations;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    notifyListeners();

    _notifications = await _notificationService.getUnreadNotifications();
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchInvitations() async {
    _isLoadingInvitations = true;
    notifyListeners();

    _pendingInvitations = await _invitationService.getPendingInvitations();
    
    _isLoadingInvitations = false;
    notifyListeners();
  }

  Future<void> markAsRead(int index) async {
    final notif = _notifications[index];
    if (notif.read) return;

    _notifications[index] = NotificationModel(
      id: notif.id,
      title: notif.title,
      content: notif.content,
      type: notif.type,
      referenceId: notif.referenceId,
      createdAt: notif.createdAt,
      read: true,
    );
    notifyListeners(); // Optimistic update

    final success = await _notificationService.markAsRead(notif.id);
    if (!success) {
      // Could handle revert here
    }
  }

  Future<bool> markAllAsRead() async {
    _isLoading = true;
    notifyListeners();

    final success = await _notificationService.markAllAsRead();
    if (success) {
      _notifications.clear();
    }
    
    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<bool> acceptInvitation(String invitationId, int index) async {
    bool success = await _invitationService.acceptInvitation(invitationId);
    if (success) {
      _pendingInvitations.removeAt(index);
      notifyListeners();
    }
    return success;
  }

  Future<bool> denyInvitation(String invitationId, int index) async {
    bool success = await _invitationService.denyInvitation(invitationId);
    if (success) {
      _pendingInvitations.removeAt(index);
      notifyListeners();
    }
    return success;
  }
}
