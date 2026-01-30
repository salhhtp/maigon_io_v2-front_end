import { getSupabaseAdminClient } from "../lib/supabaseAdmin";

export type ClauseEditJobStatus = "pending" | "running" | "succeeded" | "failed";

export interface ClauseEditPayload {
  jobType: "clause_edit";
  contractId: string;
  itemId: string;
  prompt: string;
  updatedText: string;
  originalText: string;
  clauseTitle: string | null;
  clauseEvidence: Array<{
    clause?: string;
    clause_title?: string;
    clause_text?: string;
    evidence_excerpt?: string;
    recommendation?: string;
    importance?: string;
  }>;
  context: {
    contract: {
      id: string;
      title: string | null;
      contractType: string | null;
      classificationFallback: boolean;
    };
  };
}

export interface ClauseEditResult {
  suggestedText: string;
  prompt: string;
}

interface ClauseEditJobRecord {
  id: string;
  contract_id: string;
  status: ClauseEditJobStatus;
  error: string | null;
  result: unknown;
  payload: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface ClauseEditJob {
  id: string;
  contractId: string;
  status: ClauseEditJobStatus;
  error: string | null;
  result: ClauseEditResult | null;
  payload: ClauseEditPayload | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

function mapJob(row: ClauseEditJobRecord | null): ClauseEditJob | null {
  if (!row) return null;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};

  return {
    id: row.id,
    contractId: row.contract_id,
    status: row.status as ClauseEditJobStatus,
    error: row.error,
    result:
      row.result && typeof row.result === "object"
        ? (row.result as ClauseEditResult)
        : null,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as ClauseEditPayload)
        : null,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export async function createClauseEditJob(input: {
  contractId: string;
  payload: ClauseEditPayload;
  metadata?: Record<string, unknown>;
}): Promise<ClauseEditJob> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .insert({
      contract_id: input.contractId,
      status: "pending",
      payload: input.payload,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .maybeSingle<ClauseEditJobRecord>();

  if (error) {
    throw error;
  }

  const job = mapJob(data);
  if (!job) {
    throw new Error("Failed to create clause edit job");
  }
  return job;
}

export async function getClauseEditJobById(id: string): Promise<ClauseEditJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle<ClauseEditJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}

export async function markClauseEditJobRunning(
  id: string,
): Promise<ClauseEditJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle<ClauseEditJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}

export async function markClauseEditJobSucceeded(input: {
  id: string;
  result: ClauseEditResult;
  metadata?: Record<string, unknown>;
}): Promise<ClauseEditJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .update({
      status: "succeeded",
      result: input.result,
      metadata: input.metadata ?? {},
      finished_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle<ClauseEditJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}

export async function markClauseEditJobFailed(
  id: string,
  errorMessage: string,
): Promise<ClauseEditJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .update({
      status: "failed",
      error: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle<ClauseEditJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}
