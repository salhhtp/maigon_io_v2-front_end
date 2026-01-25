import fs from "node:fs";
import path from "node:path";
import { LEGAL_AVOID_PHRASES } from "../shared/legalLanguage";

type StringNode = {
  path: string;
  value: string;
};

const collectStrings = (value: unknown, currentPath = "$"): StringNode[] => {
  if (typeof value === "string") {
    return [{ path: currentPath, value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectStrings(entry, `${currentPath}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      collectStrings(entry, `${currentPath}.${key}`),
    );
  }
  return [];
};

const normalize = (value: string) => value.toLowerCase();

const buildSnippet = (value: string, index: number, phraseLength: number) => {
  const start = Math.max(0, index - 40);
  const end = Math.min(value.length, index + phraseLength + 40);
  return value.slice(start, end).replace(/\s+/g, " ").trim();
};

const findPhraseMatches = (
  nodes: StringNode[],
  phrases: readonly string[],
) => {
  const matches: Array<{
    path: string;
    phrase: string;
    snippet: string;
  }> = [];

  nodes.forEach((node) => {
    const lower = normalize(node.value);
    phrases.forEach((phrase) => {
      const phraseLower = normalize(phrase);
      let index = lower.indexOf(phraseLower);
      while (index !== -1) {
        matches.push({
          path: node.path,
          phrase,
          snippet: buildSnippet(node.value, index, phrase.length),
        });
        index = lower.indexOf(phraseLower, index + phraseLower.length);
      }
    });
  });

  return matches;
};

const analyzeFile = (filePath: string) => {
  const raw = fs.readFileSync(filePath, "utf8");
  let parsed: unknown = raw;
  let isJson = false;

  try {
    parsed = JSON.parse(raw);
    isJson = true;
  } catch {
    parsed = raw;
  }

  const nodes = collectStrings(parsed, isJson ? "$" : "$text");
  const matches = findPhraseMatches(nodes, LEGAL_AVOID_PHRASES);
  return { nodes, matches, isJson };
};

const formatPath = (filePath: string) =>
  path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

const main = () => {
  const targets = process.argv.slice(2);
  if (!targets.length) {
    console.error(
      "Usage: tsx scripts/legal-language-qa.ts <analysis.json|text.txt> [...]",
    );
    process.exit(1);
  }

  targets.forEach((target) => {
    const resolved = formatPath(target);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      return;
    }

    const result = analyzeFile(resolved);
    console.log(`\nFile: ${resolved}`);
    console.log(
      `Strings checked: ${result.nodes.length} (format: ${result.isJson ? "json" : "text"})`,
    );

    if (!result.matches.length) {
      console.log("Colloquial phrasing: none detected.");
      return;
    }

    console.log(`Colloquial phrasing matches: ${result.matches.length}`);
    result.matches.slice(0, 40).forEach((match, index) => {
      console.log(
        `${index + 1}. ${match.path} | phrase: "${match.phrase}" | "${match.snippet}"`,
      );
    });
    if (result.matches.length > 40) {
      console.log(
        `Truncated output. Total matches: ${result.matches.length}.`,
      );
    }
  });
};

main();
