import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../viewmodels/auth/register_view_model.dart';
import '../../components/auth/register_step_1.dart';
import '../../components/auth/register_step_2.dart';
import '../../components/auth/register_step_3.dart';
import '../../components/auth/register_step_4.dart';
import '../../components/auth/auth_header.dart'; 

class RegisterPage extends StatelessWidget {
  const RegisterPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => RegisterViewModel(),
      child: const _RegisterView(),
    );
  }
}

class _RegisterView extends StatefulWidget {
  const _RegisterView({Key? key}) : super(key: key);

  @override
  State<_RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<_RegisterView> {
  final _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<RegisterViewModel>();
    final isSmall = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: isSmall ? Colors.white : const Color(0xFFF9FAFC),
      body: Center(
        child: SingleChildScrollView(
          padding: isSmall ? const EdgeInsets.all(24) : EdgeInsets.zero,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Container(
              padding: isSmall ? EdgeInsets.zero : const EdgeInsets.all(32),
              decoration: isSmall
                  ? null
                  : BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 24,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
              child: Column(
                children: [
                  const AuthHeader(subtitle: 'Create your account'),
                  const SizedBox(height: 8),
                  Text(
                    'Step ${vm.currentStep + 1} of 4',
                    style: const TextStyle(
                      fontSize: 16,
                      color: Color(0xFF5E6C84),
                    ),
                  ),

                  // Page View
                  SizedBox(
                    height: 300,
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        RegisterStep1(
                          firstNameController: vm.firstNameController,
                          lastNameController: vm.lastNameController,
                        ),
                        RegisterStep2(dobController: vm.dobController),
                        RegisterStep3(
                          usernameController: vm.usernameController,
                          emailController: vm.emailController,
                        ),
                        RegisterStep4(
                          passwordController: vm.passwordController,
                          obscurePassword: vm.obscurePassword,
                          onTogglePassword: vm.togglePassword,
                          strengthColor: vm.getPasswordStrengthColor(),
                          strengthText: vm.getPasswordStrengthText(),
                        ),
                      ],
                    ),
                  ),

                  // Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (vm.currentStep > 0)
                        OutlinedButton(
                          onPressed: () => vm.previousStep(_pageController),
                          child: const Text('Back'),
                        )
                      else
                        const SizedBox(),

                      ElevatedButton(
                        onPressed: vm.isLoading
                            ? null
                            : () async {
                                if (vm.currentStep < 3) {
                                  if (!vm.nextStep(_pageController, context)) {
                                    
                                  }
                                } else {
                                  final res = await vm.register();
                                  if (!mounted) return;

                                  if (res['statusCode'] == 200) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Success!')),
                                    );
                                    Navigator.pop(context);
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Error: ${res['error'] ?? res['body']}',
                                        ),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              },
                        child: vm.isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(vm.currentStep < 3 ? 'Next' : 'Register'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                  _buildFooter(context),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          "Already have an account? ",
          style: TextStyle(color: Color(0xFF5E6C84)),
        ),
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: const Text(
            'Log in',
            style: TextStyle(
              color: Color(0xFF0079BF),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}