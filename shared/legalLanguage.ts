export type LegalTermEntry = {
  preferred: string;
  notes?: string;
};

export const LEGAL_LANGUAGE_GUIDANCE =
  "Use clear, globally recognized legal terminology and standard clause phrasing suitable for legal professionals. Avoid colloquialisms or simplified paraphrases. Do not introduce jurisdiction-specific wording unless the contract or playbook explicitly requires it. Keep sentences precise and unambiguous.";

export const LEGAL_STYLE_GUIDE = [
  "Use defined terms consistently and capitalize them.",
  "State obligations with shall/must/may; avoid vague qualifiers unless in the source text.",
  "Prefer established legal verbs such as represent, warrant, covenant, indemnify, and terminate.",
  "Avoid colloquial phrasing; keep language precise and professional.",
  "Maintain jurisdiction-neutral drafting unless the contract or playbook specifies otherwise.",
] as const;

export const LEGAL_STYLE_GUIDE_SUMMARY = LEGAL_STYLE_GUIDE.join(" ");

export const LEGAL_TERM_BANK: LegalTermEntry[] = [
  {
    preferred: "Disclosing Party",
    notes: "NDA party providing Confidential Information.",
  },
  {
    preferred: "Receiving Party",
    notes: "NDA party receiving Confidential Information.",
  },
  {
    preferred: "Confidential Information",
    notes: "Use as a defined term; keep capitalization consistent.",
  },
  {
    preferred: "Permitted Disclosure",
    notes: "Use for allowed disclosure exceptions.",
  },
  {
    preferred: "Injunctive relief",
    notes: "Standard remedy language for confidentiality breaches.",
  },
  {
    preferred: "Data Controller",
    notes: "GDPR role; pair with Data Processor.",
  },
  {
    preferred: "Data Processor",
    notes: "GDPR role; pair with Data Controller.",
  },
  {
    preferred: "Personal Data",
    notes: "GDPR term; use Personal Information where CCPA applies.",
  },
  {
    preferred: "Data Subject",
    notes: "GDPR term for the individual.",
  },
  {
    preferred: "Sub-processor",
    notes: "Hyphenate consistently.",
  },
  {
    preferred: "Technical and organizational measures",
    notes: "Spell out once; introduce acronym only if needed.",
  },
  {
    preferred: "Security Incident",
    notes: "Use for defined breach or incident events.",
  },
  {
    preferred: "Breach notification",
    notes: "Use for incident notice obligations.",
  },
  {
    preferred: "Audit rights",
    notes: "Use for inspection or audit provisions.",
  },
  {
    preferred: "Data subject request",
    notes: "Use for access, deletion, or portability requests.",
  },
  {
    preferred: "International transfer",
    notes: "Use for cross-border data transfers.",
  },
  {
    preferred: "Standard Contractual Clauses (SCCs)",
    notes: "Use only where EU transfer mechanisms apply.",
  },
  {
    preferred: "Binding Corporate Rules (BCRs)",
    notes: "Use only where EU transfer mechanisms apply.",
  },
  {
    preferred: "Effective Date",
    notes: "Define the start date of the agreement.",
  },
  {
    preferred: "Term",
    notes: "Define the duration of the agreement.",
  },
  {
    preferred: "Termination",
    notes: "Use for ending the agreement; align with notice requirements.",
  },
  {
    preferred: "Survival",
    notes: "Identify provisions that survive termination.",
  },
  {
    preferred: "Assignment",
    notes: "Use for restrictions on transfer of rights/obligations.",
  },
  {
    preferred: "Entire Agreement",
    notes: "Use for integration clause.",
  },
  {
    preferred: "Severability",
    notes: "Use for invalid provision handling.",
  },
  {
    preferred: "Notices",
    notes: "Use for formal notice requirements.",
  },
  {
    preferred: "Dispute Resolution",
    notes: "Use for venue or arbitration procedure.",
  },
  {
    preferred: "Arbitration",
    notes: "Use when arbitration is the chosen mechanism.",
  },
  {
    preferred: "Indemnification",
    notes: "Use for indemnity obligations and scope.",
  },
  {
    preferred: "Liability cap",
    notes: "Use for limitation of liability structure.",
  },
  {
    preferred: "Governing law",
    notes: "Standard clause label.",
  },
  {
    preferred: "Limitation of liability",
    notes: "Standard clause label.",
  },
  {
    preferred: "Representations and warranties",
    notes: "Standard clause label.",
  },
  {
    preferred: "Material breach",
    notes: "Use for termination triggers.",
  },
  {
    preferred: "Force majeure",
    notes: "Standard clause label.",
  },
];

const TERM_BANK_SUMMARY_LIMIT = 12;

export const LEGAL_TERM_BANK_SUMMARY = `Preferred terms include: ${LEGAL_TERM_BANK.slice(
  0,
  TERM_BANK_SUMMARY_LIMIT,
)
  .map((item) => item.preferred)
  .join(", ")}.`;

export const LEGAL_AVOID_PHRASES = [
  "kind of",
  "sort of",
  "a bit",
  "pretty much",
  "nice to have",
  "make sure",
  "a bunch of",
  "lots of",
] as const;

export const LEGAL_LANGUAGE_PROMPT_BLOCK = [
  LEGAL_LANGUAGE_GUIDANCE,
  LEGAL_STYLE_GUIDE_SUMMARY,
  LEGAL_TERM_BANK_SUMMARY,
].join(" ");
