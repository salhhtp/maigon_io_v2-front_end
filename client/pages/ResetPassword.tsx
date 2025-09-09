import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { useUser } from "@/contexts/SupabaseUserContext";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { updatePassword } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if we have the required parameters from the reset link
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setMessage({ 
        type: 'error', 
        text: 'Invalid reset link. Please request a new password reset.' 
      });
    }
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePassword(password);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        
        // Redirect to sign in after success
        setTimeout(() => {
          navigate('/signin', { 
            state: { message: 'Password updated successfully! Please sign in with your new password.' }
          });
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-[212px] w-full max-w-[1200px]">
        {/* Left Section - Header Content */}
        <div className="hidden lg:flex flex-col items-start gap-[75px] w-full lg:w-[474px] order-2 lg:order-1">
          {/* Header */}
          <div className="flex p-2.5 justify-center items-center gap-2.5 self-stretch">
            <h1 className="text-[#313832] text-center font-lora text-4xl lg:text-[64px] font-medium leading-tight lg:leading-[90px]">
              Set New Password
            </h1>
          </div>

          {/* Body */}
          <div className="flex p-2.5 justify-center items-center gap-2.5">
            <p className="text-[#4B5563] text-center font-roboto text-base font-normal leading-6 tracking-[0.16px]">
              Create a strong password for your account. Make sure it's at least 8 characters with a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>

        {/* Right Section - Form Container */}
        <div className="flex w-full lg:w-[448px] py-14 flex-col items-center gap-12 lg:gap-8 order-1 lg:order-2">
          {/* MAIGON Logo */}
          <div className="w-full max-w-md mb-12 lg:mb-8">
            <Logo size="xl" />
          </div>

          {/* Form */}
          <div className="flex justify-center items-center self-stretch relative">
            <form
              onSubmit={handleSubmit}
              className="flex w-full lg:w-[448px] flex-col items-start gap-6 relative"
            >
              {/* New Password Field */}
              <div className="flex w-full flex-col items-start gap-1">
                <div className="flex h-5 py-[1.5px] pb-0.5 items-center self-stretch">
                  <Label
                    htmlFor="password"
                    className="text-[#4B5563] font-roboto text-xs font-medium leading-5"
                  >
                    New Password
                  </Label>
                </div>

                <div className="h-[50px] self-stretch relative">
                  <div className="inline-flex h-[50px] py-[15px] pl-3 pr-0 flex-col justify-center items-center flex-shrink-0 absolute left-0 top-0 w-8">
                    <Lock className="w-5 h-5 text-[#9CA3AF]" />
                  </div>

                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (message) setMessage(null);
                    }}
                    className="flex w-full h-[50px] py-[13px] pr-[50px] pl-[41px] items-center rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="flex w-full flex-col items-start gap-1">
                <div className="flex h-5 py-[1.5px] pb-0.5 items-center self-stretch">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-[#4B5563] font-roboto text-xs font-medium leading-5"
                  >
                    Confirm New Password
                  </Label>
                </div>

                <div className="h-[50px] self-stretch relative">
                  <div className="inline-flex h-[50px] py-[15px] pl-3 pr-0 flex-col justify-center items-center flex-shrink-0 absolute left-0 top-0 w-8">
                    <Lock className="w-5 h-5 text-[#9CA3AF]" />
                  </div>

                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (message) setMessage(null);
                    }}
                    className="flex w-full h-[50px] py-[13px] pr-[50px] pl-[41px] items-center rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-xs font-medium mb-2">Password Requirements:</p>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• At least one uppercase letter</li>
                  <li>• At least one lowercase letter</li>
                  <li>• At least one number</li>
                </ul>
              </div>

              {/* Success/Error Message */}
              {message && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border w-full ${
                  message.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex w-full h-[50px]">
                <Button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="flex h-[50px] py-[15.5px] justify-center items-center w-full rounded-lg border border-transparent bg-[#9A7C7C] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-[#9A7C7C]/90 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span className="text-white text-center font-inter text-sm font-normal leading-6">
                    {isLoading ? "Updating Password..." : "Update Password"}
                  </span>
                </Button>
              </div>

              {/* Back to Sign In Link */}
              <div className="flex w-full justify-center">
                <Link
                  to="/signin"
                  className="text-[#9A7C7C] font-inter text-sm font-medium hover:underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
