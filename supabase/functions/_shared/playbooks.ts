export type PlaybookKey =
  | "data_processing_agreement"
  | "non_disclosure_agreement"
  | "privacy_policy_document"
  | "consultancy_agreement"
  | "research_development_agreement"
  | "end_user_license_agreement"
  | "professional_services_agreement";

export interface ContractPlaybook {
  key: PlaybookKey;
  displayName: string;
  description: string;
  regulatoryFocus: string[];
  clauseTemplates: ClauseTemplate[];
  criticalClauses: Array<{
    title: string;
    mustInclude: string[];
    redFlags: string[];
  }>;
  draftingTone: string;
  negotiationGuidance: string[];
  clauseAnchors: string[];
}

export type ClauseTemplate = {
  id: string;
  title: string;
  text: string;
  insertionAnchors: string[];
  tags?: string[];
};

const createPlaybook = (
  overrides: Partial<ContractPlaybook> & Pick<ContractPlaybook, "key">,
): ContractPlaybook => ({
  key: overrides.key,
  displayName: overrides.displayName ?? overrides.key,
  description: overrides.description ?? "",
  regulatoryFocus: overrides.regulatoryFocus ?? [],
  clauseTemplates: overrides.clauseTemplates ?? [],
  criticalClauses: overrides.criticalClauses ?? [],
  draftingTone:
    overrides.draftingTone ??
    "Authoritative legal expert tone with practical negotiation framing.",
  negotiationGuidance: overrides.negotiationGuidance ?? [],
  clauseAnchors: overrides.clauseAnchors ?? [],
});

