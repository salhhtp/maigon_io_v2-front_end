/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface ContractReviewPayload {
  contract: {
    id: string;
    title: string;
    file_name?: string | null;
    file_size?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  review: {
    id: string;
    review_type: string;
    results: Record<string, unknown>;
    score?: number | null;
    confidence_level?: number | null;
    created_at?: string | null;
  };
  metadata?: {
    fileName?: string;
    fileSize?: number;
    solutionTitle?: string;
    perspective?: string;
  };
}
