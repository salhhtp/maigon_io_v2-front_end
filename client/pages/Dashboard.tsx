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
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Globe,
  Download,
  RefreshCw,
  Eye,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Calculator,
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

// Enhanced Analytics Data
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
    avgSessionDuration: 24.5,
    conversionRate: 3.2,
    churnRate: 2.1,
    customerSatisfaction: 4.7,
  },
  timeBasedData: {
    "7d": {
      users: [
        { date: "2024-01-01", value: 1847, previous: 1792 },
        { date: "2024-01-02", value: 1923, previous: 1845 },
        { date: "2024-01-03", value: 1965, previous: 1889 },
        { date: "2024-01-04", value: 2012, previous: 1923 },
        { date: "2024-01-05", value: 2089, previous: 1965 },
        { date: "2024-01-06", value: 2156, previous: 2012 },
        { date: "2024-01-07", value: 2234, previous: 2089 },
      ],
      revenue: [
        { date: "2024-01-01", value: 67890, previous: 65230 },
        { date: "2024-01-02", value: 73240, previous: 67890 },
        { date: "2024-01-03", value: 78560, previous: 73240 },
        { date: "2024-01-04", value: 81290, previous: 78560 },
        { date: "2024-01-05", value: 85430, previous: 81290 },
        { date: "2024-01-06", value: 89245, previous: 85430 },
        { date: "2024-01-07", value: 92180, previous: 89245 },
      ],
      contracts: [
        { date: "2024-01-01", value: 234, previous: 218 },
        { date: "2024-01-02", value: 267, previous: 234 },
        { date: "2024-01-03", value: 289, previous: 267 },
        { date: "2024-01-04", value: 312, previous: 289 },
        { date: "2024-01-05", value: 334, previous: 312 },
        { date: "2024-01-06", value: 356, previous: 334 },
        { date: "2024-01-07", value: 378, previous: 356 },
      ],
    },
    "30d": {
      users: [
        { date: "Week 1", value: 2156, previous: 2089 },
        { date: "Week 2", value: 2298, previous: 2156 },
        { date: "Week 3", value: 2523, previous: 2298 },
        { date: "Week 4", value: 2847, previous: 2523 },
      ],
      revenue: [
        { date: "Week 1", value: 67890, previous: 62340 },
        { date: "Week 2", value: 73240, previous: 67890 },
        { date: "Week 3", value: 81290, previous: 73240 },
        { date: "Week 4", value: 89245, previous: 81290 },
      ],
      contracts: [
        { date: "Week 1", value: 1203, previous: 1089 },
        { date: "Week 2", value: 1456, previous: 1203 },
        { date: "Week 3", value: 1892, previous: 1456 },
        { date: "Week 4", value: 2456, previous: 1892 },
      ],
    },
  },
  userBehavior: {
    sessionDuration: [
      { range: "0-5 min", users: 423, percentage: 14.9 },
      { range: "5-15 min", users: 892, percentage: 31.3 },
      { range: "15-30 min", users: 1076, percentage: 37.8 },
      { range: "30-60 min", users: 367, percentage: 12.9 },
      { range: "60+ min", users: 89, percentage: 3.1 },
    ],
    userJourney: [
      { step: "Landing Page", users: 15430, conversion: 100 },
      { step: "Sign Up", users: 4629, conversion: 30.0 },
      { step: "First Contract", users: 2314, conversion: 15.0 },
      { step: "Paid Plan", users: 1157, conversion: 7.5 },
      { step: "Active User", users: 925, conversion: 6.0 },
    ],
    deviceUsage: [
      { device: "Desktop", users: 1982, percentage: 69.6 },
      { device: "Mobile", users: 651, percentage: 22.9 },
      { device: "Tablet", users: 214, percentage: 7.5 },
    ],
  },
  advancedMetrics: {
    cohortAnalysis: [
      { cohort: "Jan 2024", week1: 100, week2: 87, week3: 76, week4: 68 },
      { cohort: "Feb 2024", week1: 100, week2: 89, week3: 79, week4: 71 },
      { cohort: "Mar 2024", week1: 100, week2: 91, week3: 82, week4: 75 },
      { cohort: "Apr 2024", week1: 100, week2: 93, week3: 85, week4: 78 },
    ],
    revenueMetrics: [
      { metric: "MRR", value: 234560, change: 18.2, trend: "up" },
      { metric: "ARR", value: 2814720, change: 22.1, trend: "up" },
      { metric: "ARPU", value: 156.8, change: 8.9, trend: "up" },
      { metric: "LTV", value: 2340, change: 15.3, trend: "up" },
      { metric: "CAC", value: 89, change: -12.5, trend: "down" },
      { metric: "LTV/CAC", value: 26.3, change: 31.2, trend: "up" },
    ],
    errorAnalysis: [
      { error: "API Timeout", count: 23, severity: "medium" },
      { error: "Authentication Failed", count: 12, severity: "high" },
      { error: "File Upload Error", count: 8, severity: "low" },
      { error: "Payment Processing", count: 4, severity: "critical" },
    ],
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

const TrendChart = ({
  data,
  title,
  metric,
  showComparison = false,
}: {
  data: any[];
  title: string;
  metric: string;
  showComparison?: boolean;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-lora text-lg font-medium text-[#271D1D]">{title}</h3>
      <div className="flex items-center gap-2">
        {showComparison && (
          <span className="text-xs text-[#271D1D]/70 bg-[#F3F3F3] px-2 py-1 rounded">
            vs Previous Period
          </span>
        )}
        <TrendingUp className="w-4 h-4 text-green-600" />
      </div>
    </div>
    <div className="space-y-4">
      {data.map((item, index) => {
        const growth = showComparison && item.previous
          ? ((item.value - item.previous) / item.previous * 100).toFixed(1)
          : null;
        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#271D1D]">{item.date}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#271D1D]">
                  {typeof item.value === 'number' && item.value > 1000
                    ? (item.value / 1000).toFixed(1) + 'k'
                    : item.value}
                </span>
                {growth && (
                  <span className={`text-xs font-medium ${
                    parseFloat(growth) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(growth) > 0 ? '+' : ''}{growth}%
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#9A7C7C] to-[#B6A5A5] h-2 rounded-full"
                style={{
                  width: `${Math.min((item.value / Math.max(...data.map(d => d.value))) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const FunnelChart = ({
  data,
  title,
}: {
  data: any[];
  title: string;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">{title}</h3>
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#271D1D]">{item.step}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#271D1D]">{item.users.toLocaleString()}</span>
              <span className="text-xs text-[#271D1D]/70">({item.conversion}%)</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-[#9A7C7C] to-[#B6A5A5] h-3 rounded-full"
              style={{ width: `${item.conversion}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RevenueMetricCard = ({
  metric,
  value,
  change,
  trend,
}: {
  metric: string;
  value: number;
  change: number;
  trend: "up" | "down";
}) => (
  <div className="bg-white rounded-lg p-4 border border-[#271D1D]/10">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-[#271D1D]">{metric}</h4>
      <div className="flex items-center gap-1">
        {trend === "up" ? (
          <TrendingUp className="w-3 h-3 text-green-600" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-600" />
        )}
        <span className={`text-xs font-medium ${
          trend === "up" ? "text-green-600" : "text-red-600"
        }`}>
          {trend === "up" ? "+" : ""}{change}%
        </span>
      </div>
    </div>
    <p className="text-lg font-bold text-[#271D1D]">
      {metric.includes("LTV") || metric.includes("CAC") || metric.includes("ARPU")
        ? `€${value}`
        : value.toLocaleString()}
    </p>
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
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [usageFilter, setUsageFilter] = useState<string>("all");

  // Filter usage data based on selected filters
  const filteredUsage = monthlyUsage.filter((data) => {
    const usagePercentage = data.max > 0 ? (data.reviews / data.max) * 100 : 0;

    const matchesPeriod = periodFilter === "all" ||
      (periodFilter === "recent" && monthlyUsage.indexOf(data) < 6) ||
      (periodFilter === "last3" && monthlyUsage.indexOf(data) < 3);

    const matchesUsage = usageFilter === "all" ||
      (usageFilter === "high" && usagePercentage >= 75) ||
      (usageFilter === "medium" && usagePercentage >= 25 && usagePercentage < 75) ||
      (usageFilter === "low" && usagePercentage < 25);

    return matchesPeriod && matchesUsage;
  });

  const displayedUsage = isExpanded ? filteredUsage : filteredUsage.slice(0, 3);

  const clearFilters = () => {
    setPeriodFilter("all");
    setUsageFilter("all");
  };

  const hasActiveFilters = periodFilter !== "all" || usageFilter !== "all";

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="font-lora text-lg font-medium text-[#271D1D]">
            Contract Review Usage
          </h3>
          {filteredUsage.length > 3 && (
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
                  Show All ({filteredUsage.length})
                </>
              )}
            </button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-[#9A7C7C] bg-[#9A7C7C]/10 px-2 py-1 rounded-full">
              {filteredUsage.length} of {monthlyUsage.length} months
            </span>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {/* Period Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`text-[#271D1D] border-[#271D1D]/20 ${
                periodFilter !== "all" ? "bg-[#9A7C7C]/10 border-[#9A7C7C]" : ""
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Period: {periodFilter === "all" ? "All" : periodFilter === "recent" ? "Last 6" : "Last 3"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Period</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPeriodFilter("all")}>
              All Months
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodFilter("recent")}>
              Last 6 Months
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodFilter("last3")}>
              Last 3 Months
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Usage Level Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`text-[#271D1D] border-[#271D1D]/20 ${
                usageFilter !== "all" ? "bg-[#9A7C7C]/10 border-[#9A7C7C]" : ""
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Usage: {usageFilter === "all" ? "All" : usageFilter}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Usage Level</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setUsageFilter("all")}>
              All Levels
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUsageFilter("high")}>
              High (75%+)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUsageFilter("medium")}>
              Medium (25-74%)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUsageFilter("low")}>
              Low (&lt;25%)
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
        {!isExpanded && filteredUsage.length > 3 && (
          <div className="text-center pt-2 border-t border-[#F3F3F3]">
            <span className="text-xs text-[#271D1D]/50">
              +{filteredUsage.length - 3} more months
            </span>
          </div>
        )}
        {filteredUsage.length === 0 && (
          <div className="text-center py-8 text-[#271D1D]/50">
            <BarChart3 className="w-8 h-8 mx-auto mb-3 text-[#271D1D]/30" />
            <p className="text-sm">No usage data matches your filters</p>
            <p className="text-xs mt-1">
              Try adjusting your filter criteria
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter activities based on search and status
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.file.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || activity.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const displayedActivities = isExpanded ? filteredActivities : filteredActivities.slice(0, 5);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="font-lora text-lg font-medium text-[#271D1D]">
            Recent Activity
          </h3>
          {filteredActivities.length > 5 && (
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
                  Show All ({filteredActivities.length})
                </>
              )}
            </button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-[#9A7C7C] bg-[#9A7C7C]/10 px-2 py-1 rounded-full">
              {filteredActivities.length} of {activities.length} activities
            </span>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#271D1D]/50" />
          <Input
            type="text"
            placeholder="Search activities or files..."
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
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("processing")}>
                Processing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
                Failed
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
            {!isExpanded && filteredActivities.length > 5 && (
              <div className="text-center pt-2 border-t border-[#F3F3F3]">
                <span className="text-xs text-[#271D1D]/50">
                  +{filteredActivities.length - 5} more activities
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-[#271D1D]/50">
            {activities.length === 0 ? (
              <>
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">
                  Start reviewing contracts to see your activity here
                </p>
              </>
            ) : (
              <>
                <FileText className="w-8 h-8 mx-auto mb-3 text-[#271D1D]/30" />
                <p className="text-sm">No activities match your filters</p>
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
              </>
            )}
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
      plan: "Enterprise Plan",
      status: "active",
      usage: "78/∞",
    },
    {
      name: "Sarah Wilson",
      email: "sarah@startup.io",
      plan: "Monthly 15",
      status: "active",
      usage: "12/15",
    },
    {
      name: "Mike Chen",
      email: "mike@legal.com",
      plan: "Pay-As-You-Go",
      status: "inactive",
      usage: "3 contracts",
    },
    {
      name: "Emma Davis",
      email: "emma@corp.com",
      plan: "Enterprise Plan",
      status: "active",
      usage: "156/∞",
    },
    {
      name: "Alex Johnson",
      email: "alex@techcorp.com",
      plan: "Monthly 10",
      status: "active",
      usage: "7/10",
    },
    {
      name: "Lisa Martinez",
      email: "lisa@lawfirm.com",
      plan: "Free Trial",
      status: "active",
      usage: "1/1",
    },
    {
      name: "David Brown",
      email: "david@consultant.com",
      plan: "Monthly 15",
      status: "active",
      usage: "14/15",
    },
    {
      name: "Maria Garcia",
      email: "maria@startup.co",
      plan: "Pay-As-You-Go",
      status: "inactive",
      usage: "5 contracts",
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
                Plan: {planFilter === "all" ? "All" :
                  planFilter === "enterprise plan" ? "Enterprise Plan" :
                  planFilter === "monthly 15" ? "Monthly 15" :
                  planFilter === "monthly 10" ? "Monthly 10" :
                  planFilter === "pay-as-you-go" ? "Pay-As-You-Go" :
                  planFilter === "free trial" ? "Free Trial" : planFilter}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Plan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPlanFilter("all")}>
                All Plans
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("enterprise plan")}>
                Enterprise Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("monthly 15")}>
                Monthly 15
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("monthly 10")}>
                Monthly 10
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("pay-as-you-go")}>
                Pay-As-You-Go
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter("free trial")}>
                Free Trial
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
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const allSolutions = [
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
  ];

  // Filter solutions based on search and status
  const filteredSolutions = allSolutions.filter((solution) => {
    const matchesSearch =
      solution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution.client.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || solution.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="font-lora text-lg font-medium text-[#271D1D]">
            Custom Solutions
          </h3>
          {hasActiveFilters && (
            <span className="text-xs text-[#9A7C7C] bg-[#9A7C7C]/10 px-2 py-1 rounded-full">
              {filteredSolutions.length} of {allSolutions.length} solutions
            </span>
          )}
        </div>
        <Button
          onClick={onCreateSolution}
          className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Solution
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#271D1D]/50" />
          <Input
            type="text"
            placeholder="Search solutions or clients..."
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
              <DropdownMenuItem onClick={() => setStatusFilter("development")}>
                Development
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
        {filteredSolutions.length > 0 ? (
          filteredSolutions.map((solution, index) => (
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
          ))
        ) : (
          <div className="text-center py-8 text-[#271D1D]/50">
            <Settings className="w-8 h-8 mx-auto mb-3 text-[#271D1D]/30" />
            <p className="text-sm">No solutions match your filters</p>
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

export default function Dashboard() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [customSolutionModalOpen, setCustomSolutionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<string>("30d");
  const [analyticsView, setAnalyticsView] = useState<"overview" | "users" | "revenue" | "performance" | "engagement">("overview");
  const [selectedMetric, setSelectedMetric] = useState<string>("users");
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
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

          {/* Tab Navigation - Only show for admins */}
          {isAdmin && (
            <div className="mb-8">
              <div className="border-b border-[#271D1D]/20">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "overview"
                        ? "border-[#9A7C7C] text-[#9A7C7C]"
                        : "border-transparent text-[#271D1D]/70 hover:text-[#271D1D] hover:border-[#271D1D]/30"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "analytics"
                        ? "border-[#9A7C7C] text-[#9A7C7C]"
                        : "border-transparent text-[#271D1D]/70 hover:text-[#271D1D] hover:border-[#271D1D]/30"
                    }`}
                  >
                    <Activity className="w-4 h-4 inline mr-2" />
                    Analytics
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Overview Tab Content */}
          {(!isAdmin || activeTab === "overview") && (
            <>
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
            </>
          )}

          {/* Analytics Tab Content */}
          {isAdmin && activeTab === "analytics" && (
            <div className="space-y-8">
              {/* Analytics Controls */}
              <section className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-medium text-[#271D1D] font-lora">
                      Advanced Analytics
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium">Live Data</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Time Range Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-[#271D1D] border-[#271D1D]/20">
                          <Calendar className="w-4 h-4 mr-2" />
                          {analyticsTimeRange === "7d" ? "Last 7 days" :
                           analyticsTimeRange === "30d" ? "Last 30 days" :
                           analyticsTimeRange === "90d" ? "Last 90 days" : "Last year"}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setAnalyticsTimeRange("7d")}>
                          Last 7 days
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsTimeRange("30d")}>
                          Last 30 days
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsTimeRange("90d")}>
                          Last 90 days
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsTimeRange("1y")}>
                          Last year
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View Toggle */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-[#271D1D] border-[#271D1D]/20">
                          <Eye className="w-4 h-4 mr-2" />
                          {analyticsView === "overview" ? "Overview" :
                           analyticsView === "users" ? "Users" :
                           analyticsView === "revenue" ? "Revenue" :
                           analyticsView === "performance" ? "Performance" : "Engagement"}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setAnalyticsView("overview")}>
                          <BarChart3 className="w-4 h-4 mr-2" />Overview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsView("users")}>
                          <Users className="w-4 h-4 mr-2" />Users
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsView("revenue")}>
                          <DollarSign className="w-4 h-4 mr-2" />Revenue
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsView("performance")}>
                          <Activity className="w-4 h-4 mr-2" />Performance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnalyticsView("engagement")}>
                          <Target className="w-4 h-4 mr-2" />Engagement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Comparison Toggle */}
                    <Button
                      variant={comparisonMode ? "default" : "outline"}
                      onClick={() => setComparisonMode(!comparisonMode)}
                      className={comparisonMode ? "bg-[#9A7C7C] text-white" : "text-[#271D1D] border-[#271D1D]/20"}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Compare
                    </Button>

                    {/* Export Button */}
                    <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </section>

              {/* Key Metrics Overview */}
              {(analyticsView === "overview") && (
                <>
                  <section>
                    <h3 className="text-lg font-medium text-[#271D1D] font-lora mb-4">
                      Key Performance Indicators
                    </h3>
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

                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TrendChart
                        data={analyticsData.timeBasedData[analyticsTimeRange]?.users || []}
                        title="User Growth Trend"
                        metric="users"
                        showComparison={comparisonMode}
                      />
                      <TrendChart
                        data={analyticsData.timeBasedData[analyticsTimeRange]?.revenue || []}
                        title="Revenue Growth Trend"
                        metric="revenue"
                        showComparison={comparisonMode}
                      />
                    </div>
                  </section>
                </>
              )}

              {/* Users Analytics */}
              {analyticsView === "users" && (
                <>
                  <section>
                    <h3 className="text-lg font-medium text-[#271D1D] font-lora mb-4">
                      User Analytics & Behavior
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SimpleChart
                        data={analyticsData.userMetrics.byPlan}
                        title="Users by Plan Distribution"
                        type="pie"
                      />
                      <SimpleChart
                        data={analyticsData.userMetrics.geography}
                        title="Geographic Distribution"
                        type="bar"
                      />
                      <SimpleChart
                        data={analyticsData.userBehavior.sessionDuration}
                        title="Session Duration Distribution"
                        type="bar"
                      />
                      <SimpleChart
                        data={analyticsData.userBehavior.deviceUsage}
                        title="Device Usage Breakdown"
                        type="pie"
                      />
                    </div>
                  </section>

                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <FunnelChart
                        data={analyticsData.userBehavior.userJourney}
                        title="User Conversion Funnel"
                      />
                      <SimpleChart
                        data={analyticsData.userMetrics.retention}
                        title="User Retention Rates"
                        type="line"
                      />
                    </div>
                  </section>
                </>
              )}

              {/* Revenue Analytics */}
              {analyticsView === "revenue" && (
                <>
                  <section>
                    <h3 className="text-lg font-medium text-[#271D1D] font-lora mb-4">
                      Revenue Analytics & Financial Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analyticsData.advancedMetrics.revenueMetrics.map((metric, index) => (
                        <RevenueMetricCard
                          key={index}
                          metric={metric.metric}
                          value={metric.value}
                          change={metric.change}
                          trend={metric.trend}
                        />
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TrendChart
                        data={analyticsData.timeBasedData[analyticsTimeRange]?.revenue || []}
                        title="Revenue Trend Analysis"
                        metric="revenue"
                        showComparison={comparisonMode}
                      />
                      <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                        <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
                          Cohort Retention Analysis
                        </h3>
                        <div className="space-y-3">
                          {analyticsData.advancedMetrics.cohortAnalysis.map((cohort, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[#271D1D]">{cohort.cohort}</span>
                                <span className="text-xs text-[#271D1D]/70">Week 4: {cohort.week4}%</span>
                              </div>
                              <div className="flex space-x-1">
                                <div className="flex-1 bg-green-200 h-3 rounded" style={{ opacity: cohort.week1 / 100 }}></div>
                                <div className="flex-1 bg-blue-200 h-3 rounded" style={{ opacity: cohort.week2 / 100 }}></div>
                                <div className="flex-1 bg-yellow-200 h-3 rounded" style={{ opacity: cohort.week3 / 100 }}></div>
                                <div className="flex-1 bg-red-200 h-3 rounded" style={{ opacity: cohort.week4 / 100 }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* Performance Analytics */}
              {analyticsView === "performance" && (
                <>
                  <section>
                    <h3 className="text-lg font-medium text-[#271D1D] font-lora mb-4">
                      System Performance & Health
                    </h3>
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

                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                        <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
                          Error Analysis
                        </h3>
                        <div className="space-y-3">
                          {analyticsData.advancedMetrics.errorAnalysis.map((error, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-[#271D1D]/10">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className={`w-4 h-4 ${
                                  error.severity === "critical" ? "text-red-600" :
                                  error.severity === "high" ? "text-orange-600" :
                                  error.severity === "medium" ? "text-yellow-600" : "text-gray-600"
                                }`} />
                                <span className="text-sm text-[#271D1D]">{error.error}</span>
                              </div>
                              <span className="text-sm font-medium text-[#271D1D]">{error.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                        <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
                          Real-time System Status
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
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
                    </div>
                  </section>
                </>
              )}

              {/* Engagement Analytics */}
              {analyticsView === "engagement" && (
                <>
                  <section>
                    <h3 className="text-lg font-medium text-[#271D1D] font-lora mb-4">
                      User Engagement & Feature Usage
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <MetricCard
                        title="Avg Session Duration"
                        value={`${analyticsData.overview.avgSessionDuration}min`}
                        change={8.3}
                        icon={<Clock className="w-5 h-5 text-[#9A7C7C]" />}
                        trend="up"
                      />
                      <MetricCard
                        title="Conversion Rate"
                        value={`${analyticsData.overview.conversionRate}%`}
                        change={analyticsData.overview.conversionRate}
                        icon={<Target className="w-5 h-5 text-[#9A7C7C]" />}
                        trend="up"
                      />
                      <MetricCard
                        title="Churn Rate"
                        value={`${analyticsData.overview.churnRate}%`}
                        change={-0.8}
                        icon={<TrendingDown className="w-5 h-5 text-[#9A7C7C]" />}
                        trend="down"
                      />
                      <MetricCard
                        title="Satisfaction Score"
                        value={`${analyticsData.overview.customerSatisfaction}/5`}
                        change={4.2}
                        icon={<CheckCircle className="w-5 h-5 text-[#9A7C7C]" />}
                        trend="up"
                      />
                    </div>
                  </section>

                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SimpleChart
                        data={analyticsData.platformMetrics.topFeatures}
                        title="Feature Usage Analysis"
                        type="bar"
                      />
                      <SimpleChart
                        data={analyticsData.platformMetrics.contractTypes}
                        title="Contract Types Analysis"
                        type="bar"
                      />
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
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
