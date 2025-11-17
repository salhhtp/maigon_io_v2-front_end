import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/SupabaseUserContext";

const DEMO_LOGIN_ENABLED =
  import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";

export default function DemoLogin() {
  const { isLoggedIn, logout } = useUser();
  const navigate = useNavigate();

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-lora font-medium text-[#271D1D]">
            You are already signed in
          </h1>
          <p className="text-sm text-[#271D1D]/70">
            Head back to your dashboard or sign out before accessing the demo
            experience.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
            <Button
              variant="outline"
              className="text-[#271D1D] border-[#271D1D]/20"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6">
        <Link to="/">
          <Logo size="xl" />
        </Link>
        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/solutions"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Solutions
          </Link>
          <Link
            to="/pricing"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Pricing
          </Link>
          <Button
            asChild
            className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg"
          >
            <Link to="/signin">Sign in</Link>
          </Button>
        </div>
      </nav>

      <section className="py-20 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto bg-white border border-[#E8DDDD] rounded-2xl p-8 shadow-sm space-y-6">
          <div className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9A7C7C]">
              Demo experience
            </p>
            <h1 className="text-3xl lg:text-4xl font-lora text-[#271D1D]">
              Interactive demo login is currently disabled
            </h1>
            <p className="text-sm text-[#725A5A] max-w-2xl mx-auto">
              To keep production data accurate and secure, we no longer ship
              mock accounts in this build. Please use a real Maigon account or
              request access credentials from the admin team.
            </p>
          </div>

          {DEMO_LOGIN_ENABLED ? (
            <div className="bg-[#FDF7F4] border border-[#F2D6C9] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#271D1D]">
                Developer preview mode is active
              </h2>
              <p className="text-sm text-[#725A5A]">
                You have enabled demo mode via{" "}
                <code className="bg-white border border-[#E8DDDD] px-2 py-1 rounded">
                  VITE_ENABLE_DEMO_LOGIN
                </code>
                . Create temporary accounts directly in Supabase or via the
                admin dashboard and share credentials with your testers.
              </p>
              <ul className="text-sm text-[#271D1D]/80 space-y-2 list-disc list-inside">
                <li>Provision test users with the desired roles and plans.</li>
                <li>
                  Use the standard sign-in flow or deliver passwordless links.
                </li>
                <li>Disable the flag before shipping to production.</li>
              </ul>
            </div>
          ) : (
            <div className="bg-[#F3F3F3] border border-[#E8DDDD] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#271D1D]">
                Need a guided walkthrough?
              </h2>
              <p className="text-sm text-[#725A5A]">
                Reach out to{" "}
                <a
                  href="mailto:support@maigon.io"
                  className="text-[#9A7C7C] underline"
                >
                  support@maigon.io
                </a>{" "}
                and we will provision a short-lived sandbox organisation or
                schedule a live session tailored to your use case.
              </p>
            </div>
          )}

          <div className="text-center">
            <Button asChild className="bg-[#271D1D] hover:bg-[#271D1D]/80 text-white">
              <Link to="/signin">Proceed to sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
