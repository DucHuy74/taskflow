import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../views/auth/login_screen.dart';
import '../views/home/home_page.dart';
import '../views/landingpage.dart';
import '../auth/auth_gate.dart';

final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.light);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (context, currentMode, child) {
        return MaterialApp(
          title: 'TaskFlow',
          debugShowCheckedModeBanner: false,

          theme: ThemeData(
            brightness: Brightness.light,
            primarySwatch: Colors.blue,
            fontFamily: 'Inter',
            scaffoldBackgroundColor: Colors.white,
          ),

          darkTheme: ThemeData(
            brightness: Brightness.dark,
            primarySwatch: Colors.blue,
            fontFamily: 'Inter',
            scaffoldBackgroundColor: const Color(0xFF121212),
          ),

          themeMode: currentMode,

          home: const LandingPage(),

          routes: {
            '/login': (_) => const LoginPage(),
            '/home': (_) => const AuthGate(child: HomePage()),
          },
        );
      },
    );
  }
}
