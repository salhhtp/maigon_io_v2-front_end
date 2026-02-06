import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env", import.meta.url);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE URL or SERVICE ROLE KEY in environment.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const orgId = "28858beb-d4ee-488b-8e28-52ea9a3c7395";
const solutionId = "0c8c503c-c43e-40dc-acf6-6ca081bdb689";

const manualLink =
  "https://alfalavalonline.sharepoint.com/sites/hww-grouplegal/SitePages/NDA-Manual.aspx";
const templateLink =
  "https://alfalavalonline.sharepoint.com/sites/hww-grouplegal/SitePages/NDA.aspx";
const guidanceSuffix = `References:\n- ${manualLink}\n- ${templateLink}`;

const sectionLayout = [
  { id: "generalInformation", title: "General information", enabled: true },
  { id: "issues", title: "Issues to be addressed", enabled: true },
  { id: "playbookInsights", title: "Playbook deviations", enabled: true },
  { id: "actionItems", title: "Action items", enabled: true },
  { id: "contractSummary", title: "Contract summary", enabled: true },
  { id: "criteria", title: "Criteria met", enabled: false },
  { id: "clauseInsights", title: "Clause insights", enabled: false },
  { id: "similarity", title: "Similarity analysis", enabled: false },
];

const attachGuidance = (rule) => {
  if (!rule || typeof rule !== "object") return rule;
  const existing = typeof rule.guidance === "string" ? rule.guidance.trim() : "";
  const hasManual = existing.includes(manualLink);
  const hasTemplate = existing.includes(templateLink);
  if (hasManual && hasTemplate) return rule;
  const nextGuidance = existing ? `${existing}\n${guidanceSuffix}` : guidanceSuffix;
  return { ...rule, guidance: nextGuidance };
};

const run = async () => {
  const orgRes = await supabase
    .from("organizations")
    .select("id, metadata")
    .eq("id", orgId)
    .single();

  if (orgRes.error) throw orgRes.error;

  const metadata = orgRes.data?.metadata ?? {};
  const updatedMetadata = {
    ...metadata,
    playbookKey: "alfalaval-nda",
    domains: ["alfalaval.com"],
    footerTagline: "Provided by ALFA LAVAL. Powered by MAIGON.",
  };

  const orgUpdate = await supabase
    .from("organizations")
    .update({ metadata: updatedMetadata })
    .eq("id", orgId)
    .select("id");

  if (orgUpdate.error) throw orgUpdate.error;

  const solutionRes = await supabase
    .from("custom_solutions")
    .select("id, organization_id, deviation_rules")
    .eq("id", solutionId)
    .single();

  if (solutionRes.error) throw solutionRes.error;

  const deviationRules = Array.isArray(solutionRes.data?.deviation_rules)
    ? solutionRes.data.deviation_rules
    : [];
  const updatedDeviationRules = deviationRules.map(attachGuidance);

  const solutionUpdate = await supabase
    .from("custom_solutions")
    .update({
      organization_id: orgId,
      section_layout: sectionLayout,
      deviation_rules: updatedDeviationRules,
    })
    .eq("id", solutionId)
    .select("id");

  if (solutionUpdate.error) throw solutionUpdate.error;

  console.log("Alfa Laval org + custom solution updated.");
};

run().catch((error) => {
  console.error("Update failed:", error);
  process.exit(1);
});
