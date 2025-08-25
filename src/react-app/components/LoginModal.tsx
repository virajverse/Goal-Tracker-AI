import React, { useEffect, useState } from 'react';
import { LogIn, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/react-app/hooks/useCustomAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

// Phone OTP login removed; email/password only

export default function LoginModal({ isOpen, onClose, initialMode }: LoginModalProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const { login, signup } = useAuth();
  // Sync desired mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSignup(initialMode === 'signup');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
        await signup({
          email: formData.email,
          password: formData.password,
          name: formData.name
        });
      } else {
        await login({
          email: formData.email,
          password: formData.password
        });
      }
      onClose();
    } catch (error) {
      console.error('Login failed:', error);
      alert(isSignup ? 'Signup failed' : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Google login removed

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    });
    setIsSignup(false);
  };
  

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => { onClose(); resetForm(); }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isSignup ? 'Create a new account' : 'Log in to your account'}
          </h2>
          <p className="text-gray-600">
            Log in to track your goals
          </p>
        </div>
        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your name"
                  required={isSignup}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Your email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Re-enter password"
                  required={isSignup}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? 'Processing...' : isSignup ? 'Sign up' : 'Log in'}
            </button>

            <p className="text-center text-sm text-gray-600">
              {isSignup ? 'Already have an account?' : 'Want to create a new account?'}{' '}
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-purple-600 hover:underline"
              >
                {isSignup ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </form>


        {/* Google login removed */}

        <p className="text-xs text-gray-500 mt-6 text-center">
          By logging in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
