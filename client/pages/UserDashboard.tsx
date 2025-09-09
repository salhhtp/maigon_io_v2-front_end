import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  User,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  contracts: any[];
  contractStats: any;
  recentActivities: any[];
  usageStats: any;
  recentReviews: any[];
}

const MetricCard = ({
  title,
  value,
  icon,
  description,
  isLoading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-[#F3F3F3] rounded-lg">{icon}</div>
      <h3 className="font-lora text-sm font-medium text-[#271D1D]">{title}</h3>
    </div>
    {isLoading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    ) : (
      <div>
        <p className="font-lora text-2xl font-medium text-[#271D1D] mb-2">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="text-xs text-[#271D1D]/70">{description}</p>
        )}
      </div>
    )}
  </div>
);

const ActivityItem = ({ activity }: { activity: any }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contract_upload':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'review_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'login':
        return <User className="w-4 h-4 text-gray-600" />;
      case 'profile_update':
        return <User className="w-4 h-4 text-orange-600" />;
      case 'export_data':
        return <Download className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityDescription = (activity: any) => {
    if (activity.description) return activity.description;
    
    switch (activity.activity_type) {
      case 'contract_upload':
        return 'Uploaded a new contract';
      case 'review_completed':
        return 'Completed contract review';
      case 'login':
        return 'Signed in to account';
      case 'profile_update':
        return 'Updated profile information';
      case 'export_data':
        return 'Exported account data';
      default:
        return 'Activity performed';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#F9F8F8] rounded-lg">
      <div className="flex-shrink-0">
        {getActivityIcon(activity.activity_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#271D1D] truncate">
          {getActivityDescription(activity)}
        </p>
        <p className="text-xs text-[#271D1D]/70">
          {new Date(activity.created_at).toLocaleDateString()} at{" "}
          {new Date(activity.created_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

const ContractCard = ({ contract }: { contract: any }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-[#271D1D]/10 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-[#271D1D] truncate flex-1 mr-3">
          {contract.title}
        </h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
          {contract.status}
        </span>
      </div>
      <div className="text-sm text-[#271D1D]/70 space-y-1">
        <p>File: {contract.file_name}</p>
        <p>Uploaded: {new Date(contract.created_at).toLocaleDateString()}</p>
        {contract.file_size && (
          <p>Size: {(contract.file_size / 1024).toFixed(1)}KB</p>
        )}
      </div>
    </div>
  );
};

const ReviewCard = ({ review }: { review: any }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReviewTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'risk_assessment': 'Risk Assessment',
      'compliance_score': 'Compliance Review',
      'perspective_review': 'Perspective Analysis',
      'full_summary': 'Full Summary',
      'ai_integration': 'AI Integration Review'
    };
    return types[type] || type.replace('_', ' ');
  };

  return (
    <div className="border border-[#271D1D]/10 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-[#271D1D] mb-1">
            {getReviewTypeDisplay(review.review_type)}
          </h4>
          <p className="text-sm text-[#271D1D]/70">
            {review.contracts?.title || 'Contract Review'}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${getScoreColor(review.score || 0)}`}>
            {review.score || 0}%
          </span>
        </div>
      </div>
      <div className="text-xs text-[#271D1D]/70">
        Completed: {new Date(review.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};

export default function UserDashboard() {
  const { user, isLoggedIn, logout } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await DataService.getUserDashboardData(user.id);
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Track dashboard visit and load data
  useEffect(() => {
    if (user && isLoggedIn) {
      // Update last activity
      DataService.userUsageStats.updateLastActivity(user.id).catch(error => {
        console.error('Error updating last activity:', error);
      });
      
      // Load dashboard data
      loadDashboardData();
    }
  }, [user, isLoggedIn]);

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

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <MobileNavigation />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/user-solutions"
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
          <Link
            to="/user-news"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            News
          </Link>
          <Link
            to="/user-team"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Team
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
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 lg:pt-32 pb-20 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-lora font-bold text-[#271D1D] mb-2">
                Welcome back, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-[#271D1D]/70">
                Here's an overview of your contract analysis activity
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <Button
                onClick={loadDashboardData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-[#271D1D] border-[#271D1D]/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link to="/perspective-selection">
                <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Review
                </Button>
              </Link>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Contracts"
              value={dashboardData?.contractStats.total || 0}
              icon={<FileText className="w-5 h-5 text-[#9A7C7C]" />}
              description="Contracts uploaded"
              isLoading={isLoading}
            />
            <MetricCard
              title="Completed Reviews"
              value={dashboardData?.contractStats.completed || 0}
              icon={<CheckCircle className="w-5 h-5 text-[#9A7C7C]" />}
              description="Successfully analyzed"
              isLoading={isLoading}
            />
            <MetricCard
              title="Total Reviews"
              value={dashboardData?.usageStats?.contracts_reviewed || 0}
              icon={<BarChart3 className="w-5 h-5 text-[#9A7C7C]" />}
              description="All-time reviews"
              isLoading={isLoading}
            />
            <MetricCard
              title="Pages Analyzed"
              value={dashboardData?.usageStats?.total_pages_reviewed || 0}
              icon={<Activity className="w-5 h-5 text-[#9A7C7C]" />}
              description="Total pages processed"
              isLoading={isLoading}
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Recent Contracts */}
            <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-lora text-lg font-medium text-[#271D1D]">
                  Recent Contracts
                </h2>
                <Link to="/user-solutions">
                  <Button variant="outline" size="sm" className="text-[#271D1D] border-[#271D1D]/20">
                    View All
                  </Button>
                </Link>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.contracts && dashboardData.contracts.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.contracts.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#271D1D]/50">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-[#271D1D]/30" />
                  <p className="text-sm mb-4">No contracts uploaded yet</p>
                  <Link to="/perspective-selection">
                    <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                      Upload Your First Contract
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-lora text-lg font-medium text-[#271D1D]">
                  Recent Reviews
                </h2>
                <Link to="/user-solutions">
                  <Button variant="outline" size="sm" className="text-[#271D1D] border-[#271D1D]/20">
                    View All
                  </Button>
                </Link>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.recentReviews && dashboardData.recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#271D1D]/50">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[#271D1D]/30" />
                  <p className="text-sm">No reviews completed yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
            <h2 className="font-lora text-lg font-medium text-[#271D1D] mb-6">
              Recent Activity
            </h2>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#271D1D]/50">
                <Activity className="w-12 h-12 mx-auto mb-4 text-[#271D1D]/30" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
