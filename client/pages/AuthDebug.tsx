import React, { useState } from "react";
import { useUser } from "@/contexts/SupabaseUserContext";
import TestingCredentials from "@/components/TestingCredentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AuthDebug: React.FC = () => {
  const [email, setEmail] = useState("arunendu.mazumder@maigon.io");
  const [password, setPassword] = useState("Admin2024!Mx9");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useUser();

  const testSignIn = async (testEmail?: string, testPassword?: string) => {
    setIsLoading(true);
    setResult(null);
    
    const emailToUse = testEmail || email;
    const passwordToUse = testPassword || password;

    try {
      console.log(`Testing sign-in with: ${emailToUse} / ${passwordToUse}`);
      const signInResult = await signIn(emailToUse, passwordToUse);
      setResult(signInResult);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message,
        error: error.toString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-[#271D1D] mb-6">
          🔧 Authentication Debug Page
        </h1>
        
        <div className="space-y-6">
          {/* Manual Testing */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Manual Testing</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Button
                onClick={() => testSignIn()}
                disabled={isLoading}
                className="w-full bg-[#9A7C7C] hover:bg-[#8A6C6C]"
              >
                {isLoading ? "Testing..." : "Test Sign In"}
              </Button>
            </div>
          </div>

          {/* Testing Credentials */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Testing Credentials</h2>
            <TestingCredentials 
              onCredentialSelect={(testEmail, testPassword) => {
                testSignIn(testEmail, testPassword);
              }}
            />
          </div>

          {/* Results */}
          {result && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Result</h2>
              <div className={`p-4 rounded-lg ${
                result.success 
                  ? 'bg-green-100 border border-green-300' 
                  : 'bg-red-100 border border-red-300'
              }`}>
                <div className="space-y-2">
                  <div>
                    <strong>Success:</strong> {result.success ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Message:</strong> {result.message}
                  </div>
                  {result.user && (
                    <div>
                      <strong>User:</strong> {result.user.name} ({result.user.email})
                    </div>
                  )}
                  {result.error && (
                    <div>
                      <strong>Error:</strong> 
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Debugging Info */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <div className="text-sm space-y-2">
              <div><strong>Environment:</strong> Development</div>
              <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL}</div>
              <div><strong>Issue:</strong> Original Arunendu credentials not working</div>
              <div><strong>Solution:</strong> Using mock authentication for testing</div>
              <div><strong>Access:</strong> <a href="/signin" className="text-blue-600 hover:underline">Go to Sign In</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;
