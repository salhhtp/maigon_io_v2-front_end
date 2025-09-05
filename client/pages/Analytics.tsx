import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import {
  User,
  ChevronDown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Activity,
  Calendar,
  Globe,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Mock analytics data
const analyticsData = {
  overview: {
    totalUsers: 2847,
    activeUsers: 1923,
    totalRevenue: 892450,
    contractsReviewed: 15643,
    userGrowth: 12.5,
    revenueGrowth: 18.2,
    activeUsersGrowth: 8.7,
    contractsGrowth: 23.1,
  },
  userMetrics: {
    byPlan: [
      { plan: "Free Trial", users: 1156, revenue: 0, percentage: 40.6 },
      { plan: "Pay-As-You-Go", users: 687, revenue: 175230, percentage: 24.1 },
      { plan: "Monthly 10", users: 523, revenue: 318540, percentage: 18.4 },
      { plan: "Monthly 15", users: 312, revenue: 298680, percentage: 11.0 },
      { plan: "Enterprise Plan", users: 169, revenue: 100000, percentage: 5.9 },
    ],
    retention: [
      { period: "1 Week", rate: 87.3 },
      { period: "1 Month", rate: 74.8 },
      { period: "3 Months", rate: 62.1 },
      { period: "6 Months", rate: 48.9 },
      { period: "1 Year", rate: 34.2 },
    ],
    geography: [
      { country: "United States", users: 1124, percentage: 39.5 },
      { country: "United Kingdom", users: 487, percentage: 17.1 },
      { country: "Germany", users: 382, percentage: 13.4 },
      { country: "France", users: 295, percentage: 10.4 },
      { country: "Canada", users: 201, percentage: 7.1 },
      { country: "Others", users: 358, percentage: 12.5 },
    ],
  },
  platformMetrics: {
    usage: [
      { month: "Jan", contracts: 1203, users: 2156, revenue: 67890 },
      { month: "Feb", contracts: 1456, users: 2298, revenue: 73240 },
      { month: "Mar", contracts: 1678, users: 2401, revenue: 78560 },
      { month: "Apr", contracts: 1892, users: 2523, revenue: 81290 },
      { month: "May", contracts: 2134, users: 2687, revenue: 85430 },
      { month: "Jun", contracts: 2456, users: 2847, revenue: 89245 },
    ],
    contractTypes: [
      { type: "Data Processing Agreements", count: 4234, percentage: 27.1 },
      { type: "Non-Disclosure Agreements", count: 3876, percentage: 24.8 },
      { type: "Consultancy Agreements", count: 2891, percentage: 18.5 },
      { type: "Privacy Policy Documents", count: 2156, percentage: 13.8 },
      { type: "Product Supply Agreements", count: 1542, percentage: 9.9 },
      { type: "Others", count: 944, percentage: 6.0 },
    ],
    performance: {
      avgProcessingTime: 24.6,
      successRate: 98.7,
      errorRate: 1.3,
      apiUptime: 99.92,
    },
    topFeatures: [
      { feature: "Compliance Reports", usage: 94.2 },
      { feature: "Clause Extraction", usage: 87.5 },
      { feature: "Risk Assessment", usage: 82.1 },
      { feature: "API Integration", usage: 34.7 },
      { feature: "Custom Rules", usage: 28.9 },
    ],
  },
};

const MetricCard = ({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down";
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#F3F3F3] rounded-lg">{icon}</div>
        <h3 className="font-lora text-sm font-medium text-[#271D1D]">
          {title}
        </h3>
      </div>
      <div className="flex items-center gap-1">
        {trend === "up" ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span
          className={`text-xs font-medium ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend === "up" ? "+" : ""}
          {change}%
        </span>
      </div>
    </div>
    <p className="font-lora text-2xl font-medium text-[#271D1D]">{value}</p>
  </div>
);

const SimpleChart = ({
  data,
  title,
  type = "bar",
}: {
  data: any[];
  title: string;
  type?: "bar" | "line" | "pie";
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
      {title}
    </h3>
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
              }}
            />
            <span className="text-sm text-[#271D1D]">
              {item.month || item.plan || item.type || item.country || item.feature}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-[#271D1D]">
              {item.contracts || item.users || item.count || item.revenue || item.usage}
              {item.percentage && (
                <span className="text-xs text-[#271D1D]/70 ml-1">
                  ({item.percentage}%)
                </span>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PerformanceIndicator = ({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: number;
  unit: string;
  status: "good" | "warning" | "critical";
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "good":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-[#271D1D]/10">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <span className="font-medium text-[#271D1D]">{label}</span>
      </div>
      <span className={`font-bold ${getStatusColor()}`}>
        {value}
        {unit}
      </span>
    </div>
  );
};

export default function Analytics() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("30d");
  const location = useLocation();
  const { user, isLoggedIn } = useUser();

  // Check if user is admin
  if (!isLoggedIn || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-lora font-medium text-[#271D1D] mb-4">
            Access Denied
          </h1>
          <p className="text-[#271D1D]/70 mb-6">
            This page is only accessible to administrators.
          </p>
          <Link to="/dashboard">
            <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const userName = user.name.split(" ")[0];

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
          <Link
            to="/analytics"
            className={`transition-colors ${
              location.pathname === "/analytics"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
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
                className={`w-4 h-4 text-[#271D1D] transition-transform ${
                  userDropdownOpen ? "rotate-180" : ""
                }`}
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
        <MobileNavigation isLoggedIn={true} userName={userName} />
      </nav>

      {/* Main Content */}
      <main className="pt-24 lg:pt-32 pb-20 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-2">
                Advanced Analytics
              </h1>
              <p className="text-[#271D1D]/70">
                Comprehensive platform insights and user metrics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {timeRange === "7d" ? "Last 7 days" : 
                     timeRange === "30d" ? "Last 30 days" :
                     timeRange === "90d" ? "Last 90 days" : "Last year"}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTimeRange("7d")}>
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("30d")}>
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("90d")}>
                    Last 90 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeRange("1y")}>
                    Last year
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Overview Metrics */}
          <section className="mb-8">
            <h2 className="text-xl font-medium text-[#271D1D] font-lora mb-4">
              Platform Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={analyticsData.overview.totalUsers.toLocaleString()}
                change={analyticsData.overview.userGrowth}
                icon={<Users className="w-5 h-5 text-[#9A7C7C]" />}
                trend="up"
              />
              <MetricCard
                title="Active Users"
                value={analyticsData.overview.activeUsers.toLocaleString()}
                change={analyticsData.overview.activeUsersGrowth}
                icon={<Activity className="w-5 h-5 text-[#9A7C7C]" />}
                trend="up"
              />
              <MetricCard
                title="Total Revenue"
                value={`€${(analyticsData.overview.totalRevenue / 1000).toFixed(0)}k`}
                change={analyticsData.overview.revenueGrowth}
                icon={<DollarSign className="w-5 h-5 text-[#9A7C7C]" />}
                trend="up"
              />
              <MetricCard
                title="Contracts Reviewed"
                value={analyticsData.overview.contractsReviewed.toLocaleString()}
                change={analyticsData.overview.contractsGrowth}
                icon={<FileText className="w-5 h-5 text-[#9A7C7C]" />}
                trend="up"
              />
            </div>
          </section>

          {/* Charts Section */}
          <section className="mb-8">
            <h2 className="text-xl font-medium text-[#271D1D] font-lora mb-4">
              Usage Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleChart
                data={analyticsData.platformMetrics.usage}
                title="Monthly Platform Usage"
                type="bar"
              />
              <SimpleChart
                data={analyticsData.userMetrics.byPlan}
                title="Users by Plan Distribution"
                type="pie"
              />
              <SimpleChart
                data={analyticsData.platformMetrics.contractTypes}
                title="Contract Types Analysis"
                type="bar"
              />
              <SimpleChart
                data={analyticsData.userMetrics.geography}
                title="Geographic Distribution"
                type="bar"
              />
            </div>
          </section>

          {/* Performance Indicators */}
          <section className="mb-8">
            <h2 className="text-xl font-medium text-[#271D1D] font-lora mb-4">
              Platform Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PerformanceIndicator
                label="Avg. Processing Time"
                value={analyticsData.platformMetrics.performance.avgProcessingTime}
                unit="s"
                status="good"
              />
              <PerformanceIndicator
                label="Success Rate"
                value={analyticsData.platformMetrics.performance.successRate}
                unit="%"
                status="good"
              />
              <PerformanceIndicator
                label="Error Rate"
                value={analyticsData.platformMetrics.performance.errorRate}
                unit="%"
                status="good"
              />
              <PerformanceIndicator
                label="API Uptime"
                value={analyticsData.platformMetrics.performance.apiUptime}
                unit="%"
                status="good"
              />
            </div>
          </section>

          {/* Additional Analytics */}
          <section className="mb-8">
            <h2 className="text-xl font-medium text-[#271D1D] font-lora mb-4">
              Detailed Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleChart
                data={analyticsData.userMetrics.retention}
                title="User Retention Rates"
                type="line"
              />
              <SimpleChart
                data={analyticsData.platformMetrics.topFeatures}
                title="Feature Usage Analysis"
                type="bar"
              />
            </div>
          </section>

          {/* Real-time Status */}
          <section>
            <h2 className="text-xl font-medium text-[#271D1D] font-lora mb-4">
              Real-time System Status
            </h2>
            <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-[#271D1D]">System Health</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600 font-medium">
                    All Systems Operational
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Zap className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">API Response</p>
                  <p className="text-lg font-bold text-green-600">142ms</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Globe className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-800">Active Sessions</p>
                  <p className="text-lg font-bold text-blue-600">1,247</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-800">Queue Processing</p>
                  <p className="text-lg font-bold text-purple-600">97.8%</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
