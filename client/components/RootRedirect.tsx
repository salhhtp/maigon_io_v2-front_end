import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/SupabaseUserContext";
import Index from "@/pages/Index";

const RootRedirect: React.FC = () => {
  const { user, isLoggedIn, isLoading } = useUser();
  const navigate = useNavigate();
  const [forceShowPublic, setForceShowPublic] = React.useState(false);

  // Fallback timeout to prevent infinite loading
  React.useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('RootRedirect: Loading took too long, forcing public view');
        setForceShowPublic(true);
      }
    }, 8000); // 8 second fallback

    return () => clearTimeout(fallbackTimeout);
  }, [isLoading]);

  useEffect(() => {
    // Check if this is an email verification callback
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // Check for Supabase auth tokens in URL hash or search params
    const hashParams = new URLSearchParams(hash.substring(1));
    const hasAuthTokens =
      hashParams.get('access_token') ||
      searchParams.get('access_token') ||
      hashParams.get('type') === 'signup' ||
      searchParams.get('type') === 'signup' ||
      hashParams.get('type') === 'recovery' ||
      searchParams.get('type') === 'recovery';

    if (hasAuthTokens) {
      // Redirect to email verification handler
      navigate("/email-verification", { replace: true });
      return;
    }

    // Only redirect after the user context has finished loading
    if (!isLoading) {
      if (isLoggedIn && user) {
        // Check if user has temporary password and needs to change it
        if (user.hasTemporaryPassword) {
          navigate("/change-password", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
      // If not logged in or user is null, stay on current page (public view)
    }
  }, [isLoggedIn, isLoading, user, navigate]);

  // Show loading state while checking authentication (unless forced to show public)
  if (isLoading && !forceShowPublic) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#9A7C7C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#271D1D]">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in or forced to show public, show the public homepage
  if (!isLoggedIn || forceShowPublic) {
    return <Index />;
  }

  // Return null during redirect (this state should be brief)
  return null;
};

export default RootRedirect;
