import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

type AnalysisMetricInsert = Database["public"]["Tables"]["analysis_metrics"]["Insert"];

type AnalysisMetricStatus = "completed" | "failed" | "started";

export class AnalyticsEventsService {
  static async recordMetric(metric: AnalysisMetricInsert & { status?: AnalysisMetricStatus }) {
    try {
      await supabase.from("analysis_metrics").insert(metric);
    } catch (error) {
      console.warn("Failed to record analysis metric", error);
    }
  }
}

export default AnalyticsEventsService;
