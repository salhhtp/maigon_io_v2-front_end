
export interface PendingReviewMetadata {
  fileName?: string;
  fileSize?: number;
  solutionTitle?: string;
  perspective?: string;
}

export interface PendingReviewRequest {
  userId: string;
  contractInput: {
    title: string;
    content: string;
    file_name: string;
    file_size: number;
    custom_solution_id?: string;
  };
  reviewType: string;
  metadata: PendingReviewMetadata;
}

let pendingRequest: PendingReviewRequest | null = null;

export const reviewProcessingStore = {
  setPending(request: PendingReviewRequest) {
    pendingRequest = request;
  },
  consumePending(): PendingReviewRequest | null {
    const current = pendingRequest;
    pendingRequest = null;
    return current;
  },
  clear() {
    pendingRequest = null;
  },
};
