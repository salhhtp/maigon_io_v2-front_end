import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  User,
  DollarSign,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  Edit,
  Trash2,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";
import AddUserModal from "@/components/modals/AddUserModal";
import CustomSolutionModal from "@/components/modals/CustomSolutionModal";

// Dashboard Widget Components
const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#F3F3F3] rounded-lg">{icon}</div>
        <h3 className="font-lora text-sm font-medium text-[#271D1D]">
          {title}
        </h3>
      </div>
      {trend && (
        <span
          className={`text-xs font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}
        >
          {trend.positive ? "+" : ""}
          {trend.value}
        </span>
      )}
    </div>
    <div>
      <p className="font-lora text-2xl font-medium text-[#271D1D] mb-1">
        {value}
      </p>
      <p className="text-xs text-[#271D1D]/70">{subtitle}</p>
    </div>
  </div>
);

const UsageChart = ({
  monthlyUsage,
}: {
  monthlyUsage: Array<{ month: string; reviews: number; max: number }>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedUsage = isExpanded ? monthlyUsage : monthlyUsage.slice(0, 3);

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-lora text-lg font-medium text-[#271D1D]">
          Contract Review Usage
        </h3>
        {monthlyUsage.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-[#9A7C7C] hover:text-[#9A7C7C]/90 transition-colors"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Show All ({monthlyUsage.length})
              </>
            )}
          </button>
        )}
      </div>
      <div className="space-y-4">
        {displayedUsage.map((data, index) => (
          <div key={index} className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#271D1D] w-8">
              {data.month}
            </span>
            <div className="flex-1 bg-[#F3F3F3] rounded-full h-2 relative">
              <div
                className="bg-[#9A7C7C] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${data.max > 0 ? (data.reviews / data.max) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-[#271D1D]/70 w-16">
              {data.reviews}/{data.max === -1 ? "∞" : data.max}
            </span>
          </div>
        ))}
        {!isExpanded && monthlyUsage.length > 3 && (
          <div className="text-center pt-2 border-t border-[#F3F3F3]">
            <span className="text-xs text-[#271D1D]/50">
              +{monthlyUsage.length - 3} more months
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const RecentActivity = ({
  activities,
}: {
  activities: Array<{
    action: string;
    file: string;
    time: string;
    status: string;
  }>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedActivities = isExpanded ? activities : activities.slice(0, 5);

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-lora text-lg font-medium text-[#271D1D]">
          Recent Activity
        </h3>
        {activities.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-[#9A7C7C] hover:text-[#9A7C7C]/90 transition-colors"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Show All ({activities.length})
              </>
            )}
          </button>
        )}
      </div>
      <div className="space-y-4">
        {displayedActivities.length > 0 ? (
          <>
            {displayedActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-[#F3F3F3] last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.status === "completed"
                        ? "bg-green-500"
                        : activity.status === "processing"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      {activity.action}
                    </p>
                    <p className="text-xs text-[#271D1D]/70">{activity.file}</p>
                  </div>
                </div>
                <span className="text-xs text-[#271D1D]/50">
                  {activity.time}
                </span>
              </div>
            ))}
            {!isExpanded && activities.length > 5 && (
              <div className="text-center pt-2 border-t border-[#F3F3F3]">
                <span className="text-xs text-[#271D1D]/50">
                  +{activities.length - 5} more activities
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-[#271D1D]/50">
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">
              Start reviewing contracts to see your activity here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminUserManagement = ({ onAddUser }: { onAddUser: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const allUsers = [
    {
      name: "John Doe",
      email: "john@company.com",
      plan: "Enterprise",
      status: "active",
      usage: "78/100",
    },
    {
      name: "Sarah Wilson",
      email: "sarah@startup.io",
      plan: "Professional",
      status: "active",
      usage: "45/50",
    },
    {
      name: "Mike Chen",
      email: "mike@legal.com",
      plan: "Basic",
      status: "inactive",
      usage: "12/20",
    },
    {
      name: "Emma Davis",
      email: "emma@corp.com",
      plan: "Enterprise",
      status: "active",
      usage: "92/100",
    },
    {
      name: "Alex Johnson",
      email: "alex@techcorp.com",
      plan: "Professional",
      status: "active",
      usage: "23/50",
    },
    {
      name: "Lisa Martinez",
      email: "lisa@lawfirm.com",
      plan: "Basic",
      status: "active",
      usage: "15/20",
    },
    {
      name: "David Brown",
      email: "david@consultant.com",
      plan: "Enterprise",
      status: "active",
      usage: "156/200",
    },
    {
      name: "Maria Garcia",
      email: "maria@startup.co",
      plan: "Professional",
      status: "inactive",
      usage: "8/50",
    },
  ];
  // Filter users based on search term and filters
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesPlan = planFilter === "all" || user.plan.toLowerCase() === planFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const displayedUsers = isExpanded ? filteredUsers : filteredUsers.slice(0, 4);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPlanFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || planFilter !== "all";

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="font-lora text-lg font-medium text-[#271D1D]">
            User Management
          </h3>
          {filteredUsers.length > 4 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-[#9A7C7C] hover:text-[#9A7C7C]/90 transition-colors"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  Show All ({filteredUsers.length})
                </>
              )}
            </button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-[#9A7C7C] bg-[#9A7C7C]/10 px-2 py-1 rounded-full">
              {filteredUsers.length} of {allUsers.length} users
            </span>
          )}
        </div>
        <Button
          onClick={onAddUser}
          className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#271D1D]/50" />
          <Input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border-[#271D1D]/20 focus:border-[#9A7C7C] focus:ring-[#9A7C7C]"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`text-[#271D1D] border-[#271D1D]/20 ${
                  statusFilter !== "all" ? "bg-[#9A7C7C]/10 border-[#9A7C7C]" : ""
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Status: {statusFilter === "all" ? "All" : statusFilter}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Plan Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`text-[#271D1D] border-[#271D1D]/20 ${
                  planFilter !== "all" ? "bg-[#9A7C7C]/10 border-[#9A7C7C]" : ""
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Plan: {planFilter === "all" ? "All" : planFilter}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Plan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPlanFilter("all")}>
                All Plans
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("enterprise")}>
                Enterprise
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("professional")}>
                Professional
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("basic")}>
                Basic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-[#271D1D]/70 hover:text-[#271D1D]"
            >
              <X className="w-4 h-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {displayedUsers.map((user, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-[#F9F8F8] rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#D6CECE] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-[#271D1D]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#271D1D]">
                  {user.name}
                </p>
                <p className="text-xs text-[#271D1D]/70">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-[#271D1D]">
                  {user.plan}
                </p>
                <p className="text-xs text-[#271D1D]/70">
                  {user.usage} contracts
                </p>
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {user.status}
              </div>
              <div className="flex gap-1">
                <button className="p-1 hover:bg-[#D6CECE] rounded">
                  <Edit className="w-3 h-3 text-[#271D1D]" />
                </button>
                <button className="p-1 hover:bg-red-100 rounded">
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!isExpanded && filteredUsers.length > 4 && (
          <div className="text-center pt-2 border-t border-[#F3F3F3]">
            <span className="text-xs text-[#271D1D]/50">
              +{filteredUsers.length - 4} more users
            </span>
          </div>
        )}
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-[#271D1D]/50">
            <User className="w-8 h-8 mx-auto mb-3 text-[#271D1D]/30" />
            <p className="text-sm">No users match your filters</p>
            <p className="text-xs mt-1">
              Try adjusting your search term or filters
            </p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mt-2 text-[#9A7C7C] hover:text-[#9A7C7C]/90"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminSolutionCreator = ({
  onCreateSolution,
}: {
  onCreateSolution: () => void;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-lora text-lg font-medium text-[#271D1D]">
        Custom Solutions
      </h3>
      <Button
        onClick={onCreateSolution}
        className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-4 py-2 rounded-lg text-sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Solution
      </Button>
    </div>
    <div className="space-y-3">
      {[
        {
          name: "Healthcare Compliance Suite",
          client: "MedCorp Inc.",
          status: "active",
          contracts: 245,
        },
        {
          name: "Financial Services Package",
          client: "BankTech Ltd.",
          status: "development",
          contracts: 0,
        },
        {
          name: "Manufacturing Agreements",
          client: "Industrial Co.",
          status: "active",
          contracts: 89,
        },
      ].map((solution, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 border border-[#F3F3F3] rounded-lg"
        >
          <div>
            <p className="text-sm font-medium text-[#271D1D]">
              {solution.name}
            </p>
            <p className="text-xs text-[#271D1D]/70">
              Client: {solution.client}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-[#271D1D]">
                {solution.contracts} contracts
              </p>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  solution.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {solution.status}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-[#271D1D] border-[#271D1D]/20"
            >
              Configure
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [customSolutionModalOpen, setCustomSolutionModalOpen] = useState(false);
  const location = useLocation();
  const { user, isLoggedIn } = useUser();

  const handleUserAdded = (userData: any) => {
    console.log("New user added:", userData);
    // In a real app, this would update the user list and show a success message
  };

  const handleSolutionCreated = (solutionData: any) => {
    console.log("New solution created:", solutionData);
    // In a real app, this would update the solutions list and show a success message
  };

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-lora font-medium text-[#271D1D] mb-4">
            Access Denied
          </h1>
          <p className="text-[#271D1D]/70 mb-6">
            Please log in to view your dashboard.
          </p>
          <Link to="/signin">
            <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/user-solutions"
            className={`transition-colors ${
              location.pathname === "/user-solutions"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Solutions
          </Link>
          <Link
            to="/pricing"
            className={`transition-colors ${
              location.pathname === "/pricing"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Pricing
          </Link>
          <Link
            to="/user-news"
            className={`transition-colors ${
              location.pathname === "/user-news"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            News
          </Link>
          <Link
            to="/user-team"
            className={`transition-colors ${
              location.pathname === "/user-team"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Team
          </Link>
          <Link
            to="/dashboard"
            className={`transition-colors ${
              location.pathname === "/dashboard"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Dashboard
          </Link>

          {/* User Button */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">
                @{user.name.split(" ")[0]}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Profile & Settings
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

        {/* Mobile Navigation */}
        <MobileNavigation
          isLoggedIn={true}
          userName={user.name.split(" ")[0]}
        />
      </nav>

      {/* Main Content */}
      <main className="pt-24 lg:pt-32 pb-20 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora">
                {isAdmin ? "Admin Dashboard" : "Dashboard"}
              </h1>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <div className="px-3 py-1 bg-[#9A7C7C] text-white rounded-full text-sm font-medium">
                    Administrator
                  </div>
                )}
                <Link to="/profile">
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Profile & Settings
                  </Button>
                </Link>
              </div>
            </div>
            <p className="text-lg text-[#271D1D]/70">
              Welcome back, {user.name.split(" ")[0]}!{" "}
              {isAdmin
                ? "Manage your platform and users from here."
                : "Track your contract reviews and billing information."}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Reviews"
              value={user.usage.total_reviews.toString()}
              subtitle="All time"
              icon={<FileText className="w-5 h-5 text-[#9A7C7C]" />}
              trend={
                user.usage.this_month_reviews > 0
                  ? { value: "Active", positive: true }
                  : undefined
              }
            />
            <StatsCard
              title="Current Bill"
              value={
                user.plan.billing_cycle === "trial"
                  ? "€0"
                  : `€${user.billing.current_bill}`
              }
              subtitle={
                user.plan.billing_cycle === "trial"
                  ? "Free trial"
                  : user.plan.next_billing_date
                    ? `Due ${user.plan.next_billing_date}`
                    : "Pay per use"
              }
              icon={<DollarSign className="w-5 h-5 text-[#9A7C7C]" />}
            />
            {isAdmin && (
              <>
                <StatsCard
                  title="Active Users"
                  value="127"
                  subtitle="Across all plans"
                  icon={<Users className="w-5 h-5 text-[#9A7C7C]" />}
                  trend={{ value: "15%", positive: true }}
                />
                <StatsCard
                  title="Revenue"
                  value="€48,230"
                  subtitle="This month"
                  icon={<BarChart3 className="w-5 h-5 text-[#9A7C7C]" />}
                  trend={{ value: "23%", positive: true }}
                />
              </>
            )}
            {!isAdmin && (
              <>
                <StatsCard
                  title="Plan Usage"
                  value={
                    user.plan.contracts_limit === -1
                      ? `${user.plan.contracts_used}/∞`
                      : `${user.plan.contracts_used}/${user.plan.contracts_limit}`
                  }
                  subtitle={
                    user.plan.contracts_limit === -1
                      ? "Unlimited"
                      : "Contracts remaining"
                  }
                  icon={<BarChart3 className="w-5 h-5 text-[#9A7C7C]" />}
                />
                <StatsCard
                  title="Success Rate"
                  value={`${user.usage.success_rate}%`}
                  subtitle="Reviews completed"
                  icon={<BarChart3 className="w-5 h-5 text-[#9A7C7C]" />}
                />
              </>
            )}
          </div>

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              <UsageChart monthlyUsage={user.usage.monthly_usage} />
              <RecentActivity activities={user.recent_activity} />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {isAdmin ? (
                <>
                  <AdminUserManagement
                    onAddUser={() => setAddUserModalOpen(true)}
                  />
                  <AdminSolutionCreator
                    onCreateSolution={() => setCustomSolutionModalOpen(true)}
                  />
                </>
              ) : (
                <>
                  {/* Billing Information */}
                  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
                      Billing Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-[#F9F8F8] rounded-lg">
                        <span className="text-sm font-medium text-[#271D1D]">
                          Current Plan
                        </span>
                        <span className="text-sm text-[#271D1D]/70">
                          {user.plan.name}
                          {user.plan.billing_cycle !== "trial" &&
                            ` (€${user.plan.price}${user.plan.billing_cycle === "monthly" ? "/month" : user.plan.billing_cycle === "per_contract" ? "/contract" : ""})`}
                        </span>
                      </div>
                      {user.plan.next_billing_date && (
                        <div className="flex justify-between items-center p-3 bg-[#F9F8F8] rounded-lg">
                          <span className="text-sm font-medium text-[#271D1D]">
                            Next Billing Date
                          </span>
                          <span className="text-sm text-[#271D1D]/70">
                            {user.plan.next_billing_date}
                          </span>
                        </div>
                      )}
                      {user.plan.trial_days_remaining && (
                        <div className="flex justify-between items-center p-3 bg-[#F9F8F8] rounded-lg">
                          <span className="text-sm font-medium text-[#271D1D]">
                            Trial Days Remaining
                          </span>
                          <span className="text-sm text-[#271D1D]/70">
                            {user.plan.trial_days_remaining} days
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-3 bg-[#F9F8F8] rounded-lg">
                        <span className="text-sm font-medium text-[#271D1D]">
                          Payment Method
                        </span>
                        <span className="text-sm text-[#271D1D]/70">
                          {user.billing.payment_method}
                        </span>
                      </div>
                      <Link to="/pricing">
                        <Button className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                          {user.plan.type === "free_trial"
                            ? "Upgrade Plan"
                            : "Manage Billing"}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Link to="/user-solutions">
                        <Button
                          variant="outline"
                          className="w-full justify-start text-[#271D1D] border-[#271D1D]/20"
                        >
                          <FileText className="w-4 h-4 mr-3" />
                          Review New Contract
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-[#271D1D] border-[#271D1D]/20"
                      >
                        <DollarSign className="w-4 h-4 mr-3" />
                        Download Invoice
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-[#271D1D] border-[#271D1D]/20"
                      >
                        <BarChart3 className="w-4 h-4 mr-3" />
                        View Usage Report
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

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
