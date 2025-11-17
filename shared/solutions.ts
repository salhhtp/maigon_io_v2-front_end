export const SOLUTION_ALIAS_MAP = [
  { key: "nda", aliases: ["non-disclosure", "non disclosure", "nda"] },
  { key: "dpa", aliases: ["data processing", "dpa"] },
  { key: "eula", aliases: ["end user license", "software license", "eula"] },
  { key: "ppc", aliases: ["privacy policy", "privacy notice", "ppc"] },
  { key: "psa", aliases: ["product supply", "supply agreement", "psa"] },
  { key: "ca", aliases: ["consultancy", "consulting agreement", "ca"] },
  { key: "rda", aliases: ["research", "development agreement", "r&d", "rda"] },
] as const;

export type SolutionKey = (typeof SOLUTION_ALIAS_MAP)[number]["key"];

export const SOLUTION_DISPLAY_NAMES: Record<SolutionKey, string> = {
  nda: "Non-Disclosure Agreement",
  dpa: "Data Processing Agreement",
  eula: "End User License Agreement",
  ppc: "Privacy Policy Compliance",
  psa: "Product Supply Agreement",
  ca: "Consultancy Agreement",
  rda: "Research & Development Agreement",
};

const CLASSIFICATION_TO_SOLUTION_KEY: Record<string, SolutionKey> = {
  data_processing_agreement: "dpa",
  non_disclosure_agreement: "nda",
  privacy_policy_document: "ppc",
  consultancy_agreement: "ca",
  research_development_agreement: "rda",
  end_user_license_agreement: "eula",
  product_supply_agreement: "psa",
};

const SOLUTION_KEY_TO_CUSTOM_TYPE: Record<SolutionKey, string> = {
  nda: "nda",
  dpa: "data-processing",
  eula: "license",
  ppc: "privacy",
  psa: "supply",
  ca: "consultancy",
  rda: "research",
};

export function deriveSolutionKey(
  rawId?: string,
  rawTitle?: string,
): SolutionKey | undefined {
  const normalizedValues = [rawId, rawTitle]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  for (const value of normalizedValues) {
    for (const { key, aliases } of SOLUTION_ALIAS_MAP) {
      if (
        value === key ||
        value.includes(key) ||
        aliases.some((alias) => value.includes(alias))
      ) {
        return key;
      }
    }
  }

  return undefined;
}

export function mapClassificationToSolutionKey(
  contractType?: string | null,
): SolutionKey | undefined {
  if (!contractType) return undefined;
  const normalized = contractType.toLowerCase();
  return CLASSIFICATION_TO_SOLUTION_KEY[normalized];
}

export function solutionKeyToCustomContractType(
  key: SolutionKey,
): string {
  return SOLUTION_KEY_TO_CUSTOM_TYPE[key] ?? "general";
}

export function solutionKeyToDisplayName(key: SolutionKey): string {
  return SOLUTION_DISPLAY_NAMES[key] ?? key.toUpperCase();
}
