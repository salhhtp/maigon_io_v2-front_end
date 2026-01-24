// deno-lint-ignore-file no-explicit-any
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const severityEnum = z.enum(["critical", "high", "medium", "low", "info"]);
const priorityEnum = z.enum(["urgent", "high", "medium", "low"]);
const statusEnum = z.enum(["open", "in_progress", "resolved", "dismissed"]);

const clauseLocationSchema = z
  .object({
    page: z.number().int().positive().optional().nullable(),
    paragraph: z.number().int().positive().optional().nullable(),
    section: z.string().optional().nullable(),
    clauseNumber: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

export const clauseReferenceSchema = z.object({
  clauseId: z.string(),
  heading: z.string().optional(),
  locationHint: clauseLocationSchema.optional().nullable(),
  excerpt: z.string().optional(),
});

const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: severityEnum,
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  clauseReference: clauseReferenceSchema.optional().nullable(),
  legalBasis: z
    .array(
      z.object({
        authority: z.string(),
        cite: z.string().optional(),
        summary: z.string(),
      }),
    )
    .optional(),
  recommendation: z.string(),
  rationale: z.string(),
});

const criteriaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  met: z.boolean(),
  evidence: z.string().optional(),
});

const clauseFindingSchema = z.object({
  clauseId: z.string(),
  title: z.string(),
  summary: z.string(),
  excerpt: z.string().optional(),
  riskLevel: severityEnum,
  recommendation: z.string(),
});

const proposedEditSchema = z.object({
  id: z.string(),
  clauseId: z.string().optional(),
  anchorText: z.string(),
  proposedText: z.string(),
  intent: z.string(),
  rationale: z.string().optional(),
  previousText: z.string().optional(),
  updatedText: z.string().optional(),
  previewHtml: z
    .object({
      previous: z.string().optional(),
      updated: z.string().optional(),
      diff: z.string().optional(),
    })
    .optional(),
  applyByDefault: z.boolean().default(false),
});

const generalInformationSchema = z.object({
  complianceScore: z.number().min(0).max(100),
  selectedPerspective: z.string(),
  reviewTimeSeconds: z.number().nonnegative(),
  timeSavingsMinutes: z.number().nonnegative(),
  reportExpiry: z.string(),
});

const contractSummarySchema = z.object({
  contractName: z.string(),
  filename: z.string().optional(),
  parties: z.array(z.string()).min(1),
  agreementDirection: z.string().optional(),
  purpose: z.string(),
  verbalInformationCovered: z.boolean().optional(),
  contractPeriod: z.string().optional(),
  governingLaw: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const playbookInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: severityEnum.optional(),
  status: z.enum(["met", "missing", "attention"]).optional(),
  recommendation: z.string().optional(),
  guidance: z.array(z.string()).default([]),
  relatedClauseIds: z.array(z.string()).default([]),
});

const clauseExtractionSchema = z.object({
  id: z.string(),
  clauseId: z.string().optional(),
  title: z.string(),
  category: z.string().optional(),
  originalText: z.string(),
  normalizedText: z.string().optional(),
  importance: severityEnum.optional(),
  location: clauseLocationSchema,
  references: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});
export type ClauseExtraction = z.infer<typeof clauseExtractionSchema>;

const similarityMatchSchema = z.object({
  id: z.string(),
  referenceId: z.string().optional(),
  sourceTitle: z.string(),
  similarityScore: z.number().min(0).max(1),
  excerpt: z.string().optional(),
  rationale: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const deviationInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  deviationType: z.string().optional(),
  severity: severityEnum,
  description: z.string(),
  expectedStandard: z.string().optional(),
  observedLanguage: z.string().optional(),
  recommendation: z.string(),
  clauseId: z.string().optional(),
  status: statusEnum.optional(),
});

const actionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  owner: z.string().optional(),
  department: z.string().optional(),
  dueDate: z.string().optional(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  relatedClauseId: z.string().optional(),
});

const draftMetadataSchema = z
  .object({
    sourceDocumentId: z.string().nullable().optional(),
    baseVersionLabel: z.string().nullable().optional(),
    htmlSource: z.string().nullable().optional(),
    previewAvailable: z.boolean().default(false),
    selectedEditIds: z.array(z.string()).default([]),
    previousHtml: z.string().nullable().optional(),
    updatedHtml: z.string().nullable().optional(),
    diffHtml: z.string().nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
  })
  .nullable();

const baseReportSchema = z.object({
  generatedAt: z.string(),
  generalInformation: generalInformationSchema,
  contractSummary: contractSummarySchema,
  issuesToAddress: z.array(issueSchema).default([]),
  criteriaMet: z.array(criteriaSchema).default([]),
  clauseFindings: z.array(clauseFindingSchema).default([]).optional(),
  proposedEdits: z.array(proposedEditSchema).default([]),
  metadata: z
    .object({
      model: z.string(),
      modelCategory: z.enum(["default", "premium", "intensive"]),
      playbookKey: z.string(),
      classification: z
        .object({
          contractType: z.string().optional(),
          confidence: z.number().min(0).max(1).optional(),
        })
        .optional(),
      tokenUsage: z
        .object({
          input: z.number().optional(),
          output: z.number().optional(),
          totalCostUsd: z.number().optional(),
        })
        .optional(),
      critiqueNotes: z.array(z.string()).optional(),
      playbookCoverage: z
        .object({
          coverageScore: z.number().min(0).max(1).optional(),
          criticalClauses: z
            .array(
              z.object({
                title: z.string(),
                met: z.boolean(),
                evidence: z.string().optional(),
                missingMustInclude: z.array(z.string()).optional(),
              }),
            )
            .optional(),
          anchorCoverage: z
            .array(
              z.object({
                anchor: z.string(),
                met: z.boolean(),
                evidence: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const analysisReportV2Schema = baseReportSchema.extend({
  version: z.literal("v2"),
});

export const analysisReportV3Schema = baseReportSchema.extend({
  version: z.literal("v3"),
  playbookInsights: z.array(playbookInsightSchema).default([]),
  clauseExtractions: z.array(clauseExtractionSchema).default([]),
  similarityAnalysis: z.array(similarityMatchSchema).default([]),
  deviationInsights: z.array(deviationInsightSchema).default([]),
  actionItems: z.array(actionItemSchema).default([]),
  draftMetadata: draftMetadataSchema.optional(),
});

export const analysisReportSchema = z.union([
  analysisReportV2Schema,
  analysisReportV3Schema,
]);

export type AnalysisReportV2 = z.infer<typeof analysisReportV2Schema>;
export type AnalysisReportV3 = z.infer<typeof analysisReportV3Schema>;
export type AnalysisReport = AnalysisReportV3;

export function convertV2ReportToV3(
  report: AnalysisReportV2,
): AnalysisReport {
  return {
    ...report,
    version: "v3",
    playbookInsights: [],
    clauseExtractions: [],
    similarityAnalysis: [],
    deviationInsights: [],
    actionItems: [],
    draftMetadata: undefined,
  };
}

export function isAnalysisReportV3(
  report: AnalysisReportV2 | AnalysisReportV3,
): report is AnalysisReportV3 {
  return report.version === "v3";
}

export function validateAnalysisReport(payload: unknown): AnalysisReport {
  const parsed = analysisReportSchema.parse(payload);
  return isAnalysisReportV3(parsed) ? parsed : convertV2ReportToV3(parsed);
}
