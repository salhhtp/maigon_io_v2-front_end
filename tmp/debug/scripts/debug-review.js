import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { CONTRACT_PLAYBOOKS } from "../shared/ai/playbooks";
import { buildRetrievedClauseContext, evaluatePlaybookCoverageFromContent, } from "../shared/ai/reliability";
import { extractDocxText } from "../shared/docxExtractor";
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) {
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        const isFlag = !next || next.startsWith("--");
        switch (key) {
            case "file":
                if (!isFlag) {
                    args.file = next;
                    i += 1;
                }
                break;
            case "playbook":
                if (!isFlag) {
                    args.playbook = next;
                    i += 1;
                }
                break;
            case "format":
                if (!isFlag && (next === "text" || next === "json")) {
                    args.format = next;
                    i += 1;
                }
                break;
            case "output":
                if (!isFlag) {
                    args.output = next;
                    i += 1;
                }
                break;
            case "extractor":
                if (!isFlag && (next === "edge" || next === "mammoth")) {
                    args.extractor = next;
                    i += 1;
                }
                break;
            case "include-clauses":
                args.includeClauses = true;
                break;
            case "help":
                printUsage();
                process.exit(0);
            default:
                break;
        }
    }
    return args;
}
function printUsage() {
    console.log(`Usage:
  npm run debug:review -- --file <path> [options]

Options:
  --playbook <key>        Playbook key or alias (nda, dpa, eula, psa, rda, ppc)
  --format <text|json>    Output format (default: text)
  --output <path>         Write report to file
  --extractor <edge|mammoth>  DOCX extraction mode (default: edge)
  --include-clauses       Include clause list in JSON output
`);
}
function resolvePlaybook(value) {
    if (!value)
        return "non_disclosure_agreement";
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const aliasMap = {
        nda: "non_disclosure_agreement",
        dpa: "data_processing_agreement",
        ppc: "privacy_policy_document",
        privacy_policy: "privacy_policy_document",
        rda: "research_development_agreement",
        eula: "end_user_license_agreement",
        psa: "professional_services_agreement",
    };
    if (aliasMap[normalized])
        return aliasMap[normalized];
    if (CONTRACT_PLAYBOOKS[normalized]) {
        return normalized;
    }
    return "non_disclosure_agreement";
}
function cleanExtractedText(text) {
    return text
        .replace(/<\?xpacket[\s\S]*?<\/x:xmpmeta>[\s\S]*?\?>/gi, "")
        .replace(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/gi, "")
        .replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\\[0-9]{3}/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/[^\x20-\x7E\n\r]/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .trim();
}
async function extractDocxTextMammoth(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() ?? "";
}
function buildSegments(content) {
    const lines = content.split(/\r?\n/);
    const segments = [];
    let currentHeading = "";
    let buffer = [];
    const stopHeadings = new Set(["and", "or", "by", "of", "the", "a", "an"]);
    const partyHeadingRegex = /^(company|party)\s+\d+\b/i;
    const pushSegment = () => {
        if (!currentHeading || !buffer.length)
            return;
        const text = buffer.join(" ").trim();
        if (!text)
            return;
        segments.push({
            heading: currentHeading,
            section: currentHeading,
            text,
            references: [`segment ${segments.length + 1}`],
        });
        buffer = [];
    };
    const headingRegex = /^(section\s+\d+|article\s+\d+|\d+(?:\.\d+)*\.?|[A-Z][A-Z\s,&-]{3,}|[A-Z][A-Za-z0-9\s,&-]{0,80}:?)$/i;
    const splitInlineHeading = (line) => {
        const match = line.match(/^([A-Z][A-Za-z0-9\s,&-]{0,80}?)\s+((?:shall|means|mean|include|includes)\b[\s\S]+)$/i);
        if (!match)
            return null;
        const heading = match[1].trim().replace(/[:\s]+$/, "");
        const remainder = match[2].trim();
        if (!heading || remainder.length < 20)
            return null;
        return { heading, remainder };
    };
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        if (headingRegex.test(line) && line.length <= 140) {
            const inlineSplit = splitInlineHeading(line);
            if (inlineSplit) {
                pushSegment();
                currentHeading = inlineSplit.heading;
                buffer.push(inlineSplit.remainder);
                continue;
            }
            const nextHeading = line.replace(/[:\s]+$/, "").slice(0, 120) || "Clause";
            const isInlineHeading = nextHeading.trim().endsWith(",") ||
                partyHeadingRegex.test(nextHeading.trim());
            if (stopHeadings.has(nextHeading.trim().toLowerCase()) || isInlineHeading) {
                if (!currentHeading) {
                    currentHeading = "Preamble";
                }
                buffer.push(line);
                continue;
            }
            pushSegment();
            currentHeading = nextHeading;
            continue;
        }
        if (!currentHeading) {
            currentHeading = "Preamble";
        }
        buffer.push(line);
    }
    pushSegment();
    return segments;
}
function buildSummary(text) {
    if (!text)
        return "Clause excerpt recorded.";
    const trimmed = text.trim();
    if (trimmed.length <= 240) {
        return trimmed;
    }
    const sentence = trimmed.split(/(?<=\.)\s+/)[0] ?? trimmed;
    return sentence.slice(0, 240);
}
function inferCategory(heading, text, contractType) {
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
function inferImportance(heading, text) {
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
function buildClauses(content, contractType) {
    const segments = buildSegments(content);
    return segments.map((segment, index) => {
        const clauseId = segment.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64) ||
            `clause-${index + 1}`;
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
    });
}
function buildClauseDigest(clauses) {
    const maxExcerpt = 420;
    const headChars = 240;
    const tailChars = 160;
    const lines = [];
    clauses.forEach((clause, index) => {
        const identifier = clause.clauseId || clause.id || `clause-${index + 1}`;
        const title = clause.title || identifier;
        const excerptSource = clause.originalText || clause.normalizedText || "";
        const cleaned = excerptSource.replace(/\s+/g, " ").trim();
        const excerpt = cleaned.length > maxExcerpt
            ? `${cleaned.slice(0, headChars)} ... ${cleaned.slice(-tailChars)}`
            : cleaned;
        const category = clause.category || "general";
        const locationHint = clause.location.section || clause.location.clauseNumber || null;
        lines.push(`${index + 1}. [${identifier} | ${category}] ${title}${locationHint ? ` (${locationHint})` : ""} -> ${excerpt}`);
    });
    const categoryCounts = clauses.reduce((acc, clause) => {
        const key = (clause.category || "general").toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
    return {
        summary: lines.join("\n"),
        total: clauses.length,
        categoryCounts,
    };
}
function formatTextReport(report) {
    const missingAnchors = report.missingAnchors.length
        ? report.missingAnchors.join("; ")
        : "none";
    const missingCriticalClauses = report.missingCriticalClauses.length
        ? report.missingCriticalClauses.join("; ")
        : "none";
    const coverage = report.coverage;
    return [
        "DEBUG REVIEW REPORT",
        "",
        `File: ${report.meta.file}`,
        `Extractor: ${report.meta.extractor}`,
        `Playbook: ${report.meta.playbookTitle} (${report.meta.playbookKey})`,
        `Content length: ${report.meta.contentLength}`,
        `Clause count: ${report.meta.clauseCount}`,
        "",
        "CLAUSE DIGEST",
        report.clauseDigest.summary || "No clauses extracted.",
        "",
        "RETRIEVED EXCERPTS",
        report.retrievedExcerpts.summary || "No excerpts matched to playbook anchors.",
        "",
        "PLAYBOOK COVERAGE",
        `Coverage score: ${coverage.coverageScore}`,
        `Missing anchors: ${missingAnchors}`,
        `Missing critical clauses: ${missingCriticalClauses}`,
    ].join("\n");
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.file) {
        printUsage();
        process.exit(1);
    }
    const extractorRequested = args.extractor ?? "edge";
    let extractorUsed = extractorRequested;
    const format = args.format ?? "text";
    const playbookKey = resolvePlaybook(args.playbook);
    const playbook = CONTRACT_PLAYBOOKS[playbookKey];
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    let content = "";
    if (extension === ".docx") {
        if (extractorRequested === "mammoth") {
            content = await extractDocxTextMammoth(buffer);
        }
        else {
            content = await extractDocxText(buffer);
            if (!content || content.trim().length === 0) {
                console.warn("[debug-review] Edge-style DOCX extraction returned empty text; falling back to mammoth.");
                content = await extractDocxTextMammoth(buffer);
                extractorUsed = "mammoth";
            }
        }
    }
    else {
        content = buffer.toString("utf8");
    }
    if (!content || content.trim().length === 0) {
        console.error("No content extracted. Check the document or extractor.");
        process.exit(1);
    }
    const clauses = buildClauses(content, playbookKey);
    const clauseDigest = buildClauseDigest(clauses);
    const retrievedExcerpts = buildRetrievedClauseContext({
        playbook,
        clauses,
        maxPerAnchor: 2,
        maxTotal: 14,
        excerptLength: 320,
    });
    const coverage = evaluatePlaybookCoverageFromContent(playbook, {
        content,
        clauses,
    });
    const missingAnchors = coverage.anchorCoverage
        .filter((anchor) => !anchor.met)
        .map((anchor) => anchor.anchor);
    const missingCriticalClauses = coverage.criticalClauses
        .filter((clause) => !clause.met)
        .map((clause) => clause.title);
    const report = {
        meta: {
            file: filePath,
            extractor: extractorUsed,
            extractorRequested,
            playbookKey,
            playbookTitle: playbook.displayName,
            contentLength: content.length,
            clauseCount: clauses.length,
        },
        clauseDigest,
        retrievedExcerpts,
        coverage,
        missingAnchors,
        missingCriticalClauses,
        clauses: args.includeClauses ? clauses : undefined,
    };
    if (format === "json") {
        const output = JSON.stringify(report, null, 2);
        if (args.output) {
            fs.writeFileSync(args.output, output, "utf8");
            console.log(`Report written to ${args.output}`);
        }
        else {
            console.log(output);
        }
        return;
    }
    const text = formatTextReport(report);
    if (args.output) {
        fs.writeFileSync(args.output, text, "utf8");
        console.log(`Report written to ${args.output}`);
    }
    else {
        console.log(text);
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
