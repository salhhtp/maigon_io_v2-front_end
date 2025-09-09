import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import { useUser } from "@/contexts/SupabaseUserContext";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        // Navigate to dashboard on successful login
        navigate("/dashboard");
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred. Please try again.");
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
              Welcome Back!
            </h1>
          </div>

          {/* Body */}
          <div className="flex p-2.5 justify-center items-center gap-2.5">
            <p className="text-[#4B5563] text-center font-roboto text-base font-normal leading-6 tracking-[0.16px]">
              To continue with Maigon, please log in with your credentials.
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
          <div className="flex h-[364px] justify-center items-center self-stretch relative">
            <form
              onSubmit={handleSubmit}
              className="flex w-full lg:w-[448px] pb-[98px] flex-col items-start gap-4 relative"
            >
              {/* Email Field Container */}
              <div className="flex w-full flex-col items-start gap-1 h-[74px]">
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
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.668 3.83594H3.33464C2.41416 3.83594 1.66797 4.58213 1.66797 5.5026V15.5026C1.66797 16.4231 2.41416 17.1693 3.33464 17.1693H16.668C17.5884 17.1693 18.3346 16.4231 18.3346 15.5026V5.5026C18.3346 4.58213 17.5884 3.83594 16.668 3.83594Z"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M18.3346 6.33594L10.8596 11.0859C10.6024 11.2471 10.3049 11.3326 10.0013 11.3326C9.6977 11.3326 9.40024 11.2471 9.14297 11.0859L1.66797 6.33594"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Email Input */}
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex w-full h-[50px] py-[13px] pr-[13px] pl-[41px] items-center rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                    required
                  />
                </div>
              </div>

              {/* Password Field Container */}
              <div className="flex w-full flex-col items-start h-[74px] mt-4">
                {/* Password Label Container */}
                <div className="flex py-0 pr-[384.32px] pb-1 items-center self-stretch">
                  <Label
                    htmlFor="password"
                    className="text-[#4B5563] font-inter text-xs font-medium leading-5"
                  >
                    Password
                  </Label>
                </div>

                {/* Password Input Container */}
                <div className="h-[50px] self-stretch relative">
                  {/* Password Icon Container */}
                  <div className="inline-flex h-[50px] py-[15px] pl-3 pr-0 flex-col justify-center items-center flex-shrink-0 absolute left-0 top-0 w-8">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15.8333 9.66406H4.16667C3.24619 9.66406 2.5 10.4103 2.5 11.3307V17.1641C2.5 18.0845 3.24619 18.8307 4.16667 18.8307H15.8333C16.7538 18.8307 17.5 18.0845 17.5 17.1641V11.3307C17.5 10.4103 16.7538 9.66406 15.8333 9.66406Z"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.83203 9.66406V6.33073C5.83203 5.22566 6.27102 4.16585 7.05242 3.38445C7.83382 2.60305 8.89363 2.16406 9.9987 2.16406C11.1038 2.16406 12.1636 2.60305 12.945 3.38445C13.7264 4.16585 14.1654 5.22566 14.1654 6.33073V9.66406"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Password Input */}
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex w-full h-[50px] py-[13px] pr-[13px] pl-[41px] items-center rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-inter"
                    required
                  />
                </div>
              </div>

              {/* Remember Me and Forgot Password Container */}
              <div className="flex justify-between items-center w-full lg:w-[448px] h-[21px] mt-4">
                {/* Remember Me Container */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                    className="w-4 h-4 rounded-sm border border-[#767676] bg-white"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-[#4B5563] font-inter text-xs font-normal leading-5"
                  >
                    Remember Me
                  </Label>
                </div>

                {/* Forgot Password Container */}
                <div className="flex items-center">
                  <Link
                    to="/forgot-password"
                    className="text-[#6B7280] font-inter text-xs font-medium leading-5 hover:text-[#9A7C7C] transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex w-full mt-4">
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Login Button Container */}
              <div className="flex w-full lg:w-[448px] h-[50px] mt-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-[50px] py-[15.5px] justify-center items-center w-full rounded-lg border border-transparent bg-[#9A7C7C] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-[#9A7C7C]/90 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span className="text-white text-center font-inter text-sm font-normal leading-6">
                    {isLoading ? "Signing in..." : "Login Now"}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Bottom Account Creation Link */}
          <div className="flex w-full lg:w-[448px] h-6 justify-center items-center relative -mt-[69px]">
            <div className="flex w-full h-6 py-0 px-[79.367px] lg:px-[79.359px] pt-[26px] lg:pt-0 justify-center items-center flex-shrink-0">
              <span className="flex w-[170px] h-[19px] flex-col justify-center flex-shrink-0 text-[#4B5563] text-center font-inter text-sm font-normal leading-6">
                Don't have an account?
              </span>
              <span className="flex w-1 h-[19px] flex-col justify-center flex-shrink-0 text-[#4B5563] text-center font-inter text-sm font-normal leading-6">
                {" "}
              </span>
              <Link
                to="/signup"
                className="flex w-[115px] h-6 py-[2.5px] justify-center items-center flex-shrink-0 bg-transparent"
              >
                <span className="flex w-[115px] h-[19px] flex-col justify-center flex-shrink-0 text-[#9A7C7C] text-center font-inter text-sm font-medium leading-6 hover:underline">
                  Create Account
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
