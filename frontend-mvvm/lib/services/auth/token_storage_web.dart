import 'dart:html' as html;
import 'token_storage.dart';

class WebTokenStorage implements TokenStorage {
  @override
  Future<void> write(String key, String value) async {
    html.window.localStorage[key] = value;
  }

  @override
  Future<String?> read(String key) async {
    return html.window.localStorage[key];
  }

  @override
  Future<void> deleteAll() async {
    html.window.localStorage.clear();
  }
}
