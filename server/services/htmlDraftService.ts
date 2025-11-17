import JSZip from "jszip";
import * as cheerio from "cheerio";
import type { AgentDraftEdit, StorageObjectRef } from "../../shared/api";
import {
  downloadStorageObject,
  uploadDraftAsset,
} from "./storageService";
import {
  escapeHtml,
  htmlToPlainText,
  stripDangerousHtml,
} from "../utils/htmlTransforms";

interface BuildHtmlDraftOptions {
  contractId: string;
  draftKey: string;
  htmlPackage: StorageObjectRef;
  agentEdits: AgentDraftEdit[];
  updatedPlainText?: string | null;
}

export interface HtmlDraftBuildResult {
  html: string | null;
  plainText: string | null;
  assetRef: StorageObjectRef | null;
  matchedEdits: string[];
  unmatchedEdits: string[];
}

interface ClauseNode {
  element: cheerio.Element;
  normalizedText: string;
}

const MATCH_THRESHOLD = 0.55;

export async function buildPatchedHtmlDraft(
  options: BuildHtmlDraftOptions,
): Promise<HtmlDraftBuildResult | null> {
  if (!options.agentEdits.length && !options.updatedPlainText) {
    return null;
  }

  const downloaded = await downloadStorageObject(options.htmlPackage);
  if (!downloaded) {
    return null;
  }

  const zip = await JSZip.loadAsync(downloaded.buffer);
  const entry = selectPrimaryHtmlEntry(zip);
  if (!entry) {
    return null;
  }

  const originalHtml = await entry.async("string");
  let patched = applyEditsToHtml(originalHtml, options.agentEdits);

  if ((!patched || patched.matchedEdits.length === 0) && options.updatedPlainText) {
    const blockPatched = applyBlockDiffToHtml(originalHtml, options.updatedPlainText);
    if (blockPatched) {
      patched = blockPatched;
    }
  }

  if (!patched || patched.matchedEdits.length === 0) {
    return {
      html: stripDangerousHtml(originalHtml) ?? originalHtml,
      plainText: htmlToPlainText(originalHtml) ?? null,
      assetRef: null,
      matchedEdits: [],
      unmatchedEdits: options.agentEdits.map(
        (edit) => edit.id ?? edit.clauseReference ?? "unknown-edit",
      ),
    };
  }

  zip.file(entry.name, patched.html);
  const updatedZip = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const assetRef = await uploadDraftAsset({
    contractId: options.contractId,
    buffer: updatedZip,
    fileName: `${options.draftKey}.zip`,
    bucket: options.htmlPackage.bucket,
  });

  const sanitizedHtml = stripDangerousHtml(patched.html) ?? patched.html;
  const plainText = htmlToPlainText(sanitizedHtml) ?? null;

  return {
    html: sanitizedHtml,
    plainText,
    assetRef,
    matchedEdits: patched.matchedEdits,
    unmatchedEdits: patched.unmatchedEdits,
  };
}

function selectPrimaryHtmlEntry(zip: JSZip) {
  const entries = Object.values(zip.files).filter(
    (file) =>
      !file.dir &&
      file.name.toLowerCase().endsWith(".html") &&
      !file.name.startsWith("__MACOSX"),
  );

  if (!entries.length) {
    return null;
  }

  const preferred = entries.find((file) =>
    /index\.html$/i.test(file.name),
  );
  return preferred ?? entries[0];
}

