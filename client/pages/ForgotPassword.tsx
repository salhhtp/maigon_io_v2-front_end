import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import { useUser } from "@/contexts/SupabaseUserContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { resetPassword } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setEmail(""); // Clear the form
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
              Reset Password
            </h1>
          </div>

          {/* Body */}
          <div className="flex p-2.5 justify-center items-center gap-2.5">
            <p className="text-[#4B5563] text-center font-roboto text-base font-normal leading-6 tracking-[0.16px]">
              Enter your email address and we'll send you a link to reset your password.
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
              {/* Email Field Container */}
              <div className="flex w-full flex-col items-start gap-1">
                {/* Email Label */}
                <div className="flex h-5 py-[1.5px] pb-0.5 items-center self-stretch">
                  <Label
                    htmlFor="email"
                    className="text-[#4B5563] font-roboto text-xs font-medium leading-5"
                  >
                    Email Address
                  </Label>
                </div>

                {/* Email Input Container */}
                <div className="h-[50px] self-stretch relative">
                  {/* Email Icon Container */}
                  <div className="inline-flex h-[50px] py-[15px] pl-3 pr-0 flex-col justify-center items-center flex-shrink-0 absolute left-0 top-0 w-8">
                    <Mail className="w-5 h-5 text-[#9CA3AF]" />
                  </div>

                  {/* Email Input */}
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (message) setMessage(null); // Clear message when user types
                    }}
                    className="flex w-full h-[50px] py-[13px] pr-[13px] pl-[41px] items-center rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                    required
                  />
                </div>
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

              {/* Submit Button Container */}
              <div className="flex w-full h-[50px]">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-[50px] py-[15.5px] justify-center items-center w-full rounded-lg border border-transparent bg-[#9A7C7C] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-[#9A7C7C]/90 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span className="text-white text-center font-inter text-sm font-normal leading-6">
                    {isLoading ? "Sending..." : "Send Reset Link"}
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
