const createPlaybook = (overrides) => ({
    key: overrides.key,
    displayName: overrides.displayName ?? overrides.key,
    description: overrides.description ??
        "No description provided. Update the playbook configuration.",
    regulatoryFocus: overrides.regulatoryFocus ?? [],
    criticalClauses: overrides.criticalClauses ?? [],
    draftingTone: overrides.draftingTone ??
        "Authoritative legal expert tone with globally recognized legal terminology and standard clause phrasing.",
    negotiationGuidance: overrides.negotiationGuidance ?? [],
    clauseAnchors: overrides.clauseAnchors ?? [],
});
export const CONTRACT_PLAYBOOKS = {
    data_processing_agreement: createPlaybook({
        key: "data_processing_agreement",
        displayName: "Data Processing Agreement",
        description: "Ensures controller ↔ processor alignment, GDPR/CCPA compliance, and security posture.",
        regulatoryFocus: [
            "GDPR Articles 28-32",
            "CCPA / CPRA obligations",
            "ISO 27001 alignment",
        ],
        clauseAnchors: [
            "Roles & responsibilities",
            "Sub-processor approvals",
            "Security measures",
            "Breach notification timelines",
            "International transfers",
        ],
        criticalClauses: [
            {
                title: "Security measures",
                mustInclude: [
                    "Defined technical and organisational measures",
                    "Certification or audit rights",
                ],
                redFlags: [
                    "Vague references to 'industry standard'",
                    "No incident response commitments",
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
        ],
        negotiationGuidance: [
            "Align liability caps with security risk profile",
            "Demand notice + cooperation within 48-72h for incidents",
        ],
    }),
    non_disclosure_agreement: createPlaybook({
        key: "non_disclosure_agreement",
        displayName: "Non-Disclosure Agreement",
        description: "Protects confidential information with balanced carve-outs and survivals.",
        regulatoryFocus: ["Uniform Trade Secrets Act", "EU Trade Secrets Directive"],
        clauseAnchors: [
            "Definition of Confidential Information",
            "Permitted disclosures",
            "Return/Destroy obligations",
            "Term & survival",
        ],
        criticalClauses: [
            {
                title: "Definition & exclusions",
                mustInclude: [
                    "Exclusions for prior knowledge & public domain",
                    "Clear residual knowledge stance",
                ],
                redFlags: [
                    "Catch-all definitions covering non-confidential info",
                    "One-way obligations not matched by context",
                ],
            },
            {
                title: "Remedies",
                mustInclude: ["Injunctive relief", "Specific performance language"],
                redFlags: ["Exclusive remedy of damages"],
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
        description: "User-facing disclosures covering data categories, lawful bases, and user rights.",
        regulatoryFocus: [
            "GDPR Articles 12-14",
            "CCPA/CPRA notice obligations",
            "ePrivacy notice requirements",
        ],
        clauseAnchors: [
            "Data categories collected",
            "Purposes & lawful bases",
            "User rights & contact",
            "International transfers",
            "Cookies and tracking",
        ],
        criticalClauses: [
            {
                title: "Data subject rights",
                mustInclude: [
                    "Access/rectification/erasure/removal rights procedures",
                    "Contact details for privacy team or DPO",
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
        ],
        negotiationGuidance: [
            "Policies must match real processing activities",
            "Highlight opt-out mechanisms prominently",
        ],
    }),
    consultancy_agreement: createPlaybook({
        key: "consultancy_agreement",
        displayName: "Consultancy Agreement",
        description: "Defines scope, deliverables, IP ownership, and risk allocation for consultants.",
        regulatoryFocus: [
            "Independent contractor law",
            "IP assignment statutes",
            "Tax authority guidance (IRS 20-factor, HMRC IR35)",
        ],
        clauseAnchors: [
            "Scope and deliverables",
            "Fees & expenses",
            "IP ownership",
            "Exclusivity & conflict",
            "Termination",
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
        ],
        negotiationGuidance: [
            "Clarify milestone acceptance",
            "Ensure non-solicitation clauses are reasonable",
        ],
    }),
    research_development_agreement: createPlaybook({
        key: "research_development_agreement",
        displayName: "R&D Agreement",
        description: "Governs collaborative innovation, background IP, and commercialization rights.",
        regulatoryFocus: [
            "Bayh-Dole Act (where applicable)",
            "Export control / ITAR considerations",
            "Competition law on exclusivity",
        ],
        clauseAnchors: [
            "Project objectives & KPIs",
            "Funding & resource commitments",
            "IP ownership & licensing",
            "Confidentiality & publications",
            "Exit/termination",
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
        ],
        negotiationGuidance: [
            "Balance exclusivity with antitrust guardrails",
            "Tie milestone funding to deliverables",
        ],
    }),
    end_user_license_agreement: createPlaybook({
        key: "end_user_license_agreement",
        displayName: "End-User License Agreement",
        description: "Software licensing terms including usage scope, warranties, and compliance.",
        regulatoryFocus: [
            "Consumer protection / UCC Article 2",
            "Open-source license obligations",
            "Export control for software",
        ],
        clauseAnchors: [
            "License grant & restrictions",
            "Updates & support",
            "Warranties & disclaimers",
            "Limitation of liability",
            "Termination & suspension",
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
        ],
        negotiationGuidance: [
            "Align SLA / support obligations with business criticality",
            "Document audit processes and notice periods",
        ],
    }),
    professional_services_agreement: createPlaybook({
        key: "professional_services_agreement",
        displayName: "PSA",
        description: "Service delivery framework with SOWs, change control, and performance standards.",
        regulatoryFocus: [
            "Professional liability standards",
            "Service credit regulations",
        ],
        clauseAnchors: [
            "Services scope via SOW",
            "Service Levels",
            "Change control",
            "Client obligations",
            "Indemnities",
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
        ],
        negotiationGuidance: [
            "Tie acceptance to measurable deliverables",
            "Ensure dependencies on client are documented",
        ],
    }),
};
export function resolvePlaybook(key) {
    const normalized = (key ?? "").toLowerCase();
    const found = Object.values(CONTRACT_PLAYBOOKS).find((playbook) => playbook.key === normalized) ??
        Object.values(CONTRACT_PLAYBOOKS).find((playbook) => playbook.displayName.toLowerCase() === normalized);
    return (found ??
        CONTRACT_PLAYBOOKS.non_disclosure_agreement ??
        Object.values(CONTRACT_PLAYBOOKS)[0]);
}
