import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { useUser } from "@/contexts/SupabaseUserContext";

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, changePassword } = useUser();
  const navigate = useNavigate();

  // Redirect if user doesn't need to change password
  React.useEffect(() => {
    if (!user?.hasTemporaryPassword) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push("Password must contain at least one special character (!@#$%^&*)");
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password strength
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(", "));
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(currentPassword, newPassword);

      if (result.success) {
        // Redirect to dashboard after successful password change
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.hasTemporaryPassword) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Logo size="xl" />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#271D1D] mb-2">
              Change Your Password
            </h2>
            <p className="text-gray-600 text-sm">
              For security reasons, you must change your temporary password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-[#4B5563] text-sm font-medium">
                Current (Temporary) Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter your temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-[#4B5563] text-sm font-medium">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                required
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#4B5563] text-sm font-medium">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                required
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains uppercase and lowercase letters</li>
                <li>• Contains at least one number</li>
                <li>• Contains at least one special character (!@#$%^&*)</li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm rounded-lg"
            >
              {isLoading ? "Changing Password..." : "Change Password"}
            </Button>
          </form>

          {/* Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              After changing your password, you'll be redirected to your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
