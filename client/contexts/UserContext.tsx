import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  role: 'user' | 'admin';
  plan: {
    type: 'free_trial' | 'pay_as_you_go' | 'monthly_10' | 'monthly_15' | 'professional';
    name: string;
    price: number;
    contracts_limit: number;
    contracts_used: number;
    billing_cycle: 'trial' | 'per_contract' | 'monthly' | 'custom';
    next_billing_date?: string;
    trial_days_remaining?: number;
    features: string[];
  };
  usage: {
    total_reviews: number;
    this_month_reviews: number;
    success_rate: number;
    monthly_usage: Array<{
      month: string;
      reviews: number;
      max: number;
    }>;
  };
  billing: {
    current_bill: number;
    payment_method: string;
    billing_history: Array<{
      date: string;
      amount: number;
      status: 'paid' | 'pending' | 'failed';
      invoice_id: string;
    }>;
  };
  recent_activity: Array<{
    action: string;
    file: string;
    time: string;
    status: 'completed' | 'processing' | 'failed';
  }>;
  settings: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    two_factor_auth: boolean;
    auto_save: boolean;
    language: string;
    timezone: string;
  };
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  isLoggedIn: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock user data - in a real app, this would come from an API
const mockUsers: Record<string, User> = {
  'adam': {
    id: 'adam_123',
    name: 'Adam Smith',
    email: 'adam@company.com',
    company: 'Acme Corporation',
    phone: '+1 (555) 123-4567',
    role: 'admin',
    plan: {
      type: 'professional',
      name: 'Professional Plan',
      price: 2450,
      contracts_limit: -1, // unlimited
      contracts_used: 324,
      billing_cycle: 'custom',
      next_billing_date: '2024-07-15',
      features: ['Unlimited contracts', 'Priority support', 'Custom integrations', 'Advanced analytics', 'API access']
    },
    usage: {
      total_reviews: 324,
      this_month_reviews: 78,
      success_rate: 98.5,
      monthly_usage: [
        { month: 'Jan', reviews: 45, max: 100 },
        { month: 'Feb', reviews: 67, max: 100 },
        { month: 'Mar', reviews: 83, max: 100 },
        { month: 'Apr', reviews: 92, max: 100 },
        { month: 'May', reviews: 78, max: 100 },
        { month: 'Jun', reviews: 65, max: 100 }
      ]
    },
    billing: {
      current_bill: 2450,
      payment_method: '•••• 4242',
      billing_history: [
        { date: '2024-06-15', amount: 2450, status: 'paid', invoice_id: 'INV-001' },
        { date: '2024-05-15', amount: 2450, status: 'paid', invoice_id: 'INV-002' },
        { date: '2024-04-15', amount: 2200, status: 'paid', invoice_id: 'INV-003' }
      ]
    },
    recent_activity: [
      { action: 'Reviewed NDA contract', file: 'confidentiality_agreement.pdf', time: '2 hours ago', status: 'completed' },
      { action: 'Uploaded DPA document', file: 'data_processing_agreement.docx', time: '1 day ago', status: 'processing' },
      { action: 'Downloaded report', file: 'privacy_policy_review.pdf', time: '3 days ago', status: 'completed' },
      { action: 'Reviewed consultancy agreement', file: 'service_agreement.pdf', time: '1 week ago', status: 'completed' }
    ],
    settings: {
      email_notifications: true,
      push_notifications: false,
      marketing_emails: true,
      two_factor_auth: false,
      auto_save: true,
      language: 'en',
      timezone: 'UTC-5'
    }
  },
  'john': {
    id: 'john_456',
    name: 'John Doe',
    email: 'john@company.com',
    company: 'Legal Solutions Inc.',
    phone: '+1 (555) 987-6543',
    role: 'user',
    plan: {
      type: 'monthly_10',
      name: 'Monthly 10 Contracts',
      price: 799,
      contracts_limit: 10,
      contracts_used: 7,
      billing_cycle: 'monthly',
      next_billing_date: '2024-07-20',
      features: ['10 contracts/month', 'Priority processing', 'Enhanced support', 'Advanced playbooks']
    },
    usage: {
      total_reviews: 67,
      this_month_reviews: 7,
      success_rate: 96.2,
      monthly_usage: [
        { month: 'Jan', reviews: 8, max: 10 },
        { month: 'Feb', reviews: 10, max: 10 },
        { month: 'Mar', reviews: 9, max: 10 },
        { month: 'Apr', reviews: 10, max: 10 },
        { month: 'May', reviews: 10, max: 10 },
        { month: 'Jun', reviews: 7, max: 10 }
      ]
    },
    billing: {
      current_bill: 799,
      payment_method: '•••• 5678',
      billing_history: [
        { date: '2024-06-20', amount: 799, status: 'paid', invoice_id: 'INV-101' },
        { date: '2024-05-20', amount: 799, status: 'paid', invoice_id: 'INV-102' }
      ]
    },
    recent_activity: [
      { action: 'Reviewed employment contract', file: 'employment_agreement.pdf', time: '1 day ago', status: 'completed' },
      { action: 'Uploaded service agreement', file: 'service_contract.docx', time: '3 days ago', status: 'completed' },
      { action: 'Downloaded compliance report', file: 'contract_review.pdf', time: '5 days ago', status: 'completed' }
    ],
    settings: {
      email_notifications: true,
      push_notifications: true,
      marketing_emails: false,
      two_factor_auth: true,
      auto_save: true,
      language: 'en',
      timezone: 'UTC-8'
    }
  },
  'sarah': {
    id: 'sarah_789',
    name: 'Sarah Wilson',
    email: 'sarah@startup.io',
    company: 'TechStart Innovations',
    phone: '+1 (555) 456-7890',
    role: 'user',
    plan: {
      type: 'free_trial',
      name: 'Free Trial',
      price: 0,
      contracts_limit: 1,
      contracts_used: 0,
      billing_cycle: 'trial',
      trial_days_remaining: 5,
      features: ['1 complete contract review', 'Full compliance report', 'All 7 contract modules', '7-day report storage']
    },
    usage: {
      total_reviews: 0,
      this_month_reviews: 0,
      success_rate: 0,
      monthly_usage: [
        { month: 'Jan', reviews: 0, max: 1 },
        { month: 'Feb', reviews: 0, max: 1 },
        { month: 'Mar', reviews: 0, max: 1 },
        { month: 'Apr', reviews: 0, max: 1 },
        { month: 'May', reviews: 0, max: 1 },
        { month: 'Jun', reviews: 0, max: 1 }
      ]
    },
    billing: {
      current_bill: 0,
      payment_method: 'No payment method',
      billing_history: []
    },
    recent_activity: [
      { action: 'Account created', file: 'Welcome to Maigon', time: '2 days ago', status: 'completed' }
    ],
    settings: {
      email_notifications: true,
      push_notifications: false,
      marketing_emails: true,
      two_factor_auth: false,
      auto_save: true,
      language: 'en',
      timezone: 'UTC-5'
    }
  }
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // In a real app, you'd check localStorage, cookies, or make an API call
    // For demo purposes, we'll simulate a logged-in user
    const storedUser = localStorage.getItem('maigon_current_user');
    if (storedUser && mockUsers[storedUser]) {
      return mockUsers[storedUser];
    }
    return null;
  });

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      // In a real app, you'd also update the backend
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('maigon_current_user');
  };

  // Helper function to simulate login (for demo purposes)
  const loginUser = (userName: string) => {
    if (mockUsers[userName]) {
      setUser(mockUsers[userName]);
      localStorage.setItem('maigon_current_user', userName);
    }
  };

  // Expose loginUser for demo purposes
  if (typeof window !== 'undefined') {
    (window as any).maigonLogin = loginUser;
  }

  const value = {
    user,
    setUser,
    updateUser,
    isLoggedIn: !!user,
    logout
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Export mock users for demo purposes
export { mockUsers };
