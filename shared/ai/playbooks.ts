export type PlaybookKey =
  | "data_processing_agreement"
  | "non_disclosure_agreement"
  | "privacy_policy_document"
  | "consultancy_agreement"
  | "research_development_agreement"
  | "end_user_license_agreement"
  | "professional_services_agreement";

export type EvidenceMapping = {
  clauseIds?: string[];
  headings?: string[];
  topics?: string[];
};

export type PlaybookChecklistItem = {
  id: string;
  title: string;
  description: string;
  requiredSignals: string[];
  evidenceMapping: EvidenceMapping;
  insertionPolicyKey: string;
};

export interface ContractPlaybook {
  key: PlaybookKey;
  displayName: string;
  description: string;
  regulatoryFocus: string[];
  criticalClauses: Array<{
    title: string;
    mustInclude: string[];
    redFlags: string[];
  }>;
  draftingTone: string;
  negotiationGuidance: string[];
  clauseAnchors: string[];
  checklist: PlaybookChecklistItem[];
}

const createPlaybook = (
  overrides: Partial<ContractPlaybook> & Pick<ContractPlaybook, "key">,
): ContractPlaybook => ({
  key: overrides.key,
  displayName: overrides.displayName ?? overrides.key,
  description:
    overrides.description ??
    "No description provided. Update the playbook configuration.",
  regulatoryFocus: overrides.regulatoryFocus ?? [],
  criticalClauses: overrides.criticalClauses ?? [],
  draftingTone:
    overrides.draftingTone ??
    "Authoritative legal expert tone with practical negotiation framing.",
  negotiationGuidance: overrides.negotiationGuidance ?? [],
  clauseAnchors: overrides.clauseAnchors ?? [],
  checklist: overrides.checklist ?? [],
});

