import { supabase, type Database } from "@/lib/supabase";
import logger from "@/utils/logger";

type AgentEditApprovalInsert =
  Database["public"]["Tables"]["agent_edit_approvals"]["Insert"];

export class AgentEditApprovalsService {
  static async recordApproval(payload: AgentEditApprovalInsert): Promise<void> {
    try {
      const { error } = await supabase
        .from("agent_edit_approvals")
        .insert(payload);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn("Failed to record agent edit approval", {
        error,
        payload,
      });
    }
  }
}

export default AgentEditApprovalsService;
