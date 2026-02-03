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
  regionalCriteria?: RegionalCriteriaOverlay[];
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
  variants?: ClauseTemplateVariant[];
};

export type ClauseTemplateVariant = {
  region: string;
  text: string;
  insertionAnchors?: string[];
  tags?: string[];
};

export type RegionalCriteriaOverlay = {
  region: string;
  criticalClauses?: ContractPlaybook["criticalClauses"];
  clauseAnchors?: string[];
};

const createPlaybook = (
  overrides: Partial<ContractPlaybook> & Pick<ContractPlaybook, "key">,
): ContractPlaybook => ({
  key: overrides.key,
  displayName: overrides.displayName ?? overrides.key,
  description: overrides.description ?? "",
  regulatoryFocus: overrides.regulatoryFocus ?? [],
  clauseTemplates: overrides.clauseTemplates ?? [],
  regionalCriteria: overrides.regionalCriteria ?? [],
  criticalClauses: overrides.criticalClauses ?? [],
  draftingTone:
    overrides.draftingTone ??
    "Authoritative legal expert tone with globally recognized legal terminology and standard clause phrasing.",
  negotiationGuidance: overrides.negotiationGuidance ?? [],
  clauseAnchors: overrides.clauseAnchors ?? [],
});

const PRIORITY_COUNTRY_KEYS = [
  "se",
  "ee",
  "ua",
  "ru",
  "fr",
  "de",
  "es",
  "it",
  "be",
  "in",
  "jp",
  "cn",
  "kr",
  "no",
  "dk",
  "fi",
  "tr",
];

const PRIORITY_EEA_COUNTRY_KEYS = [
  "se",
  "ee",
  "fr",
  "de",
  "es",
  "it",
  "be",
  "no",
  "dk",
  "fi",
];

const PRIORITY_NON_EEA_COUNTRY_KEYS = [
  "ua",
  "ru",
  "in",
  "jp",
  "cn",
  "kr",
  "tr",
];

const createCountryVariants = (
  regions: string[],
  text: string,
): ClauseTemplateVariant[] => regions.map((region) => ({ region, text }));

