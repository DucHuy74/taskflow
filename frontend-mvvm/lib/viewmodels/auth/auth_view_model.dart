import '../../services/auth/auth_service.dart';

class AuthViewModel {
  final AuthService _auth = AuthService.instance;

  Future<void> logout() async {
    await _auth.logout();
  }
}
