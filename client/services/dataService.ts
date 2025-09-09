import { ContractsService } from './contractsService';
import { ContractReviewsService } from './contractReviewsService';
import { UserActivitiesService } from './userActivitiesService';
import { AdminAnalyticsService } from './adminAnalyticsService';
import { UserUsageStatsService } from './userUsageStatsService';

// Central data service that orchestrates all other services
export class DataService {
  // Contract management
  static contracts = ContractsService;
  static contractReviews = ContractReviewsService;
  
  // User tracking and analytics
  static userActivities = UserActivitiesService;
  static userUsageStats = UserUsageStatsService;
  
  // Admin analytics
  static adminAnalytics = AdminAnalyticsService;

  // High-level dashboard data methods
  static async getUserDashboardData(userId: string) {
    try {
      const [
        contracts,
        contractStats,
        recentActivities,
        usageStats,
        recentReviews,
      ] = await Promise.all([
        ContractsService.getRecentContracts(userId, 5),
        ContractsService.getUserContractStats(userId),
        UserActivitiesService.getRecentActivities(userId, 10),
        UserUsageStatsService.getUserStats(userId),
        ContractReviewsService.getRecentReviews(userId, 5),
      ]);

      return {
        contracts,
        contractStats,
        recentActivities,
        usageStats,
        recentReviews,
      };
    } catch (error) {
      console.error('Error fetching user dashboard data:', error);
      throw error;
    }
  }

  static async getAdminDashboardData() {
    try {
      const [
        platformOverview,
        latestMetrics,
        topUsers,
        usageSummary,
      ] = await Promise.all([
        AdminAnalyticsService.getPlatformOverview(),
        AdminAnalyticsService.getLatestMetrics(),
        UserUsageStatsService.getTopUsers('contracts_reviewed', 10),
        UserUsageStatsService.getUsageSummary(),
      ]);

      return {
        platformOverview,
        latestMetrics,
        topUsers,
        usageSummary,
      };
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      throw error;
    }
  }

  // Complete contract processing workflow
  static async processContractWorkflow(
    userId: string,
    contractData: any,
    reviewType: string
  ) {
    try {
      // 1. Create contract
      const contract = await ContractsService.createContract({
        ...contractData,
        user_id: userId,
      });

      // 2. Track contract upload activity
      await UserActivitiesService.trackContractUpload(
        userId,
        contract.id,
        contractData.file_name
      );

      // 3. Update contract status to reviewing
      await ContractsService.updateContractStatus(contract.id, 'reviewing');

      // 4. Simulate review process (in real implementation, this would trigger AI processing)
      const reviewResults = await this.simulateReviewProcess(reviewType);

      // 5. Create review record
      const review = await ContractReviewsService.createReview({
        contract_id: contract.id,
        user_id: userId,
        review_type: reviewType,
        results: reviewResults,
        score: reviewResults.score,
        confidence_level: reviewResults.confidence,
      });

      // 6. Update contract status to completed
      await ContractsService.updateContractStatus(contract.id, 'completed');

      // 7. Track review completion
      await UserActivitiesService.trackReviewCompleted(
        userId,
        contract.id,
        reviewType
      );

      // 8. Update user usage statistics
      await UserUsageStatsService.trackReviewCompletion(
        userId,
        reviewType,
        reviewResults.pages || 1
      );

      return {
        contract,
        review,
        success: true,
      };
    } catch (error) {
      console.error('Error in contract workflow:', error);
      throw error;
    }
  }

  // Simulate AI review process (replace with actual AI integration)
  private static async simulateReviewProcess(reviewType: string) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const baseResults = {
      timestamp: new Date().toISOString(),
      pages: Math.floor(Math.random() * 20) + 1,
      processing_time: Math.random() * 5 + 1,
    };

    switch (reviewType) {
      case 'risk_assessment':
        return {
          ...baseResults,
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
          risks: [
            { type: 'financial', level: 'medium', description: 'Payment terms may be unfavorable' },
            { type: 'legal', level: 'low', description: 'Standard liability clauses' },
          ],
          recommendations: [
            'Review payment terms carefully',
            'Consider adding termination clause',
          ],
        };

      case 'compliance_score':
        return {
          ...baseResults,
          score: Math.floor(Math.random() * 30) + 70, // 70-100
          confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
          compliance_areas: {
            gdpr: 85,
            financial_regulations: 92,
            industry_standards: 78,
          },
          violations: [],
          recommendations: ['Update privacy policy section'],
        };

      case 'perspective_review':
        return {
          ...baseResults,
          score: Math.floor(Math.random() * 50) + 50, // 50-100
          confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
          perspectives: {
            buyer: { score: 75, concerns: ['Payment terms', 'Delivery schedule'] },
            seller: { score: 82, concerns: ['Liability limits', 'Force majeure'] },
            legal: { score: 88, concerns: ['Jurisdiction clause'] },
          },
        };

      case 'full_summary':
        return {
          ...baseResults,
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
          summary: 'Comprehensive contract analysis completed',
          key_points: [
            'Payment terms: Net 30 days',
            'Contract duration: 2 years',
            'Termination clause: 90 days notice',
          ],
          action_items: [
            'Negotiate payment terms',
            'Clarify deliverables section',
          ],
        };

      default:
        return {
          ...baseResults,
          score: Math.floor(Math.random() * 50) + 50,
          confidence: Math.random() * 0.5 + 0.5,
          results: 'General analysis completed',
        };
    }
  }

  // Export user data
  static async exportUserData(userId: string, format: string = 'json') {
    try {
      const [
        contracts,
        reviews,
        activities,
        usageStats,
      ] = await Promise.all([
        ContractsService.getUserContracts(userId),
        ContractReviewsService.getUserReviews(userId),
        UserActivitiesService.getUserActivities(userId, 1, 1000), // Get all activities
        UserUsageStatsService.getUserStats(userId),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        contracts,
        reviews,
        activities,
        usage_stats: usageStats,
      };

      // Track export activity
      await UserActivitiesService.trackDataExport(userId, format);

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      }

      // Add other export formats as needed (CSV, PDF, etc.)
      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Initialize user data when they first sign up
  static async initializeNewUser(userId: string) {
    try {
      // Initialize usage stats
      await UserUsageStatsService.initializeUserStats(userId);
      
      // Track initial login
      await UserActivitiesService.trackLogin(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing new user:', error);
      throw error;
    }
  }
}

// Export all services for individual use if needed
export {
  ContractsService,
  ContractReviewsService,
  UserActivitiesService,
  AdminAnalyticsService,
  UserUsageStatsService,
};
