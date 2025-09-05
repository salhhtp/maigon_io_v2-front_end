import { Button } from "@/components/ui/button";
import { User, Crown, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useUser, mockUsers } from "@/contexts/UserContext";

const UserCard = ({
  userName,
  user,
  onLogin,
}: {
  userName: string;
  user: any;
  onLogin: (userName: string) => void;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-[#D6CECE] rounded-full flex items-center justify-center">
        {user.role === "admin" ? (
          <Crown className="w-6 h-6 text-[#9A7C7C]" />
        ) : (
          <User className="w-6 h-6 text-[#271D1D]" />
        )}
      </div>
      <div>
        <h3 className="font-lora text-lg font-medium text-[#271D1D]">
          {user.name}
        </h3>
        <p className="text-sm text-[#271D1D]/70">{user.email}</p>
      </div>
      {user.role === "admin" && (
        <div className="ml-auto">
          <span className="bg-[#9A7C7C] text-white px-2 py-1 rounded-full text-xs font-medium">
            Admin
          </span>
        </div>
      )}
    </div>

    <div className="space-y-3 mb-6">
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#271D1D]/70">Plan:</span>
        <span className="font-medium text-[#271D1D]">{user.plan.name}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#271D1D]/70">Company:</span>
        <span className="font-medium text-[#271D1D]">{user.company}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#271D1D]/70">Reviews:</span>
        <span className="font-medium text-[#271D1D]">
          {user.usage.total_reviews}
        </span>
      </div>
      {user.plan.trial_days_remaining && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#271D1D]/70">Trial:</span>
          <span className="font-medium text-orange-600">
            {user.plan.trial_days_remaining} days left
          </span>
        </div>
      )}
    </div>

    <Button
      onClick={() => onLogin(userName)}
      className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
    >
      Login as {user.name.split(" ")[0]}
    </Button>
  </div>
);

export default function DemoLogin() {
  const { setUser, isLoggedIn, logout } = useUser();
  const navigate = useNavigate();

  const handleLogin = (userName: string) => {
    const user = mockUsers[userName];
    if (user) {
      setUser(user);
      localStorage.setItem("maigon_current_user", userName);
      navigate("/profile");
    }
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-lora font-medium text-[#271D1D] mb-4">
            Already Logged In
          </h1>
          <p className="text-[#271D1D]/70 mb-6">
            You're already logged in. Go to your profile or logout first.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/profile">
              <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                Go to Profile
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="text-[#271D1D] border-[#271D1D]/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
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
            to="/news"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            News
          </Link>
          <Link
            to="/team"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Team
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
            <Link to="/signin">Sign In/Up</Link>
          </Button>
        </div>
      </nav>

      {/* Demo Login Section */}
      <section className="py-20 px-8 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora mb-6">
              Demo Login
            </h1>
            <p className="text-lg text-[#271D1D]/70 mb-8">
              Choose a test user to explore different features and user
              experiences.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">
                <strong>For Developers:</strong> You can also use the browser
                console:
                <code className="bg-blue-100 px-2 py-1 rounded ml-2">
                  window.maigonLogin('adam')
                </code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(mockUsers).map(([userName, user]) => (
              <UserCard
                key={userName}
                userName={userName}
                user={user}
                onLogin={handleLogin}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 max-w-4xl mx-auto">
              <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
                Test User Guide
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-[#9A7C7C] mb-2">
                    👑 Adam (Admin)
                  </h4>
                  <ul className="text-[#271D1D]/70 space-y-1">
                    <li>• Professional Plan (€2,450)</li>
                    <li>• 324 total reviews</li>
                    <li>• Admin dashboard features</li>
                    <li>• User management tools</li>
                    <li>• Custom solutions creator</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-[#9A7C7C] mb-2">
                    👤 John (Regular User)
                  </h4>
                  <ul className="text-[#271D1D]/70 space-y-1">
                    <li>• Monthly Plan (€799)</li>
                    <li>• 67 total reviews</li>
                    <li>• 7/10 contracts used</li>
                    <li>• Standard dashboard</li>
                    <li>• Billing management</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-[#9A7C7C] mb-2">
                    🆓 Sarah (Trial User)
                  </h4>
                  <ul className="text-[#271D1D]/70 space-y-1">
                    <li>• Free Trial (€0)</li>
                    <li>• 0 reviews done</li>
                    <li>• 5 trial days remaining</li>
                    <li>• Upgrade prompts</li>
                    <li>• Limited features</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
