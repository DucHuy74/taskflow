import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'token_storage.dart';

class MobileTokenStorage implements TokenStorage {
  final _storage = const FlutterSecureStorage();

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> deleteAll() => _storage.deleteAll();
}
