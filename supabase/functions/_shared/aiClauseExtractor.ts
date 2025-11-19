import type { ClauseExtraction } from "./reviewSchema.ts";

const MAX_SEGMENTS_DEFAULT = 15;

export interface ClauseExtractionJob {
  clauses: ClauseExtraction[];
  source: "segment-parser";
  raw?: unknown;
}

export async function extractClausesWithAI(options: {
  content: string;
  contractType?: string;
  filename?: string | null;
  maxClauses?: number;
}): Promise<ClauseExtractionJob> {
  const content = options.content?.trim();
  if (!content) {
    throw new Error("No content provided for clause extraction.");
  }

  const segments = buildSegments(content, {
    maxSegments: options.maxClauses ?? MAX_SEGMENTS_DEFAULT,
    maxCharsPerSegment: 360,
  });

  if (!segments.length) {
    throw new Error("Unable to derive clause segments from content.");
  }

  const clauses = segments.map((segment, index) =>
    buildClauseFromSegment({
      segment,
      index,
      contractType: options.contractType,
    }),
  );

  return {
    clauses,
    source: "segment-parser",
    raw: { segments },
  };
}

type ContractSegment = {
  heading: string;
  section: string;
  text: string;
  references: string[];
};

function buildSegments(
  content: string,
  options: { maxSegments: number; maxCharsPerSegment: number },
): ContractSegment[] {
  const lines = content.split(/\r?\n/);
  const segments: ContractSegment[] = [];
  let currentHeading = "";
  let buffer: string[] = [];
  const pushSegment = () => {
    if (!currentHeading || !buffer.length) return;
    const text = buffer.join(" ").trim();
    if (!text) return;
    segments.push({
      heading: currentHeading,
      section: currentHeading,
      text: text.slice(0, options.maxCharsPerSegment),
      references: [`segment ${segments.length + 1}`],
    });
    buffer = [];
  };

  const headingRegex =
    /^(section\s+\d+|article\s+\d+|\d+(?:\.\d+)*\.?|[A-Z][A-Z\s,&-]{3,}|[A-Z][A-Za-z0-9\s,&-]{0,80}:?)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (headingRegex.test(line) && line.length <= 140) {
      pushSegment();
      currentHeading = line.replace(/[:\s]+$/, "").slice(0, 120) || "Clause";
      if (segments.length >= options.maxSegments) {
        break;
      }
      continue;
    }
    if (!currentHeading) {
      currentHeading = "Preamble";
    }
    buffer.push(line);
    if (buffer.join(" ").length > options.maxCharsPerSegment * 1.4) {
      pushSegment();
    }
    if (segments.length >= options.maxSegments) {
      break;
    }
  }
  pushSegment();
  return segments.slice(0, options.maxSegments);
}

function buildClauseFromSegment(options: {
  segment: ContractSegment;
  index: number;
  contractType?: string;
}): ClauseExtraction {
  const { segment, index, contractType } = options;
  const clauseId = segment.heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 64) || `clause-${index + 1}`;
  const category = inferCategory(segment.heading, segment.text, contractType);
  const importance = inferImportance(segment.heading, segment.text);
  const summary = buildSummary(segment.text);

  return {
    id: clauseId,
    clauseId,
    title: segment.heading || `Clause ${index + 1}`,
    category,
    originalText: segment.text,
    normalizedText: summary,
    importance,
    location: {
      page: null,
      paragraph: null,
      section: segment.section ?? segment.heading,
      clauseNumber: null,
    },
    references: segment.references,
    metadata: {
      source: "segment-parser",
      contractType,
    },
  };
}

function buildSummary(text: string): string {
  if (!text) return "Clause excerpt recorded.";
  const trimmed = text.trim();
  if (trimmed.length <= 240) {
    return trimmed;
  }
  const sentence = trimmed.split(/(?<=\.)\s+/)[0] ?? trimmed;
  return sentence.slice(0, 240);
}

function inferCategory(
  heading: string,
  text: string,
  contractType?: string,
): string {
  const candidate = `${heading} ${text}`.toLowerCase();
  if (/confidential|non[-\s]?disclosure|nda/.test(candidate)) {
    return "confidential_information";
  }
  if (/term|termination|survival/.test(candidate)) {
    return "term_and_termination";
  }
  if (/liability|indemn|damages/.test(candidate)) {
    return "liability";
  }
  if (/remed|injunctive|specific performance/.test(candidate)) {
    return "remedies";
  }
  if (/payment|fees|consideration/.test(candidate)) {
    return "payment";
  }
  if (/data|privacy|gdpr|information security/.test(candidate)) {
    return "data_protection";
  }
  if (/governing law|jurisdiction|dispute/.test(candidate)) {
    return "governing_law";
  }
  if (/audit|compliance|regulatory/.test(candidate)) {
    return "compliance";
  }
  if (/intellectual property|license/.test(candidate)) {
    return "ip_rights";
  }
  if (contractType && contractType.toLowerCase().includes("nda")) {
    return "confidential_information";
  }
  return "general";
}

function inferImportance(heading: string, text: string) {
  const candidate = `${heading} ${text}`.toLowerCase();
  if (/liability|indemn|damages/.test(candidate)) {
    return "critical";
  }
  if (/term|termination|confidential|audit|compliance|security/.test(candidate)) {
    return "high";
  }
  if (/payment|fees|license/.test(candidate)) {
    return "medium";
  }
  return "low";
}
