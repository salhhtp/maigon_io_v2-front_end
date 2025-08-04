import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-[#F9F8F8] flex">
      {/* Left side - Welcome message */}
      <div className="flex-1 flex flex-col justify-center items-start px-12 lg:px-16">
        <div className="max-w-2xl">
          <div className="mb-16">
            <div className="text-4xl lg:text-5xl font-medium bg-gradient-to-r from-[#B6A5A5] to-transparent bg-clip-text text-transparent mb-12">
              <span className="font-lora">MAIGON</span>
            </div>
          </div>

          <h1 className="text-5xl lg:text-6xl font-medium text-[#313832] font-lora leading-tight mb-8">
            Welcome Back!
          </h1>
          
          <p className="text-[#4B5563] text-lg leading-relaxed">
            To continue with Maigon, please log in with your credentials.
          </p>
        </div>
      </div>

      {/* Right side - Sign in form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#4B5563] text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#4B5563] text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                    required
                  />
                </div>
              </div>

              {/* Remember me and Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-[#767676]"
                  />
                  <Label htmlFor="remember" className="text-[#4B5563] text-sm">
                    Remember Me
                  </Label>
                </div>
                <Link to="/forgot-password" className="text-[#6B7280] text-sm hover:text-[#9A7C7C] transition-colors">
                  Forgot Password?
                </Link>
              </div>

              {/* Login button */}
              <Button
                type="submit"
                className="w-full h-12 bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white text-sm rounded-lg"
              >
                Login Now
              </Button>

              {/* Sign up link */}
              <div className="text-center">
                <span className="text-[#4B5563] text-sm">Don't have an account? </span>
                <Link to="/signup" className="text-[#9A7C7C] text-sm font-medium hover:underline">
                  Create Account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
