import fs from "fs";
import JSZip from "jszip";

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

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTextFromXml(xml) {
  const paragraphs = [];
  const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g;
  let paragraphMatch;
  while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
    const paragraphXml = paragraphMatch[0];
    const textMatches = [];
    const wordTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let textMatch;
    while ((textMatch = wordTextRegex.exec(paragraphXml)) !== null) {
      const text = textMatch[1];
      if (text && text.trim()) {
        textMatches.push(decodeXmlEntities(text.trim()));
      }
    }
    const paragraphText = textMatches.join(" ").replace(/\s+/g, " ").trim();
    if (paragraphText) {
      paragraphs.push(paragraphText);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join("\n");
  }

  const fallbackMatches = [];
  const wordTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
  let match;
  while ((match = wordTextRegex.exec(xml)) !== null) {
    const text = match[1];
    if (text && text.trim()) {
      fallbackMatches.push(decodeXmlEntities(text.trim()));
    }
  }
  return fallbackMatches.join(" ").replace(/\s+/g, " ").trim();
}

async function extractDocxText(buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const xmlFiles = Object.keys(zip.files)
      .filter((name) =>
        /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(
          name,
        ),
      )
      .sort((a, b) => {
        if (a === "word/document.xml") return -1;
        if (b === "word/document.xml") return 1;
        return a.localeCompare(b);
      });

    const textChunks = [];
    for (const name of xmlFiles) {
      const file = zip.file(name);
      if (!file) continue;
      const xml = await file.async("string");
      if (!xml) continue;
      const extracted = extractTextFromXml(xml);
      if (extracted) textChunks.push(extracted);
    }
    return cleanExtractedText(textChunks.join(" ").trim());
  } catch {
    return "";
  }
}

const input = process.argv[2];
if (!input) {
  console.error("Usage: node tmp/extract-docx.mjs <docx>");
  process.exit(1);
}
const buffer = fs.readFileSync(input);
const text = await extractDocxText(buffer);
if (!text) {
  console.error("No text extracted");
  process.exit(1);
}
fs.writeFileSync("tmp/nda-base.txt", text.trim(), "utf8");
console.log("Wrote tmp/nda-base.txt");
