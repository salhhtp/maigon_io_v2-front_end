import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { load } from "cheerio";

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath) {
    console.error("Usage: npm run generate:adobe-schema -- <docx-path> [output-json-path]");
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(inputPath);
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value || "";
  const $ = load(html);

  const sections: Array<{ heading: string; paragraphs: string[] }> = [];
  let current = { heading: "Untitled Section", paragraphs: [] as string[] };

  function pushCurrent() {
    if (current.paragraphs.length > 0) {
      sections.push(current);
    }
    current = { heading: "Untitled Section", paragraphs: [] };
  }

  $("body").children().each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    const text = $(element).text().trim();
    if (!text) return;

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      pushCurrent();
      current.heading = text;
    } else if (tag === "p") {
      current.paragraphs.push(text);
    } else if (tag === "ul" || tag === "ol") {
      const items = $(element)
        .find("li")
        .map((_, li) => $(li).text().trim())
        .get();
      if (items.length) {
        current.paragraphs.push(...items);
      }
    }
  });

  pushCurrent();

  const title = sections.shift()?.heading ?? path.basename(inputPath);

  const schema = {
    title,
    sections: sections.map((section, index) => ({
      id: index,
      heading: section.heading,
      paragraphs: section.paragraphs,
    })),
  };

  const output = outputPath ?? path.resolve(process.cwd(), "adobe-schema.json");
  fs.writeFileSync(output, JSON.stringify(schema, null, 2), "utf8");
  console.log(`Adobe schema written to ${output}`);
}

main().catch((error) => {
  console.error("Failed to generate schema", error);
  process.exit(1);
});