export const CONTRACT_PLAYBOOKS: Record<PlaybookKey, ContractPlaybook> = {
  data_processing_agreement: createPlaybook({
    key: "data_processing_agreement",
    displayName: "Data Processing Agreement",
    description:
      "Ensures controller ↔ processor alignment, GDPR/CCPA compliance, and security posture.",
    regulatoryFocus: [
      "GDPR Articles 28-32",
      "CCPA / CPRA obligations",
      "ISO 27001 alignment",
    ],
    clauseAnchors: [
      "Roles & responsibilities (controller vs processor instructions)",
      "Processing details (categories, subjects, purpose, duration, location)",
      "Confidentiality of personnel",
      "Security measures (TOMs) and certification/audit rights",
      "Breach notification timelines and cooperation",
      "Sub-processor approvals, registry, and flow-down",
      "Deletion/return of data (incl. backups) at end of services",
      "Audit/inspection and assistance (DPIA/support for regulators)",
      "Data subject requests support",
      "International transfers mechanism (SCCs/BCRs/approach)",
      "Use limitations / no secondary use",
      "Liability caps and indemnities",
      "Incident and change notification",
    ],
    criticalClauses: [
      {
        title: "Processing instructions & scope",
        mustInclude: [
          "Documented instructions and limits",
          "Purpose, categories of data/subjects, duration",
        ],
        redFlags: [
          "Processor may determine purposes/means",
          "Silent on data categories/subjects/purpose",
        ],
      },
      {
        title: "Security measures & breach handling",
        mustInclude: [
          "Defined technical and organisational measures",
          "Certification or audit rights",
          "Breach notice timeline and cooperation duties",
        ],
        redFlags: [
          "Vague references to 'industry standard'",
          "No incident response commitments",
          "Notice only after containment or unreasonable delay",
        ],
      },
      {
        title: "Sub-processing",
        mustInclude: [
          "Obligation to inform/approve",
          "Flow-down of identical protections",
        ],
        redFlags: ["Unlimited right to appoint sub-processors"],
      },
      {
        title: "Deletion and return of data",
        mustInclude: [
          "Deletion/return on termination or request",
          "Treatment of backups and timelines; certificate of deletion",
        ],
        redFlags: ["Only returns data; no deletion path or backups handling"],
      },
      {
        title: "Audit and assistance",
        mustInclude: [
          "Audit/inspection rights (or third-party reports) with frequency limits",
          "Assistance with DPIAs and regulator engagements",
        ],
        redFlags: ["No audit or assistance commitment beyond 'reasonable efforts'"],
      },
      {
        title: "International transfers",
        mustInclude: [
          "Lawful transfer mechanism (e.g., SCCs/BCRs)",
          "Notice on changes to transfer tools",
        ],
        redFlags: ["Transfers permitted without mechanism or notice"],
      },
      {
        title: "Liability and indemnity",
        mustInclude: [
          "Liability cap aligned to risk/fees",
          "Carve-outs for data protection breaches if required",
        ],
        redFlags: ["Unlimited liability or silent liability allocation"],
      },
    ],
    negotiationGuidance: [
      "Align liability caps with security risk profile",
      "Demand notice + cooperation within 48-72h for incidents",
    ],
  }),
  non_disclosure_agreement: createPlaybook({
    key: "non_disclosure_agreement",
    displayName: "Non-Disclosure Agreement",
    description:
      "Protects confidential information with balanced carve-outs and survivals.",
    regulatoryFocus: ["Uniform Trade Secrets Act", "EU Trade Secrets Directive"],
    clauseTemplates: [
      {
        id: "nda-remedies",
        title: "Remedies",
        tags: ["remedies", "injunctive", "specific performance", "equitable relief"],
        insertionAnchors: ["Confidential Information", "Exceptions", "MISCELLANEOUS"],
        text:
          "Remedies. The Discloser may seek injunctive relief and specific performance to prevent or cure any unauthorized use or disclosure of Confidential Information, in addition to any other remedies available at law or in equity. Remedies are cumulative, and the availability of damages does not limit equitable relief.",
      },
      {
        id: "nda-marking-notice",
        title: "Marking and reasonable notice",
        tags: ["marking", "reasonable notice", "unmarked", "confidentiality"],
        insertionAnchors: [
          "Confidential Information",
          "Definition of Confidential Information",
          "Exceptions",
        ],
        text:
          "Marking and notice. Confidential Information should be marked as confidential when disclosed in writing or electronic form. Oral or visual disclosures are Confidential Information if identified as confidential at the time of disclosure or confirmed in writing within 30 days. Unmarked information is Confidential Information when a reasonable person would understand the circumstances to indicate confidentiality.",
      },
      {
        id: "nda-residual-knowledge",
        title: "Residual knowledge",
        tags: ["residual knowledge", "residual", "memory"],
        insertionAnchors: [
          "Confidential Information",
          "Exceptions",
          "Purpose/use limitation",
        ],
        text:
          "Residual knowledge. The Receiving Party's obligations apply regardless of any residual knowledge retained in unaided memory. Residual knowledge does not authorize use or disclosure of Confidential Information or derivative information.",
      },
      {
        id: "nda-use-limitation",
        title: "Use limitation and need-to-know",
        tags: ["use limitation", "purpose", "need-to-know", "need to know"],
        insertionAnchors: [
          "The Receiving Party hereby undertakes",
          "Confidential Information",
        ],
        text:
          "Use limitation and need-to-know. The Receiving Party shall use Confidential Information solely for the Purpose and disclose it only to personnel, contractors, or Affiliates with a need to know and who are bound by confidentiality obligations at least as protective as this Agreement. The Receiving Party shall not disclose Confidential Information to any third party without the Discloser's prior written consent, except as required by law.",
      },
      {
        id: "nda-liability-cap",
        title: "Limitation of liability",
        tags: ["liability", "caps", "carve-outs", "limitation"],
        insertionAnchors: ["MISCELLANEOUS", "Governing law", "Term and termination"],
        text:
          "Limitation of liability. Except for breaches of confidentiality, misuse of Confidential Information, willful misconduct, or infringement of intellectual property rights, each party's aggregate liability arising out of this Agreement is limited to the greater of USD 100,000 or the total fees paid (if any) under this Agreement. Neither party is liable for indirect, consequential, special, or punitive damages to the maximum extent permitted by law.",
      },
      {
        id: "nda-export-control",
        title: "Export control and sanctions",
        tags: ["export control", "sanctions", "restricted party", "restricted end use"],
        insertionAnchors: ["MISCELLANEOUS", "Governing law"],
        text:
          "Export control and sanctions. Each party shall comply with applicable export control and sanctions laws. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination and shall not use it for any prohibited end use.",
      },
      {
        id: "nda-non-solicit",
        title: "Non-solicitation",
        tags: ["non-solicit", "noncompete", "non compete", "non-solicitation"],
        insertionAnchors: ["MISCELLANEOUS"],
        text:
          "Non-solicitation. During the term of this Agreement and for 12 months thereafter, neither party will knowingly solicit for employment any employee of the other party who had material involvement with the Project, except through general advertisements not targeted to such employees.",
      },
      {
        id: "nda-ip-no-license",
        title: "No license",
        tags: ["no license", "license", "intellectual property", "ip ownership"],
        insertionAnchors: ["No Binding Commitments", "Confidential Information"],
        text:
          "No license. All Confidential Information and related intellectual property remain the property of the Discloser. No license or transfer is granted or implied except the limited right to use Confidential Information for the Purpose.",
      },
      {
        id: "nda-term-survival",
        title: "Term and survival",
        tags: ["term", "survival", "trade secret", "fixed term"],
        insertionAnchors: ["Term and termination", "term and termination"],
        text:
          "Term and survival. This Agreement remains in effect for 2 years for Confidential Information that is not a trade secret. Obligations for trade secrets survive for so long as the information remains a trade secret under applicable law. Obligations that by their nature should survive, including confidentiality and return or destruction, survive termination.",
      },
      {
        id: "nda-governing-law",
        title: "Governing law and disputes",
        tags: ["governing law", "dispute resolution", "jurisdiction", "venue"],
        insertionAnchors: ["MISCELLANEOUS"],
        text:
          "Governing law and disputes. This Agreement is governed by the laws of the Discloser's jurisdiction of incorporation, without regard to conflict of laws rules. The parties submit to the exclusive jurisdiction of the courts located in that jurisdiction for any dispute arising out of or relating to this Agreement.",
      },
    ],
    clauseAnchors: [
      "Definition of Confidential Information",
      "Marking vs reasonable notice for confidentiality",
      "Purpose/use limitation",
      "Standard of care for protection",
      "Permitted disclosures and compelled disclosure process",
      "Return/Destroy obligations (incl. electronic copies/backups + certificate)",
      "Term & survival (trade secrets vs other CI)",
      "Termination rights",
      "Remedies / injunctive relief",
      "IP ownership / no license granted",
      "Residual knowledge stance",
      "Liability caps / carve-outs",
      "Non-solicit / non-compete (if applicable)",
      "Governing law and dispute resolution clarity",
      "Export control / sanctions (if relevant)",
    ],
    criticalClauses: [
      {
        title: "Definition & exclusions",
        mustInclude: [
          "Exclusions for prior knowledge & public domain",
          "Clear residual knowledge stance",
          "Reasonable-person confidentiality coverage (unmarked information)",
        ],
        redFlags: [
          "Catch-all definitions covering non-confidential info",
          "One-way obligations not matched by context",
          "Protection only if marked with no safety net",
        ],
      },
      {
        title: "Remedies",
        mustInclude: ["Injunctive relief", "Specific performance language"],
        redFlags: ["Exclusive remedy of damages"],
      },
      {
        title: "Use limitation & purpose",
        mustInclude: [
          "Purpose-limited use of Confidential Information",
          "Need-to-know access controls for personnel/affiliates",
        ],
        redFlags: [
          "Use only for discloser’s benefit with no defined purpose",
          "Unrestricted sharing with third parties",
        ],
      },
      {
        title: "Return/Destruction",
        mustInclude: [
          "Return or destruction of tangible and electronic copies",
          "Treatment of backups/archives and destruction certificate on request",
        ],
        redFlags: ["Returns only on request with no destruction path"],
      },
      {
        title: "Term & survival",
        mustInclude: [
          "Fixed term for non-trade-secret CI (e.g., 2–5 years)",
          "Survival for trade secrets while they remain trade secrets",
        ],
        redFlags: ["Perpetual non-terminable obligations for all CI"],
      },
      {
        title: "Compelled disclosure",
        mustInclude: [
          "Prompt notice of legal/process requests",
          "Cooperation to limit disclosure and protective order option",
        ],
        redFlags: ["No process for subpoenas/regulator demands"],
      },
      {
        title: "IP & no license",
        mustInclude: [
          "No transfer of IP ownership",
          "No implied license beyond Purpose",
        ],
        redFlags: ["Implied ownership or broad license to recipient"],
      },
    ],
    negotiationGuidance: [
      "Survival period 2-5 years is standard",
      "Ensure destruction certification on termination",
    ],
  }),
  privacy_policy_document: createPlaybook({
    key: "privacy_policy_document",
    displayName: "Privacy Policy",
    description:
      "User-facing disclosures covering data categories, lawful bases, and user rights.",
    regulatoryFocus: [
      "GDPR Articles 12-14",
      "CCPA/CPRA notice obligations",
      "ePrivacy notice requirements",
    ],
    clauseAnchors: [
      "Data controller identity and contact/DPO",
      "Data categories collected (including sensitive data)",
      "Purposes & lawful bases (by category)",
      "User rights & contact/appeal route",
      "Retention periods or criteria",
      "Sharing/recipients (processors/third parties)",
      "International transfers and mechanisms",
      "Security measures statement",
      "Children’s data handling/age limits",
      "Cookies and tracking + consent signals",
      "Do Not Sell/Share and opt-out (where applicable)",
      "Updates/versioning and effective date",
    ],
    criticalClauses: [
      {
        title: "Data subject rights",
        mustInclude: [
          "Access/rectification/erasure/removal rights procedures",
          "Contact details for privacy team or DPO",
          "Appeal/escalation path",
        ],
        redFlags: [
          "Omission of appeal/escalation route",
          "Silence on timelines for responses",
        ],
      },
      {
        title: "Sharing & processors",
        mustInclude: ["Categories of recipients", "Purpose limitations"],
        redFlags: ["Blanket resale of personal data without opt-out"],
      },
      {
        title: "Lawful bases and purposes",
        mustInclude: ["Lawful basis per purpose/category", "Separate consent where required"],
        redFlags: ["Purposes listed with no lawful basis", "Bundled consent for unrelated purposes"],
      },
      {
        title: "Retention",
        mustInclude: ["Retention periods or criteria per category"],
        redFlags: ["No retention statement", "Indefinite retention without justification"],
      },
      {
        title: "International transfers",
        mustInclude: ["Transfer mechanism description (e.g., SCCs/BCRs/adequacy)", "Contact for copies of safeguards"],
        redFlags: ["Transfers mentioned with no mechanism", "Implied transfers with no disclosure"],
      },
      {
        title: "Children and sensitive data",
        mustInclude: ["Age limitations/parental consent stance", "Handling of sensitive/special categories"],
        redFlags: ["Silent on minors where service is general audience", "Collects sensitive data without notice"],
      },
    ],
    negotiationGuidance: [
      "Policies must match real processing activities",
      "Highlight opt-out mechanisms prominently",
    ],
  }),
  consultancy_agreement: createPlaybook({
    key: "consultancy_agreement",
    displayName: "Consultancy Agreement",
    description:
      "Defines scope, deliverables, IP ownership, and risk allocation for consultants.",
    regulatoryFocus: [
      "Independent contractor law",
      "IP assignment statutes",
      "Tax authority guidance (IRS 20-factor, HMRC IR35)",
    ],
    clauseAnchors: [
      "Scope and deliverables (SOW) with acceptance criteria",
      "Fees, expenses, payment timing, and taxes",
      "IP ownership (background vs foreground) and license-back",
      "Confidentiality and data protection",
      "Warranties/performance standards and remedies",
      "Indemnities and limitation of liability",
      "Exclusivity & conflicts / non-solicit of staff",
      "Change control process",
      "Staffing/assignments and subcontracting",
      "Insurance requirements (if any)",
      "Termination (for cause and convenience)",
      "Governing law and dispute resolution",
    ],
    criticalClauses: [
      {
        title: "IP assignment",
        mustInclude: [
          "Work-made-for-hire / assignment language",
          "License-back if consultant needs portfolio rights",
        ],
        redFlags: [
          "Ambiguous ownership of background IP",
          "No moral rights waiver where needed",
        ],
      },
      {
        title: "Liability & indemnity",
        mustInclude: ["Cap tied to fees", "Professional indemnity"],
        redFlags: ["Unlimited liability for consultant"],
      },
      {
        title: "Scope, deliverables, and acceptance",
        mustInclude: ["Defined deliverables/milestones", "Acceptance/rejection procedure and cure timeline"],
        redFlags: ["No acceptance criteria", "Implied automatic acceptance"],
      },
      {
        title: "Confidentiality and data protection",
        mustInclude: ["Confidentiality obligations", "Data protection alignment if personal data processed"],
        redFlags: ["No confidentiality beyond NDA assumption", "No data protection obligations despite access"],
      },
      {
        title: "Change control and termination",
        mustInclude: ["Written change procedure", "Termination for convenience/notice and for cause with cure"],
        redFlags: ["Unilateral scope changes", "No exit path except breach"],
      },
      {
        title: "Fees and expenses",
        mustInclude: ["Payment timing/invoicing", "Expense reimbursement rules/approvals"],
        redFlags: ["Open-ended expenses", "Payment only on acceptance with no milestone structure"],
      },
    ],
    negotiationGuidance: [
      "Clarify milestone acceptance",
      "Ensure non-solicitation clauses are reasonable",
    ],
  }),
  research_development_agreement: createPlaybook({
    key: "research_development_agreement",
    displayName: "R&D Agreement",
    description:
      "Governs collaborative innovation, background IP, and commercialization rights.",
    regulatoryFocus: [
      "Bayh-Dole Act (where applicable)",
      "Export control / ITAR considerations",
      "Competition law on exclusivity",
    ],
    clauseAnchors: [
      "Project objectives, KPIs, and milestones",
      "Funding, cost sharing, and resource commitments",
      "Governance/steering committee and change control",
      "Background vs foreground IP ownership/management",
      "Commercialization rights, licenses, and revenue sharing",
      "Confidentiality & data/security (incl. export control)",
      "Publications and publicity with review periods",
      "Exclusivity/field-of-use and antitrust guardrails",
      "Deliverables and acceptance",
      "Warranties/indemnities and limitation of liability",
      "Termination (for convenience/for cause) and post-termination rights",
      "Dispute resolution and governing law",
    ],
    criticalClauses: [
      {
        title: "Background vs Foreground IP",
        mustInclude: [
          "Schedules listing background IP",
          "Mechanism for joint IP management",
        ],
        redFlags: ["Ownership defaults to one party without compensation"],
      },
      {
        title: "Publication rights",
        mustInclude: ["Review periods", "Patent filing coordination"],
        redFlags: ["Unrestricted publication jeopardizing patents"],
      },
      {
        title: "Commercialization & licensing",
        mustInclude: [
          "License/grant-back terms for foreground IP",
          "Field, territory, exclusivity, and revenue sharing (if any)",
        ],
        redFlags: ["Silent on commercialization rights", "Implicit exclusivity without terms"],
      },
      {
        title: "Confidentiality, security, and export",
        mustInclude: ["Confidentiality obligations", "Security/export control compliance if applicable"],
        redFlags: ["No export control guardrails", "Silence on data/security despite collaboration"],
      },
      {
        title: "Governance and change control",
        mustInclude: ["Steering/decision process", "Change procedure for scope/timeline"],
        redFlags: ["Unilateral change rights", "No forum to resolve scope/resource disputes"],
      },
      {
        title: "Liability and indemnities",
        mustInclude: ["Liability cap aligned to contributions", "Indemnities for IP infringement/third-party claims"],
        redFlags: ["Unlimited liability", "No indemnity despite joint R&D outputs"],
      },
      {
        title: "Termination and survivals",
        mustInclude: ["Termination rights and notice", "Handling of IP, data, and materials on exit"],
        redFlags: ["No termination mechanism", "Unclear post-termination IP/data handling"],
      },
    ],
    negotiationGuidance: [
      "Balance exclusivity with antitrust guardrails",
      "Tie milestone funding to deliverables",
    ],
  }),
  end_user_license_agreement: createPlaybook({
    key: "end_user_license_agreement",
    displayName: "End-User License Agreement",
    description:
      "Software licensing terms including usage scope, warranties, and compliance.",
    regulatoryFocus: [
      "Consumer protection / UCC Article 2",
      "Open-source license obligations",
      "Export control for software",
    ],
    clauseAnchors: [
      "License grant & restrictions",
      "Acceptable use and audit rights",
      "Updates & support / service levels (if SaaS)",
      "Payment, renewal, and refund/termination terms",
      "Data/telemetry use and privacy notice reference",
      "Open-source notices and third-party components",
      "Warranties & disclaimers",
      "Indemnities (IP/third-party claims)",
      "Limitation of liability and exclusions",
      "Export control and sanctions compliance",
      "Termination & suspension / effect of termination",
      "IP ownership and reservations",
      "DMCA/IP enforcement and user content (if applicable)",
    ],
    criticalClauses: [
      {
        title: "License scope",
        mustInclude: [
          "Permitted/forbidden uses",
          "Seat or usage metrics",
        ],
        redFlags: ["Automatic transfer of ownership", "Silent on audits"],
      },
      {
        title: "Liability",
        mustInclude: ["Cap tied to fees", "Exclusion of consequential damages"],
        redFlags: ["No cap or unreasonably low cap for vendor obligations"],
      },
      {
        title: "Indemnity (IP/third-party claims)",
        mustInclude: ["IP infringement defense/remedy", "Customer obligations for claims"],
        redFlags: ["No IP indemnity where customary", "Indemnity only from customer"],
      },
      {
        title: "Data and privacy",
        mustInclude: ["Data/telemetry collection notice", "Reference to privacy policy and compliance"],
        redFlags: ["Silent on data use", "Broad data rights with no safeguards"],
      },
      {
        title: "Export and sanctions",
        mustInclude: ["Export law compliance", "No use in embargoed countries/with denied parties"],
        redFlags: ["No export control language"],
      },
      {
        title: "Termination/suspension",
        mustInclude: ["Grounds for suspension/termination", "Post-termination effect on data/access"],
        redFlags: ["Unilateral termination without notice", "No clarity on refunds/data retrieval"],
      },
    ],
    negotiationGuidance: [
      "Align SLA / support obligations with business criticality",
      "Document audit processes and notice periods",
    ],
  }),
  professional_services_agreement: createPlaybook({
    key: "professional_services_agreement",
    displayName: "PSA",
    description:
      "Service delivery framework with SOWs, change control, and performance standards.",
    regulatoryFocus: [
      "Professional liability standards",
      "Service credit regulations",
    ],
    clauseAnchors: [
      "Services scope via SOW and acceptance criteria",
      "Service Levels and service credits",
      "Change control",
      "Client obligations and dependencies",
      "Fees, invoicing, expenses, and taxes",
      "IP ownership and license to deliverables",
      "Confidentiality and data protection",
      "Staffing, subcontracting, and non-solicit",
      "Warranties/performance standards",
      "Indemnities and limitation of liability",
      "Termination (for convenience and cause) and transition/exit",
      "Governing law and dispute resolution",
    ],
    criticalClauses: [
      {
        title: "Service levels",
        mustInclude: [
          "Clear KPIs / credit mechanism",
          "Chronic failure remedies",
        ],
        redFlags: ["No remedy for repeated breaches"],
      },
      {
        title: "Change control",
        mustInclude: ["Written change procedure"],
        redFlags: ["Unilateral right to change scope"],
      },
      {
        title: "IP ownership and licenses",
        mustInclude: ["Ownership of deliverables/background IP", "License back if vendor retains tools"],
        redFlags: ["Silent on IP", "Ownership default unclear"],
      },
      {
        title: "Acceptance and warranties",
        mustInclude: ["Acceptance criteria/timeline", "Performance warranty and remedies"],
        redFlags: ["Automatic acceptance", "No warranty beyond best efforts"],
      },
      {
        title: "Liability and indemnities",
        mustInclude: ["Liability cap tied to fees", "Indemnities for third-party/IP claims as applicable"],
        redFlags: ["Unlimited liability", "No indemnity coverage"],
      },
      {
        title: "Termination and transition",
        mustInclude: ["Termination for convenience/notice", "Exit/transition assistance and data return"],
        redFlags: ["No termination right", "No handover obligations on exit"],
      },
    ],
    negotiationGuidance: [
      "Tie acceptance to measurable deliverables",
      "Ensure dependencies on client are documented",
    ],
  }),
};

export function resolvePlaybook(
  key: string | null | undefined,
): ContractPlaybook {
  const normalized = (key ?? "").toLowerCase();
  return (
    Object.values(CONTRACT_PLAYBOOKS).find(
      (playbook) => playbook.key === normalized,
    ) ??
    Object.values(CONTRACT_PLAYBOOKS).find((playbook) =>
      playbook.displayName.toLowerCase() === normalized,
    ) ??
    CONTRACT_PLAYBOOKS.non_disclosure_agreement
  );
}
