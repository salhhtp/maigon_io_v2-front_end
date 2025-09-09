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
  Users,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  Filter,
  X,
  RefreshCw,
  Download,
  Calendar,
  Target,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import { useNavigate } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import Footer from "@/components/Footer";

interface PlatformData {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
  };
  contracts: {
    total: number;
    byStatus: { [key: string]: number };
    recentCount: number;
    recentContracts: any[];
  };
  reviews: {
    total: number;
    byType: { [key: string]: any };
  };
  activities: {
    totalActivities: number;
    dailyActiveUsers: { [key: string]: number };
    byActivityType: { [key: string]: number };
    uniqueActiveUsers: number;
  };
}

const MetricCard = ({
  title,
  value,
  change,
  icon,
  trend,
  isLoading = false,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: "up" | "down";
  isLoading?: boolean;
}) => (
  <div className="bg-white rounded-lg p-4 sm:p-6 border border-[#271D1D]/10">
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-[#F3F3F3] rounded-lg">{icon}</div>
        <h3 className="font-lora text-xs sm:text-sm font-medium text-[#271D1D]">
          {title}
        </h3>
      </div>
      {change && trend && (
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
      )}
    </div>
    <div>
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      ) : (
        <p className="font-lora text-xl sm:text-2xl font-medium text-[#271D1D]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  </div>
);

const ChartCard = ({
  title,
  data,
  isLoading = false,
  type = "bar",
}: {
  title: string;
  data: any[];
  isLoading?: boolean;
  type?: "bar" | "list";
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
      {title}
    </h3>
    {isLoading ? (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {data && data.length > 0 ? data.map((item, index) => {
          const label = item.label || item.name || item.type || `Item ${index + 1}`;
          const value = item.value || item.count || 0;
          const maxValue = Math.max(...data.map(d => d.value || d.count || 0));
          
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
                  }}
                />
                <span className="text-sm text-[#271D1D]">{label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-[#271D1D]">
                  {value.toLocaleString()}
                </span>
                <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-gradient-to-r from-[#9A7C7C] to-[#B6A5A5] h-1.5 rounded-full"
                    style={{
                      width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-8 text-[#271D1D]/50">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No data available</p>
          </div>
        )}
      </div>
    )}
  </div>
);

const TopUsersCard = ({ topUsers, isLoading }: { topUsers: any[]; isLoading: boolean }) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
      Top Active Users
    </h3>
    {isLoading ? (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        {topUsers && topUsers.length > 0 ? topUsers.map((user, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-[#F9F8F8] rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#D6CECE] rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-[#271D1D]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#271D1D]">
                  {user.user_profiles?.first_name} {user.user_profiles?.last_name}
                </p>
                <p className="text-xs text-[#271D1D]/70">
                  {user.user_profiles?.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[#271D1D]">
                {user.contracts_reviewed || 0}
              </p>
              <p className="text-xs text-[#271D1D]/70">contracts</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-[#271D1D]/50">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No user data available</p>
          </div>
        )}
      </div>
    )}
  </div>
);

export default function AdminAnalytics() {
  const { user, isLoggedIn } = useUser();
  const navigate = useNavigate();
  const [platformData, setPlatformData] = useState<PlatformData | null>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<string>("30d");

  // Check if user is admin
  useEffect(() => {
    if (!isLoggedIn || !user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [isLoggedIn, user, navigate]);

  // Load dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [dashboardData, topUsersData, usageData] = await Promise.all([
        DataService.adminAnalytics.getPlatformOverview(),
        DataService.userUsageStats.getTopUsers('contracts_reviewed', 10),
        DataService.userUsageStats.getUsageSummary(),
      ]);

      setPlatformData(dashboardData);
      setTopUsers(topUsersData || []);
      setUsageSummary(usageData || {});
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh analytics data
  const refreshData = async () => {
    try {
      await DataService.adminAnalytics.updateAnalytics();
      await loadDashboardData();
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      setError('Failed to refresh analytics data.');
    }
  };

  // Export data
  const exportData = async () => {
    try {
      const data = {
        platformOverview: platformData,
        topUsers,
        usageSummary,
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user && user.role === 'admin') {
      loadDashboardData();
    }
  }, [isLoggedIn, user]);

  if (!isLoggedIn || !user || user.role !== 'admin') {
    return null;
  }

  // Prepare chart data
  const contractStatusData = platformData?.contracts.byStatus 
    ? Object.entries(platformData.contracts.byStatus).map(([status, count]) => ({
        label: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count
      }))
    : [];

  const reviewTypeData = platformData?.reviews.byType
    ? Object.entries(platformData.reviews.byType).map(([type, data]: [string, any]) => ({
        label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: data.count || 0
      }))
    : [];

  const activityTypeData = platformData?.activities.byActivityType
    ? Object.entries(platformData.activities.byActivityType).map(([type, count]) => ({
        label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count
      }))
    : [];

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <MobileNavigation />
      
      <div className="lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-lora font-bold text-[#271D1D] mb-2">
                Admin Analytics
              </h1>
              <p className="text-[#271D1D]/70">
                Platform insights and user analytics
                {lastUpdated && (
                  <span className="block text-xs mt-1">
                    Last updated: {lastUpdated.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <Button
                onClick={refreshData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-[#271D1D] border-[#271D1D]/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={exportData}
                variant="outline"
                size="sm"
                className="text-[#271D1D] border-[#271D1D]/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <MetricCard
              title="Total Users"
              value={platformData?.users.total || 0}
              change={12.5}
              trend="up"
              icon={<Users className="w-5 h-5 text-[#9A7C7C]" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Active Users"
              value={platformData?.users.active || 0}
              change={8.7}
              trend="up"
              icon={<Activity className="w-5 h-5 text-[#9A7C7C]" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Total Contracts"
              value={platformData?.contracts.total || 0}
              change={23.1}
              trend="up"
              icon={<FileText className="w-5 h-5 text-[#9A7C7C]" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Total Reviews"
              value={platformData?.reviews.total || 0}
              change={15.8}
              trend="up"
              icon={<Target className="w-5 h-5 text-[#9A7C7C]" />}
              isLoading={isLoading}
            />
          </div>

          {/* Usage Summary */}
          {usageSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <MetricCard
                title="Avg Contracts/User"
                value={usageSummary.averageContractsPerUser?.toFixed(1) || '0.0'}
                icon={<BarChart3 className="w-5 h-5 text-[#9A7C7C]" />}
                isLoading={isLoading}
              />
              <MetricCard
                title="Total Pages Reviewed"
                value={usageSummary.totalPagesReviewed || 0}
                icon={<FileText className="w-5 h-5 text-[#9A7C7C]" />}
                isLoading={isLoading}
              />
              <MetricCard
                title="Risk Assessments"
                value={usageSummary.totalRiskAssessments || 0}
                icon={<AlertTriangle className="w-5 h-5 text-[#9A7C7C]" />}
                isLoading={isLoading}
              />
              <MetricCard
                title="Compliance Checks"
                value={usageSummary.totalComplianceChecks || 0}
                icon={<CheckCircle className="w-5 h-5 text-[#9A7C7C]" />}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard
              title="Contract Status Distribution"
              data={contractStatusData}
              isLoading={isLoading}
            />
            <ChartCard
              title="Review Types"
              data={reviewTypeData}
              isLoading={isLoading}
            />
            <ChartCard
              title="User Activity Types"
              data={activityTypeData}
              isLoading={isLoading}
            />
            <TopUsersCard
              topUsers={topUsers}
              isLoading={isLoading}
            />
          </div>

          {/* Recent Activity Summary */}
          <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 mb-8">
            <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-4">
              Platform Activity Summary
            </h3>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[#F9F8F8] rounded-lg">
                  <div className="text-2xl font-bold text-[#271D1D] mb-2">
                    {platformData?.activities.uniqueActiveUsers || 0}
                  </div>
                  <div className="text-sm text-[#271D1D]/70">Unique Active Users (Last 7 Days)</div>
                </div>
                <div className="text-center p-4 bg-[#F9F8F8] rounded-lg">
                  <div className="text-2xl font-bold text-[#271D1D] mb-2">
                    {platformData?.contracts.recentCount || 0}
                  </div>
                  <div className="text-sm text-[#271D1D]/70">New Contracts (Last 7 Days)</div>
                </div>
                <div className="text-center p-4 bg-[#F9F8F8] rounded-lg">
                  <div className="text-2xl font-bold text-[#271D1D] mb-2">
                    {platformData?.activities.totalActivities || 0}
                  </div>
                  <div className="text-sm text-[#271D1D]/70">Total Activities (Last 7 Days)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
