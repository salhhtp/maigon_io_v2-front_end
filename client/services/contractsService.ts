import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { isMockEnabled, mockDb } from '@/lib/mockDb';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];

export class ContractsService {
  // Get all contracts for a user
  static async getUserContracts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (e) {
      // Fallback to mock for preview/dev
      return mockDb.getRecentContracts(userId, 100);
    }
  }

  // Get a specific contract
  static async getContract(contractId: string) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      // minimal mock lookup
      const all = mockDb.getRecentContracts('', 1000);
      return all.find(c => c.id === contractId) as any;
    }
  }

  // Create a new contract
  static async createContract(contract: ContractInsert) {
    // Use mock directly if forced
    if (isMockEnabled()) {
      return mockDb.createContract(contract as any) as any;
    }
    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert(contract)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      // Fallback to mock in preview when Supabase rejects (missing tables/RLS)
      return mockDb.createContract(contract as any) as any;
    }
  }

  // Update contract status
  static async updateContractStatus(contractId: string, status: string) {
    if (isMockEnabled()) {
      return mockDb.updateContractStatus(contractId as any, status as any) as any;
    }
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      return mockDb.updateContractStatus(contractId as any, status as any) as any;
    }
  }

  // Delete a contract
  static async deleteContract(contractId: string) {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;
    } catch (e) {
      // Remove from mock store
      mockDb.updateContractStatus(contractId as any, 'failed');
    }
  }

  // Get contract statistics for a user
  static async getUserContractStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('status')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(c => c.status === 'pending').length,
        reviewing: data.filter(c => c.status === 'reviewing').length,
        completed: data.filter(c => c.status === 'completed').length,
        failed: data.filter(c => c.status === 'failed').length,
      };

      return stats;
    } catch (e) {
      const mock = mockDb.getRecentContracts(userId, 1000);
      return {
        total: mock.length,
        pending: mock.filter(c => c.status === 'pending').length,
        reviewing: mock.filter(c => c.status === 'reviewing').length,
        completed: mock.filter(c => c.status === 'completed').length,
        failed: mock.filter(c => c.status === 'failed').length,
      };
    }
  }

  // Get recent contracts for dashboard
  static async getRecentContracts(userId: string, limit = 5) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, title, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (e) {
      return mockDb.getRecentContracts(userId, limit) as any;
    }
  }
}