export const CONTRACT_PLAYBOOKS: Record<PlaybookKey, ContractPlaybook> = {
  data_processing_agreement: createPlaybook({
    key: "data_processing_agreement",
    displayName: "Data Processing Agreement",
    description:
      "Ensures controller and processor alignment, GDPR/CCPA compliance, and security posture.",
    regulatoryFocus: [
      "GDPR Articles 28-32",
      "CCPA / CPRA obligations",
      "ISO 27001 alignment",
    ],
    clauseAnchors: [
      "Roles and responsibilities",
      "Processing details",
      "Confidentiality of personnel",
      "Security measures",
      "Breach notification timelines",
      "Sub-processor approvals",
      "Deletion or return of data",
      "Audit and assistance",
      "Data subject requests",
      "International transfers",
      "Use limitations",
      "Liability and indemnity",
    ],
    criticalClauses: [
      {
        title: "Processing instructions and scope",
        mustInclude: [
          "Documented instructions",
          "Purpose, categories of data and subjects, duration",
        ],
        redFlags: [
          "Processor may determine purposes or means",
          "Silent on data categories or purpose",
        ],
      },
      {
        title: "Security measures and breach handling",
        mustInclude: [
          "Defined technical and organizational measures",
          "Breach notice timeline and cooperation duties",
        ],
        redFlags: [
          "Vague references to industry standard",
          "No incident response commitments",
        ],
      },
      {
        title: "Sub-processing",
        mustInclude: [
          "Obligation to inform or approve",
          "Flow-down of identical protections",
        ],
        redFlags: ["Unlimited right to appoint sub-processors"],
      },
      {
        title: "Deletion and return of data",
        mustInclude: [
          "Deletion or return on termination",
          "Treatment of backups and timelines",
        ],
        redFlags: ["Returns data only; no deletion path"],
      },
    ],
    negotiationGuidance: [
      "Align liability caps with security risk profile",
      "Demand notice and cooperation within 48-72 hours for incidents",
    ],
    checklist: [
      {
        id: "CHECK_DPA_01",
        title: "Processing instructions and scope",
        description:
          "Documented processing instructions, purpose, categories of data/subjects, and duration.",
        requiredSignals: [
          "documented instructions",
          "purpose",
          "categories of data",
          "data subjects",
          "duration",
        ],
        evidenceMapping: {
          headings: [
            "Processing Instructions",
            "Scope of Processing",
            "Details of Processing",
          ],
          topics: ["processing", "controller", "processor"],
        },
        insertionPolicyKey: "after_heading:DEFINITIONS|SCOPE",
      },
      {
        id: "CHECK_DPA_02",
        title: "Confidentiality of personnel",
        description:
          "Processor personnel confidentiality commitments and access restrictions.",
        requiredSignals: ["confidentiality", "personnel", "authorized"],
        evidenceMapping: {
          headings: ["Confidentiality", "Personnel", "Security"],
          topics: ["confidential", "personnel"],
        },
        insertionPolicyKey: "after_heading:CONFIDENTIALITY|SECURITY",
      },
      {
        id: "CHECK_DPA_03",
        title: "Security measures (TOMs)",
        description:
          "Defined technical and organizational measures with access controls.",
        requiredSignals: [
          "technical and organizational measures",
          "security",
          "access controls",
        ],
        evidenceMapping: {
          headings: [
            "Security Measures",
            "Data Security",
            "Technical and Organizational Measures",
          ],
          topics: ["security", "controls"],
        },
        insertionPolicyKey: "after_heading:SECURITY|DATA SECURITY",
      },
      {
        id: "CHECK_DPA_04",
        title: "Breach notification",
        description:
          "Incident notice obligations with timelines and cooperation duties.",
        requiredSignals: [
          "breach notification",
          "without undue delay",
          "timeline",
          "cooperation",
        ],
        evidenceMapping: {
          headings: ["Security Incident", "Breach Notification", "Incident"],
          topics: ["breach", "incident"],
        },
        insertionPolicyKey: "after_heading:SECURITY|INCIDENT",
      },
      {
        id: "CHECK_DPA_05",
        title: "Sub-processor approvals",
        description:
          "Approval or notice for sub-processors and flow-down requirements.",
        requiredSignals: ["sub-processor", "approval", "flow-down", "notice"],
        evidenceMapping: {
          headings: ["Sub-processing", "Subprocessors", "Sub-processor"],
          topics: ["sub-processor", "subprocessing"],
        },
        insertionPolicyKey: "after_heading:SUB-PROCESSING|SUBPROCESSORS",
      },
      {
        id: "CHECK_DPA_06",
        title: "Data subject requests",
        description:
          "Assistance with data subject access, deletion, and portability requests.",
        requiredSignals: ["data subject", "requests", "assistance"],
        evidenceMapping: {
          headings: ["Data Subject", "Assistance"],
          topics: ["data subject", "requests"],
        },
        insertionPolicyKey: "after_heading:ASSISTANCE|DATA SUBJECT",
      },
      {
        id: "CHECK_DPA_07",
        title: "Deletion or return of data",
        description:
          "Return or deletion of personal data, including backups and certification.",
        requiredSignals: ["return", "delete", "backups", "certificate"],
        evidenceMapping: {
          headings: ["Deletion", "Return", "Termination"],
          topics: ["deletion", "return"],
        },
        insertionPolicyKey: "after_heading:TERM|TERMINATION|RETURN",
      },
      {
        id: "CHECK_DPA_08",
        title: "Audit and assistance",
        description:
          "Audit rights and assistance with DPIAs or regulator inquiries.",
        requiredSignals: ["audit", "inspection", "DPIA", "regulator"],
        evidenceMapping: {
          headings: ["Audit", "Inspection", "Compliance"],
          topics: ["audit", "assistance"],
        },
        insertionPolicyKey: "after_heading:AUDIT|INSPECTION",
      },
      {
        id: "CHECK_DPA_09",
        title: "International transfers",
        description:
          "Lawful transfer mechanism such as SCCs or equivalent safeguards.",
        requiredSignals: ["international transfers", "SCC", "transfer mechanism"],
        evidenceMapping: {
          headings: ["International Transfers", "Cross-Border Transfers"],
          topics: ["transfer", "international"],
        },
        insertionPolicyKey: "before_heading:GOVERNING LAW|MISCELLANEOUS",
      },
      {
        id: "CHECK_DPA_10",
        title: "Liability and indemnity",
        description:
          "Allocation of liability, indemnity, and any caps for data protection breaches.",
        requiredSignals: ["liability", "indemnity", "cap"],
        evidenceMapping: {
          headings: ["Liability", "Indemnity", "Limitation of Liability"],
          topics: ["liability", "indemnity"],
        },
        insertionPolicyKey: "before_heading:LIMITATION OF LIABILITY|LIABILITY",
      },
    ],
  }),
  non_disclosure_agreement: createPlaybook({
    key: "non_disclosure_agreement",
    displayName: "Non-Disclosure Agreement",
    description:
      "Protects confidential information with balanced carve-outs, use limits, and survivals.",
    regulatoryFocus: ["Uniform Trade Secrets Act", "EU Trade Secrets Directive"],
    clauseAnchors: [
      "Definition of Confidential Information",
      "Purpose and use limitation",
      "Standard of care",
      "Permitted disclosures",
      "Return or destruction",
      "Term and survival",
      "Remedies",
      "IP ownership and no license",
    ],
    criticalClauses: [
      {
        title: "Definition and exclusions",
        mustInclude: [
          "Exclusions for prior knowledge and public domain",
          "Reasonable-person confidentiality coverage",
        ],
        redFlags: [
          "Catch-all definitions covering non-confidential info",
          "Protection only if marked with no safety net",
        ],
      },
      {
        title: "Remedies",
        mustInclude: ["Injunctive relief", "Specific performance language"],
        redFlags: ["Exclusive remedy of damages"],
      },
      {
        title: "Return or destruction",
        mustInclude: [
          "Return or destruction of tangible and electronic copies",
          "Treatment of backups and destruction certificate",
        ],
        redFlags: ["Returns only on request with no destruction path"],
      },
    ],
    negotiationGuidance: [
      "Survival period of 2-5 years is typical for non-trade secret CI",
      "Ensure destruction certification on termination",
    ],
    checklist: [
      {
        id: "CHECK_NDA_01",
        title: "Definition and exclusions",
        description:
          "Definition of Confidential Information with clear exclusions for public domain and prior knowledge.",
        requiredSignals: [
          "confidential information",
          "exclusions",
          "public domain",
        ],
        evidenceMapping: {
          headings: [
            "Definition of Confidential Information",
            "Confidential Information",
            "Definitions",
          ],
          topics: ["confidential information", "definitions"],
        },
        insertionPolicyKey: "after_heading:DEFINITIONS|CONFIDENTIAL INFORMATION",
      },
      {
        id: "CHECK_NDA_02",
        title: "Use limitation and purpose",
        description:
          "Use of Confidential Information solely for the defined purpose.",
        requiredSignals: ["purpose", "use limitation", "solely"],
        evidenceMapping: {
          headings: [
            "Purpose",
            "Use of Confidential Information",
            "Obligations of Receiving Party",
          ],
          topics: ["purpose", "use"],
        },
        insertionPolicyKey: "after_heading:PURPOSE|OBLIGATIONS",
      },
      {
        id: "CHECK_NDA_03",
        title: "Standard of care",
        description:
          "Reasonable care obligations to protect Confidential Information.",
        requiredSignals: ["reasonable care", "protect"],
        evidenceMapping: {
          headings: ["Standard of Care", "Confidentiality", "Protection"],
          topics: ["care", "protect"],
        },
        insertionPolicyKey: "after_heading:CONFIDENTIALITY|PROTECTION",
      },
      {
        id: "CHECK_NDA_04",
        title: "Permitted and compelled disclosures",
        description:
          "Process for legally compelled disclosures with notice and protective order steps.",
        requiredSignals: ["required by law", "notice", "protective order"],
        evidenceMapping: {
          headings: ["Permitted Disclosures", "Compelled Disclosure", "Legal Process"],
          topics: ["compelled", "required by law"],
        },
        insertionPolicyKey: "after_heading:PERMITTED DISCLOSURES|DISCLOSURE",
      },
      {
        id: "CHECK_NDA_05",
        title: "Return or destruction",
        description:
          "Return or destruction of Confidential Information, including backups and certification.",
        requiredSignals: ["return", "destroy", "backups", "certification"],
        evidenceMapping: {
          headings: ["Return", "Destruction", "Ownership"],
          topics: ["return", "destroy"],
        },
        insertionPolicyKey: "after_heading:RETURN|DESTRUCTION|OWNERSHIP",
      },
      {
        id: "CHECK_NDA_06",
        title: "Term and survival",
        description:
          "Defined term with survival for trade secrets or a fixed period.",
        requiredSignals: ["term", "survival", "years"],
        evidenceMapping: {
          headings: ["Term", "Termination", "Survival"],
          topics: ["term", "survival"],
        },
        insertionPolicyKey: "before_heading:GOVERNING LAW|MISCELLANEOUS",
      },
      {
        id: "CHECK_NDA_07",
        title: "Remedies and injunctive relief",
        description:
          "Availability of injunctive or equitable relief for breaches.",
        requiredSignals: ["injunctive relief", "specific performance"],
        evidenceMapping: {
          headings: ["Remedies", "Injunctive Relief"],
          topics: ["remedies", "injunctive"],
        },
        insertionPolicyKey: "before_heading:GOVERNING LAW|MISCELLANEOUS",
      },
      {
        id: "CHECK_NDA_08",
        title: "IP ownership and no license",
        description:
          "No transfer of IP ownership and no implied licenses.",
        requiredSignals: ["no license", "ownership", "intellectual property"],
        evidenceMapping: {
          headings: ["Intellectual Property", "No License", "Ownership"],
          topics: ["intellectual property", "license"],
        },
        insertionPolicyKey: "after_heading:INTELLECTUAL PROPERTY|OWNERSHIP",
      },
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
      "Data categories collected",
      "Purposes and lawful bases",
      "Sharing and recipients",
      "User rights and contact",
      "International transfers",
      "Cookies and tracking",
      "Retention",
      "Security",
    ],
    criticalClauses: [
      {
        title: "Data subject rights",
        mustInclude: [
          "Access, rectification, erasure rights procedures",
          "Contact details for privacy team or DPO",
        ],
        redFlags: ["Silence on timelines for responses"],
      },
      {
        title: "Sharing and processors",
        mustInclude: ["Categories of recipients", "Purpose limitations"],
        redFlags: ["Blanket resale of personal data without opt-out"],
      },
    ],
    negotiationGuidance: [
      "Policies must match actual processing activities",
      "Highlight opt-out mechanisms prominently",
    ],
    checklist: [
      {
        id: "CHECK_PP_01",
        title: "Data categories collected",
        description: "List categories of personal data collected and sources.",
        requiredSignals: ["personal data", "categories", "collect"],
        evidenceMapping: {
          headings: ["Information We Collect", "Data Collection", "Data Categories"],
          topics: ["personal data", "collect"],
        },
        insertionPolicyKey: "after_heading:INFORMATION WE COLLECT|DATA COLLECTION",
      },
      {
        id: "CHECK_PP_02",
        title: "Purposes and lawful bases",
        description: "Describe purposes of processing and lawful bases.",
        requiredSignals: ["purpose", "lawful basis", "consent"],
        evidenceMapping: {
          headings: ["How We Use", "Purposes", "Lawful Bases"],
          topics: ["purpose", "lawful"],
        },
        insertionPolicyKey: "after_heading:HOW WE USE|PURPOSES",
      },
      {
        id: "CHECK_PP_03",
        title: "Sharing and recipients",
        description: "Identify categories of recipients and sharing purposes.",
        requiredSignals: ["share", "third parties", "service providers"],
        evidenceMapping: {
          headings: ["Sharing", "Disclosure", "Third Parties"],
          topics: ["share", "recipients"],
        },
        insertionPolicyKey: "after_heading:SHARING|DISCLOSURE",
      },
      {
        id: "CHECK_PP_04",
        title: "User rights",
        description: "Explain rights to access, delete, and opt-out with procedures.",
        requiredSignals: ["access", "erasure", "opt-out"],
        evidenceMapping: {
          headings: ["Your Rights", "Data Subject Rights"],
          topics: ["rights", "opt-out"],
        },
        insertionPolicyKey: "after_heading:YOUR RIGHTS|DATA SUBJECT RIGHTS",
      },
      {
        id: "CHECK_PP_05",
        title: "Retention",
        description: "State retention periods or criteria for retention.",
        requiredSignals: ["retention", "how long", "storage"],
        evidenceMapping: {
          headings: ["Retention", "Storage"],
          topics: ["retention", "storage"],
        },
        insertionPolicyKey: "after_heading:RETENTION|STORAGE",
      },
      {
        id: "CHECK_PP_06",
        title: "Cookies and tracking",
        description: "Describe cookie usage, tracking, and analytics.",
        requiredSignals: ["cookies", "tracking", "analytics"],
        evidenceMapping: {
          headings: ["Cookies", "Tracking", "Analytics"],
          topics: ["cookies", "tracking"],
        },
        insertionPolicyKey: "after_heading:COOKIES|TRACKING",
      },
      {
        id: "CHECK_PP_07",
        title: "Security safeguards",
        description: "Describe security safeguards for personal data.",
        requiredSignals: ["security", "safeguards", "protect"],
        evidenceMapping: {
          headings: ["Security", "Safeguards"],
          topics: ["security", "safeguards"],
        },
        insertionPolicyKey: "after_heading:SECURITY",
      },
      {
        id: "CHECK_PP_08",
        title: "International transfers",
        description: "Explain cross-border transfers and safeguards.",
        requiredSignals: ["international transfers", "cross-border", "SCC"],
        evidenceMapping: {
          headings: ["International Transfers", "Cross-Border"],
          topics: ["transfers", "international"],
        },
        insertionPolicyKey: "after_heading:INTERNATIONAL TRANSFERS|CROSS-BORDER",
      },
      {
        id: "CHECK_PP_09",
        title: "Contact and complaints",
        description: "Provide contact details and complaint escalation route.",
        requiredSignals: ["contact", "privacy", "complaint"],
        evidenceMapping: {
          headings: ["Contact", "Questions", "Complaints"],
          topics: ["contact", "privacy"],
        },
        insertionPolicyKey: "after_heading:CONTACT|QUESTIONS",
      },
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
      "Tax authority guidance",
    ],
    clauseAnchors: [
      "Scope and deliverables",
      "Fees and expenses",
      "IP ownership",
      "Confidentiality",
      "Independent contractor status",
      "Termination",
      "Liability and indemnity",
    ],
    criticalClauses: [
      {
        title: "IP assignment",
        mustInclude: [
          "Work-made-for-hire or assignment language",
          "License-back for portfolio rights if needed",
        ],
        redFlags: [
          "Ambiguous ownership of background IP",
          "No moral rights waiver where needed",
        ],
      },
      {
        title: "Liability and indemnity",
        mustInclude: ["Cap tied to fees", "Professional indemnity"],
        redFlags: ["Unlimited liability for consultant"],
      },
    ],
    negotiationGuidance: [
      "Clarify milestone acceptance",
      "Ensure non-solicitation clauses are reasonable",
    ],
    checklist: [
      {
        id: "CHECK_CONS_01",
        title: "Scope and deliverables",
        description: "Define services scope, deliverables, and acceptance criteria.",
        requiredSignals: ["scope", "deliverables", "services"],
        evidenceMapping: {
          headings: ["Scope", "Services", "Deliverables"],
          topics: ["scope", "deliverables"],
        },
        insertionPolicyKey: "after_heading:SCOPE|SERVICES",
      },
      {
        id: "CHECK_CONS_02",
        title: "Fees and expenses",
        description: "Set fees, payment terms, and reimbursable expenses.",
        requiredSignals: ["fees", "payment", "expenses"],
        evidenceMapping: {
          headings: ["Fees", "Payment", "Expenses"],
          topics: ["fees", "payment"],
        },
        insertionPolicyKey: "after_heading:FEES|PAYMENT",
      },
      {
        id: "CHECK_CONS_03",
        title: "IP assignment",
        description: "Assign IP created and address background IP rights.",
        requiredSignals: ["assignment", "work made for hire", "intellectual property"],
        evidenceMapping: {
          headings: ["Intellectual Property", "Ownership", "IP Assignment"],
          topics: ["intellectual property", "assignment"],
        },
        insertionPolicyKey: "after_heading:INTELLECTUAL PROPERTY|OWNERSHIP",
      },
      {
        id: "CHECK_CONS_04",
        title: "Confidentiality",
        description: "Confidential information obligations and protections.",
        requiredSignals: ["confidentiality", "confidential information"],
        evidenceMapping: {
          headings: ["Confidentiality", "Confidential Information"],
          topics: ["confidentiality"],
        },
        insertionPolicyKey: "after_heading:CONFIDENTIALITY",
      },
      {
        id: "CHECK_CONS_05",
        title: "Independent contractor status",
        description: "Clarify independent contractor relationship and no employment.",
        requiredSignals: ["independent contractor", "no employment"],
        evidenceMapping: {
          headings: ["Independent Contractor", "Status"],
          topics: ["independent contractor"],
        },
        insertionPolicyKey: "after_heading:INDEPENDENT CONTRACTOR|STATUS",
      },
      {
        id: "CHECK_CONS_06",
        title: "Termination",
        description: "Termination rights and notice requirements.",
        requiredSignals: ["termination", "notice"],
        evidenceMapping: {
          headings: ["Termination", "Term"],
          topics: ["termination"],
        },
        insertionPolicyKey: "after_heading:TERMINATION",
      },
      {
        id: "CHECK_CONS_07",
        title: "Liability and indemnity",
        description: "Liability caps, indemnities, and insurance alignment.",
        requiredSignals: ["liability", "indemnity", "cap"],
        evidenceMapping: {
          headings: ["Liability", "Indemnity", "Limitation of Liability"],
          topics: ["liability", "indemnity"],
        },
        insertionPolicyKey: "before_heading:LIMITATION OF LIABILITY|LIABILITY",
      },
    ],
  }),
  research_development_agreement: createPlaybook({
    key: "research_development_agreement",
    displayName: "R&D Agreement",
    description:
      "Governs collaborative innovation, background IP, and commercialization rights.",
    regulatoryFocus: [
      "Bayh-Dole Act (where applicable)",
      "Export control considerations",
      "Competition law on exclusivity",
    ],
    clauseAnchors: [
      "Project objectives and milestones",
      "Funding and resource commitments",
      "Background and foreground IP",
      "Confidentiality and publications",
      "Commercialization",
      "Exit and termination",
    ],
    criticalClauses: [
      {
        title: "Background vs foreground IP",
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
    ],
    negotiationGuidance: [
      "Balance exclusivity with antitrust guardrails",
      "Tie milestone funding to deliverables",
    ],
    checklist: [
      {
        id: "CHECK_RD_01",
        title: "Background IP schedules",
        description: "Identify pre-existing IP and attach schedules.",
        requiredSignals: ["background IP", "schedule", "pre-existing"],
        evidenceMapping: {
          headings: ["Background IP", "Pre-Existing IP", "Schedules"],
          topics: ["background IP", "pre-existing"],
        },
        insertionPolicyKey: "after_heading:BACKGROUND IP|PRE-EXISTING",
      },
      {
        id: "CHECK_RD_02",
        title: "Foreground IP ownership",
        description: "Define ownership and licensing for project results.",
        requiredSignals: ["foreground IP", "ownership", "license"],
        evidenceMapping: {
          headings: ["Foreground IP", "Results", "Ownership"],
          topics: ["foreground IP", "ownership"],
        },
        insertionPolicyKey: "after_heading:FOREGROUND IP|RESULTS",
      },
      {
        id: "CHECK_RD_03",
        title: "Publication review",
        description: "Publication review period and patent coordination.",
        requiredSignals: ["publication", "review period", "patent"],
        evidenceMapping: {
          headings: ["Publication", "Publications"],
          topics: ["publication", "patent"],
        },
        insertionPolicyKey: "after_heading:PUBLICATION|PUBLICATIONS",
      },
      {
        id: "CHECK_RD_04",
        title: "Confidentiality",
        description: "Confidentiality obligations for research information.",
        requiredSignals: ["confidentiality", "confidential information"],
        evidenceMapping: {
          headings: ["Confidentiality", "Confidential Information"],
          topics: ["confidentiality"],
        },
        insertionPolicyKey: "after_heading:CONFIDENTIALITY",
      },
      {
        id: "CHECK_RD_05",
        title: "Funding and milestones",
        description: "Funding commitments tied to milestones and deliverables.",
        requiredSignals: ["funding", "milestones", "deliverables"],
        evidenceMapping: {
          headings: ["Funding", "Milestones", "Deliverables"],
          topics: ["funding", "milestones"],
        },
        insertionPolicyKey: "after_heading:FUNDING|MILESTONES",
      },
      {
        id: "CHECK_RD_06",
        title: "Commercialization and licensing",
        description: "Commercialization rights, licensing, and exclusivity terms.",
        requiredSignals: ["commercialization", "license", "exclusivity"],
        evidenceMapping: {
          headings: ["Commercialization", "Licensing", "Exclusivity"],
          topics: ["commercialization", "license"],
        },
        insertionPolicyKey: "after_heading:COMMERCIALIZATION|LICENSING",
      },
      {
        id: "CHECK_RD_07",
        title: "Termination and exit",
        description: "Termination rights and wind-down obligations.",
        requiredSignals: ["termination", "exit", "wind down"],
        evidenceMapping: {
          headings: ["Termination", "Exit"],
          topics: ["termination", "exit"],
        },
        insertionPolicyKey: "after_heading:TERMINATION|EXIT",
      },
    ],
  }),
  end_user_license_agreement: createPlaybook({
    key: "end_user_license_agreement",
    displayName: "End-User License Agreement",
    description:
      "Software licensing terms including usage scope, warranties, and compliance.",
    regulatoryFocus: [
      "Consumer protection rules",
      "Open-source license obligations",
      "Export control for software",
    ],
    clauseAnchors: [
      "License grant and restrictions",
      "Updates and support",
      "Warranties and disclaimers",
      "Limitation of liability",
      "Termination and suspension",
      "IP ownership",
      "Compliance and export",
    ],
    criticalClauses: [
      {
        title: "License scope",
        mustInclude: ["Permitted uses", "Restrictions"],
        redFlags: ["Automatic transfer of ownership", "Silent on audits"],
      },
      {
        title: "Liability",
        mustInclude: ["Cap tied to fees", "Exclusion of consequential damages"],
        redFlags: ["No cap or unreasonably low cap"],
      },
    ],
    negotiationGuidance: [
      "Align support obligations with business criticality",
      "Document audit processes and notice periods",
    ],
    checklist: [
      {
        id: "CHECK_EULA_01",
        title: "License grant scope",
        description: "Grant a non-exclusive, non-transferable license with scope.",
        requiredSignals: ["license", "non-exclusive", "non-transferable"],
        evidenceMapping: {
          headings: ["License", "Grant", "License Grant"],
          topics: ["license", "grant"],
        },
        insertionPolicyKey: "after_heading:LICENSE|GRANT",
      },
      {
        id: "CHECK_EULA_02",
        title: "Use restrictions",
        description: "Specify prohibited uses and restrictions.",
        requiredSignals: ["restrictions", "reverse engineering", "no copying"],
        evidenceMapping: {
          headings: ["Restrictions", "Use Restrictions"],
          topics: ["restrictions", "use"],
        },
        insertionPolicyKey: "after_heading:RESTRICTIONS|USE",
      },
      {
        id: "CHECK_EULA_03",
        title: "Updates and support",
        description: "Define updates, maintenance, and support obligations.",
        requiredSignals: ["updates", "support", "maintenance"],
        evidenceMapping: {
          headings: ["Updates", "Support", "Maintenance"],
          topics: ["support", "updates"],
        },
        insertionPolicyKey: "after_heading:SUPPORT|UPDATES",
      },
      {
        id: "CHECK_EULA_04",
        title: "Warranties and disclaimers",
        description: "State warranties and disclaimers (as-is, no implied).",
        requiredSignals: ["disclaimer", "as is", "warranty"],
        evidenceMapping: {
          headings: ["Warranties", "Disclaimer"],
          topics: ["warranty", "disclaimer"],
        },
        insertionPolicyKey: "after_heading:WARRANTIES|DISCLAIMER",
      },
      {
        id: "CHECK_EULA_05",
        title: "Limitation of liability",
        description: "Limit liability and exclude consequential damages.",
        requiredSignals: [
          "limitation of liability",
          "cap",
          "consequential damages",
        ],
        evidenceMapping: {
          headings: ["Limitation of Liability", "Liability"],
          topics: ["liability", "cap"],
        },
        insertionPolicyKey: "before_heading:LIMITATION OF LIABILITY|LIABILITY",
      },
      {
        id: "CHECK_EULA_06",
        title: "Termination and suspension",
        description: "Termination rights for breach and suspension conditions.",
        requiredSignals: ["termination", "suspend", "breach"],
        evidenceMapping: {
          headings: ["Termination", "Suspension"],
          topics: ["termination", "suspend"],
        },
        insertionPolicyKey: "after_heading:TERMINATION|SUSPENSION",
      },
      {
        id: "CHECK_EULA_07",
        title: "IP ownership",
        description: "Confirm ownership remains with licensor and no transfer.",
        requiredSignals: ["ownership", "intellectual property", "no transfer"],
        evidenceMapping: {
          headings: ["Ownership", "Intellectual Property"],
          topics: ["ownership", "intellectual property"],
        },
        insertionPolicyKey: "after_heading:OWNERSHIP|INTELLECTUAL PROPERTY",
      },
      {
        id: "CHECK_EULA_08",
        title: "Compliance and export",
        description: "Compliance with export control and sanctions laws.",
        requiredSignals: ["export control", "sanctions", "compliance"],
        evidenceMapping: {
          headings: ["Compliance", "Export"],
          topics: ["export", "sanctions"],
        },
        insertionPolicyKey: "before_heading:GOVERNING LAW|MISCELLANEOUS",
      },
    ],
  }),
  professional_services_agreement: createPlaybook({
    key: "professional_services_agreement",
    displayName: "Product Supply Agreement",
    description:
      "Supply of goods framework covering delivery, quality, and commercial risk allocation.",
    regulatoryFocus: [
      "UCC Article 2 sales principles",
      "Product safety and warranty rules",
      "Supply chain compliance",
    ],
    clauseAnchors: [
      "Supply obligations and forecasts",
      "Delivery and acceptance",
      "Quality and warranties",
      "Pricing and payment",
      "Title and risk of loss",
      "Indemnities",
      "Limitation of liability",
      "Termination",
    ],
    criticalClauses: [
      {
        title: "Delivery and acceptance",
        mustInclude: ["Delivery schedule", "Inspection and acceptance"],
        redFlags: ["No acceptance criteria"],
      },
      {
        title: "Quality and warranty",
        mustInclude: ["Specifications", "Warranty remedies"],
        redFlags: ["No remedy for non-conforming goods"],
      },
    ],
    negotiationGuidance: [
      "Tie acceptance to measurable quality specifications",
      "Align liability caps with insurance coverage",
    ],
    checklist: [
      {
        id: "CHECK_SUPPLY_01",
        title: "Supply obligations and forecasts",
        description: "Define supply commitments, forecasts, and order process.",
        requiredSignals: ["supply", "forecast", "purchase orders"],
        evidenceMapping: {
          headings: ["Supply", "Forecasts", "Orders"],
          topics: ["supply", "forecast"],
        },
        insertionPolicyKey: "after_heading:SUPPLY|FORECASTS",
      },
      {
        id: "CHECK_SUPPLY_02",
        title: "Delivery and acceptance",
        description: "Delivery schedules, inspection, and acceptance criteria.",
        requiredSignals: ["delivery", "acceptance", "inspection"],
        evidenceMapping: {
          headings: ["Delivery", "Acceptance", "Inspection"],
          topics: ["delivery", "acceptance"],
        },
        insertionPolicyKey: "after_heading:DELIVERY|ACCEPTANCE",
      },
      {
        id: "CHECK_SUPPLY_03",
        title: "Quality and warranties",
        description: "Quality standards, specifications, and warranty remedies.",
        requiredSignals: ["specifications", "quality", "warranty"],
        evidenceMapping: {
          headings: ["Quality", "Warranty", "Specifications"],
          topics: ["quality", "warranty"],
        },
        insertionPolicyKey: "after_heading:QUALITY|WARRANTY",
      },
      {
        id: "CHECK_SUPPLY_04",
        title: "Pricing and payment",
        description: "Pricing terms, invoicing, and payment timing.",
        requiredSignals: ["price", "payment", "invoice"],
        evidenceMapping: {
          headings: ["Pricing", "Payment", "Invoices"],
          topics: ["pricing", "payment"],
        },
        insertionPolicyKey: "after_heading:PRICING|PAYMENT",
      },
      {
        id: "CHECK_SUPPLY_05",
        title: "Title and risk of loss",
        description: "Transfer of title and allocation of risk of loss.",
        requiredSignals: ["title", "risk of loss", "insurance"],
        evidenceMapping: {
          headings: ["Title", "Risk of Loss"],
          topics: ["title", "risk"],
        },
        insertionPolicyKey: "after_heading:TITLE|RISK OF LOSS",
      },
      {
        id: "CHECK_SUPPLY_06",
        title: "Indemnity",
        description: "Indemnities for third-party claims and product liability.",
        requiredSignals: ["indemnity", "defend", "third party"],
        evidenceMapping: {
          headings: ["Indemnity", "Indemnification"],
          topics: ["indemnity"],
        },
        insertionPolicyKey: "after_heading:INDEMNITY",
      },
      {
        id: "CHECK_SUPPLY_07",
        title: "Limitation of liability",
        description: "Liability caps and exclusion of consequential damages.",
        requiredSignals: [
          "limitation of liability",
          "cap",
          "consequential damages",
        ],
        evidenceMapping: {
          headings: ["Limitation of Liability", "Liability"],
          topics: ["liability", "cap"],
        },
        insertionPolicyKey: "before_heading:LIMITATION OF LIABILITY|LIABILITY",
      },
      {
        id: "CHECK_SUPPLY_08",
        title: "Term and termination",
        description: "Term, termination rights, and notice periods.",
        requiredSignals: ["term", "termination", "notice"],
        evidenceMapping: {
          headings: ["Term", "Termination"],
          topics: ["termination", "term"],
        },
        insertionPolicyKey: "after_heading:TERM|TERMINATION",
      },
    ],
  }),
};

export function resolvePlaybook(
  key: PlaybookKey | string | null | undefined,
): ContractPlaybook {
  const normalized = (key ?? "").toLowerCase();
  const found =
    Object.values(CONTRACT_PLAYBOOKS).find(
      (playbook) => playbook.key === normalized,
    ) ??
    Object.values(CONTRACT_PLAYBOOKS).find((playbook) =>
      playbook.displayName.toLowerCase() === normalized,
    );

  return (
    found ??
    CONTRACT_PLAYBOOKS.non_disclosure_agreement ??
    Object.values(CONTRACT_PLAYBOOKS)[0]
  );
}
