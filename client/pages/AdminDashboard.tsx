import { Button } from "@/components/ui/button";
import { ChevronDown, User, UserPlus, Plus, Settings, BarChart3, FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import { useUser } from "@/contexts/UserContext";
import AddUserModal from "@/components/modals/AddUserModal";
import CustomSolutionModal from "@/components/modals/CustomSolutionModal";

const StatCard = ({
  title,
  value,
  icon,
  change,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
}) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-[#D6CECE]/30">
    <div className="flex items-center justify-between mb-4">
      <div className="text-[#725A5A] text-sm font-medium">{title}</div>
      <div className="text-[#9A7C7C]">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-[#271D1D] mb-2">{value}</div>
    {change && (
      <div className="text-sm text-green-600">
        {change}
      </div>
    )}
  </div>
);

const QuickActionCard = ({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-[#D6CECE]/30 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
    <div className="flex items-center mb-4">
      <div className="text-[#9A7C7C] mr-3">{icon}</div>
      <h3 className="text-lg font-semibold text-[#271D1D]">{title}</h3>
    </div>
    <p className="text-[#725A5A] text-sm">{description}</p>
  </div>
);

export default function AdminDashboard() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [customSolutionModalOpen, setCustomSolutionModalOpen] = useState(false);
  const { user } = useUser();
  const userName = user?.name?.split(' ')[0] || 'Admin';

  const handleUserAdded = (userData: any) => {
    console.log('New user added:', userData);
    // In a real app, this would update the user list and show a success message
  };

  const handleSolutionCreated = (solutionData: any) => {
    console.log('New solution created:', solutionData);
    // In a real app, this would update the solutions list and show a success message
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-white shadow-sm">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/admin-dashboard"
            className="text-[#9A7C7C] font-medium"
          >
            Dashboard
          </Link>
          <Link
            to="/admin-users"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Users
          </Link>
          <Link
            to="/admin-solutions"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Solutions
          </Link>
          <Link
            to="/admin-analytics"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Analytics
          </Link>

          {/* User Button */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">@{userName}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Settings
                </Link>
                <Link
                  to="/"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Log Out
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-8 lg:px-16 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#271D1D] font-lora mb-2">
              Admin Dashboard
            </h1>
            <p className="text-[#725A5A]">
              Manage users, solutions, and platform configuration
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value="1,247"
              icon={<Users className="w-5 h-5" />}
              change="+12% this month"
            />
            <StatCard
              title="Active Solutions"
              value="7"
              icon={<FileText className="w-5 h-5" />}
              change="+2 new"
            />
            <StatCard
              title="Reviews Completed"
              value="15,482"
              icon={<BarChart3 className="w-5 h-5" />}
              change="+18% this month"
            />
            <StatCard
              title="System Health"
              value="99.9%"
              icon={<Settings className="w-5 h-5" />}
              change="All systems operational"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#271D1D] font-lora mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickActionCard
                title="Add User"
                description="Add a new user to the platform with specific roles and permissions"
                icon={<UserPlus className="w-6 h-6" />}
                onClick={() => setAddUserModalOpen(true)}
              />
              <QuickActionCard
                title="Create Custom Solution"
                description="Create custom solution playbooks for clients without developer involvement"
                icon={<Plus className="w-6 h-6" />}
                onClick={() => setCustomSolutionModalOpen(true)}
              />
              <QuickActionCard
                title="System Settings"
                description="Configure platform settings, integrations, and security policies"
                icon={<Settings className="w-6 h-6" />}
                onClick={() => {}}
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-[#D6CECE]/30 p-6">
            <h2 className="text-xl font-semibold text-[#271D1D] font-lora mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#D6CECE]/20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#9A7C7C]/20 rounded-full flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-[#9A7C7C]" />
                  </div>
                  <div>
                    <p className="text-[#271D1D] font-medium">New user registered</p>
                    <p className="text-[#725A5A] text-sm">sarah.johnson@example.com</p>
                  </div>
                </div>
                <span className="text-[#725A5A] text-sm">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#D6CECE]/20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#9A7C7C]/20 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#9A7C7C]" />
                  </div>
                  <div>
                    <p className="text-[#271D1D] font-medium">Custom solution created</p>
                    <p className="text-[#725A5A] text-sm">Employment Agreement Playbook</p>
                  </div>
                </div>
                <span className="text-[#725A5A] text-sm">4 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#9A7C7C]/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[#9A7C7C]" />
                  </div>
                  <div>
                    <p className="text-[#271D1D] font-medium">Monthly report generated</p>
                    <p className="text-[#725A5A] text-sm">Platform usage summary</p>
                  </div>
                </div>
                <span className="text-[#725A5A] text-sm">1 day ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onSuccess={handleUserAdded}
      />

      {/* Custom Solution Modal */}
      <CustomSolutionModal
        isOpen={customSolutionModalOpen}
        onClose={() => setCustomSolutionModalOpen(false)}
        onSuccess={handleSolutionCreated}
      />
    </div>
  );
}
