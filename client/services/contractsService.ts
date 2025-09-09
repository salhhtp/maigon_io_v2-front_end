import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];

export class ContractsService {
  // Get all contracts for a user
  static async getUserContracts(userId: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get a specific contract
  static async getContract(contractId: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) throw error;
    return data;
  }

  // Create a new contract
  static async createContract(contract: ContractInsert) {
    const { data, error } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update contract status
  static async updateContractStatus(contractId: string, status: string) {
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
  }

  // Delete a contract
  static async deleteContract(contractId: string) {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId);

    if (error) throw error;
  }

  // Get contract statistics for a user
  static async getUserContractStats(userId: string) {
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
  }

  // Get recent contracts for dashboard
  static async getRecentContracts(userId: string, limit = 5) {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, title, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