function applyEditsToHtml(
  html: string,
  edits: AgentDraftEdit[],
): { html: string; matchedEdits: string[]; unmatchedEdits: string[] } | null {
  if (!html.trim()) {
    return null;
  }

  const $ = cheerio.load(html, { decodeEntities: false });
  const nodes = collectClauseNodes($);
  const usedNodes = new Set<cheerio.Element>();
  const matched: string[] = [];
  const unmatched: string[] = [];
  let lastTarget: cheerio.Element | null = null;

  for (const edit of edits) {
    const resolvedId = edit.id ?? edit.clauseReference ?? "edit";
    const changeType = (edit.changeType || "modify").toLowerCase();
    const targetNode = findMatchingNode(edit, nodes, usedNodes);

    if (!targetNode && changeType !== "insert") {
      unmatched.push(resolvedId);
      continue;
    }

    if (changeType === "remove" && targetNode) {
      $(targetNode.element).remove();
      usedNodes.add(targetNode.element);
      matched.push(resolvedId);
      lastTarget = null;
      continue;
    }

    if (changeType === "insert") {
      const formattedInsert = formatSuggestedText(edit);
      if (!formattedInsert) {
        unmatched.push(resolvedId);
        continue;
      }

      const insertionHtml = `<p>${formattedInsert}</p>`;
      if (targetNode) {
        $(targetNode.element).after(insertionHtml);
        matched.push(resolvedId);
        lastTarget = $(targetNode.element).next().get(0) ?? null;
      } else if (lastTarget) {
        $(lastTarget).after(insertionHtml);
        matched.push(resolvedId);
        lastTarget = $(lastTarget).next().get(0) ?? null;
      } else {
        $("body").append(insertionHtml);
        matched.push(resolvedId);
      }

      continue;
    }

    if (!targetNode) {
      unmatched.push(resolvedId);
      continue;
    }

    const formatted = formatSuggestedText(edit);
    if (!formatted) {
      unmatched.push(resolvedId);
      continue;
    }

    $(targetNode.element).html(formatted);
    usedNodes.add(targetNode.element);
    matched.push(resolvedId);
    lastTarget = targetNode.element;
  }

  return {
    html: $.html(),
    matchedEdits: matched,
    unmatchedEdits: unmatched,
  };
}

function collectClauseNodes($: cheerio.CheerioAPI): ClauseNode[] {
  const selector = "p, li, td, th, div";
  return $(selector)
    .toArray()
    .map((element) => {
      const text = $(element).text();
      return {
        element,
        normalizedText: normalizeClauseText(text),
      };
    })
    .filter((node) => node.normalizedText.length > 0);
}

function findMatchingNode(
  edit: AgentDraftEdit,
  nodes: ClauseNode[],
  usedNodes: Set<cheerio.Element>,
) {
  const normalizedOriginal = normalizeClauseText(edit.originalText ?? "");
  let bestNode: ClauseNode | null = null;
  let bestScore = 0;

  if (normalizedOriginal) {
    for (const node of nodes) {
      if (usedNodes.has(node.element)) continue;
      const score = computeMatchScore(normalizedOriginal, node.normalizedText);
      if (score > bestScore && score >= MATCH_THRESHOLD) {
        bestNode = node;
        bestScore = score;
      }
    }
  }

  if (!bestNode && edit.clauseReference) {
    const reference = normalizeClauseReference(edit.clauseReference);
    for (const node of nodes) {
      if (usedNodes.has(node.element)) continue;
      if (node.normalizedText.includes(reference)) {
        bestNode = node;
        break;
      }
    }
  }

  return bestNode;
}

function normalizeClauseText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeClauseReference(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function computeMatchScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (b.includes(a)) {
    return a.length / b.length;
  }
  if (a.includes(b)) {
    return b.length / a.length;
  }
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap++;
    }
  }
  return overlap / aTokens.size;
}

function formatSuggestedText(edit: AgentDraftEdit): string {
  const suggestion = (edit.suggestedText || "").trim();
  if (!suggestion) {
    return "";
  }

  const paragraphs = suggestion
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split(/\n/)
        .map((line) => escapeHtml(line.trim()))
        .join("<br />"),
    )
    .map((block) => (block.length > 0 ? block : "&nbsp;"));

  let content = paragraphs.join("<br /><br />");
  const prefix = extractNumberingPrefix(
    edit.originalText,
    edit.suggestedText,
  );
  if (prefix) {
    const escapedPrefix = escapeHtml(prefix);
    if (!suggestion.startsWith(prefix)) {
      content = `${escapedPrefix} ${content}`;
    }
  }

  return content;
}

function extractNumberingPrefix(
  originalText?: string | null,
  suggestion?: string | null,
): string | null {
  const source = originalText || suggestion;
  if (!source) return null;
  const match = source.trim().match(
    /^((section|clause)\s+[0-9][0-9.\-A-Za-z]*|[0-9]+(?:\.[0-9a-z]+)*[.)]?)/i,
  );
  if (!match) {
    return null;
  }
  return match[0].trim();
}

const BLOCK_SELECTORS = "p, li, td, th, div, h1, h2, h3, h4, h5, h6";

interface BlockInfo {
  element: cheerio.Element;
  normalized: string;
  raw: string;
}

interface BlockText {
  raw: string;
  normalized: string;
}

type BlockDiffChunk =
  | { type: "equal"; length: number }
  | { type: "removed"; length: number }
  | { type: "added"; length: number };

