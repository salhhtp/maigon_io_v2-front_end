import fs from "fs";
import { extractDocxText } from "../shared/docxExtractor";

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx tmp/extract-docx.ts <docx>");
  process.exit(1);
}

const buffer = fs.readFileSync(file);
const text = await extractDocxText(buffer);
fs.writeFileSync("tmp/nda-base.txt", text.trim(), "utf8");
console.log("Wrote tmp/nda-base.txt");
