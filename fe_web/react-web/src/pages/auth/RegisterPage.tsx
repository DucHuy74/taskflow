import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setCredentials } from '@/store/authSlice';
import authService from '@/services/authService';

// Animation variants
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
};

const totalSteps = 4;

interface RegisterFormData {
  firstName: string;
  lastName: string;
  dob: string;
  username: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    dob: '',
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});

  const updateFormData = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Password strength calculation
  const getPasswordStrength = (password: string): { strength: number; color: string; text: string } => {
    if (!password) return { strength: 0, color: '', text: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { color: '#EB5A46', text: 'Weak' },
      { color: '#F5A623', text: 'Fair' },
      { color: '#61BD4F', text: 'Good' },
      { color: '#0079BF', text: 'Strong' },
    ];

    const level = levels[Math.min(strength - 1, levels.length - 1)];
    return { strength, color: level.color, text: level.text };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // Validation for each step
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    switch (step) {
      case 0: // First name & Last name
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'Please enter your first name';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Please enter your last name';
        }
        break;
      case 1: // Date of birth
        if (!formData.dob) {
          newErrors.dob = 'Please enter your date of birth';
        } else {
          const dobDate = new Date(formData.dob);
          const today = new Date();
          const age = today.getFullYear() - dobDate.getFullYear();
          if (age < 13) {
            newErrors.dob = 'You must be at least 13 years old';
          }
        }
        break;
      case 2: // Username & Email
        if (!formData.username.trim()) {
          newErrors.username = 'Please enter a username';
        } else if (formData.username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Please enter your email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email';
        }
        break;
      case 3: // Password
        if (!formData.password) {
          newErrors.password = 'Please enter a password';
        } else if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      const response = await authService.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dob: formData.dob,
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        })
      );

      navigate('/');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.';
      console.error('Registration error:', errorMessage);
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            index === currentStep
              ? 'w-6 bg-[#0079BF]'
              : index < currentStep
              ? 'bg-[#61BD4F]'
              : 'bg-gray-300 dark:bg-gray-700'
          )}
        />
      ))}
    </div>
  );

  // Step content
  const renderStepContent = () => {
    const steps = [
      // Step 1: First name & Last name
      <motion.div
        key="step1"
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label
            htmlFor="firstName"
            className="text-[13px] text-[#5E6C84] dark:text-gray-400"
          >
            First name
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            className={cn(
              'h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500',
              errors.firstName && 'border-red-500'
            )}
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="lastName"
            className="text-[13px] text-[#5E6C84] dark:text-gray-400"
          >
            Last name
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            className={cn(
              'h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500',
              errors.lastName && 'border-red-500'
            )}
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName}</p>
          )}
        </div>
      </motion.div>,

      // Step 2: Date of birth
      <motion.div
        key="step2"
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label
            htmlFor="dob"
            className="text-[13px] text-[#5E6C84] dark:text-gray-400"
          >
            Date of birth
          </Label>
          <Input
            id="dob"
            type="date"
            value={formData.dob}
            onChange={(e) => updateFormData('dob', e.target.value)}
            className={cn(
              'h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500',
              errors.dob && 'border-red-500'
            )}
            disabled={isLoading}
          />
          {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
        </div>
      </motion.div>,

      // Step 3: Username & Email
      <motion.div
        key="step3"
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label
            htmlFor="username"
            className="text-[13px] text-[#5E6C84] dark:text-gray-400"
          >
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="johndoe123"
            value={formData.username}
            onChange={(e) => updateFormData('username', e.target.value)}
            className={cn(
              'h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500',
              errors.username && 'border-red-500'
            )}
            disabled={isLoading}
          />
          {errors.username && (
            <p className="text-xs text-red-500">{errors.username}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-[13px] text-[#5E6C84] dark:text-gray-400"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={cn(
              'h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500',
              errors.email && 'border-red-500'
            )}
            disabled={isLoading}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
      </motion.div>,

      // Step 4: Password
      <motion.div
        key="step4"
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-[13px] text-[#5E6C84] dark:text-gray-400"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              className={cn(
                'h-10 pr-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500',
                errors.password && 'border-red-500'
              )}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6C84] dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password}</p>
          )}

          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      passwordStrength.strength >= level
                        ? 'bg-[#0079BF]'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                    style={
                      passwordStrength.strength >= level
                        ? { backgroundColor: passwordStrength.color }
                        : undefined
                    }
                  />
                ))}
              </div>
              <p
                className="text-xs font-medium"
                style={{ color: passwordStrength.color || 'inherit' }}
              >
                {passwordStrength.text}
              </p>
            </div>
          )}
        </div>
      </motion.div>,
    ];

    return steps[currentStep];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFC] dark:bg-gray-950 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[500px]"
      >
        {/* Header */}
        <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              TaskFlow
            </h1>
          </div>
          <p className="text-[#5E6C84] dark:text-gray-400">Create your account</p>
          <p className="text-[16px] text-[#5E6C84] dark:text-gray-500 mt-1">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </motion.div>

        {/* Register Card */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-8"
        >
          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          <div className="overflow-hidden min-h-[200px]">
            <AnimatePresence mode="wait" custom={direction}>
              {renderStepContent()}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="h-10 px-4 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              onClick={currentStep === totalSteps - 1 ? handleSubmit : handleNext}
              disabled={isLoading}
              className="h-10 px-6 bg-[#0079BF] hover:bg-[#0065a3] text-white font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {currentStep === totalSteps - 1 ? 'Creating...' : 'Loading...'}
                </>
              ) : currentStep === totalSteps - 1 ? (
                <>
                  Register
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="text-center mt-6"
        >
          <p className="text-[13px] text-[#5E6C84] dark:text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#0079BF] font-semibold hover:underline transition-colors"
            >
              Log in
            </button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;
