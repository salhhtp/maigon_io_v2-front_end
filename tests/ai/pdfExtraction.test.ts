import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { evaluatePlaybookCoverageFromContent } from "../../shared/ai/reliability";
import { CONTRACT_PLAYBOOKS } from "../../shared/ai/playbooks";
import { extractDocxText } from "../../shared/docxExtractor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.resolve(__dirname, "../../docs");

function extractPdfText(filePath: string, maxPages = 1): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing PDF fixture: ${filePath}`);
  }
  const script = `
    const fs = require("fs");
    const pdf = require("pdf-parse");
    const filePath = process.argv[1];
    const maxPages = Number(process.argv[2] || "1");
    (async () => {
      const data = fs.readFileSync(filePath);
      const result = await pdf(data, { max: maxPages });
      process.stdout.write(result.text || "");
    })().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  `;
  return execFileSync(
    process.execPath,
    ["-e", script, filePath, `${maxPages}`],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    },
  );
}


describe("PDF extraction fixtures", () => {
  it("extracts NDA PDF text content", async () => {
    const filePath = path.join(
      docsDir,
      "5-Appendix-Non-Disclosure-Agreement-Mutual.pdf",
    );
    const text = extractPdfText(filePath, 1);
    expect(text.length).toBeGreaterThan(500);
    const normalized = text.toLowerCase();
    expect(normalized).toContain("non-disclosure");
  }, 30000);

  it("extracts DPA PDF text content", async () => {
    const filePath = path.join(docsDir, "dpa.pdf");
    const text = extractPdfText(filePath, 1);
    expect(text.length).toBeGreaterThan(500);
    const normalized = text.toLowerCase();
    expect(normalized).toContain("data processing");
  });

  it("captures NDA playbook coverage from the DOCX sample", async () => {
    const filePath = path.join(docsDir, "Demo NDA AL.docx");
    const text = await extractDocxText(fs.readFileSync(filePath));
    expect(text.length).toBeGreaterThan(1000);

    const coverage = evaluatePlaybookCoverageFromContent(
      CONTRACT_PLAYBOOKS.non_disclosure_agreement,
      { content: text },
    );
    const definitionAnchor = coverage.anchorCoverage.find((anchor) =>
      anchor.anchor.includes("Definition of Confidential Information"),
    );
    expect(definitionAnchor?.met).toBeTruthy();
  });

  it("captures DPA playbook coverage from the PDF sample", () => {
    const filePath = path.join(docsDir, "dpa.pdf");
    const text = extractPdfText(filePath, 2);
    const coverage = evaluatePlaybookCoverageFromContent(
      CONTRACT_PLAYBOOKS.data_processing_agreement,
      { content: text },
    );
    const securityAnchor = coverage.anchorCoverage.find((anchor) =>
      anchor.anchor.toLowerCase().includes("security measures"),
    );
    expect(securityAnchor).toBeDefined();
  });
});
