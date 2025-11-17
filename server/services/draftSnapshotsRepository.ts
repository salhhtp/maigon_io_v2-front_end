import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import type { StorageObjectRef } from "../../shared/api";

export interface DraftSnapshotRecord {
  id: string;
  contract_id: string;
  draft_key: string;
  html: string | null;
  plain_text: string | null;
  summary: string | null;
  applied_changes: unknown;
  asset_bucket: string | null;
  asset_path: string | null;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface DraftSnapshotPayload {
  contractId: string;
  draftKey: string;
  html?: string | null;
  plainText?: string | null;
  summary?: string | null;
  appliedChanges?: string[] | null;
  assetRef?: StorageObjectRef | null;
  provider?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DraftSnapshot {
  id: string;
  contractId: string;
  draftKey: string;
  html: string | null;
  plainText: string | null;
  summary: string | null;
  appliedChanges: string[];
  assetRef: StorageObjectRef | null;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

function mapRowToSnapshot(
  row: DraftSnapshotRecord | null,
): DraftSnapshot | null {
  if (!row) return null;
  const appliedChanges =
    Array.isArray(row.applied_changes) || row.applied_changes === null
      ? ((row.applied_changes as string[] | null) ?? [])
      : [];
  const assetRef =
    row.asset_bucket && row.asset_path
      ? { bucket: row.asset_bucket, path: row.asset_path }
      : null;

  const metadata =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  const snapshot: DraftSnapshot = {
    id: row.id,
    contractId: row.contract_id,
    draftKey: row.draft_key,
    html: row.html ?? null,
    plainText: row.plain_text ?? null,
    summary: row.summary ?? null,
    appliedChanges,
    assetRef,
    provider: row.provider ?? null,
    model: row.model ?? null,
    metadata,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
  return snapshot;
}

export async function getDraftSnapshotByKey(
  contractId: string,
  draftKey: string,
): Promise<DraftSnapshot | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_snapshots")
    .select("*")
    .eq("contract_id", contractId)
    .eq("draft_key", draftKey)
    .maybeSingle<DraftSnapshotRecord>();

  if (error) {
    throw error;
  }

  return mapRowToSnapshot(data);
}

export async function getDraftSnapshotById(
  id: string,
): Promise<DraftSnapshot | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_draft_snapshots")
    .select("*")
    .eq("id", id)
    .maybeSingle<DraftSnapshotRecord>();

  if (error) {
    throw error;
  }

  return mapRowToSnapshot(data);
}

export async function upsertDraftSnapshot(
  payload: DraftSnapshotPayload,
): Promise<DraftSnapshot | null> {
  const supabase = getSupabaseAdminClient();
  const insertPayload: Record<string, unknown> = {
    contract_id: payload.contractId,
    draft_key: payload.draftKey,
    html: payload.html ?? null,
    plain_text: payload.plainText ?? null,
    summary: payload.summary ?? null,
    applied_changes: payload.appliedChanges ?? [],
    asset_bucket: payload.assetRef?.bucket ?? null,
    asset_path: payload.assetRef?.path ?? null,
    provider: payload.provider ?? null,
    model: payload.model ?? null,
    metadata: payload.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("contract_draft_snapshots")
    .upsert(insertPayload, {
      onConflict: "contract_id,draft_key",
    })
    .select("*")
    .maybeSingle<DraftSnapshotRecord>();

  if (error) {
    throw error;
  }

  return mapRowToSnapshot(data);
}