function applyBlockDiffToHtml(html: string, updatedPlainText: string) {
  const trimmed = updatedPlainText.trim();
  if (!trimmed) {
    return null;
  }

  const $ = cheerio.load(html, { decodeEntities: false });
  const originalBlocks = collectBlockInfos($);
  if (originalBlocks.length === 0) {
    return null;
  }

  const updatedBlocks = splitPlainTextIntoBlocks(trimmed);
  if (updatedBlocks.length === 0) {
    return null;
  }

  const diffChunks = diffBlockSequences(
    originalBlocks.map((block) => block.normalized),
    updatedBlocks.map((block) => block.normalized),
  );

  if (!diffChunks.length) {
    return null;
  }

  let originalIndex = 0;
  let updatedIndex = 0;
  let lastNode: cheerio.Element | null = null;

  const advanceLastNode = (element: cheerio.Element | null) => {
    if (element) {
      lastNode = element;
    }
  };

  diffChunks.forEach((chunk) => {
    if (chunk.type === "equal") {
      for (let i = 0; i < chunk.length; i += 1) {
        const originalBlock = originalBlocks[originalIndex];
        const updatedBlock = updatedBlocks[updatedIndex];
        if (originalBlock && updatedBlock) {
          setBlockContent($, originalBlock.element, updatedBlock.raw);
          advanceLastNode(originalBlock.element);
        }
        originalIndex += 1;
        updatedIndex += 1;
      }
      return;
    }

    if (chunk.type === "removed") {
      for (let i = 0; i < chunk.length; i += 1) {
        const block = originalBlocks[originalIndex];
        if (block) {
          const currentElement = block.element;
          const previousSibling = $(currentElement)
            .prevAll(BLOCK_SELECTORS)
            .get(0);
          $(currentElement).remove();
          if (lastNode === currentElement) {
            lastNode =
              previousSibling ??
              $(currentElement).parent().get(0) ??
              null;
          }
        }
        originalIndex += 1;
      }
      return;
    }

    for (let i = 0; i < chunk.length; i += 1) {
      const block = updatedBlocks[updatedIndex];
      if (block) {
        const newElement = $("<p></p>")
          .html(formatBlockContent(block.raw))
          .get(0);
        if (lastNode) {
          $(lastNode).after(newElement);
        } else {
          $("body").prepend(newElement);
        }
        advanceLastNode(newElement ?? null);
      }
      updatedIndex += 1;
    }
  });

  return {
    html: $.html(),
    matchedEdits: [],
    unmatchedEdits: [],
  };
}

function collectBlockInfos($: cheerio.CheerioAPI): BlockInfo[] {
  const nodes: BlockInfo[] = [];
  $("body")
    .find(BLOCK_SELECTORS)
    .each((_idx, element) => {
      const raw = $(element).text();
      const normalized = normalizeBlockText(raw);
      if (!normalized) {
        return;
      }
      nodes.push({ element, raw, normalized });
    });
  return nodes;
}

function splitPlainTextIntoBlocks(text: string): BlockText[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => ({
      raw: block,
      normalized: normalizeBlockText(block),
    }));
}

function normalizeBlockText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function diffBlockSequences(
  original: string[],
  updated: string[],
): BlockDiffChunk[] {
  const m = original.length;
  const n = updated.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (original[i] === updated[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const chunks: BlockDiffChunk[] = [];
  let i = 0;
  let j = 0;

  const pushChunk = (chunk: BlockDiffChunk) => {
    const prev = chunks[chunks.length - 1];
    if (prev && prev.type === chunk.type) {
      prev.length += chunk.length;
    } else {
      chunks.push(chunk);
    }
  };

  while (i < m && j < n) {
    if (original[i] === updated[j]) {
      pushChunk({ type: "equal", length: 1 });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      pushChunk({ type: "removed", length: 1 });
      i += 1;
    } else {
      pushChunk({ type: "added", length: 1 });
      j += 1;
    }
  }

  while (i < m) {
    pushChunk({ type: "removed", length: 1 });
    i += 1;
  }

  while (j < n) {
    pushChunk({ type: "added", length: 1 });
    j += 1;
  }

  return chunks;
}

function setBlockContent(
  $: cheerio.CheerioAPI,
  element: cheerio.Element,
  raw: string,
) {
  $(element).html(formatBlockContent(raw));
}

function formatBlockContent(block: string) {
  const lines = block
    .split("\n")
    .map((line) => escapeHtml(line.trim()))
    .join("<br />");
  return lines || "&nbsp;";
}
