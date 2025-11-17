import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const [filePath] = process.argv.slice(2);
  if (!filePath) {
    console.error("Usage: npm run ingestion:verify <path-to-file>");
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  console.log("Uploading file for ingestion:", absolutePath);

  const fileBuffer = readFileSync(absolutePath);
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("file", blob, absolutePath.split("/").pop() || "document.pdf");

  let uploadResp: Response;
  try {
    uploadResp = await fetch("http://localhost:8080/api/ingest", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error(
      "Unable to reach ingestion API. Make sure `npm run dev` (or the Express server) is running.",
    );
    throw error;
  }

  const uploadJson = await uploadResp.json();
  if (!uploadResp.ok) {
    console.error("Upload failed:", uploadJson);
    process.exit(1);
  }

  console.log("Upload response:", uploadJson);

  const extractionResp = await fetch(
    `http://localhost:8080/api/ingest/${uploadJson.ingestionId}/extract`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  const extractionJson = await extractionResp.json();
  if (!extractionResp.ok) {
    console.error("Extraction failed:", extractionJson);
    process.exit(1);
  }

  console.log("Extraction response:", {
    status: extractionJson.status,
    wordCount: extractionJson.result?.wordCount,
    pageCount: extractionJson.result?.pageCount,
    warnings: extractionJson.result?.warnings,
  });
}

main().catch((error) => {
  console.error("Verification script failed", error);
  process.exit(1);
});
