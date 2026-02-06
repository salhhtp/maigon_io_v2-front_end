import { supabase } from "@/lib/supabase";
import { ContractsService } from "./contractsService";
import { ContractReviewsService } from "./contractReviewsService";
import { UserActivitiesService } from "./userActivitiesService";
import { UserUsageStatsService } from "./userUsageStatsService";
import { AdminAnalyticsService } from "./adminAnalyticsService";
import AdminDashboardService from "./adminDashboardService";
import EnterpriseDashboardService from "./enterpriseDashboardService";
import aiService, {
  type ContractAnalysisRequest,
  AIModel,
} from "./aiService";
import clauseExtractionService from "./clauseExtractionService";
import { generateFallbackAnalysis } from "./fallbackAnalysis";
import logger from "@/utils/logger";
import { logError, createUserFriendlyMessage } from "@/utils/errorLogger";
import AnalyticsEventsService from "./analyticsEventsService";
import PaygCreditsService from "./paygCreditsService";
import type { CustomSolution } from "@shared/api";
import {
  deriveSolutionKey,
  mapClassificationToSolutionKey,
  solutionKeyToCustomContractType,
  solutionKeyToDisplayName,
  type SolutionKey,
} from "@shared/solutions";

export class DataService {
  private static mapCustomSolutionRow(row: Record<string, unknown>): CustomSolution {
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      description: (row.description as string) ?? "",
      contractType: (row.contract_type as string) ?? "general",
      complianceFramework:
        (row.compliance_framework as string[])?.filter(Boolean) ?? [],
      riskLevel:
        (row.risk_level as CustomSolution["riskLevel"]) ?? "medium",
      customRules: (row.custom_rules as string) ?? "",
      analysisDepth:
        (row.analysis_depth as CustomSolution["analysisDepth"]) ?? "standard",
      reportFormat:
        (row.report_format as CustomSolution["reportFormat"]) ?? "detailed",
      aiModel:
        (row.ai_model as CustomSolution["aiModel"]) ?? "openai-gpt-5",
      organizationId: (row.organization_id as string) ?? null,
      prompts: (row.prompts as CustomSolution["prompts"]) ?? {
        systemPrompt: "",
        analysisPrompt: "",
      },
      sectionLayout:
        (row.section_layout as CustomSolution["sectionLayout"]) ?? [],
      clauseLibrary:
        (row.clause_library as CustomSolution["clauseLibrary"]) ?? [],
      deviationRules:
        (row.deviation_rules as CustomSolution["deviationRules"]) ?? [],
      similarityBenchmarks:
        (row.similarity_benchmarks as CustomSolution["similarityBenchmarks"]) ??
        [],
      modelSettings:
        (row.model_settings as CustomSolution["modelSettings"]) ?? undefined,
      draftingSettings:
        (row.drafting_settings as CustomSolution["draftingSettings"]) ??
        undefined,
      isPublic: (row.is_public as boolean) ?? undefined,
      isActive: (row.is_active as boolean) ?? undefined,
      createdBy: (row.created_by as string) ?? undefined,
    };
  }

  private static async fetchCustomSolution(
    customSolutionId: string,
  ): Promise<CustomSolution | null> {
    try {
      const { data, error } = await supabase
        .from("custom_solutions")
        .select(
          [
            "id",
            "name",
            "description",
            "contract_type",
            "compliance_framework",
            "risk_level",
            "custom_rules",
            "analysis_depth",
            "report_format",
            "ai_model",
            "prompts",
            "organization_id",
            "is_public",
            "is_active",
            "created_by",
            "section_layout",
            "clause_library",
            "deviation_rules",
            "similarity_benchmarks",
            "model_settings",
            "drafting_settings",
          ].join(","),
        )
        .eq("id", customSolutionId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch custom solution", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapCustomSolutionRow(data);
    } catch (error) {
      console.error("Unexpected error loading custom solution", error);
      return null;
    }
  }

  static async getCustomSolutionById(
    customSolutionId: string,
  ): Promise<CustomSolution | null> {
    return this.fetchCustomSolution(customSolutionId);
  }

  private static async findOrganizationCustomSolution(
    organizationId: string,
    solutionKey?: SolutionKey,
  ): Promise<CustomSolution | null> {
    if (!organizationId) {
      return null;
    }

    try {
      const desiredContractType = solutionKey
        ? solutionKeyToCustomContractType(solutionKey)
        : null;

      let query = supabase
        .from("custom_solutions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (desiredContractType) {
        query = query.eq("contract_type", desiredContractType);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.warn("Failed to resolve organization custom solution", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapCustomSolutionRow(data);
    } catch (error) {
      console.error("Unexpected error resolving organization solution", error);
      return null;
    }
  }

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

  static get adminDashboard() {
    return AdminDashboardService;
  }

  static get enterpriseDashboard() {
    return EnterpriseDashboardService;
  }

  static get paygCredits() {
    return PaygCreditsService;
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

  static async getUserDashboardData(userId: string) {
    try {
      const [
        contracts,
        contractStats,
        recentActivities,
        usageStats,
        recentReviews,
      ] = await Promise.all([
        ContractsService.getUserContracts(userId),
        ContractsService.getUserContractStats(userId),
        UserActivitiesService.getRecentActivities(userId, 10),
        UserUsageStatsService.getUserStats(userId),
        ContractReviewsService.getRecentReviews(userId, 5),
      ]);

      return {
        contracts: contracts.slice(0, 5),
        contractStats,
        recentActivities,
        usageStats,
        recentReviews,
      };
    } catch (error) {
      logError("Error fetching user dashboard data", error, { userId });
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
      const [
        platformOverview,
        latestMetrics,
        topUsers,
        usageSummary,
        analysisMetrics,
      ] = await Promise.all([
        UserUsageStatsService.getPlatformOverview(),
        AdminAnalyticsService.getLatestMetrics(),
        AdminAnalyticsService.getTopUsers(),
        UserUsageStatsService.getUsageSummary(),
        AdminAnalyticsService.getAnalysisMetrics(),
      ]);

      return {
        platformOverview,
        latestMetrics,
        topUsers,
        analysisMetrics,
        usageSummary,
      };
    } catch (error) {
      logError("Error fetching admin dashboard data", error);
      throw error;
    }
  }

  // Complete contract processing workflow with intelligent classification
  static async processContractWorkflow(
    userIdentifiers: { authId: string; profileId?: string },
    contractData: any,
    reviewType: string,
    options?: { onProgress?: (stage: string, percent: number) => void },
  ) {
    const emitProgress = (stage: string, percent: number) => {
      if (typeof options?.onProgress === "function") {
        try {
          options.onProgress(stage, percent);
        } catch (error) {
          console.warn("[workflow] progress handler failed", {
            stage,
            percent,
            error,
          });
        }
      }
    };

    const authUserId = userIdentifiers.authId;
    const profileId =
      userIdentifiers.profileId ||
      contractData.user_profile_id ||
      contractData.userId ||
      authUserId;
    let ownerUserId = profileId;

    if (!authUserId) {
      throw new Error("Missing authenticated user id for contract processing.");
    }

    const workflowStartedAt = new Date().toISOString();
    const workflowPerfStart =
      typeof performance !== "undefined" ? performance.now() : null;
    let classification: any = null;
    let retryCount = 0;
    let customSolutionId =
      typeof contractData.custom_solution_id === "string" &&
      contractData.custom_solution_id.length > 0
        ? contractData.custom_solution_id
        : undefined;
    let customSolution: CustomSolution | null = null;
    const organizationId =
      typeof contractData.organization_id === "string" &&
      contractData.organization_id.length > 0
        ? contractData.organization_id
        : null;

    try {
      emitProgress("preparing", 6);
      emitProgress("uploading", 12);
      emitProgress("extracting", 18);
      console.log("🚀 Starting intelligent contract processing workflow...");
      logger.contractAction("Workflow started", undefined, {
        authUserId,
        reviewType,
        ingestionId: contractData.ingestion_id,
        selectedSolution: contractData.selected_solution_key ?? contractData.selected_solution_id ?? null,
      });

      // 1. Classify contract type using AI with robust error handling
      try {
        const { contractClassificationService } = await import(
          "./contractClassificationService"
        );
        console.log("🤖 Classifying contract type...");

        classification = await this.measureAsync(
          "workflow.classification",
          () =>
            contractClassificationService.classifyContract(
              contractData.content,
              contractData.file_name,
              {
                solutionKey:
                  typeof contractData.selected_solution_key === "string"
                    ? contractData.selected_solution_key
                    : typeof contractData.selected_solution_id === "string"
                      ? contractData.selected_solution_id
                      : typeof contractData.selected_solution_title === "string"
                        ? contractData.selected_solution_title
                        : null,
              },
            ),
          {
            context: {
              reviewType,
              ingestionId: contractData.ingestion_id,
              filename: contractData.file_name,
            },
            warnMs: 4000,
          },
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
        logger.contractAction("classification_fallback", undefined, {
          reason: classificationError instanceof Error ? classificationError.message : String(classificationError),
          userId: authUserId,
        });
      }
      logger.contractAction("classification_completed", undefined, {
        contractType: classification?.contractType,
        confidence: classification?.confidence,
        reviewType,
      });
      emitProgress("classification_complete", 22);

      if (contractData.ingestion_id || contractData.content) {
        emitProgress("clause_extraction", 28);
        try {
          const clauseResult = await this.measureAsync(
            "workflow.clause_extraction",
            () =>
              clauseExtractionService.ensureClauses({
                ingestionId: contractData.ingestion_id,
                content: contractData.content,
                contractType: classification?.contractType,
                filename: contractData.file_name,
                forceRefresh: true,
              }),
            {
              context: {
                ingestionId: contractData.ingestion_id,
                contractType: classification?.contractType,
              },
              warnMs: 6000,
            },
          );
          contractData.clause_extractions = clauseResult.clauses;
          logger.contractAction("clause_extraction_completed", undefined, {
            clauseCount: clauseResult.clauses.length,
            ingestionId: contractData.ingestion_id,
          });
        } catch (clauseError) {
          logError("Clause extraction failed", clauseError, {
            ingestionId: contractData.ingestion_id,
            reviewType,
          });
        }
        emitProgress("clause_ready", 32);
      }

      const classificationSolutionKey =
        this.extractSolutionKeyFromClassification(classification);

      if (!contractData.selected_solution_key && classificationSolutionKey) {
        contractData.selected_solution_key = classificationSolutionKey;
      }
      if (!contractData.selected_solution_title && classificationSolutionKey) {
        contractData.selected_solution_title =
          solutionKeyToDisplayName(classificationSolutionKey);
      }

      if (!customSolutionId && organizationId) {
        const inferredSolutionKey =
          (contractData.selected_solution_key as SolutionKey | undefined) ??
          classificationSolutionKey;
        const organizationSolution =
          await this.findOrganizationCustomSolution(
            organizationId,
            inferredSolutionKey,
          );
        if (organizationSolution) {
          customSolution = organizationSolution;
          customSolutionId = organizationSolution.id ?? undefined;
          contractData.custom_solution_id = customSolutionId;
          contractData.selected_solution_id ??=
            organizationSolution.id ?? undefined;
          contractData.selected_solution_title ??=
            organizationSolution.name ??
            contractData.selected_solution_title;
          if (!contractData.selected_solution_key) {
            const derived = deriveSolutionKey(
              organizationSolution.contractType,
              organizationSolution.name,
            );
            if (derived) {
              contractData.selected_solution_key = derived;
            }
          }
        }
      }

      const userIdCandidates = Array.from(
        new Set(
          [
            authUserId,
            profileId,
            contractData.user_auth_id,
            contractData.user_profile_id,
            contractData.user_id,
            contractData.userId,
          ]
            .map((value) =>
              typeof value === "string" ? value.trim() : "",
            )
            .filter((value): value is string => value.length > 0),
        ),
      );

      if (userIdCandidates.length === 0) {
        throw new Error(
          "Unable to determine the user identifier for contract storage.",
        );
      }

      const contractMetadata = {
        classification: classification,
        originalFileType: contractData.file_type,
        userProfileId: profileId,
        authUserId,
        ingestionId: contractData.ingestion_id,
        ingestionStrategy: contractData.ingestion_strategy,
        ingestionWarnings: contractData.ingestion_warnings,
        documentWordCount: contractData.document_word_count,
        documentPageCount: contractData.document_page_count,
        attemptedOwnerIds: userIdCandidates,
        selectedSolutionId: contractData.selected_solution_id,
        selectedSolutionKey: contractData.selected_solution_key,
        selectedSolutionTitle: contractData.selected_solution_title,
        ingestionAssets: contractData.assets ?? null,
        customSolutionId:
          customSolutionId ?? contractData.custom_solution_id ?? null,
        organizationId,
      };

      let contract: Awaited<
        ReturnType<typeof ContractsService.createContract>
      > | null = null;
      let resolvedUserId: string | null = null;
      let lastCreationError: unknown = null;

      for (const [attemptIndex, candidateUserId] of userIdCandidates.entries()) {
        try {
          const created = await this.measureAsync(
            "workflow.contract_create",
            () =>
              ContractsService.createContract({
                title: contractData.title,
                content: contractData.content,
                content_html: contractData.content_html ?? null,
                file_name: contractData.file_name,
                file_size: contractData.file_size,
                user_id: candidateUserId,
                custom_solution_id:
                  customSolutionId ?? contractData.custom_solution_id ?? null,
                organization_id: organizationId ?? null,
                metadata: {
                  ...contractMetadata,
                  resolvedOwnerId: candidateUserId,
                },
              }),
            {
              context: {
                attempt: attemptIndex + 1,
                userId: candidateUserId,
                ingestionId: contractData.ingestion_id,
              },
              warnMs: 2000,
            },
          );

          contract = created;
          resolvedUserId = created?.user_id ?? candidateUserId;
          break;
        } catch (creationError) {
          lastCreationError = creationError;

          if (
            !this.isForeignKeyConstraintError(
              creationError,
              "contracts_user_id_fkey",
            )
          ) {
            throw creationError;
          }

          console.warn(
            "⚠️ Contract insert failed for user identifier, trying fallback",
            {
              attemptedUserId: candidateUserId,
              candidates: userIdCandidates,
              error:
                creationError instanceof Error
                  ? creationError.message
                  : creationError,
            },
          );
        }
      }

      if (!contract || !resolvedUserId) {
        throw lastCreationError ??
          new Error(
            "Unable to create contract record due to invalid user linkage.",
          );
      }

      ownerUserId = resolvedUserId;

      const candidateUserIds = userIdCandidates;

      const { userId: activityUserId } = await this.measureAsync(
        "workflow.track_contract_upload",
        () =>
          this.executeWithUserIdFallback(
            candidateUserIds,
            "trackContractUpload",
            async (candidateUserId) =>
              UserActivitiesService.trackContractUpload(
                candidateUserId,
                contract.id,
                contract.title,
                {
                  classification: classification,
                  user_profile_id: profileId,
                },
              ),
          ),
        {
          context: { contractId: contract.id },
          warnMs: 2000,
        },
      );

      await this.measureAsync(
        "workflow.track_login",
        () =>
          this.executeWithUserIdFallback(
            [activityUserId, ...candidateUserIds],
            "trackLogin",
            async (candidateUserId) =>
              UserActivitiesService.trackLogin(candidateUserId),
          ),
        {
          context: { contractId: contract.id },
          warnMs: 2000,
        },
      );

      console.log("✅ Contract created and activity tracked");
      emitProgress("contract_persisted", 42);

      // 4. Process with AI analysis using classified contract type with enhanced error handling
      const enhancedContractData = {
        ...contractData,
        user_id: ownerUserId,
        user_auth_id: authUserId,
        user_profile_id: profileId,
        contract_type: classification.contractType,
        classification: classification,
        selected_solution_id: contractData.selected_solution_id,
        selected_solution_title: contractData.selected_solution_title,
        selected_solution_key: contractData.selected_solution_key,
        custom_solution_id:
          customSolutionId ?? contractData.custom_solution_id ?? null,
      };

      let reviewResults: any;
      let retryCount = 0;
      const maxRetries = 2;
      const analysisStartedAt = new Date().toISOString();
      const analysisPerfStart = typeof performance !== "undefined" ? performance.now() : null;

      while (retryCount <= maxRetries) {
        try {
          if (retryCount === 0) {
            emitProgress("analysis_start", 55);
          }
          console.log(
            `🔄 Attempting AI analysis (attempt ${retryCount + 1}/${maxRetries + 1})...`,
          );
          reviewResults = await this.measureAsync(
            "workflow.ai_analysis_attempt",
            () =>
              this.processWithAI(
                enhancedContractData,
                reviewType,
                authUserId,
                customSolutionId,
                customSolution,
              ),
            {
              context: {
                attempt: retryCount + 1,
                reviewType,
                contractType: enhancedContractData.contract_type,
                ingestionId: contractData.ingestion_id,
              },
              warnMs: 20000,
            },
          );
          reviewResults = this.applyCalibration(reviewResults, reviewType, {
            selected_solution_id: contractData.selected_solution_id,
            selected_solution_key: contractData.selected_solution_key,
            selected_solution_title: contractData.selected_solution_title,
          });
          console.log("✅ AI analysis completed successfully");
          emitProgress("analysis_complete", 85);
          break;
        } catch (aiError) {
          retryCount++;
          logError(`❌ AI analysis attempt ${retryCount} failed`, aiError, {
            userId: ownerUserId,
            reviewType,
            retryCount,
          });

          if (retryCount > maxRetries) {
            // Final fallback - create a basic review result
            console.log(
              "🔄 Using fallback analysis due to repeated AI failures",
            );
            const fallbackResult = generateFallbackAnalysis(
              reviewType,
              classification,
              {
                fallbackReason: "Primary AI provider unavailable",
                contractContent: contractData.content,
                contractType: contractData.contract_type,
                solutionKey:
                  contractData.selected_solution_key ||
                  contractData.selected_solution_id,
                solutionTitle: contractData.selected_solution_title,
              },
            );
            reviewResults = this.applyCalibration(fallbackResult, reviewType, {
              selected_solution_id: contractData.selected_solution_id,
              selected_solution_key: contractData.selected_solution_key,
              selected_solution_title: contractData.selected_solution_title,
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
      const normalizedScore =
        typeof reviewResults?.score === "number"
          ? Math.round(reviewResults.score)
          : undefined;
      const normalizedConfidence =
        typeof reviewResults?.confidence === "number"
          ? Math.max(0, Math.min(1, reviewResults.confidence))
          : undefined;

      const review = await this.measureAsync(
        "workflow.review_create",
        () =>
          ContractReviewsService.createReview({
            contract_id: contract.id,
            user_id: ownerUserId,
            review_type: reviewType,
            results: reviewResults,
            score: normalizedScore,
            confidence_level: normalizedConfidence,
            custom_solution_id:
              customSolutionId ?? contractData.custom_solution_id,
            model_used:
              typeof reviewResults?.model_used === "string"
                ? reviewResults.model_used
                : undefined,
            confidence_breakdown:
              reviewResults?.confidence_breakdown ?? undefined,
          }),
        {
          context: { contractId: contract.id, reviewType },
          warnMs: 2000,
        },
      );

      const completedAt = new Date().toISOString();
      const workflowLatencyMs = workflowPerfStart !== null
        ? Math.round(performance.now() - workflowPerfStart)
        : null;
      const analysisLatencyFromPerf = analysisPerfStart !== null
        ? Math.round(performance.now() - analysisPerfStart)
        : null;
      const analysisLatencyMs = typeof reviewResults?.processing_time === "number"
        ? Math.round(reviewResults.processing_time * 1000)
        : analysisLatencyFromPerf;

      AnalyticsEventsService.recordMetric({
        user_id: ownerUserId,
        contract_id: contract.id,
        review_id: review.id,
        ingestion_id: contractData.ingestion_id ?? null,
        model_used: reviewResults?.model_used ?? null,
        review_type: reviewType,
        contract_type: classification?.contractType ?? null,
        solution_key:
          reviewResults?.calibration?.solutionKey ||
          contractData.selected_solution_key ||
          null,
        fallback_used: reviewResults?.calibration?.fallbackUsed ?? false,
        retry_count: retryCount,
        latency_ms: analysisLatencyMs ?? workflowLatencyMs,
        started_at: analysisStartedAt,
        completed_at: completedAt,
        status: "completed",
        metadata: {
          score: reviewResults?.score,
          confidence: reviewResults?.confidence,
          classificationConfidence: classification?.confidence,
          ingestionStrategy: contractData.ingestion_strategy,
          warnings: contractData.ingestion_warnings ?? [],
          workflowLatencyMs,
        },
      });

      // 6. Update user usage statistics
      const { userId: statsUserId } = await this.measureAsync(
        "workflow.track_usage_stats",
        () =>
          this.executeWithUserIdFallback(
            candidateUserIds,
            "trackUsageStats",
            async (candidateUserId) =>
              UserUsageStatsService.trackReviewCompletion(
                candidateUserId,
                reviewType,
                1,
              ),
          ),
        {
          context: { contractId: contract.id, reviewType },
          warnMs: 2000,
        },
      );

      await this.measureAsync(
        "workflow.track_review_completed",
        () =>
          this.executeWithUserIdFallback(
            [statsUserId, ...candidateUserIds],
            "trackReviewCompleted",
            async (candidateUserId) =>
              UserActivitiesService.trackReviewCompleted(
                candidateUserId,
                contract.id,
                reviewType,
              ),
          ),
        {
          context: { contractId: contract.id, reviewType },
          warnMs: 2000,
        },
      );

      console.log("✅ Contract processing workflow completed successfully");
      emitProgress("review_saved", 96);
      emitProgress("complete", 100);

      return {
        success: true,
        contract,
        review,
        classification,
        timings: {
          workflowMs: workflowLatencyMs,
          analysisMs: analysisLatencyMs,
        },
      };
    } catch (error) {
      emitProgress("error", 96);
      // Log error with comprehensive context
      const errorDetails = logError(
        "❌ Contract processing workflow failed",
        error,
        {
          userId: ownerUserId,
          reviewType,
          contractTitle: contractData.title,
          contentLength: contractData.content?.length,
          fileName: contractData.file_name,
        },
      );

      // Re-throw with user-friendly error message
      const userFriendlyMessage = createUserFriendlyMessage(
        error,
        "Contract processing failed due to an unexpected error",
      );
      const failedLatencyMs = workflowPerfStart !== null
        ? Math.round(performance.now() - workflowPerfStart)
        : null;

      AnalyticsEventsService.recordMetric({
        user_id: ownerUserId ?? profileId ?? authUserId,
        contract_id: contractData.contract_id ?? null,
        review_id: null,
        ingestion_id: contractData.ingestion_id ?? null,
        model_used: null,
        review_type: reviewType,
        contract_type:
          classification?.contractType ?? contractData.contract_type ?? null,
        solution_key: contractData.selected_solution_key ?? null,
        fallback_used: true,
        retry_count,
        latency_ms: failedLatencyMs,
        started_at: workflowStartedAt,
        completed_at: new Date().toISOString(),
        status: "failed",
        error_code: error instanceof Error ? error.name : "unknown",
        error_message:
          error instanceof Error ? error.message : String(error),
        metadata: {
          classificationFallback: classification?.fallback_used ?? false,
          message: errorDetails.message,
          workflowLatencyMs: failedLatencyMs,
        },
      });
      throw new Error(userFriendlyMessage);
    }
  }

  private static isForeignKeyConstraintError(
    error: unknown,
    constraint: string,
  ): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const err = error as Record<string, unknown>;
    const code =
      typeof err.code === "string"
        ? err.code
        : typeof (err as Record<string, unknown>).status === "number" &&
            (err as Record<string, unknown>).status === 409
          ? "23503"
          : undefined;
    const message =
      typeof err.message === "string"
        ? err.message
        : typeof err.error === "string"
          ? err.error
          : "";
    const details =
      typeof err.details === "string"
        ? err.details
        : typeof err.description === "string"
          ? err.description
          : "";
    const hint = typeof err.hint === "string" ? err.hint : "";

    const haystack = `${message} ${details} ${hint}`.toLowerCase();
    const normalizedConstraint = constraint.toLowerCase();

    if (code === "23503" && haystack.includes(normalizedConstraint)) {
      return true;
    }

    if (code === "23503" && constraint === "contracts_user_id_fkey") {
      return true;
    }

    return (
      haystack.includes("foreign key") && haystack.includes(normalizedConstraint)
    );
  }

  private static normalizeScore(
    value: unknown,
    fallback: number,
  ): { score: number; source: "model" | "fallback" | "derived" } {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      const score = Math.min(100, Math.max(0, Math.round(parsed)));
      return { score, source: "model" };
    }
    const score = Math.min(100, Math.max(0, Math.round(fallback)));
    return { score, source: "fallback" };
  }

  private static normalizeConfidence(
    value: unknown,
    fallback: number,
  ): { confidence: number; source: "model" | "fallback" | "derived" } {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      const confidence = Math.min(1, Math.max(0, Number(parsed)));
      return { confidence, source: "model" };
    }
    const confidence = Math.min(1, Math.max(0, Number(fallback)));
    return { confidence, source: "fallback" };
  }

  private static deriveConfidenceBand(confidence: number) {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.65) return "medium";
    return "low";
  }

  private static extractSolutionKeyFromClassification(
    classification: any,
  ): SolutionKey | undefined {
    if (!classification || typeof classification !== "object") {
      return undefined;
    }

    const explicitKey =
      typeof classification.recommendedSolutionKey === "string"
        ? (classification.recommendedSolutionKey as SolutionKey)
        : undefined;

    if (explicitKey) {
      return explicitKey;
    }

    const contractType =
      typeof classification.contractType === "string"
        ? classification.contractType
        : undefined;

    return mapClassificationToSolutionKey(contractType);
  }

  private static applyCalibration(
    rawResults: any,
    reviewType: string,
    solutionContext: {
      selected_solution_id?: string;
      selected_solution_key?: string;
      selected_solution_title?: string;
    },
  ) {
    const results = rawResults ?? {};

    const solutionKeyNormalized = (solutionContext.selected_solution_key || solutionContext.selected_solution_id || solutionContext.selected_solution_title || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const scoringProfiles: Record<
      string,
      {
        baselineScore: number;
        fallbackScore: number;
        baselineConfidence: number;
        fallbackConfidence: number;
        emphasis: string;
      }
    > = {
      dpa: {
        baselineScore: 76,
        fallbackScore: 68,
        baselineConfidence: 0.84,
        fallbackConfidence: 0.6,
        emphasis: "data protection & regulatory compliance",
      },
      ppc: {
        baselineScore: 75,
        fallbackScore: 67,
        baselineConfidence: 0.82,
        fallbackConfidence: 0.58,
        emphasis: "transparency obligations & privacy rights",
      },
      nda: {
        baselineScore: 77,
        fallbackScore: 70,
        baselineConfidence: 0.83,
        fallbackConfidence: 0.6,
        emphasis: "confidentiality scope & enforcement",
      },
      eula: {
        baselineScore: 76,
        fallbackScore: 69,
        baselineConfidence: 0.8,
        fallbackConfidence: 0.58,
        emphasis: "license restrictions & liability coverage",
      },
      ca: {
        baselineScore: 74,
        fallbackScore: 68,
        baselineConfidence: 0.78,
        fallbackConfidence: 0.55,
        emphasis: "service scope & ownership of deliverables",
      },
      psa: {
        baselineScore: 74,
        fallbackScore: 67,
        baselineConfidence: 0.77,
        fallbackConfidence: 0.54,
        emphasis: "supply obligations & logistics risk",
      },
      rda: {
        baselineScore: 75,
        fallbackScore: 68,
        baselineConfidence: 0.79,
        fallbackConfidence: 0.55,
        emphasis: "research governance & IP sharing",
      },
      default: {
        baselineScore: 75,
        fallbackScore: 70,
        baselineConfidence: 0.8,
        fallbackConfidence: 0.6,
        emphasis: "contractual balance of risk and obligations",
      },
    };

    const solutionProfile =
      scoringProfiles[solutionKeyNormalized] ?? scoringProfiles.default;

    if (
      solutionContext.selected_solution_id ||
      solutionContext.selected_solution_key ||
      solutionContext.selected_solution_title
    ) {
      results.selected_solution = {
        id: solutionContext.selected_solution_id ?? null,
        key: solutionContext.selected_solution_key ?? null,
        title: solutionContext.selected_solution_title ?? null,
      };
    }

    const fallbackUsed =
      results?.fallback_used === true ||
      (typeof results?.fallback_reason === "string" &&
        results.fallback_reason.length > 0);

    const defaultScore = fallbackUsed
      ? solutionProfile.fallbackScore
      : solutionProfile.baselineScore;
    const defaultConfidence = fallbackUsed
      ? solutionProfile.fallbackConfidence
      : solutionProfile.baselineConfidence;

    const { score, source: scoreSource } = this.normalizeScore(
      results?.score,
      defaultScore,
    );
    const { confidence, source: confidenceSource } = this.normalizeConfidence(
      results?.confidence ?? results?.confidence_level,
      defaultConfidence,
    );

    const calibration = {
      score,
      scoreSource,
      confidence,
      confidenceSource,
      confidenceBand: this.deriveConfidenceBand(confidence),
      fallbackUsed,
      reviewType,
      solutionKey: solutionKeyNormalized || null,
      scoringEmphasis: solutionProfile.emphasis,
    } as const;

    return {
      ...results,
      score,
      confidence,
      calibration,
    };
  }

  private static isUserScopeError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const err = error as Record<string, unknown>;
    const code =
      typeof err.code === "string" ? err.code.toLowerCase() : undefined;
    const status = Number(
      typeof err.status === "number"
        ? err.status
        : typeof err.status === "string"
          ? err.status
          : NaN,
    );
    const message = (
      (typeof err.message === "string"
        ? err.message
        : typeof err.error === "string"
          ? err.error
          : typeof err.details === "string"
            ? err.details
            : "") || ""
    )
      .toLowerCase()
      .trim();

    if (code === "23503") {
      return true;
    }

    if ([401, 403, 404, 406].includes(status)) {
      return true;
    }

    if (
      message.includes("foreign key") ||
      message.includes("not present in table") ||
      message.includes("violates row-level security")
    ) {
      return true;
    }

    return false;
  }

  private static async executeWithUserIdFallback<T>(
    userIds: string[],
    operationName: string,
    executor: (userId: string) => Promise<T>,
  ): Promise<{ result: T; userId: string }> {
    const attempted: Array<{ userId: string; error: unknown }> = [];
    const seen = new Set<string>();
    let lastError: unknown = null;

    for (const candidateId of userIds) {
      if (!candidateId) {
        continue;
      }

      if (seen.has(candidateId)) {
        continue;
      }
      seen.add(candidateId);

      try {
        const result = await executor(candidateId);
        if (attempted.length > 0) {
          console.warn(
            `[${operationName}] succeeded using fallback user identifier`,
            {
              candidateId,
              attempts: attempted.map((item) => item.userId),
            },
          );
        }
        return { result, userId: candidateId };
      } catch (error) {
        attempted.push({ userId: candidateId, error });
        lastError = error;

        if (!this.isUserScopeError(error)) {
          throw error;
        }

        console.warn(
          `[${operationName}] user identifier failed, trying fallback`,
          {
            candidateId,
            attempts: attempted.length,
            error,
          },
        );
      }
    }

    throw lastError ??
      new Error(
        `Unable to complete ${operationName}. All user identifier attempts failed.`,
      );
  }

  private static getNowMs(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  private static async measureAsync<T>(
    label: string,
    task: () => Promise<T>,
    options?: {
      context?: Record<string, unknown>;
      warnMs?: number;
    },
  ): Promise<T> {
    const start = this.getNowMs();
    let status: "success" | "error" = "success";

    try {
      return await task();
    } catch (error) {
      status = "error";
      throw error;
    } finally {
      const durationMs = Math.round(this.getNowMs() - start);
      const context = { ...options?.context, status };
      logger.performance(label, durationMs, context);

      if (options?.warnMs && durationMs >= options.warnMs) {
        logger.warn(`Slow step: ${label}`, {
          ...options?.context,
          durationMs,
          thresholdMs: options.warnMs,
        });
      }
    }
  }

  // AI processing with enhanced error handling and classification context
  private static async processWithAI(
    contractData: any,
    reviewType: string,
    authUserId: string,
    customSolutionId?: string,
    presetCustomSolution?: CustomSolution | null,
  ) {
    try {
      console.log("🤖 Starting AI analysis with enhanced context...");

      // Get custom solution if specified
      let customSolution: CustomSolution | null =
        presetCustomSolution ?? null;
      if (!customSolution && customSolutionId) {
        console.log("📋 Resolving custom solution metadata:", customSolutionId);
        customSolution = await this.measureAsync(
          "workflow.custom_solution_fetch",
          () => this.fetchCustomSolution(customSolutionId),
          {
            context: { customSolutionId },
            warnMs: 2000,
          },
        );
        if (!customSolution) {
          console.warn(
            "⚠️ Custom solution metadata unavailable, continuing with default playbook.",
            { customSolutionId },
          );
        }
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
      const selectedSolution =
        contractData.selected_solution_id ||
        contractData.selected_solution_key ||
        contractData.selected_solution_title
          ? {
              id: contractData.selected_solution_id,
              key: contractData.selected_solution_key,
              title: contractData.selected_solution_title,
            }
          : undefined;

      // Force fast model for analysis
      const normalizedModel = AIModel.OPENAI_GPT5_NANO;

      const analysisRequest = {
        // Keep content to avoid empty payload; server will prefer ingestionId if provided
        content: contractData.content,
        reviewType,
        contractType: contractData.contract_type || "general",
        perspective: contractData.perspective ?? undefined,
        perspectiveLabel: contractData.perspective_label ?? undefined,
        customSolution: customSolution ?? undefined,
        model: normalizedModel as ContractAnalysisRequest["model"],
        userId: authUserId,
        fileType: contractData.file_type,
        fileName: contractData.file_name,
        filename: contractData.file_name,
        documentFormat,
        classification: contractData.classification || null,
        ingestionId: contractData.ingestion_id,
        ingestionWarnings: contractData.ingestion_warnings,
        selectedSolution,
      };

      console.log("📊 Analysis request prepared:", {
        reviewType,
        contractType: analysisRequest.contractType,
        hasClassification: !!analysisRequest.classification,
        contentLength: contractData.content.length,
      });

      // Analyze contract with AI
      const result = await this.measureAsync(
        "workflow.ai_analysis_request",
        () => aiService.analyzeContract(analysisRequest),
        {
          context: {
            reviewType,
            contractType: analysisRequest.contractType,
            ingestionId: analysisRequest.ingestionId,
            model: analysisRequest.model,
          },
          warnMs: 20000,
        },
      );

      console.log("✅ AI analysis completed successfully:", {
        score: result.score,
        confidence: result.confidence,
        processingTime: result.processing_time,
      });

      return result;
    } catch (error) {
      const errorInfo = logError("❌ AI analysis failed", error, {
        reviewType,
        userId: authUserId,
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
