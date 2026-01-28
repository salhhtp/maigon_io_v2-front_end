import JSZip from "jszip";
export async function extractDocxText(buffer) {
    const zipText = await extractDocxTextFromZip(buffer);
    if (zipText && zipText.trim().length > 0) {
        return cleanExtractedText(zipText);
    }
    const rawText = extractDocxTextRaw(buffer);
    return cleanExtractedText(rawText);
}
export function cleanExtractedText(text) {
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
async function extractDocxTextFromZip(buffer) {
    try {
        const zip = await JSZip.loadAsync(buffer);
        const xmlFiles = Object.keys(zip.files)
            .filter((name) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(name))
            .sort((a, b) => {
            if (a === "word/document.xml")
                return -1;
            if (b === "word/document.xml")
                return 1;
            return a.localeCompare(b);
        });
        const textChunks = [];
        for (const name of xmlFiles) {
            const file = zip.file(name);
            if (!file)
                continue;
            const xml = await file.async("string");
            if (!xml)
                continue;
            const extracted = extractTextFromXml(xml);
            if (extracted)
                textChunks.push(extracted);
        }
        return textChunks.join(" ").trim();
    }
    catch {
        return "";
    }
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
function decodeXmlEntities(value) {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
function extractDocxTextRaw(buffer) {
    const base64Data = buffer.toString("base64");
    const binaryString = Buffer.from(base64Data, "base64").toString("binary");
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const docxString = decoder.decode(bytes);
    const textMatches = [];
    const wordTextRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let match;
    while ((match = wordTextRegex.exec(docxString)) !== null) {
        const text = match[1];
        if (text && text.trim()) {
            textMatches.push(text);
        }
    }
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
    if (textMatches.length === 0) {
        const readableRegex = /[\x20-\x7E]{15,}/g;
        const readableMatches = docxString.match(readableRegex);
        if (readableMatches) {
            const filtered = readableMatches.filter((text) => !text.includes("xml") &&
                !text.includes("PK") &&
                !text.startsWith("<?") &&
                text.split(" ").length > 2);
            textMatches.push(...filtered);
        }
    }
    return textMatches
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .join(" ");
}
