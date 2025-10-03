import { supabase } from "@/lib/supabase";
import { ContractsService } from "./contractsService";
import { ContractReviewsService } from "./contractReviewsService";
import { UserActivitiesService } from "./userActivitiesService";
import { UserUsageStatsService } from "./userUsageStatsService";
import { AdminAnalyticsService } from "./adminAnalyticsService";
import aiService from "./aiService";
import { generateFallbackAnalysis } from "./fallbackAnalysis";
import logger from "@/utils/logger";
import { logError, createUserFriendlyMessage } from "@/utils/errorLogger";

export class DataService {
  static async initializeNewUser(userId: string) {
    try {
      // Initialize user usage statistics
      await UserUsageStatsService.initializeUserStats(userId);

      console.log("✅ New user initialized successfully:", userId);
    } catch (error) {
      logError("❌ Failed to initialize new user", error, { userId });
      throw error;
    }
  }

  // Track initial login
  static get userActivities() {
    return UserActivitiesService;
  }

  static get userUsageStats() {
    return UserUsageStatsService;
  }

  static get adminAnalytics() {
    return AdminAnalyticsService;
  }

  // Get comprehensive analytics dashboard data
  static async getDashboardData(userId: string) {
    try {
      // Get user data
      const [userStats, recentActivities, contractsSummary] = await Promise.all(
        [
          UserUsageStatsService.getUserStats(userId),
          UserActivitiesService.getRecentActivities(userId, 10),
          this.getUserContractsSummary(userId),
        ],
      );

      return {
        userStats,
        recentActivities,
        contractsSummary,
      };
    } catch (error) {
      logError("Error fetching dashboard data", error, { userId });
      throw error;
    }
  }

  // Get contracts summary for user
  static async getUserContractsSummary(userId: string) {
    try {
      const contracts = await ContractsService.getUserContracts(userId);
      const reviews = await ContractReviewsService.getUserReviews(userId);

      return {
        totalContracts: contracts.length,
        totalReviews: reviews.length,
        recentContracts: contracts.slice(0, 5),
        recentReviews: reviews.slice(0, 5),
      };
    } catch (error) {
      logError("Error fetching user contracts summary", error, { userId });
      throw error;
    }
  }

  // Get admin dashboard data
  static async getAdminDashboardData() {
    try {
      const [platformOverview, latestMetrics, topUsers, usageSummary] =
        await Promise.all([
          UserUsageStatsService.getPlatformOverview(),
          AdminAnalyticsService.getLatestMetrics(),
          AdminAnalyticsService.getTopUsers(),
          UserUsageStatsService.getUsageSummary(),
        ]);

      return {
        platformOverview,
        latestMetrics,
        topUsers,
        usageSummary,
      };
    } catch (error) {
      logError("Error fetching admin dashboard data", error);
      throw error;
    }
  }

