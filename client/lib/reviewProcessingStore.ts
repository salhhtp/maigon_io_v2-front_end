
import type { ExtractionAssets } from "@shared/api";

export interface PendingClauseSnippet {
  id: string;
  title?: string;
  text: string;
  clauseId?: string;
  category?: string;
}

export interface PendingSimilarityReference {
  id: string;
  sourceTitle: string;
  similarityScore?: number;
  rationale?: string;
  referenceId?: string;
}

export interface PendingEditAnchor {
  id: string;
  clauseId?: string;
  description?: string;
  anchorText?: string;
}

export interface PendingReviewMetadata {
  fileName?: string;
  fileSize?: number;
  solutionTitle?: string;
  perspective?: string;
  ingestionWarnings?: string[];
  userProfileId?: string;
  solutionId?: string;
  solutionKey?: string;
  customSolutionId?: string;
  organizationId?: string | null;
  clauseSnippets?: PendingClauseSnippet[];
  similarityReferences?: PendingSimilarityReference[];
  editAnchors?: PendingEditAnchor[];
}

export interface PendingReviewRequest {
  userAuthId: string;
  userProfileId?: string;
  contractInput: {
    title: string;
    content: string;
    content_html?: string | null;
    file_name: string;
    file_size: number;
    file_type?: string;
    ingestion_id?: string;
    ingestion_strategy?: string;
    ingestion_warnings?: string[];
    ingestion_needs_ocr?: boolean;
    document_word_count?: number;
    document_page_count?: number;
    user_profile_id?: string;
    user_auth_id: string;
    custom_solution_id?: string;
    selected_solution_id?: string;
    selected_solution_title?: string;
    selected_solution_key?: string;
    assets?: ExtractionAssets;
    organization_id?: string | null;
  };
  reviewType: string;
  metadata: PendingReviewMetadata;
}

let pendingRequest: PendingReviewRequest | null = null;
const STORAGE_KEY = "maigon:pendingReview:pending";

const isBrowser = typeof window !== "undefined" && !!window.sessionStorage;

function persistPending(request: PendingReviewRequest | null) {
  if (!isBrowser) return;
  try {
    if (!request) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
    }
  } catch (error) {
    console.warn("[reviewProcessingStore] Failed to persist pending review", error);
  }
}

function readPersistedPending(): PendingReviewRequest | null {
  if (!isBrowser) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingReviewRequest;
    return parsed;
  } catch (error) {
    console.warn("[reviewProcessingStore] Failed to read pending review", error);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore removal errors
    }
    return null;
  }
}

export const reviewProcessingStore = {
  setPending(request: PendingReviewRequest) {
    pendingRequest = request;
    persistPending(request);
  },
  consumePending(): PendingReviewRequest | null {
    if (pendingRequest) {
      const current = pendingRequest;
      pendingRequest = null;
      persistPending(null);
      return current;
    }
    const restored = readPersistedPending();
    if (restored) {
      persistPending(null);
      return restored;
    }
    return null;
  },
  clear() {
    pendingRequest = null;
    persistPending(null);
  },
};
