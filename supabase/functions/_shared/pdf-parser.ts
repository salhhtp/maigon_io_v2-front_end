import JSZip from "https://esm.sh/jszip@3.10.1?target=deno";

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
  // Convert bytes to string
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let pdfString = decoder.decode(pdfBytes);

  // Extract text between stream objects
  const textMatches: string[] = [];

  // Method 1: Extract from stream objects
  const streamRegex = /stream\s*(.*?)\s*endstream/gs;
  let match;
  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamContent = match[1];
    // Decode if it looks like text
    if (
      streamContent &&
      !streamContent.includes("\x00") &&
      streamContent.length > 10
    ) {
      textMatches.push(streamContent);
    }
  }

  // Method 2: Extract from text objects - more reliable for most PDFs
  const textObjectRegex = /BT\s*(.*?)\s*ET/gs;
  while ((match = textObjectRegex.exec(pdfString)) !== null) {
    const textContent = match[1];
    // Extract actual text from PDF commands
    const textCommands = textContent.match(/\((.*?)\)\s*Tj/g);
    if (textCommands) {
      textCommands.forEach((cmd) => {
        const text = cmd.match(/\((.*?)\)/)?.[1];
        if (text) {
          textMatches.push(text);
        }
      });
    }

    // Also try TJ (array) commands
    const arrayCommands = textContent.match(/\[(.*?)\]\s*TJ/g);
    if (arrayCommands) {
      arrayCommands.forEach((cmd) => {
        const texts = cmd.match(/\((.*?)\)/g);
        if (texts) {
          texts.forEach((t) => {
            const text = t.match(/\((.*?)\)/)?.[1];
            if (text) {
              textMatches.push(text);
            }
          });
        }
      });
    }
  }

  // Method 3: Fallback - extract readable ASCII text
  if (textMatches.length === 0) {
    const asciiRegex = /[\x20-\x7E]{10,}/g;
    const asciiMatches = pdfString.match(asciiRegex);
    if (asciiMatches) {
      // Filter out common PDF structure keywords
      const filtered = asciiMatches.filter(
        (text) =>
          !text.startsWith("/") &&
          !text.includes("endobj") &&
          !text.includes("stream") &&
          text.split(" ").length > 1,
      );
      textMatches.push(...filtered);
    }
  }

  // Method 4: Ultra fallback - just get any readable text sequences
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
    const zip = await JSZip.loadAsync(docxBytes);
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

    const textChunks: string[] = [];
    for (const name of xmlFiles) {
      const file = zip.file(name);
      if (!file) continue;
      const xml = await file.async("string");
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