const createRegionalCriteria = (
  regions: string[],
  overlay: Omit<RegionalCriteriaOverlay, "region">,
): RegionalCriteriaOverlay[] => regions.map((region) => ({ region, ...overlay }));

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
    clauseTemplates: [
      {
        id: "dpa-processing-instructions",
        title: "Processing instructions",
        tags: ["processing instructions", "controller instructions", "scope"],
        insertionAnchors: [
          "Roles & responsibilities",
          "Processing details",
          "Scope",
        ],
        text:
          "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller, including with respect to transfers, unless required by law. Processing will comply with [DATA_PROTECTION_LAW]. The Processor shall promptly inform the Controller if an instruction violates applicable law.",
        variants: [
          {
            region: "eu",
            text:
              "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller as required by GDPR Article 28, including with respect to transfers, unless required by law.",
          },
          {
            region: "uk",
            text:
              "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller as required by the UK GDPR, including with respect to transfers, unless required by law.",
          },
          {
            region: "us",
            text:
              "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller and in compliance with applicable U.S. privacy laws, including CCPA/CPRA where applicable.",
          },
          {
            region: "ca",
            text:
              "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller and in compliance with PIPEDA and applicable provincial privacy laws.",
          },
          {
            region: "au",
            text:
              "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller and in compliance with the Australian Privacy Act 1988.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Processing instructions. The Processor shall process Personal Data only on documented instructions from the Controller and in compliance with [DATA_PROTECTION_LAW] applicable in [COUNTRY_NAME].",
          ),
        ],
      },
      {
        id: "dpa-processing-details",
        title: "Processing details",
        tags: ["processing details", "categories", "purpose", "duration", "location"],
        insertionAnchors: [
          "Processing details",
          "Categories",
          "Purpose",
        ],
        text:
          "Processing details. The categories of data, data subjects, purposes, duration, and locations of processing are described in the applicable order form or statement of work. The Processor shall not process Personal Data for any other purpose.",
      },
      {
        id: "dpa-confidentiality-personnel",
        title: "Confidentiality of personnel",
        tags: ["confidentiality", "personnel", "authorized personnel"],
        insertionAnchors: [
          "Confidentiality",
          "Personnel",
          "Security measures",
        ],
        text:
          "Confidentiality of personnel. The Processor shall ensure that persons authorized to process Personal Data are bound by confidentiality obligations or an appropriate statutory duty of confidentiality.",
      },
      {
        id: "dpa-security-measures",
        title: "Security measures",
        tags: ["security measures", "technical and organizational measures", "toms"],
        insertionAnchors: [
          "Security measures",
          "Technical and organizational measures",
          "Data security",
        ],
        text:
          "Security measures. The Processor shall implement and maintain appropriate technical and organizational measures to protect Personal Data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. Upon request, the Processor shall provide a summary of its security measures.",
      },
      {
        id: "dpa-breach-notification",
        title: "Personal data breach",
        tags: ["breach notification", "incident", "personal data breach"],
        insertionAnchors: [
          "Incident",
          "Breach notification",
          "Security",
        ],
        text:
          "Personal Data Breach. The Processor shall notify the Controller without undue delay and no later than 72 hours after becoming aware of a Personal Data Breach, provide relevant details, and cooperate in remediation and notifications as required by [DATA_PROTECTION_LAW].",
        variants: [
          {
            region: "eu",
            text:
              "Personal Data Breach. The Processor shall notify the Controller without undue delay and no later than 72 hours after becoming aware of a Personal Data Breach and provide the information required under the GDPR.",
          },
          {
            region: "uk",
            text:
              "Personal Data Breach. The Processor shall notify the Controller without undue delay and no later than 72 hours after becoming aware of a Personal Data Breach and provide the information required under the UK GDPR.",
          },
          {
            region: "us",
            text:
              "Personal Data Breach. The Processor shall notify the Controller without undue delay and within timelines required by applicable U.S. breach notification laws, and cooperate in remediation and notifications.",
          },
          {
            region: "ca",
            text:
              "Personal Data Breach. The Processor shall notify the Controller without undue delay and within timelines required by applicable Canadian privacy laws and cooperate in remediation and notifications.",
          },
          {
            region: "au",
            text:
              "Personal Data Breach. The Processor shall notify the Controller without undue delay and within timelines required by the Australian Privacy Act 1988 (Notifiable Data Breaches scheme) and cooperate in remediation and notifications.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Personal Data Breach. The Processor shall notify the Controller without undue delay and within the timelines required by [DATA_PROTECTION_LAW] applicable in [COUNTRY_NAME], provide relevant details, and cooperate in remediation and notifications.",
          ),
        ],
      },
      {
        id: "dpa-subprocessors",
        title: "Sub-processors",
        tags: ["sub-processor", "subprocessor", "flow-down", "approval"],
        insertionAnchors: [
          "Sub-processor",
          "Subprocessing",
          "Third-party processing",
        ],
        text:
          "Sub-processors. The Processor shall not engage a sub-processor without the Controller's prior authorization (specific or general). The Processor shall impose equivalent data protection obligations on sub-processors and remain fully liable for their performance.",
      },
      {
        id: "dpa-data-subject-requests",
        title: "Data subject requests",
        tags: ["data subject requests", "dsr", "assistance"],
        insertionAnchors: [
          "Data subject requests",
          "Assistance",
          "Cooperation",
        ],
        text:
          "Data subject requests. The Processor shall assist the Controller in responding to data subject requests, including access, deletion, restriction, and portability, taking into account the nature of processing.",
      },
      {
        id: "dpa-audit-assistance",
        title: "Audit and assistance",
        tags: ["audit", "inspection", "compliance", "assistance"],
        insertionAnchors: [
          "Audit",
          "Inspection",
          "Compliance",
        ],
        text:
          "Audit and assistance. The Processor shall make available information necessary to demonstrate compliance and allow audits or provide third-party reports, subject to reasonable notice, scope, and confidentiality.",
      },
      {
        id: "dpa-deletion-return",
        title: "Deletion and return",
        tags: ["deletion", "return", "end of services", "backups"],
        insertionAnchors: [
          "Deletion",
          "Return",
          "Termination",
        ],
        text:
          "Deletion and return. At the Controller's choice upon termination, the Processor shall delete or return all Personal Data, including copies, unless retention is required by law.",
      },
      {
        id: "dpa-international-transfers",
        title: "International transfers",
        tags: ["international transfers", "scc", "cross-border"],
        insertionAnchors: [
          "International transfers",
          "Cross-border",
          "Data transfers",
        ],
        text:
          "International transfers. The Processor shall not transfer Personal Data outside the applicable territory except using a valid transfer mechanism as required by [DATA_PROTECTION_LAW], such as SCCs where applicable, and shall notify the Controller of any material change to transfer safeguards.",
        variants: [
          {
            region: "eu",
            text:
              "International transfers. The Processor shall not transfer Personal Data outside the EEA except using a valid transfer mechanism such as the EU Standard Contractual Clauses and shall notify the Controller of any material change to transfer safeguards.",
          },
          {
            region: "uk",
            text:
              "International transfers. The Processor shall not transfer Personal Data outside the UK except using a valid transfer mechanism such as the UK IDTA or the UK Addendum to the EU SCCs and shall notify the Controller of any material change to transfer safeguards.",
          },
          {
            region: "us",
            text:
              "International transfers. The Processor shall not transfer Personal Data outside the applicable territory except in compliance with applicable privacy laws and using appropriate contractual safeguards.",
          },
          {
            region: "ca",
            text:
              "International transfers. The Processor shall not transfer Personal Data outside Canada except in compliance with applicable privacy laws and with appropriate contractual safeguards.",
          },
          {
            region: "au",
            text:
              "International transfers. The Processor shall not transfer Personal Data outside Australia except in compliance with applicable privacy laws and with appropriate contractual safeguards.",
          },
          ...createCountryVariants(
            PRIORITY_EEA_COUNTRY_KEYS,
            "International transfers. The Processor shall not transfer Personal Data outside the EEA except using a valid transfer mechanism such as the EU Standard Contractual Clauses, as required by [DATA_PROTECTION_LAW] in [COUNTRY_NAME], and shall notify the Controller of any material change to transfer safeguards.",
          ),
          ...createCountryVariants(
            PRIORITY_NON_EEA_COUNTRY_KEYS,
            "International transfers. The Processor shall not transfer Personal Data internationally except in compliance with [DATA_PROTECTION_LAW] in [COUNTRY_NAME] and any required transfer mechanisms, and shall notify the Controller of any material change to transfer safeguards.",
          ),
        ],
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Local data protection law compliance ([DATA_PROTECTION_LAW])",
          mustInclude: ["[DATA_PROTECTION_LAW_SHORT]"],
          redFlags: ["No reference to [DATA_PROTECTION_LAW_SHORT] compliance"],
        },
      ],
    }),
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
        id: "nda-definition-exclusions",
        title: "Definition of Confidential Information and Exclusions",
        tags: [
          "definition",
          "confidential information",
          "exclusions",
          "prior knowledge",
          "public domain",
          "independently developed",
        ],
        insertionAnchors: [
          "Confidential Information",
          "Definition of Confidential Information",
          "Whereas",
        ],
        text:
          "Definition clarification. Confidential Information includes unmarked information that a reasonable person would understand to be confidential under the circumstances. Confidential Information does not include information that (i) was known to the Receiving Party without obligation of confidentiality before disclosure, (ii) becomes publicly known through no fault of the Receiving Party, (iii) is independently developed without use of the Disclosing Party's Confidential Information, or (iv) is rightfully received from a third party without breach of confidentiality.",
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
          "Marking and reasonable notice. Confidential Information should be marked as confidential when disclosed in writing or electronic form. For oral or visual disclosures, reasonable notice must be provided at the time of disclosure or confirmed in writing within 30 days. Unmarked information is Confidential Information when a reasonable person would understand the circumstances to indicate confidentiality.",
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
        id: "nda-compelled-disclosure",
        title: "Compelled disclosure",
        tags: ["compelled disclosure", "notice", "protective order", "subpoena", "regulatory"],
        insertionAnchors: ["Exceptions", "Permitted disclosures", "Confidential Information"],
        text:
          "Compelled disclosure. If the Receiving Party is required by law, regulation, subpoena, or other governmental process to disclose Confidential Information, it shall promptly notify the Disclosing Party (to the extent permitted), cooperate to seek a protective order or limit disclosure, and disclose only the minimum required.",
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
          "Limitation of liability. Except for breaches of confidentiality, misuse of Confidential Information, willful misconduct, or infringement of intellectual property rights, each party's aggregate liability arising out of this Agreement is limited to the greater of [CURRENCY] 100,000 or the total fees paid (if any) under this Agreement. Neither party is liable for indirect, consequential, special, or punitive damages to the maximum extent permitted by law.",
      },
      {
        id: "nda-return-destruction",
        title: "Return/Destruction",
        tags: ["return", "destruction", "backups", "archives", "destruction certificate"],
        insertionAnchors: [
          "The Receiving Party hereby undertakes",
          "Return or Destruction",
          "MISCELLANEOUS",
        ],
        text:
          "Return/Destruction. Upon termination or upon the Discloser's written request, the Receiving Party shall return or destroy all Confidential Information, including copies and summaries. Electronic backups and archives containing Confidential Information shall be destroyed or rendered inaccessible to the extent practicable. Upon request, the Receiving Party shall provide a written destruction certificate.",
      },
      {
        id: "nda-export-control",
        title: "Export control and sanctions",
        tags: ["export control", "sanctions", "restricted party", "restricted end use"],
        insertionAnchors: ["MISCELLANEOUS", "Governing law"],
        text:
          "Export control and sanctions. Each party shall comply with applicable export control and sanctions laws. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination and shall not use it for any prohibited end use.",
        variants: [
          {
            region: "us",
            text:
              "Export control and sanctions. Each party shall comply with U.S. export control and sanctions laws, including the Export Administration Regulations (EAR) and OFAC programs, as applicable. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination or for any prohibited end use.",
          },
          {
            region: "uk",
            text:
              "Export control and sanctions. Each party shall comply with U.K. export control and sanctions laws. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination or for any prohibited end use.",
          },
          {
            region: "eu",
            text:
              "Export control and sanctions. Each party shall comply with EU export control rules and restrictive measures. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination or for any prohibited end use.",
          },
          {
            region: "ca",
            text:
              "Export control and sanctions. Each party shall comply with Canadian export control and sanctions laws. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination or for any prohibited end use.",
          },
          {
            region: "au",
            text:
              "Export control and sanctions. Each party shall comply with Australian export control and sanctions laws. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination or for any prohibited end use.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Export control and sanctions. Each party shall comply with export control and sanctions laws of [COUNTRY_NAME]. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination or for any prohibited end use.",
          ),
        ],
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
          "Governing law and disputes. This Agreement is governed by the laws of [GOVERNING_LAW], without regard to conflict of laws rules. The parties submit to the exclusive jurisdiction of the courts located in [JURISDICTION] for any dispute arising out of or relating to this Agreement.",
        variants: [
          {
            region: "us",
            text:
              "Governing law and disputes. This Agreement is governed by the laws of the State of [GOVERNING_LAW], without regard to conflict of laws rules. The parties submit to the exclusive jurisdiction of the state and federal courts located in [JURISDICTION] for any dispute arising out of or relating to this Agreement.",
          },
          {
            region: "uk",
            text:
              "Governing law and disputes. This Agreement is governed by the laws of England and Wales, and the parties submit to the exclusive jurisdiction of the courts of England and Wales for any dispute arising out of or relating to this Agreement.",
          },
          {
            region: "eu",
            text:
              "Governing law and disputes. This Agreement is governed by the laws of [GOVERNING_LAW], and the courts located in [JURISDICTION] have exclusive jurisdiction over any dispute arising out of or relating to this Agreement.",
          },
          {
            region: "ca",
            text:
              "Governing law and disputes. This Agreement is governed by the laws of the Province of [GOVERNING_LAW] and the federal laws of Canada applicable therein, and the parties submit to the courts located in [JURISDICTION] for any dispute arising out of or relating to this Agreement.",
          },
          {
            region: "au",
            text:
              "Governing law and disputes. This Agreement is governed by the laws of [GOVERNING_LAW], and the courts located in [JURISDICTION] have exclusive jurisdiction over any dispute arising out of or relating to this Agreement.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Governing law and disputes. This Agreement is governed by the laws of [GOVERNING_LAW], without regard to conflict of laws rules. The parties submit to the exclusive jurisdiction of the courts located in [JURISDICTION] for any dispute arising out of or relating to this Agreement.",
          ),
        ],
      },
      {
        id: "nda-governing-law-clarify",
        title: "Governing law clarification",
        tags: ["governing law", "jurisdiction", "dispute resolution", "clarify"],
        insertionAnchors: ["Governing law", "GOVERNING LAW AND DISPUTES"],
        text:
          "Forum election and jurisdiction. The parties may agree in writing to resolve disputes by arbitration; absent such agreement, disputes shall be resolved by the courts identified above, and that jurisdiction is exclusive.",
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Governing law and jurisdiction ([COUNTRY_NAME])",
          mustInclude: ["governing law", "jurisdiction"],
          redFlags: ["No governing law or jurisdiction clause"],
        },
      ],
    }),
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
    clauseTemplates: [
      {
        id: "privacy-controller-contact",
        title: "Controller and contact",
        tags: ["controller", "contact", "dpo", "privacy contact"],
        insertionAnchors: [
          "Data controller",
          "Contact",
          "Who we are",
        ],
        text:
          "Controller and contact. [Company name] is the data controller. Contact: [privacy contact email/address]. Where required, you may contact the Data Protection Officer at [DPO contact].",
      },
      {
        id: "privacy-data-categories",
        title: "Data categories",
        tags: ["data categories", "personal data", "information we collect"],
        insertionAnchors: [
          "Data categories",
          "Information we collect",
          "Personal data",
        ],
        text:
          "Data we collect. We collect identifiers, contact details, account data, usage data, device and log information, and any other data you provide. We do not intentionally collect sensitive data unless stated.",
      },
      {
        id: "privacy-purposes-lawful-basis",
        title: "Purposes and lawful bases",
        tags: ["purposes", "lawful basis", "processing purposes"],
        insertionAnchors: [
          "Purposes",
          "Lawful bases",
          "How we use data",
        ],
        text:
          "Purposes and lawful bases. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service. Our lawful bases or permitted grounds include contract performance, legitimate interests, consent where required, and legal obligations, as applicable under [DATA_PROTECTION_LAW].",
        variants: [
          {
            region: "eu",
            text:
              "Purposes and lawful bases. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service. Our lawful bases under the GDPR include contract performance, legitimate interests, consent where required, and legal obligations.",
          },
          {
            region: "uk",
            text:
              "Purposes and lawful bases. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service. Our lawful bases under the UK GDPR include contract performance, legitimate interests, consent where required, and legal obligations.",
          },
          {
            region: "us",
            text:
              "Purposes. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service. We do so for business purposes and as permitted by applicable U.S. privacy laws.",
          },
          {
            region: "ca",
            text:
              "Purposes and lawful bases. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service, consistent with PIPEDA and applicable provincial privacy laws.",
          },
          {
            region: "au",
            text:
              "Purposes and lawful bases. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service, consistent with the Australian Privacy Act 1988 and the APPs.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Purposes and lawful bases. We process personal data to provide the service, operate and secure our systems, communicate with users, comply with law, and improve the service. Our lawful bases or permitted grounds include contract performance, legitimate interests, consent where required, and legal obligations, as applicable under [DATA_PROTECTION_LAW] in [COUNTRY_NAME].",
          ),
        ],
      },
      {
        id: "privacy-rights",
        title: "Your rights",
        tags: ["rights", "access", "deletion", "rectification", "portability"],
        insertionAnchors: [
          "Your rights",
          "Data subject rights",
          "Rights",
        ],
        text:
          "Your rights. You may request access, correction, deletion, restriction, portability, and object to processing. You may withdraw consent at any time. To exercise rights, contact [privacy contact], and we respond within the time required by [DATA_PROTECTION_LAW].",
        variants: [
          {
            region: "eu",
            text:
              "Your rights. You may request access, correction, deletion, restriction, portability, and object to processing, and you may withdraw consent at any time. You also have the right to lodge a complaint with a supervisory authority. To exercise rights, contact [privacy contact].",
          },
          {
            region: "uk",
            text:
              "Your rights. You may request access, correction, deletion, restriction, portability, and object to processing, and you may withdraw consent at any time. You also have the right to lodge a complaint with the ICO. To exercise rights, contact [privacy contact].",
          },
          {
            region: "us",
            text:
              "Your rights. You may have the right to know, access, correct, and delete personal information, and to opt out of the sale or sharing of personal information. We will not discriminate for exercising these rights. To exercise rights, contact [privacy contact].",
          },
          {
            region: "ca",
            text:
              "Your rights. You may request access to and correction of personal information and withdraw consent, subject to legal or contractual restrictions. To exercise rights, contact [privacy contact].",
          },
          {
            region: "au",
            text:
              "Your rights. You may request access to and correction of personal information, and you may make a complaint to the OAIC if you are not satisfied with our response. To exercise rights, contact [privacy contact].",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Your rights. You may request access, correction, deletion, restriction, portability, and object to processing, and you may withdraw consent at any time. To exercise rights, contact [privacy contact], and we respond within the time required by [DATA_PROTECTION_LAW] in [COUNTRY_NAME].",
          ),
        ],
      },
      {
        id: "privacy-retention",
        title: "Retention",
        tags: ["retention", "storage period", "how long"],
        insertionAnchors: [
          "Retention",
          "Storage",
          "How long we keep data",
        ],
        text:
          "Retention. We retain personal data only for as long as necessary for the purposes described, then delete or anonymize it unless we must keep it for legal reasons.",
      },
      {
        id: "privacy-sharing",
        title: "Sharing and recipients",
        tags: ["sharing", "recipients", "processors", "third parties"],
        insertionAnchors: [
          "Sharing",
          "Recipients",
          "Service providers",
        ],
        text:
          "Sharing. We share data with service providers, affiliates, and professional advisors as needed to provide the service, and with authorities when legally required. We do not sell personal data.",
      },
      {
        id: "privacy-transfers",
        title: "International transfers",
        tags: ["international transfers", "scc", "cross-border"],
        insertionAnchors: [
          "International transfers",
          "Cross-border",
          "Transfers",
        ],
        text:
          "International transfers. If we transfer data internationally, we rely on lawful mechanisms as required by [DATA_PROTECTION_LAW], such as Standard Contractual Clauses or adequacy decisions where applicable.",
        variants: [
          {
            region: "eu",
            text:
              "International transfers. If we transfer data outside the EEA, we rely on lawful mechanisms such as the EU Standard Contractual Clauses or adequacy decisions.",
          },
          {
            region: "uk",
            text:
              "International transfers. If we transfer data outside the UK, we rely on lawful mechanisms such as the UK IDTA or the UK Addendum to the EU SCCs.",
          },
          {
            region: "us",
            text:
              "International transfers. We may transfer data to and process data in countries outside your state or country, subject to appropriate safeguards and applicable law.",
          },
          {
            region: "ca",
            text:
              "International transfers. We may transfer data outside Canada and will use appropriate safeguards consistent with applicable privacy laws.",
          },
          {
            region: "au",
            text:
              "International transfers. We may transfer data outside Australia and will use appropriate safeguards consistent with applicable privacy laws.",
          },
          ...createCountryVariants(
            PRIORITY_EEA_COUNTRY_KEYS,
            "International transfers. If we transfer data outside the EEA, we rely on lawful mechanisms such as the EU Standard Contractual Clauses or adequacy decisions, as required by [DATA_PROTECTION_LAW] in [COUNTRY_NAME].",
          ),
          ...createCountryVariants(
            PRIORITY_NON_EEA_COUNTRY_KEYS,
            "International transfers. If we transfer data internationally, we rely on lawful mechanisms as required by [DATA_PROTECTION_LAW] in [COUNTRY_NAME].",
          ),
        ],
      },
      {
        id: "privacy-children",
        title: "Children",
        tags: ["children", "minors", "age limit"],
        insertionAnchors: [
          "Children",
          "Minors",
          "Age",
        ],
        text:
          "Children. Our services are not directed to children under [age], and we do not knowingly collect their data. If we learn we have collected it, we will delete it in accordance with [DATA_PROTECTION_LAW].",
        variants: [
          {
            region: "us",
            text:
              "Children. Our services are not directed to children under 13, and we do not knowingly collect their data. If we learn we have collected it, we will delete it in accordance with COPPA.",
          },
          {
            region: "eu",
            text:
              "Children. Our services are not directed to children under 16 (or lower age permitted by local law), and we do not knowingly collect their data. If we learn we have collected it, we will delete it.",
          },
          {
            region: "uk",
            text:
              "Children. Our services are not directed to children under 13, and we do not knowingly collect their data. If we learn we have collected it, we will delete it.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Children. Our services are not directed to children under [age], and we do not knowingly collect their data. If we learn we have collected it, we will delete it in accordance with [DATA_PROTECTION_LAW] in [COUNTRY_NAME].",
          ),
        ],
      },
      {
        id: "privacy-cookies",
        title: "Cookies and tracking",
        tags: ["cookies", "tracking", "analytics", "consent"],
        insertionAnchors: [
          "Cookies",
          "Tracking",
          "Analytics",
        ],
        text:
          "Cookies and tracking. We use cookies and similar technologies for essential operations, analytics, and preferences. You can manage cookie settings through your browser or our cookie banner.",
      },
      {
        id: "privacy-do-not-sell",
        title: "Do Not Sell/Share",
        tags: ["do not sell", "do not share", "opt-out"],
        insertionAnchors: [
          "Do Not Sell",
          "Opt-out",
          "Your choices",
        ],
        text:
          "Do Not Sell/Share. Where applicable, you may opt out of the sale or sharing of personal information by using the \"Do Not Sell or Share\" link or contacting us.",
      },
      {
        id: "privacy-security",
        title: "Security",
        tags: ["security", "safeguards"],
        insertionAnchors: [
          "Security",
          "Safeguards",
          "Protection",
        ],
        text:
          "Security. We use reasonable administrative, technical, and physical safeguards to protect personal data.",
      },
      {
        id: "privacy-updates",
        title: "Updates",
        tags: ["updates", "effective date", "changes"],
        insertionAnchors: [
          "Updates",
          "Changes",
          "Effective date",
        ],
        text:
          "Updates. We may update this policy from time to time and will post the effective date and any material changes.",
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Privacy notice compliance ([DATA_PROTECTION_LAW])",
          mustInclude: ["[DATA_PROTECTION_LAW_SHORT]"],
          redFlags: ["No reference to [DATA_PROTECTION_LAW_SHORT] compliance"],
        },
      ],
    }),
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
    clauseTemplates: [
      {
        id: "consult-scope-acceptance",
        title: "Scope and acceptance",
        tags: ["scope", "deliverables", "acceptance", "milestones"],
        insertionAnchors: [
          "Scope",
          "Deliverables",
          "Acceptance",
        ],
        text:
          "Scope and acceptance. Services and deliverables are described in the applicable SOW. Client will review deliverables within ten (10) business days and either accept or provide written notice of deficiencies; Consultant will remedy deficiencies within a reasonable period.",
      },
      {
        id: "consult-fees-expenses",
        title: "Fees and expenses",
        tags: ["fees", "expenses", "payment", "invoicing"],
        insertionAnchors: [
          "Fees",
          "Expenses",
          "Payment",
        ],
        text:
          "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of applicable [TAX_TERM] unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
        variants: [
          {
            region: "us",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of applicable sales and use taxes unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
          },
          {
            region: "uk",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of VAT unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
          },
          {
            region: "eu",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of VAT unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
          },
          {
            region: "ca",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of GST/HST unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
          },
          {
            region: "au",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of GST unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of applicable [TAX_TERM] in [COUNTRY_NAME] unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Consultant is responsible for its taxes and withholdings.",
          ),
        ],
      },
      {
        id: "consult-ip-ownership",
        title: "IP ownership",
        tags: ["ip ownership", "work made for hire", "assignment", "background ip"],
        insertionAnchors: [
          "Intellectual Property",
          "IP ownership",
          "Ownership",
        ],
        text:
          "IP ownership. Background IP remains with the owning party. Deliverables created under this Agreement are work-made-for-hire to Client; to the extent not work-made-for-hire, Consultant assigns all right, title, and interest in such Deliverables to Client.",
      },
      {
        id: "consult-confidentiality",
        title: "Confidentiality",
        tags: ["confidentiality", "data protection", "confidential information"],
        insertionAnchors: [
          "Confidentiality",
          "Confidential Information",
          "Data protection",
        ],
        text:
          "Confidentiality. Consultant shall protect Client Confidential Information, use it only for the Services, and restrict access to personnel with a need to know who are bound by confidentiality obligations. These obligations survive termination.",
      },
      {
        id: "consult-warranties",
        title: "Warranties",
        tags: ["warranties", "performance", "professional services"],
        insertionAnchors: [
          "Warranties",
          "Performance standards",
          "Quality",
        ],
        text:
          "Warranties. Consultant represents it will perform the Services in a professional and workmanlike manner and that Deliverables will materially conform to the SOW. Remedies are re-performance or refund of the applicable fees.",
      },
      {
        id: "consult-indemnity-liability",
        title: "Indemnity and liability",
        tags: ["indemnity", "liability cap", "limitation of liability"],
        insertionAnchors: [
          "Indemnity",
          "Limitation of liability",
          "Liability",
        ],
        text:
          "Indemnity and liability. Consultant shall defend and indemnify Client from third-party claims arising from Consultant IP infringement or gross negligence. Liability is capped at fees paid in the twelve (12) months before the claim, excluding breaches of confidentiality or willful misconduct.",
      },
      {
        id: "consult-change-control",
        title: "Change control",
        tags: ["change control", "change order", "scope change"],
        insertionAnchors: [
          "Change control",
          "Changes",
          "Scope",
        ],
        text:
          "Change control. Any change to scope, timeline, or fees must be documented in a written change order signed by both parties.",
      },
      {
        id: "consult-termination",
        title: "Termination",
        tags: ["termination", "cure", "for convenience"],
        insertionAnchors: [
          "Termination",
          "Term and termination",
          "Exit",
        ],
        text:
          "Termination. Either party may terminate for material breach with thirty (30) days notice and opportunity to cure. Client may terminate for convenience with thirty (30) days notice. Upon termination, Client pays for Services performed and Consultant returns Client materials.",
      },
      {
        id: "consult-non-solicit",
        title: "Non-solicitation",
        tags: ["non-solicit", "non solicitation", "staff"],
        insertionAnchors: [
          "Non-solicit",
          "Staffing",
          "Personnel",
        ],
        text:
          "Non-solicitation. During the term and for twelve (12) months after, neither party will knowingly solicit for employment any employee of the other party who had material involvement with the project, except through general advertisements not targeted to such employees.",
      },
      {
        id: "consult-insurance",
        title: "Insurance",
        tags: ["insurance", "professional liability", "coverage"],
        insertionAnchors: [
          "Insurance",
          "Liability",
          "Risk",
        ],
        text:
          "Insurance. Consultant shall maintain commercially reasonable insurance, including professional liability and general liability, and provide certificates of insurance upon request.",
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Tax treatment and [TAX_TERM]",
          mustInclude: ["[TAX_TERM]"],
          redFlags: ["No tax or [TAX_TERM] allocation language"],
        },
      ],
    }),
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
    clauseTemplates: [
      {
        id: "rnd-background-foreground-ip",
        title: "Background and foreground IP",
        tags: ["background ip", "foreground ip", "joint ownership", "assignment"],
        insertionAnchors: [
          "IP ownership",
          "Background IP",
          "Foreground IP",
        ],
        text:
          "Background and Foreground IP. Each party retains ownership of its Background IP. Foreground IP created jointly is jointly owned, and each party receives a non-exclusive, royalty-free license for internal research use. Commercialization requires a separate written license.",
      },
      {
        id: "rnd-publications",
        title: "Publications and publicity",
        tags: ["publication", "publicity", "review period", "patent"],
        insertionAnchors: [
          "Publications",
          "Publicity",
          "Confidentiality",
        ],
        text:
          "Publications. Parties shall provide draft publications at least forty-five (45) days before submission. The other party may request delay to allow patent filings and removal of Confidential Information.",
      },
      {
        id: "rnd-commercialization",
        title: "Commercialization and licensing",
        tags: ["commercialization", "license", "revenue sharing", "field of use"],
        insertionAnchors: [
          "Commercialization",
          "Licensing",
          "Revenue sharing",
        ],
        text:
          "Commercialization. The parties will negotiate in good faith a license for commercialization, addressing field, territory, exclusivity, royalties, and milestones. No commercialization rights are granted unless expressly agreed in writing.",
      },
      {
        id: "rnd-governance",
        title: "Governance and change control",
        tags: ["governance", "steering committee", "change control"],
        insertionAnchors: [
          "Governance",
          "Steering committee",
          "Change control",
        ],
        text:
          "Governance and change control. A joint steering committee will meet regularly to review progress and approve scope changes. Changes to scope, timeline, or budget require written agreement.",
      },
      {
        id: "rnd-confidentiality-export",
        title: "Confidentiality and export control",
        tags: ["confidentiality", "export control", "security", "itar"],
        insertionAnchors: [
          "Confidentiality",
          "Export control",
          "Security",
        ],
        text:
          "Confidentiality and export control. Each party shall protect Confidential Information and comply with applicable export control laws. Transfers of controlled technology require prior written approval and appropriate licenses.",
        variants: [
          {
            region: "us",
            text:
              "Confidentiality and export control. Each party shall protect Confidential Information and comply with U.S. export control and sanctions laws, including EAR and ITAR where applicable. Transfers of controlled technology require prior written approval and appropriate licenses.",
          },
          {
            region: "uk",
            text:
              "Confidentiality and export control. Each party shall protect Confidential Information and comply with U.K. export control and sanctions laws. Transfers of controlled technology require prior written approval and appropriate licenses.",
          },
          {
            region: "eu",
            text:
              "Confidentiality and export control. Each party shall protect Confidential Information and comply with EU export control rules and restrictive measures. Transfers of controlled technology require prior written approval and appropriate licenses.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Confidentiality and export control. Each party shall protect Confidential Information and comply with export control and sanctions laws of [COUNTRY_NAME]. Transfers of controlled technology require prior written approval and appropriate licenses.",
          ),
        ],
      },
      {
        id: "rnd-funding-cost-share",
        title: "Funding and cost sharing",
        tags: ["funding", "cost sharing", "budget", "resources"],
        insertionAnchors: [
          "Funding",
          "Cost sharing",
          "Budget",
        ],
        text:
          "Funding and cost sharing. Each party will contribute resources as set out in the project plan. No expenditures beyond the agreed budget are authorized without prior written approval.",
      },
      {
        id: "rnd-deliverables-acceptance",
        title: "Deliverables and acceptance",
        tags: ["deliverables", "acceptance", "milestones"],
        insertionAnchors: [
          "Deliverables",
          "Acceptance",
          "Milestones",
        ],
        text:
          "Deliverables and acceptance. Deliverables are specified in the project plan. The receiving party will accept or provide written deficiencies within thirty (30) days, and the providing party will cure within a reasonable period.",
      },
      {
        id: "rnd-liability-indemnity",
        title: "Liability and indemnities",
        tags: ["liability", "indemnity", "limitation of liability"],
        insertionAnchors: [
          "Liability",
          "Indemnity",
          "Limitation of liability",
        ],
        text:
          "Liability and indemnities. Liability is capped at each party's contributions under the Agreement, excluding breaches of confidentiality or IP infringement. Each party indemnifies the other for third-party claims arising from its negligence or willful misconduct.",
      },
      {
        id: "rnd-termination-survival",
        title: "Termination and survivals",
        tags: ["termination", "survival", "post-termination"],
        insertionAnchors: [
          "Termination",
          "Term and termination",
          "Survival",
        ],
        text:
          "Termination. Either party may terminate for material breach with notice and cure, or for convenience with sixty (60) days notice. Upon termination, IP rights and confidentiality obligations survive as set forth in this Agreement.",
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Export control compliance ([COUNTRY_NAME])",
          mustInclude: ["export control", "sanctions"],
          redFlags: ["No export control or sanctions compliance language"],
        },
      ],
    }),
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
    clauseTemplates: [
      {
        id: "eula-license-grant",
        title: "License grant",
        tags: ["license grant", "license scope", "permitted use"],
        insertionAnchors: [
          "License grant",
          "License",
          "Grant",
        ],
        text:
          "License grant. Licensor grants User a limited, non-exclusive, non-transferable, revocable license to use the Software solely for internal business purposes during the term.",
      },
      {
        id: "eula-restrictions",
        title: "Restrictions",
        tags: ["restrictions", "reverse engineer", "no redistribution"],
        insertionAnchors: [
          "Restrictions",
          "Acceptable use",
          "Prohibited uses",
        ],
        text:
          "Restrictions. User shall not copy, modify, reverse engineer, or distribute the Software, nor use it to provide services to third parties, except as expressly permitted.",
      },
      {
        id: "eula-ownership",
        title: "Ownership",
        tags: ["ownership", "intellectual property", "reservation of rights"],
        insertionAnchors: [
          "Ownership",
          "Intellectual Property",
          "IP ownership",
        ],
        text:
          "Ownership. Licensor retains all rights, title, and interest in the Software and documentation. No rights are granted except as expressly stated.",
      },
      {
        id: "eula-updates-support",
        title: "Updates and support",
        tags: ["updates", "support", "maintenance"],
        insertionAnchors: [
          "Updates",
          "Support",
          "Maintenance",
        ],
        text:
          "Updates and support. Licensor may provide updates at its discretion; support, if any, is described in an order or support policy.",
      },
      {
        id: "eula-data-privacy",
        title: "Data and privacy",
        tags: ["data", "telemetry", "privacy policy"],
        insertionAnchors: [
          "Data",
          "Privacy",
          "Telemetry",
        ],
        text:
          "Data and privacy. The Software may collect usage data to operate and improve the service as described in the privacy policy. User will ensure it has rights to provide any personal data.",
      },
      {
        id: "eula-warranty-disclaimer",
        title: "Warranty disclaimer",
        tags: ["warranty", "disclaimer", "as is"],
        insertionAnchors: [
          "Warranties",
          "Disclaimer",
          "Warranty disclaimer",
        ],
        text:
          "Warranty disclaimer. The Software is provided \"as is\" and licensor disclaims all warranties, including merchantability, fitness, and non-infringement, to the maximum extent permitted by law.",
        variants: [
          {
            region: "uk",
            text:
              "Warranty disclaimer. The Software is provided \"as is\" and licensor disclaims all warranties to the maximum extent permitted by law. Nothing in this Agreement limits any statutory consumer rights that cannot be excluded under applicable law.",
          },
          {
            region: "eu",
            text:
              "Warranty disclaimer. The Software is provided \"as is\" and licensor disclaims all warranties to the maximum extent permitted by law. Nothing in this Agreement limits mandatory consumer rights under applicable law.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Warranty disclaimer. The Software is provided \"as is\" and licensor disclaims all warranties to the maximum extent permitted by law. Nothing in this Agreement limits any statutory consumer rights that cannot be excluded under [COUNTRY_NAME] law.",
          ),
        ],
      },
      {
        id: "eula-ip-indemnity",
        title: "IP indemnity",
        tags: ["indemnity", "ip infringement", "third-party claims"],
        insertionAnchors: [
          "Indemnity",
          "IP indemnity",
          "Claims",
        ],
        text:
          "IP indemnity. Licensor will defend and indemnify User from third-party claims alleging the Software infringes IP, with standard exclusions and remedies including replacement, modification, or refund.",
      },
      {
        id: "eula-liability-cap",
        title: "Limitation of liability",
        tags: ["liability cap", "limitation of liability", "consequential damages"],
        insertionAnchors: [
          "Limitation of liability",
          "Liability",
          "Damages",
        ],
        text:
          "Limitation of liability. Liability is capped at fees paid in the twelve (12) months prior to the claim and excludes indirect, incidental, or consequential damages.",
      },
      {
        id: "eula-termination",
        title: "Termination",
        tags: ["termination", "suspension", "effect of termination"],
        insertionAnchors: [
          "Termination",
          "Suspension",
          "Effect of termination",
        ],
        text:
          "Termination. Licensor may suspend or terminate for breach after notice. Upon termination, User must cease use and delete copies, and any data access or export will be handled as reasonably practicable.",
      },
      {
        id: "eula-export",
        title: "Export control",
        tags: ["export control", "sanctions", "embargo"],
        insertionAnchors: [
          "Export control",
          "Sanctions",
          "Compliance",
        ],
        text:
          "Export control. User will comply with export laws and not use the Software in embargoed territories or for prohibited end uses.",
        variants: [
          {
            region: "us",
            text:
              "Export control. User will comply with U.S. export control and sanctions laws, including the EAR and OFAC programs, and will not use the Software in embargoed territories or for prohibited end uses.",
          },
          {
            region: "uk",
            text:
              "Export control. User will comply with U.K. export control and sanctions laws and will not use the Software in embargoed territories or for prohibited end uses.",
          },
          {
            region: "eu",
            text:
              "Export control. User will comply with EU export control rules and restrictive measures and will not use the Software in embargoed territories or for prohibited end uses.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Export control. User will comply with export control and sanctions laws of [COUNTRY_NAME] and will not use the Software in embargoed territories or for prohibited end uses.",
          ),
        ],
      },
      {
        id: "eula-open-source",
        title: "Open source",
        tags: ["open source", "third-party components", "oss"],
        insertionAnchors: [
          "Open source",
          "Third-party components",
          "Notices",
        ],
        text:
          "Open source. Open-source components are governed by their respective licenses and are identified in notices provided with the Software.",
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Mandatory consumer rights ([COUNTRY_NAME])",
          mustInclude: ["consumer", "rights"],
          redFlags: ["Disclaims non-excludable consumer rights"],
        },
      ],
    }),
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
    clauseTemplates: [
      {
        id: "psa-sow-acceptance",
        title: "SOW and acceptance",
        tags: ["statement of work", "acceptance", "deliverables"],
        insertionAnchors: [
          "SOW",
          "Acceptance",
          "Deliverables",
        ],
        text:
          "SOW and acceptance. Services and deliverables are defined in each Statement of Work. Client will accept deliverables or provide written deficiencies within ten (10) business days, and Provider will cure within a reasonable period.",
      },
      {
        id: "psa-service-levels",
        title: "Service levels",
        tags: ["service levels", "sla", "service credits"],
        insertionAnchors: [
          "Service Levels",
          "SLA",
          "Service credits",
        ],
        text:
          "Service levels. Provider shall meet the service levels in the SOW. If service levels are missed, Client is entitled to service credits as the sole remedy, without limiting other contractual remedies for chronic failure.",
      },
      {
        id: "psa-change-control",
        title: "Change control",
        tags: ["change control", "change order", "scope change"],
        insertionAnchors: [
          "Change control",
          "Changes",
          "Scope",
        ],
        text:
          "Change control. Any change to scope, timeline, or fees must be documented in a written change order signed by both parties.",
      },
      {
        id: "psa-client-obligations",
        title: "Client obligations",
        tags: ["client obligations", "dependencies", "cooperation"],
        insertionAnchors: [
          "Client obligations",
          "Dependencies",
          "Cooperation",
        ],
        text:
          "Client obligations. Client will provide timely access, information, and approvals required for Provider to perform the Services. Provider is not responsible for delays caused by Client's failure to meet its obligations.",
      },
      {
        id: "psa-fees-expenses",
        title: "Fees and expenses",
        tags: ["fees", "expenses", "payment", "invoicing"],
        insertionAnchors: [
          "Fees",
          "Expenses",
          "Payment",
        ],
        text:
          "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of applicable [TAX_TERM] unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
        variants: [
          {
            region: "us",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of applicable sales and use taxes unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
          },
          {
            region: "uk",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of VAT unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
          },
          {
            region: "eu",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of VAT unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
          },
          {
            region: "ca",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of GST/HST unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
          },
          {
            region: "au",
            text:
              "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of GST unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
          },
          ...createCountryVariants(
            PRIORITY_COUNTRY_KEYS,
            "Fees and expenses. Client shall pay fees as specified in the SOW within thirty (30) days of invoice. Fees are exclusive of applicable [TAX_TERM] in [COUNTRY_NAME] unless stated otherwise. Pre-approved reasonable expenses are reimbursable with receipts. Provider is responsible for its taxes.",
          ),
        ],
      },
      {
        id: "psa-ip-ownership",
        title: "IP ownership",
        tags: ["ip ownership", "deliverables", "license back"],
        insertionAnchors: [
          "Intellectual Property",
          "IP ownership",
          "Ownership",
        ],
        text:
          "IP ownership. Provider retains ownership of its background tools and methodologies. Client owns the deliverables upon full payment, and Provider receives a limited license to reuse its background IP.",
      },
      {
        id: "psa-confidentiality",
        title: "Confidentiality",
        tags: ["confidentiality", "data protection", "confidential information"],
        insertionAnchors: [
          "Confidentiality",
          "Confidential Information",
          "Data protection",
        ],
        text:
          "Confidentiality. Each party shall protect the other's Confidential Information, use it only to perform the Agreement, and restrict access to personnel with a need to know who are bound by confidentiality obligations.",
      },
      {
        id: "psa-warranties",
        title: "Warranties",
        tags: ["warranties", "performance", "professional services"],
        insertionAnchors: [
          "Warranties",
          "Performance standards",
          "Quality",
        ],
        text:
          "Warranties. Provider represents it will perform the Services in a professional and workmanlike manner and that Deliverables will materially conform to the SOW. Remedies are re-performance or refund of the applicable fees.",
      },
      {
        id: "psa-liability-indemnity",
        title: "Liability and indemnities",
        tags: ["liability", "indemnity", "limitation of liability"],
        insertionAnchors: [
          "Liability",
          "Indemnity",
          "Limitation of liability",
        ],
        text:
          "Liability and indemnities. Liability is capped at fees paid in the twelve (12) months prior to the claim, excluding breaches of confidentiality or willful misconduct. Provider indemnifies Client for third-party claims arising from Provider IP infringement.",
      },
      {
        id: "psa-termination-transition",
        title: "Termination and transition",
        tags: ["termination", "transition", "exit"],
        insertionAnchors: [
          "Termination",
          "Exit",
          "Transition",
        ],
        text:
          "Termination and transition. Either party may terminate for material breach with notice and cure, and Client may terminate for convenience with notice. Provider will provide reasonable transition assistance and return Client data upon termination.",
      },
    ],
    regionalCriteria: createRegionalCriteria(PRIORITY_COUNTRY_KEYS, {
      criticalClauses: [
        {
          title: "Tax treatment and [TAX_TERM]",
          mustInclude: ["[TAX_TERM]"],
          redFlags: ["No tax or [TAX_TERM] allocation language"],
        },
      ],
    }),
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
