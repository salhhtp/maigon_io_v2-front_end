import {
  inflateSync,
  unzipSync,
  strFromU8,
} from "https://esm.sh/fflate@0.8.1?target=deno";

/**
 * Real PDF text extraction for contract analysis
 * This replaces the mock PDF extraction with actual text extraction
 */

export async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to string for text extraction
    // Note: For production, you would use a proper PDF parsing library
    // For now, we'll use a simplified approach that works with most PDFs

    const text = extractPDFText(bytes);

    if (!text || text.trim().length < 20) {
      throw new Error(
        "No text extracted from PDF. This PDF may be scanned (image-based) or use unsupported encoding. Please convert to text format or use a different PDF.",
      );
    }

    return cleanExtractedText(text);
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function extractPDFText(pdfBytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const encoder = new TextEncoder();
  const pdfString = decoder.decode(pdfBytes);

  const textMatches: string[] = [];

  const extractTextFromContent = (content: string) => {
    const matches: string[] = [];
    if (!content) return matches;
    const textObjectRegex = /BT\s*(.*?)\s*ET/gs;
    let match;
    while ((match = textObjectRegex.exec(content)) !== null) {
      const textContent = match[1];
      const textCommands = textContent.match(/\((.*?)\)\s*Tj/g);
      if (textCommands) {
        textCommands.forEach((cmd) => {
          const text = cmd.match(/\((.*?)\)/)?.[1];
          if (text) matches.push(text);
        });
      }
      const arrayCommands = textContent.match(/\[(.*?)\]\s*TJ/g);
      if (arrayCommands) {
        arrayCommands.forEach((cmd) => {
          const texts = cmd.match(/\((.*?)\)/g);
          if (texts) {
            texts.forEach((t) => {
              const text = t.match(/\((.*?)\)/)?.[1];
              if (text) matches.push(text);
            });
          }
        });
      }
    }
    return matches;
  };

  const extractReadableSegments = (content: string) => {
    if (!content) return [];
    const asciiRegex = /[\x20-\x7E]{10,}/g;
    const asciiMatches = content.match(asciiRegex) ?? [];
    return asciiMatches.filter(
      (text) =>
        !text.startsWith("/") &&
        !text.includes("endobj") &&
        !text.includes("stream") &&
        text.split(" ").length > 1,
    );
  };

  const indexOfSequence = (
    haystack: Uint8Array,
    needle: Uint8Array,
    start = 0,
  ) => {
    if (needle.length === 0) return -1;
    for (let i = start; i <= haystack.length - needle.length; i += 1) {
      let found = true;
      for (let j = 0; j < needle.length; j += 1) {
        if (haystack[i + j] !== needle[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  };

  const lastIndexOfSequence = (
    haystack: Uint8Array,
    needle: Uint8Array,
    end: number,
  ) => {
    if (needle.length === 0) return -1;
    const start = Math.min(end, haystack.length - needle.length);
    for (let i = start; i >= 0; i -= 1) {
      let found = true;
      for (let j = 0; j < needle.length; j += 1) {
        if (haystack[i + j] !== needle[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  };

  const decodeStream = (bytes: Uint8Array) => decoder.decode(bytes);

  textMatches.push(...extractTextFromContent(pdfString));

  const streamMarker = encoder.encode("stream");
  const endStreamMarker = encoder.encode("endstream");
  const dictStartMarker = encoder.encode("<<");
  const dictEndMarker = encoder.encode(">>");
  let cursor = 0;
  while (true) {
    const streamIndex = indexOfSequence(pdfBytes, streamMarker, cursor);
    if (streamIndex === -1) break;
    const dictStart = lastIndexOfSequence(pdfBytes, dictStartMarker, streamIndex);
    const dictEnd = lastIndexOfSequence(pdfBytes, dictEndMarker, streamIndex);
    const dictText =
      dictStart !== -1 && dictEnd !== -1 && dictEnd > dictStart
        ? decoder.decode(
            pdfBytes.slice(dictStart, dictEnd + dictEndMarker.length),
          )
        : "";
    let dataStart = streamIndex + streamMarker.length;
    if (pdfBytes[dataStart] === 0x0d && pdfBytes[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (pdfBytes[dataStart] === 0x0a) {
      dataStart += 1;
    }
    const dataEnd = indexOfSequence(pdfBytes, endStreamMarker, dataStart);
    if (dataEnd === -1) break;
    let streamData = pdfBytes.slice(dataStart, dataEnd);
    const isFlate =
      /\/Filter\s*\/FlateDecode/i.test(dictText) ||
      /\/Filter\s*\[[^\]]*FlateDecode/i.test(dictText);
    if (isFlate && streamData.length > 0) {
      try {
        streamData = inflateSync(streamData);
      } catch (error) {
        console.warn("⚠️ PDF stream inflate failed", error);
      }
    }
    const streamText = decodeStream(streamData);
    const streamMatches = extractTextFromContent(streamText);
    if (streamMatches.length > 0) {
      textMatches.push(...streamMatches);
    } else {
      textMatches.push(...extractReadableSegments(streamText));
    }
    cursor = dataEnd + endStreamMarker.length;
  }

  if (textMatches.length === 0) {
    const fallbackMatches = extractReadableSegments(pdfString);
    if (fallbackMatches.length > 0) {
      textMatches.push(...fallbackMatches);
    }
  }

  if (textMatches.length === 0) {
    console.log("⚠️ Using ultra-fallback PDF extraction");
    const ultraFallbackRegex = /[a-zA-Z]{3,}[\s\S]{0,100}[a-zA-Z]{3,}/g;
    const ultraMatches = pdfString.match(ultraFallbackRegex);
    if (ultraMatches) {
      textMatches.push(...ultraMatches.slice(0, 50));
    }
  }

  const extractedText = textMatches.join(" ");
  console.log(
    `📄 PDF extraction found ${textMatches.length} text segments, total length: ${extractedText.length}`,
  );
  return extractedText;
}

function cleanExtractedText(text: string): string {
  return (
    text
      // Remove XMP metadata blocks (common in PDFs)
      .replace(/<\?xpacket[\s\S]*?<\/x:xmpmeta>[\s\S]*?\?>/gi, "")
      .replace(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/gi, "")
      .replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, "")
      // Remove other common XML/metadata patterns
      .replace(/<[^>]+>/g, "")
      // Remove PDF encoding artifacts
      .replace(/\\[0-9]{3}/g, "")
      // Collapse letter-spaced words like "A g r e e m e n t"
      .replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (match) =>
        match.replace(/\s+/g, ""),
      )
      // Collapse digit-spaced sequences like "2 0 2 2"
      .replace(/\b(?:\d\s+){2,}\d\b/g, (match) =>
        match.replace(/\s+/g, ""),
      )
      // Remove excessive whitespace
      .replace(/[ \t]+/g, " ")
      // Remove common PDF artifacts
      .replace(/[^\x20-\x7E\n\r]/g, "")
      // Normalize line breaks
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim()
  );
}

export async function extractTextFromDOCX(base64Data: string): Promise<string> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // DOCX files are ZIP archives containing XML files
    // For production, you would use a proper DOCX parser
    // For now, we'll extract what we can from the XML content

    const zipText = await extractDOCXTextFromZip(bytes);
    const cleanedZip = cleanExtractedText(zipText);
    let cleaned = cleanedZip;

    if (!cleaned || cleaned.length === 0) {
      const rawText = extractDOCXTextRaw(bytes);
      cleaned = cleanExtractedText(rawText);
    }

    if (!cleaned || cleaned.trim().length === 0) {
      throw new Error(
        "Could not extract meaningful text from DOCX. The file may be corrupted or empty.",
      );
    }

    return cleaned;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(
      `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function extractDOCXTextFromZip(docxBytes: Uint8Array): Promise<string> {
  try {
    const zipEntries = unzipSync(docxBytes);
    const xmlFiles = Object.keys(zipEntries)
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

    const textChunks: string[] = [];
    for (const name of xmlFiles) {
      const file = zipEntries[name];
      if (!file) continue;
      const xml = strFromU8(file);
      if (!xml) continue;
      const extracted = extractDocxTextFromXml(xml);
      if (extracted) textChunks.push(extracted);
    }

    return textChunks.join(" ").trim();
  } catch (error) {
    console.warn("DOCX zip extraction failed, falling back to raw scan:", error);
    return "";
  }
}

function extractDocxTextFromXml(xml: string): string {
  const paragraphs: string[] = [];
  const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g;
  let paragraphMatch: RegExpExecArray | null;
  while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
    const paragraphXml = paragraphMatch[0];
    const textMatches: string[] = [];
    const wordTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let textMatch: RegExpExecArray | null;
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

  const fallbackMatches: string[] = [];
  const wordTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
  let match: RegExpExecArray | null;
  while ((match = wordTextRegex.exec(xml)) !== null) {
    const text = match[1];
    if (text && text.trim()) {
      fallbackMatches.push(decodeXmlEntities(text.trim()));
    }
  }
  return fallbackMatches.join(" ").replace(/\s+/g, " ").trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function extractDOCXTextRaw(docxBytes: Uint8Array): string {
  // Convert bytes to string for searching
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const docxString = decoder.decode(docxBytes);

  const textMatches: string[] = [];

  // Method 1: Extract from w:t (word text) elements
  const wordTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
  let match;
  while ((match = wordTextRegex.exec(docxString)) !== null) {
    const text = match[1];
    if (text && text.trim()) {
      textMatches.push(text);
    }
  }

  // Method 2: Extract from v:textbox elements (for textboxes)
  const textboxRegex = /<v:textbox[^>]*>(.*?)<\/v:textbox>/gs;
  while ((match = textboxRegex.exec(docxString)) !== null) {
    const textboxContent = match[1];
    const innerTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let innerMatch;
    while ((innerMatch = innerTextRegex.exec(textboxContent)) !== null) {
      const text = innerMatch[1];
      if (text && text.trim()) {
        textMatches.push(text);
      }
    }
  }

  // Method 3: Fallback - extract readable text
  if (textMatches.length === 0) {
    const readableRegex = /[\x20-\x7E]{15,}/g;
    const readableMatches = docxString.match(readableRegex);
    if (readableMatches) {
      // Filter out XML tags and keep actual content
      const filtered = readableMatches.filter(
        (text) =>
          !text.includes("xml") &&
          !text.includes("PK") &&
          !text.startsWith("<?") &&
          text.split(" ").length > 2,
      );
      textMatches.push(...filtered);
    }
  }

  // Join with spaces and preserve paragraph structure
  return textMatches
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join(" ");
}

export function validateExtractedText(text: string): {
  valid: boolean;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error:
        "No text extracted from document. This may be a scanned PDF (image-based) or use unsupported encoding. Please use a text-based PDF, TXT, or DOCX file instead.",
    };
  }

  // More lenient minimum length - just 30 characters
  if (text.trim().length < 30) {
    return {
      valid: false,
      error:
        "Extracted text is too short (less than 30 characters). Document may be empty, corrupted, or scanned.",
    };
  }

  // Check if text contains enough words - reduced to 10 words minimum
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 10) {
    return {
      valid: false,
      error:
        "Not enough readable words found (minimum 10 required). Document may be scanned, encrypted, or use unsupported encoding. Please convert to a text-based format.",
    };
  }

  // Check for reasonable text distribution (not just repetitive characters) - more lenient
  const uniqueChars = new Set(text.toLowerCase().split("")).size;
  if (uniqueChars < 10) {
    return {
      valid: false,
      error:
        "Text appears corrupted or contains only repetitive characters. Please use a different file format.",
    };
  }

  return { valid: true };
}
