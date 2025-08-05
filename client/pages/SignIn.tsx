import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle sign in logic here
    console.log("Sign in attempt:", { email, password, rememberMe });
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-[212px] w-full max-w-[1200px]">
        {/* Left Section - Header Content */}
        <div className="flex flex-col items-start gap-[75px] w-full lg:w-[474px] order-2 lg:order-1">
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
        <div className="flex w-full lg:w-[448px] py-14 flex-col items-center gap-[97px] order-1 lg:order-2">
          {/* MAIGON Logo */}
          <div
            className="self-stretch text-center font-lora text-5xl font-normal leading-6 relative"
            style={{
              textShadow: '0 4px 4px rgba(0, 0, 0, 0.25)',
              WebkitTextStrokeWidth: '1px',
              WebkitTextStrokeColor: '#B6A5A5',
              background: 'linear-gradient(98deg, #B6A5A5 31.1%, rgba(182, 165, 165, 0.00) 52.18%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            <span className="font-lora text-5xl font-normal">M</span>
            <span className="font-lora text-5xl font-normal">AI</span>
            <span className="font-lora text-5xl font-normal">GON</span>
          </div>

          {/* Form */}
          <div className="flex h-[364px] justify-center items-center self-stretch relative">
            <form onSubmit={handleSubmit} className="flex w-full lg:w-[448px] h-[364px] pb-[98px] flex-col items-start gap-4 absolute left-0 top-0">
              {/* Email Field Container */}
              <div className="flex w-full flex-col justify-center items-start gap-1 h-[74px]">
                {/* Email Label */}
                <div className="flex w-full h-5 py-[1.5px] pr-[354.625px] pb-0.5 items-center">
                  <Label htmlFor="email" className="flex w-[93px] h-[17px] flex-col justify-center flex-shrink-0 text-[#4B5563] font-roboto text-xs font-medium leading-5">
                    Email Address
                  </Label>
                </div>

                {/* Email Input Container */}
                <div className="w-full h-[50px] relative">
                  {/* Email Icon Container */}
                  <div className="inline-flex h-[50px] py-[15px] pl-3 pr-0 flex-col justify-center items-center flex-shrink-0 absolute left-0 top-0 w-8">
                    <Mail className="w-5 h-5 flex-shrink-0 text-[#9CA3AF]" />
                  </div>
                  
                  {/* Email Input */}
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex w-full h-[50px] py-[13px] pr-[13px] pl-[41px] items-center flex-shrink-0 rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto absolute left-0 top-0"
                    required
                  />
                </div>
              </div>

              {/* Password Field Container */}
              <div className="flex w-full flex-col justify-center items-start h-[74px] mt-4">
                {/* Password Label Container */}
                <div className="flex h-6 py-0 pr-[384.32px] pb-1 items-center w-full">
                  <div className="flex w-16 h-5 py-[1.5px] pb-0.5 justify-center items-center">
                    <Label htmlFor="password" className="flex w-16 h-[17px] flex-col justify-center flex-shrink-0 text-[#4B5563] font-inter text-xs font-medium leading-5">
                      Password
                    </Label>
                  </div>
                </div>

                {/* Password Input Container */}
                <div className="w-full h-[50px] relative">
                  {/* Password Icon Container */}
                  <div className="inline-flex h-[50px] py-[15px] pl-3 pr-0 flex-col justify-center items-center flex-shrink-0 absolute left-0 top-0 w-8">
                    <Lock className="w-5 h-5 flex-shrink-0 text-[#9CA3AF]" />
                  </div>
                  
                  {/* Password Input */}
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex w-full h-[50px] py-[13px] pr-[13px] pl-[41px] items-center flex-shrink-0 rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-inter absolute left-0 top-0"
                    required
                  />
                </div>
              </div>

              {/* Remember Me and Forgot Password Container */}
              <div className="flex w-full h-5 justify-center items-start gap-[212.203px] flex-shrink-0 mt-4">
                {/* Remember Me Container */}
                <div className="flex w-[118px] h-5 justify-center items-center gap-2 flex-shrink-0">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="flex w-4 h-4 p-0.5 justify-center items-center flex-shrink-0 rounded-sm border border-[#767676] bg-white"
                  />
                  <Label htmlFor="remember" className="flex w-[94px] h-5 py-[1.5px] pb-0.5 justify-center items-center flex-shrink-0">
                    <span className="flex w-[94px] h-[17px] flex-col justify-center flex-shrink-0 text-[#4B5563] font-inter text-xs font-normal leading-5">
                      Remember Me
                    </span>
                  </Label>
                </div>

                {/* Forgot Password Container */}
                <div className="flex w-[118px] h-5 py-[1.5px] pb-0.5 justify-center items-center flex-shrink-0">
                  <Link to="/forgot-password" className="flex w-[118px] h-[17px] justify-center items-center flex-shrink-0">
                    <span className="flex w-[118px] h-[17px] flex-col justify-center flex-shrink-0 text-[#6B7280] font-inter text-xs font-medium leading-5 hover:text-[#9A7C7C] transition-colors">
                      Forgot Password?
                    </span>
                  </Link>
                </div>
              </div>

              {/* Login Button Container */}
              <div className="flex w-full h-[50px] justify-center items-center flex-shrink-0 mt-9">
                <Button
                  type="submit"
                  className="flex w-full h-[50px] py-[15.5px] justify-center items-center flex-shrink-0 rounded-lg border border-transparent bg-[#9A7C7C] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-[#9A7C7C]/90"
                >
                  <span className="flex w-[76px] h-[19px] flex-col justify-center flex-shrink-0 text-white text-center font-inter text-sm font-normal leading-6">
                    Login Now
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Bottom Account Creation Link */}
          <div className="flex w-full lg:w-[448px] h-6 justify-center items-center relative -mt-[69px]">
            <div className="flex w-full h-6 py-0 px-[79.367px] lg:px-[79.359px] justify-center items-center flex-shrink-0">
              <span className="flex w-[170px] h-[19px] flex-col justify-center flex-shrink-0 text-[#4B5563] text-center font-inter text-sm font-normal leading-6">
                Don't have an account?
              </span>
              <span className="flex w-1 h-[19px] flex-col justify-center flex-shrink-0 text-[#4B5563] text-center font-inter text-sm font-normal leading-6">
                {" "}
              </span>
              <Link to="/signup" className="flex w-[115px] h-6 py-[2.5px] justify-center items-center flex-shrink-0 bg-transparent">
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
