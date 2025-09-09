import React, { useState } from "react";
import { resetUserPassword, confirmUserEmail } from "@/utils/passwordReset";

const AdminPasswordReset: React.FC = () => {
  const [email, setEmail] = useState("arunendu.mazumder@maigon.io");
  const [password, setPassword] = useState("Admin2024!Mx9");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePasswordReset = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      // First confirm the email
      const emailResult = await confirmUserEmail(email);
      if (!emailResult.success) {
        setMessage(`Email confirmation failed: ${emailResult.message}`);
        return;
      }

      // Then reset the password
      const passwordResult = await resetUserPassword(email, password);
      if (passwordResult.success) {
        setMessage(`✅ Password reset successfully for ${email}`);
      } else {
        setMessage(`❌ Password reset failed: ${passwordResult.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetArunenduPassword = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      // Reset Arunendu's password to the expected value
      const result = await resetUserPassword("arunendu.mazumder@maigon.io", "Admin2024!Mx9");
      const emailResult = await confirmUserEmail("arunendu.mazumder@maigon.io");
      
      if (result.success && emailResult.success) {
        setMessage("✅ Arunendu's password has been reset to 'Admin2024!Mx9' and email confirmed");
      } else {
        setMessage(`❌ Failed to reset Arunendu's password: ${result.message} | ${emailResult.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-[#271D1D] mb-6">Admin Password Reset</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9A7C7C]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9A7C7C]"
            />
          </div>
          
          <button
            onClick={handlePasswordReset}
            disabled={isLoading}
            className="w-full bg-[#9A7C7C] hover:bg-[#8A6C6C] disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
          
          <div className="border-t pt-4">
            <button
              onClick={resetArunenduPassword}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? "Resetting..." : "Quick Fix: Reset Arunendu's Password"}
            </button>
          </div>
          
          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordReset;
