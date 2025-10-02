// Very small localStorage-backed mock DB to enable preview without Supabase tables
// Only implements the minimal pieces used by the upload workflow.

type UUID = string;

export interface MockContract {
  id: UUID;
  user_id: string;
  title: string;
  content?: string;
  file_name?: string;
  file_size?: number;
  status: 'pending' | 'reviewing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface MockReview {
  id: UUID;
  contract_id: UUID;
  user_id: string;
  review_type: string;
  results: any;
  score?: number;
  confidence_level?: number;
  created_at: string;
}

export interface MockActivity {
  id: UUID;
  user_id: string;
  activity_type: string;
  description?: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}

const STORAGE_KEYS = {
  contracts: 'mock_contracts',
  reviews: 'mock_contract_reviews',
  activities: 'mock_user_activities',
};

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage errors in preview mode
  }
}

function uuid(): UUID {
  // RFC4122 v4-ish UUID, sufficient for preview
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const mockDb = {
  createContract(input: Partial<MockContract>): MockContract {
    const now = new Date().toISOString();
    const contract: MockContract = {
      id: uuid(),
      user_id: input.user_id || 'unknown-user',
      title: input.title || 'Untitled',
      content: input.content,
      file_name: input.file_name,
      file_size: input.file_size,
      status: (input.status as any) || 'pending',
      created_at: now,
      updated_at: now,
    };
    const list = load<MockContract>(STORAGE_KEYS.contracts);
    list.unshift(contract);
    save(STORAGE_KEYS.contracts, list);
    return contract;
  },

  updateContractStatus(id: UUID, status: MockContract['status']): MockContract | null {
    const list = load<MockContract>(STORAGE_KEYS.contracts);
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], status, updated_at: new Date().toISOString() };
    save(STORAGE_KEYS.contracts, list);
    return list[idx];
  },

  createReview(input: Omit<MockReview, 'id' | 'created_at'>): MockReview {
    const review: MockReview = { ...input, id: uuid(), created_at: new Date().toISOString() };
    const list = load<MockReview>(STORAGE_KEYS.reviews);
    list.unshift(review);
    save(STORAGE_KEYS.reviews, list);
    return review;
  },

  trackActivity(input: Omit<MockActivity, 'id' | 'created_at'>): MockActivity {
    const activity: MockActivity = { ...input, id: uuid(), created_at: new Date().toISOString() };
    const list = load<MockActivity>(STORAGE_KEYS.activities);
    list.unshift(activity);
    save(STORAGE_KEYS.activities, list);
    return activity;
  },

  // Convenience getters used by dashboards (limited set)
  getRecentContracts(userId: string, limit = 5): MockContract[] {
    return load<MockContract>(STORAGE_KEYS.contracts)
      .filter(c => c.user_id === userId)
      .slice(0, limit);
  },
};

export function isMockEnabled(): boolean {
  // Enable when explicitly set or when Supabase isn’t reachable from the client
  // The services will also flip to mock on first Supabase error they catch.
  return (import.meta as any).env?.VITE_USE_MOCK_DB === 'true';
}

