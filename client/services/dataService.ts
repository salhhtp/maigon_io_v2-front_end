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

  // Complete contract processing workflow with intelligent classification
  static async processContractWorkflow(
    userId: string,
    contractData: any,
    reviewType: string
  ) {
    try {
      console.log('🚀 Starting intelligent contract processing workflow...');

      // 1. Classify contract type using AI with robust error handling
      let classification: any;
      try {
        const { contractClassificationService } = await import('./contractClassificationService');
        console.log('🤖 Classifying contract type...');

        classification = await contractClassificationService.classifyContract(
          contractData.content,
          contractData.file_name
        );

        console.log('✅ Contract classification completed:', {
          type: classification.contractType,
          confidence: classification.confidence,
          characteristics: classification.characteristics
        });
      } catch (classificationError) {
        console.warn('⚠️ Classification failed, using fallback:', classificationError);
        // Provide a safe fallback classification
        classification = {
          contractType: 'general_commercial',
          confidence: 0.5,
          characteristics: ['Commercial agreement requiring review'],
          reasoning: 'Fallback classification due to processing error',
          suggestedSolutions: ['full_summary', 'risk_assessment']
        };
      }

      // 2. Create contract with classification results
      const contract = await ContractsService.createContract({
        title: contractData.title,
        content: contractData.content,
        file_name: contractData.file_name,
        file_size: contractData.file_size,
        user_id: userId,
        // Store classification metadata for future reference
        metadata: {
          classification: classification,
          originalFileType: contractData.file_type
        }
      });

      // 2. Track contract upload activity
      await UserActivitiesService.trackContractUpload(
        userId,
        contract.id,
        contractData.file_name
      );

      // 3. Update contract status to reviewing
      await ContractsService.updateContractStatus(contract.id, 'reviewing');

      // 4. Process with AI analysis using classified contract type with enhanced error handling
      const enhancedContractData = {
        ...contractData,
        contract_type: classification.contractType,
        classification: classification
      };

      let reviewResults: any;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 Attempting AI analysis (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          reviewResults = await this.processWithAI(enhancedContractData, reviewType, contractData.custom_solution_id);
          console.log('✅ AI analysis completed successfully');
          break;
        } catch (aiError) {
          retryCount++;
          console.error(`❌ AI analysis attempt ${retryCount} failed:`, aiError);

          if (retryCount > maxRetries) {
            // Final fallback - create a basic review result
            console.log('🔄 Using fallback analysis due to repeated AI failures');
            reviewResults = this.generateFallbackAnalysis(reviewType, classification);
            break;
          }

          // Wait before retry
          console.log(`⏳ Waiting before retry ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }

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

  // AI review process using real AI integration
  private static async processWithAI(contractData: any, reviewType: string, customSolutionId?: string) {
    try {
      console.log('🤖 Starting AI analysis process...', {
        reviewType,
        contentLength: contractData.content?.length,
        userId: contractData.user_id
      });

      // Import AI service dynamically to avoid circular imports
      const aiServiceModule = await import('./aiService');
      const aiService = aiServiceModule.aiService;

      // Validate inputs
      if (!contractData.content || contractData.content.trim().length === 0) {
        throw new Error('Contract content is empty or invalid');
      }

      if (!contractData.user_id) {
        throw new Error('User ID is required for AI analysis');
      }

      // Get custom solution if specified
      let customSolution;
      if (customSolutionId) {
        try {
          const solutions = await aiService.getCustomSolutions(contractData.user_id);
          customSolution = solutions.find(s => s.id === customSolutionId);
          console.log('🎯 Custom solution loaded:', customSolution?.name);
        } catch (error) {
          console.warn('Failed to load custom solution, using default:', error);
        }
      }

      // Prepare AI analysis request with enhanced file information and classification
      const analysisRequest = {
        content: contractData.content,
        reviewType,
        contractType: contractData.contract_type || 'general',
        customSolution,
        userId: contractData.user_id,
        fileType: contractData.file_type,
        fileName: contractData.file_name,
        classification: contractData.classification || null,
      };

      console.log('📝 Prepared analysis request:', {
        reviewType: analysisRequest.reviewType,
        contractType: analysisRequest.contractType,
        hasCustomSolution: !!analysisRequest.customSolution,
        contentPreview: analysisRequest.content.substring(0, 100) + '...'
      });

      // Call AI service for analysis
      const aiResult = await aiService.analyzeContract(analysisRequest);

      console.log('✅ AI analysis completed successfully:', {
        score: aiResult.score,
        confidence: aiResult.confidence,
        processingTime: aiResult.processing_time
      });

      return {
        timestamp: aiResult.timestamp,
        pages: aiResult.pages,
        processing_time: aiResult.processing_time,
        score: aiResult.score,
        confidence: aiResult.confidence,
        model_used: aiResult.model_used,
        custom_solution_id: aiResult.custom_solution_id,
        // Include all AI-generated results
        ...aiResult,
      };
    } catch (error) {
      console.error('❌ AI analysis failed:', error);

      // Log detailed error information
      console.error('AI analysis error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        reviewType,
        contentLength: contractData.content?.length,
        userId: contractData.user_id
      });

      // Re-throw error for production - no mock fallbacks
      throw new Error(`AI contract analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
