import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/SupabaseUserContext";
import Index from "@/pages/Index";

const RootRedirect: React.FC = () => {
  const { user, isLoggedIn, isLoading, authStatus, lastError } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    const hashParams = new URLSearchParams(hash.substring(1));
    const hasAuthTokens =
      hashParams.get("access_token") ||
      searchParams.get("access_token") ||
      hashParams.get("type") === "signup" ||
      searchParams.get("type") === "signup" ||
      hashParams.get("type") === "recovery" ||
      searchParams.get("type") === "recovery";

    if (hasAuthTokens) {
      navigate("/email-verification", { replace: true });
      return;
    }

    if (!isLoading && authStatus === "authenticated" && isLoggedIn && user) {
      if (user.hasTemporaryPassword) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [authStatus, isLoading, isLoggedIn, user, navigate]);

  if (authStatus === "error") {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-[#271D1D]">We couldn't verify your session</h1>
          {lastError ? (
            <p className="text-sm text-[#6B7280] leading-relaxed">{lastError}</p>
          ) : (
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Please refresh the page or sign in again to continue.
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 px-6 items-center justify-center rounded-md bg-[#9A7C7C] text-white text-sm font-medium transition hover:bg-[#8a6e6e]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#9A7C7C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#271D1D]">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Index />;
  }

  return null;
};

export default RootRedirect;
