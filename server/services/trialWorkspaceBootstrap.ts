import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TrialWorkspaceBootstrapOptions {
  supabase: SupabaseClient;
  organizationId: string;
  organizationName: string;
}

export interface TrialWorkspaceBootstrapResult {
  sampleUserId: string | null;
  seededContracts: number;
  seededReviews: number;
  seededActivities: number;
  skipped: boolean;
}

const SAMPLE_CONTRACT_TITLE = "Sample Mutual NDA Review";
const SAMPLE_CONTRACT_FILE_NAME = "Sample-Mutual-NDA.pdf";
const SAMPLE_CONTRACT_CONTENT = `This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between ACME Corporation and Prospective Partner LLC for the purpose of exploring a confidential business opportunity. Both parties agree to keep shared information confidential, limit use of the data to evaluation purposes, and return or destroy materials upon request.`;

const SAMPLE_REVIEW_RESULTS = {
  summary:
    "The NDA is balanced for both parties with standard confidentiality, use, and remedies clauses. Recommended to clarify the survival period and ensure governing law matches your preference.",
  riskRating: "low",
  flaggedSections: [
    {
      clause: "Use of confidential information",
      risk: "medium",
      recommendation:
        "Limit internal access to individuals with a need-to-know and ensure subcontractors are covered.",
    },
    {
      clause: "Survival",
      risk: "medium",
      recommendation:
        "Extend confidentiality obligations to 3 years post-termination to align with internal policy.",
    },
  ],
  metrics: {
    clausesReviewed: 12,
    aiConfidence: 0.86,
    fallbackUsed: false,
  },
};

const SAMPLE_ACTIVITY_DESCRIPTIONS = [
  "AI review completed for Sample Mutual NDA",
  "Shared sample compliance checklist with workspace",
  "Suggested next step: upload your first real contract",
];

export async function bootstrapTrialWorkspaceSampleData(
  options: TrialWorkspaceBootstrapOptions,
): Promise<TrialWorkspaceBootstrapResult> {
  const { supabase, organizationId, organizationName } = options;

  const result: TrialWorkspaceBootstrapResult = {
    sampleUserId: null,
    seededContracts: 0,
    seededReviews: 0,
    seededActivities: 0,
    skipped: false,
  };

  try {
    const existingContracts = await supabase
      .from("contracts")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(1);

    if (existingContracts.error) {
      throw existingContracts.error;
    }

    if ((existingContracts.data ?? []).length > 0) {
      result.skipped = true;
      return result;
    }

    const sampleUserEmail = `sample.user+${organizationId.slice(0, 8)}@maigon-trials.invalid`;
    const profileInsert = await supabase
      .from("user_profiles")
      .insert({
        email: sampleUserEmail,
        first_name: "Sample",
        last_name: "Reviewer",
        company: organizationName,
        role: "user",
        is_active: false,
        organization_id: organizationId,
        organization_role: "member",
      })
      .select("id")
      .single();

    if (profileInsert.error) {
      throw profileInsert.error;
    }

    const sampleUserId = profileInsert.data.id as string;
    result.sampleUserId = sampleUserId;

    await supabase
      .from("user_usage_stats")
      .upsert(
        {
          user_id: sampleUserId,
          contracts_reviewed: 1,
          total_pages_reviewed: 12,
          risk_assessments_completed: 1,
          compliance_checks_completed: 1,
          organization_id: organizationId,
          last_activity: new Date().toISOString(),
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

    const contractInsert = await supabase
      .from("contracts")
      .insert({
        id: crypto.randomUUID(),
        user_id: sampleUserId,
        organization_id: organizationId,
        title: SAMPLE_CONTRACT_TITLE,
        content: SAMPLE_CONTRACT_CONTENT,
        file_name: SAMPLE_CONTRACT_FILE_NAME,
        file_size: 128000,
        status: "completed",
      })
      .select("id")
      .single();

    if (contractInsert.error) {
      throw contractInsert.error;
    }

    result.seededContracts += 1;

    const contractId = contractInsert.data.id as string;

    const reviewInsert = await supabase
      .from("contract_reviews")
      .insert({
        contract_id: contractId,
        user_id: sampleUserId,
        organization_id: organizationId,
        review_type: "risk_assessment",
        results: SAMPLE_REVIEW_RESULTS,
        score: 87,
        confidence_level: 0.88,
        model_used: "gpt-4o-mini",
      })
      .select("id")
      .single();

    if (reviewInsert.error) {
      throw reviewInsert.error;
    }

    result.seededReviews += 1;

    for (const description of SAMPLE_ACTIVITY_DESCRIPTIONS) {
      const activityInsert = await supabase.from("user_activities").insert({
        user_id: sampleUserId,
        organization_id: organizationId,
        activity_type: "system_seed",
        description,
        metadata: {
          is_sample_activity: true,
        },
      });

      if (activityInsert.error) {
        throw activityInsert.error;
      }

      result.seededActivities += 1;
    }

    return result;
  } catch (error) {
    console.error(
      "[bootstrap] Failed to seed trial workspace sample data",
      error,
    );
    return result;
  }
}
