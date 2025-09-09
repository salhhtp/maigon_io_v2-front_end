import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/SupabaseUserContext";

const EmailVerification: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useUser();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the hash from URL (Supabase sends verification data in URL hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Also check search params as fallback
        const urlAccessToken = searchParams.get('access_token');
        const urlRefreshToken = searchParams.get('refresh_token');
        const urlType = searchParams.get('type');

        const token = accessToken || urlAccessToken;
        const refresh = refreshToken || urlRefreshToken;
        const eventType = type || urlType;

        if (eventType === 'signup' && token && refresh) {
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refresh,
          });

          if (error) {
            console.error('Email verification error:', error);
            setVerificationResult({
              success: false,
              message: 'Email verification failed. Please try again or contact support.',
            });
          } else if (data.user) {
            setVerificationResult({
              success: true,
              message: 'Email verified successfully! You are now logged in.',
            });

            // Wait a moment then redirect to dashboard
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 2000);
          }
        } else if (eventType === 'recovery') {
          // Handle password reset
          setVerificationResult({
            success: true,
            message: 'Password reset verified. You can now set a new password.',
          });
          setTimeout(() => {
            navigate('/reset-password', { replace: true });
          }, 2000);
        } else {
          // No verification tokens found, might be an already verified user
          setVerificationResult({
            success: false,
            message: 'No verification data found. You may already be verified.',
          });
          setTimeout(() => {
            navigate('/signin', { replace: true });
          }, 3000);
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setVerificationResult({
          success: false,
          message: 'An unexpected error occurred during verification.',
        });
      } finally {
        setIsVerifying(false);
      }
    };

    handleEmailVerification();
  }, [navigate, searchParams]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-12 h-12 border-4 border-[#9A7C7C] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-[#271D1D] mb-4">
            Verifying Your Email
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
          verificationResult?.success 
            ? 'bg-green-100 text-green-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {verificationResult?.success ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h2 className={`text-2xl font-bold mb-4 ${
          verificationResult?.success ? 'text-green-600' : 'text-red-600'
        }`}>
          {verificationResult?.success ? 'Email Verified!' : 'Verification Failed'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {verificationResult?.message}
        </p>

        {!verificationResult?.success && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/signin', { replace: true })}
              className="w-full bg-[#9A7C7C] hover:bg-[#8A6C6C] text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