  // Complete contract processing workflow with intelligent classification
  static async processContractWorkflow(
    userId: string,
    contractData: any,
    reviewType: string,
  ) {
    try {
      console.log("🚀 Starting intelligent contract processing workflow...");

      // 1. Classify contract type using AI with robust error handling
      let classification: any;
      try {
        const { contractClassificationService } = await import(
          "./contractClassificationService"
        );
        console.log("🤖 Classifying contract type...");

        classification = await contractClassificationService.classifyContract(
          contractData.content,
          contractData.file_name,
        );

        console.log("✅ Contract classification completed:", {
          type: classification.contractType,
          confidence: classification.confidence,
          characteristics: classification.characteristics,
        });
      } catch (classificationError) {
        console.warn(
          "⚠️ Classification failed, using fallback:",
          classificationError,
        );
        // Provide a safe fallback classification
        classification = {
          contractType: "general_commercial",
          confidence: 0.5,
          characteristics: ["Commercial agreement requiring review"],
          reasoning: "Fallback classification due to processing error",
          suggestedSolutions: ["full_summary", "risk_assessment"],
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
          originalFileType: contractData.file_type,
        },
      });

      // 3. Track contract upload activity
      await UserActivitiesService.trackContractUpload(
        userId,
        contract.id,
        contract.title,
        { classification: classification },
      );

      // Track initial login
      await UserActivitiesService.trackLogin(userId);

      console.log("✅ Contract created and activity tracked");

      // 4. Process with AI analysis using classified contract type with enhanced error handling
      const enhancedContractData = {
        ...contractData,
        user_id: userId,
        contract_type: classification.contractType,
        classification: classification,
      };

      let reviewResults: any;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          console.log(
            `🔄 Attempting AI analysis (attempt ${retryCount + 1}/${maxRetries + 1})...`,
          );
          reviewResults = await this.processWithAI(
            enhancedContractData,
            reviewType,
            userId,
            contractData.custom_solution_id,
          );
          console.log("✅ AI analysis completed successfully");
          break;
        } catch (aiError) {
          retryCount++;
          logError(`❌ AI analysis attempt ${retryCount} failed`, aiError, {
            userId,
            reviewType,
            retryCount,
          });

          if (retryCount > maxRetries) {
            // Final fallback - create a basic review result
            console.log(
              "🔄 Using fallback analysis due to repeated AI failures",
            );
            reviewResults = generateFallbackAnalysis(reviewType, classification, {
              fallbackReason: "Primary AI provider unavailable",
              contractContent: contractData.content,
              contractType: contractData.contract_type,
            });
            break;
          }

          // Wait before retry
          console.log(`⏳ Waiting before retry ${retryCount + 1}...`);
          await new Promise((resolve) =>
            setTimeout(resolve, 2000 * retryCount),
          );
        }
      }

      // 5. Create review record
      const review = await ContractReviewsService.createReview({
        contract_id: contract.id,
        user_id: userId,
        review_type: reviewType,
        results: reviewResults,
        status: "completed",
      });

      // 6. Update user usage statistics
      await UserUsageStatsService.trackReviewCompletion(userId, reviewType, 1);
      await UserActivitiesService.trackReviewCompleted(
        userId,
        contract.id,
        reviewType,
      );

      console.log("✅ Contract processing workflow completed successfully");

      return {
        success: true,
        contract,
        review,
        classification,
      };
    } catch (error) {
      // Log error with comprehensive context
      const errorDetails = logError(
        "❌ Contract processing workflow failed",
        error,
        {
          userId,
          reviewType,
          contractTitle: contractData.title,
          contentLength: contractData.content?.length,
          fileName: contractData.file_name,
        },
      );

      // Track the failure with proper error serialization
      try {
        await UserActivitiesService.trackActivity({
          user_id: userId,
          activity_type: "contract_processing_error",
          description: `Contract processing failed: ${errorDetails.message}`,
          metadata: {
            error: errorDetails.message,
            errorType: errorDetails.type,
            reviewType: reviewType,
            timestamp: errorDetails.timestamp,
          },
        });
      } catch (trackError) {
        logError("Failed to track processing error", trackError, {
          originalError: errorDetails.message,
          userId,
          reviewType,
        });
      }

      // Re-throw with user-friendly error message
      const userFriendlyMessage = createUserFriendlyMessage(
        error,
        "Contract processing failed due to an unexpected error",
      );
      throw new Error(userFriendlyMessage);
    }
  }

  // AI processing with enhanced error handling and classification context
  private static async processWithAI(
    contractData: any,
    reviewType: string,
    userId: string,
    customSolutionId?: string,
  ) {
    try {
      console.log("🤖 Starting AI analysis with enhanced context...");

      // Get custom solution if specified
      let customSolution = null;
      if (customSolutionId) {
        // Fetch custom solution from database
        console.log("📋 Using custom solution:", customSolutionId);
      }

      // Prepare AI analysis request with enhanced file information and classification
      const fileExtension =
        typeof contractData.file_name === "string"
          ? contractData.file_name.split(".").pop()?.toLowerCase()
          : undefined;
      const documentFormat =
        contractData.file_type ||
        (fileExtension === "pdf"
          ? "pdf"
          : fileExtension === "docx" || fileExtension === "doc"
            ? "docx"
            : fileExtension);

      const analysisRequest = {
        content: contractData.content,
        reviewType,
        contractType: contractData.contract_type || "general",
        customSolution,
        userId,
        fileType: contractData.file_type,
        fileName: contractData.file_name,
        filename: contractData.file_name,
        documentFormat,
        classification: contractData.classification || null,
      };

      console.log("📊 Analysis request prepared:", {
        reviewType,
        contractType: analysisRequest.contractType,
        hasClassification: !!analysisRequest.classification,
        contentLength: contractData.content.length,
      });

      // Analyze contract with AI
      const result = await aiService.analyzeContract(analysisRequest);

      console.log("✅ AI analysis completed successfully:", {
        score: result.score,
        confidence: result.confidence,
        processingTime: result.processing_time,
      });

      return result;
    } catch (error) {
      const errorInfo = logError("❌ AI analysis failed", error, {
        reviewType,
        userId,
        contentLength: contractData.content?.length,
        contractType: contractData.contract_type,
      });

      // Re-throw error with safe user-friendly message
      const userMessage = createUserFriendlyMessage(
        error,
        "AI contract analysis failed. Please try again.",
      );

      throw new Error(userMessage);
    }
  }
}

export default DataService;
