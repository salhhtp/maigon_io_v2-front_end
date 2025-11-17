const SOLUTION_ALIAS_MAP = [
  { key: "nda", aliases: ["non-disclosure", "non disclosure", "nda"] },
  { key: "dpa", aliases: ["data processing", "dpa"] },
  { key: "eula", aliases: ["end user license", "software license", "eula"] },
  { key: "ppc", aliases: ["privacy policy", "privacy notice", "ppc"] },
  { key: "psa", aliases: ["product supply", "supply agreement", "psa"] },
  { key: "ca", aliases: ["consultancy", "consulting agreement", "ca"] },
  { key: "rda", aliases: ["research and development", "r&d", "rda"] },
] as const;

export type SolutionKey = (typeof SOLUTION_ALIAS_MAP)[number]["key"];

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

export const SOLUTION_DISPLAY_NAMES: Record<SolutionKey, string> = {
  nda: "Non-Disclosure Agreement",
  dpa: "Data Processing Agreement",
  eula: "End User License Agreement",
  ppc: "Privacy Policy Compliance",
  psa: "Product Supply Agreement",
  ca: "Consultancy Agreement",
  rda: "Research & Development Agreement",
};
