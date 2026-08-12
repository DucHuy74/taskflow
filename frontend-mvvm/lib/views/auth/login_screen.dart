import 'package:flutter/material.dart';
import 'register_screen.dart';

import '../../components/auth/auth_header.dart';
import '../../viewmodels/auth/login_view_model.dart';
import '../../components/auth/auth_input.dart';
import '../../components/auth/auth_button.dart';
import '../../components/auth/social_login_button.dart';
import '../../components/auth/auth_footer.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({Key? key}) : super(key: key);

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // State variables
  bool _rememberMe = false;
  bool _obscurePassword = true;
  bool _isLoading = false;

  final LoginViewModel _viewModel = LoginViewModel();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool _isSmallScreen(BuildContext context) =>
      MediaQuery.of(context).size.width < 800;

  void _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    bool success = await _viewModel.login(
      username: _emailController.text.trim(),
      password: _passwordController.text.trim(),
    );

    setState(() => _isLoading = false);

    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Log in successful!'),
          backgroundColor: Color(0xFF61BD4F),
        ),
      );
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Login failed. Please check your credentials.'),
          backgroundColor: Color(0xFFEB5A46),
        ),
      );
    }
  }

  void _handleGoogleLogin() async {
    setState(() => _isLoading = true);
    bool success = await _viewModel.loginWithGoogle();
    setState(() => _isLoading = false);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Log in with Google successful!' : 'Google login failed',
        ),
        backgroundColor: success
            ? const Color(0xFF61BD4F)
            : const Color(0xFFEB5A46),
      ),
    );
  }

  void _handleGithubLogin() async {
    setState(() => _isLoading = true);
    bool success = await _viewModel.loginWithGithub();
    setState(() => _isLoading = false);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Log in with GitHub successful!' : 'GitHub login failed',
        ),
        backgroundColor: success
            ? const Color(0xFF61BD4F)
            : const Color(0xFFEB5A46),
      ),
    );
  }

  // --- UI RESPONSIVE ---
  @override
  Widget build(BuildContext context) {
    final isSmallScreen = _isSmallScreen(context);

    return Scaffold(
      backgroundColor: isSmallScreen ? Colors.white : const Color(0xFFF9FAFC),
      body: Center(
        child: SingleChildScrollView(
          padding: isSmallScreen ? const EdgeInsets.all(24) : EdgeInsets.zero,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const AuthHeader(
                subtitle: 'Log in to continue',
              ),

              SizedBox(height: isSmallScreen ? 32 : 40),

              Container(
                width: isSmallScreen ? double.infinity : 400,
                padding: isSmallScreen
                    ? EdgeInsets.zero
                    : const EdgeInsets.all(32),
                decoration: isSmallScreen
                    ? null
                    : BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 24,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AuthInput(
                        controller: _emailController,
                        labelText: 'Enter your email or username',
                        validator: (value) {
                          if (value == null || value.isEmpty)
                            return 'Please enter email or username';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      AuthInput(
                        controller: _passwordController,
                        labelText: 'Enter your password',
                        obscureText: _obscurePassword,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            color: const Color(0xFF5E6C84),
                            size: 20,
                          ),
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty)
                            return 'Please enter your password';
                          if (value.length < 6)
                            return 'Password must be at least 6 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              SizedBox(
                                width: 18,
                                height: 18,
                                child: Checkbox(
                                  value: _rememberMe,
                                  onChanged: (value) => setState(
                                    () => _rememberMe = value ?? false,
                                  ),
                                  activeColor: const Color(0xFF0079BF),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Remember me',
                                style: TextStyle(
                                  color: Color(0xFF5E6C84),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Forgot password functionality',
                                  ),
                                ),
                              );
                            },
                            child: const Text(
                              'Forgot password?',
                              style: TextStyle(
                                color: Color(0xFF0079BF),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      AuthButton(
                        label: 'Log in',
                        isLoading: _isLoading,
                        onPressed: _handleLogin,
                      ),
                      const SizedBox(height: 24),

                      Row(
                        children: [
                          const Expanded(
                            child: Divider(color: Color(0xFFDFE1E6)),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'OR',
                              style: TextStyle(
                                color: const Color(0xFF5E6C84).withOpacity(0.8),
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const Expanded(
                            child: Divider(color: Color(0xFFDFE1E6)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      SocialLoginButton(
                        label: 'Continue with Google',
                        icon: Icons.g_mobiledata,
                        iconColor: const Color(0xFFDB4437),
                        onTap: _handleGoogleLogin,
                        disabled: _isLoading,
                      ),
                      const SizedBox(height: 12),
                      SocialLoginButton(
                        label: 'Continue with GitHub',
                        icon: Icons.code,
                        iconColor: const Color(0xFF24292E),
                        onTap: _handleGithubLogin,
                        disabled: _isLoading,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              _buildFooterSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooterSection() {
    return AuthFooter(
      onSignUp: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const RegisterPage()),
        );
      },
    );
  }
  // Footer links handled in AuthFooter component
}
