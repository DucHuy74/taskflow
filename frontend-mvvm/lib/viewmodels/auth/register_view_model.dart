import 'package:flutter/material.dart';
import '../../services/auth/register_service.dart';

class RegisterViewModel extends ChangeNotifier {
  // Page & Form Controllers
  final pageController = PageController();

  // Data Controllers
  final firstNameController = TextEditingController();
  final lastNameController = TextEditingController();
  final dobController = TextEditingController();
  final usernameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  // State
  bool _obscurePassword = true;
  bool _isLoading = false;
  int _currentStep = 0;

  @override
  void dispose() {
    pageController.dispose();
    firstNameController.dispose();
    lastNameController.dispose();
    dobController.dispose();
    usernameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  // Getters
  bool get obscurePassword => _obscurePassword;
  bool get isLoading => _isLoading;
  int get currentStep => _currentStep;

  // Toggle Password
  void togglePassword() {
    _obscurePassword = !_obscurePassword;
    notifyListeners();
  }

  // Logic Navigation
  bool nextStep(PageController pageController, BuildContext context) {
    if (_validateCurrentStep(context)) {
      _currentStep++;
      pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      notifyListeners();
      return true;
    }
    return false;
  }

  void previousStep(PageController pageController) {
    if (_currentStep > 0) {
      _currentStep--;
      pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      notifyListeners();
    }
  }

  bool _validateCurrentStep(BuildContext context) {
    switch (_currentStep) {
      case 0: // Tên
        if (firstNameController.text.isEmpty)
          return showError('Please enter your first name', context);
        if (lastNameController.text.isEmpty)
          return showError('Please enter your last name', context);
        return true;
      case 1: // Ngày sinh
        if (dobController.text.isEmpty)
          return showError('Please select your date of birth', context);
        return true;
      case 2: // Username & Email
        if (usernameController.text.isEmpty)
          return showError('Please enter a username', context);
        if (usernameController.text.length < 3)
          return showError('Username must be at least 3 characters', context);
        if (emailController.text.isEmpty)
          return showError('Please enter your email', context);
        if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(emailController.text))
          return showError('Please enter a valid email', context);
        return true;
      case 3: // Password
        if (passwordController.text.isEmpty)
          return showError('Please enter a password', context);
        if (passwordController.text.length < 6)
          return showError('Password must be at least 6 characters', context);
        return true;
      default:
        return true;
    }
  }

  bool showError(String message, BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFEB5A46),
        behavior: SnackBarBehavior.floating,
      ),
    );
    return false;
  }

  Color getPasswordStrengthColor() {
    final length = passwordController.text.length;
    if (length < 6) return const Color(0xFFEB5A46);
    if (length < 10) return const Color(0xFFF2D600);
    return const Color(0xFF61BD4F);
  }

  String getPasswordStrengthText() {
    final length = passwordController.text.length;
    if (length < 6) return 'Weak';
    if (length < 10) return 'Medium';
    return 'Strong';
  }

  Future<Map<String, dynamic>> register() async {
    _isLoading = true;
    notifyListeners();

    final body = {
      "username": usernameController.text.trim(),
      "password": passwordController.text,
      "email": emailController.text.trim(),
      "firstName": firstNameController.text.trim(),
      "lastName": lastNameController.text.trim(),
      "dob": dobController.text,
    };

    try {
      final response = await RegisterService.register(body);
      _isLoading = false;
      notifyListeners();

      return {'statusCode': response.statusCode, 'body': response.body};
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return {'statusCode': 0, 'error': e.toString()};
    }
  }
}
