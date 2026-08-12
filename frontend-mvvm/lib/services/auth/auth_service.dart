import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'dart:html' as html;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'token_storage.dart';
import 'token_storage_mobile.dart';
import 'token_storage_web.dart';

class AuthService {
  AuthService._internal();
  static final AuthService instance = AuthService._internal();

  final String _clientId = 'nckh_app';
  final String _clientSecret = dotenv.env['Client_Secret'] ?? '';
  final String _issuer = 'http://localhost:8180/realms/nckh';

  late final TokenStorage _storage = kIsWeb
      ? WebTokenStorage()
      : MobileTokenStorage();

  Future<bool> isLoggedIn() async {
    final token = await getValidAccessToken();
    return token != null;
  }

  Future<bool> login({
    required String username,
    required String password,
  }) async {
    await _storage.deleteAll();

    final res = await http.post(
      Uri.parse('$_issuer/protocol/openid-connect/token'),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'grant_type': 'password',
        'client_id': _clientId,
        'client_secret': _clientSecret,
        'username': username,
        'password': password,
        'scope': 'openid',
      },
    );

    if (res.statusCode != 200) return false;

    final data = json.decode(res.body);
    await _saveTokens(data);
    return true;
  }

  Future<void> _saveTokens(Map<String, dynamic> data) async {
    final expiresIn = data['expires_in'] as int;
    final safeExpiresIn = expiresIn > 30 ? expiresIn - 30 : expiresIn;

    final expiresAt =
        DateTime.now().millisecondsSinceEpoch + safeExpiresIn * 1000;

    await _storage.write('access_token', data['access_token']);
    await _storage.write('refresh_token', data['refresh_token']);
    await _storage.write('id_token', data['id_token']);
    await _storage.write('expires_at', expiresAt.toString());
  }

  Future<String?> getValidAccessToken() async {
    if (!await _isExpired()) {
      return _storage.read('access_token');
    }

    final refreshed = await _refreshToken();
    return refreshed ? _storage.read('access_token') : null;
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await _storage.read('refresh_token');
    if (refreshToken == null) return false;

    final res = await http.post(
      Uri.parse('$_issuer/protocol/openid-connect/token'),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'grant_type': 'refresh_token',
        'client_id': _clientId,
        'client_secret': _clientSecret,
        'refresh_token': refreshToken,
      },
    );

    if (res.statusCode != 200) return false;

    final data = json.decode(res.body);
    await _saveTokens(data);
    return true;
  }

  Future<void> logout() async {
    await _storage.deleteAll();

    if (kIsWeb) {
      html.window.location.replace('http://localhost:3000/login');
    }
  }

  void _logoutWebRedirect() async {
    final idToken = await _storage.read('id_token');
    if (idToken == null) return;

    final logoutUrl =
        '$_issuer/protocol/openid-connect/logout'
        '?id_token_hint=$idToken'
        '&post_logout_redirect_uri=http://localhost:3000';

    html.window.location.replace(logoutUrl);
  }

  Future<bool> _isExpired() async {
    final expiresAtStr = await _storage.read('expires_at');
    if (expiresAtStr == null) return true;

    return DateTime.now().millisecondsSinceEpoch > int.parse(expiresAtStr);
  }
}
