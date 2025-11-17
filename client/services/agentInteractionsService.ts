import { supabase, type Database } from "@/lib/supabase";
import logger from "@/utils/logger";

type AgentInteractionInsert =
  Database["public"]["Tables"]["agent_interaction_logs"]["Insert"];
type AgentInteractionRow =
  Database["public"]["Tables"]["agent_interaction_logs"]["Row"];

export class AgentInteractionsService {
  static async logInteraction(
    payload: AgentInteractionInsert,
  ): Promise<AgentInteractionRow | null> {
    try {
      const { data, error } = await supabase
        .from("agent_interaction_logs")
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.warn("Failed to log agent interaction", {
        error,
        payload,
      });
      return null;
    }
  }
}

export default AgentInteractionsService;
