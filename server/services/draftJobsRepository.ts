import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import type { AgentDraftRequest, AgentDraftResponse } from "../../shared/api";

export type DraftJobStatus = "pending" | "running" | "succeeded" | "failed";

interface DraftJobRecord {
  id: string;
  contract_id: string;
  draft_key: string | null;
  status: DraftJobStatus;
  error: string | null;
  result_snapshot_id: string | null;
  result: unknown;
  payload: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface DraftJob {
  id: string;
  contractId: string;
  draftKey: string | null;
  status: DraftJobStatus;
  error: string | null;
  resultSnapshotId: string | null;
  result: AgentDraftResponse | null;
  payload: AgentDraftRequest | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

function mapJob(row: DraftJobRecord | null): DraftJob | null {
  if (!row) return null;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};

  return {
    id: row.id,
    contractId: row.contract_id,
    draftKey: row.draft_key,
    status: row.status,
    error: row.error,
    resultSnapshotId: row.result_snapshot_id,
    result:
      row.result && typeof row.result === "object"
        ? (row.result as AgentDraftResponse)
        : null,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as AgentDraftRequest)
        : null,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export async function createDraftJob(input: {
  contractId: string;
  draftKey?: string | null;
  payload: AgentDraftRequest;
  metadata?: Record<string, unknown>;
}): Promise<DraftJob> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .insert({
      contract_id: input.contractId,
      draft_key: input.draftKey ?? null,
      status: "pending",
      payload: input.payload,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .maybeSingle<DraftJobRecord>();

  if (error) {
    throw error;
  }

  const job = mapJob(data);
  if (!job) {
    throw new Error("Failed to create draft job");
  }
  return job;
}

export async function getDraftJobById(id: string): Promise<DraftJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle<DraftJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}

export async function markDraftJobRunning(
  id: string,
): Promise<DraftJob | null> {
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
    .maybeSingle<DraftJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}

export async function markDraftJobSucceeded(input: {
  id: string;
  draftKey?: string | null;
  resultSnapshotId?: string | null;
  result?: AgentDraftResponse | null;
  metadata?: Record<string, unknown>;
}): Promise<DraftJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_jobs")
    .update({
      status: "succeeded",
      draft_key: input.draftKey ?? null,
      result_snapshot_id: input.resultSnapshotId ?? null,
      result: input.result ?? null,
      metadata: input.metadata ?? {},
      finished_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle<DraftJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}

export async function markDraftJobFailed(
  id: string,
  errorMessage: string,
): Promise<DraftJob | null> {
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
    .maybeSingle<DraftJobRecord>();

  if (error) {
    throw error;
  }

  return mapJob(data);
}
