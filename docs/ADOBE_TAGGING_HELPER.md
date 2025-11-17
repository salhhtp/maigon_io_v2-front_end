# Adobe Document Generation Tagging Helper

Use this helper to speed up tagging DOCX templates for Adobe PDF Services.

## 1. Generate a schema from an existing DOCX

```
npm run generate:adobe-schema -- ./path/to/contract.docx ./adobe/schema/eula.json
```

This command converts the DOCX into HTML (via Mammoth), walks headings/paragraphs, and produces a JSON structure like:

```
{
  "title": "End User License Agreement",
  "sections": [
    {
      "id": 0,
      "heading": "DEFINITIONS",
      "paragraphs": [
        "\"Licensee\" shall mean ...",
        "\"EULA\" shall mean ..."
      ]
    },
    {
      "id": 1,
      "heading": "SCOPE OF THE END USER LICENSE",
      "paragraphs": [
        "Fornav hereby grants...",
        "The Software can be licensed ..."
      ]
    }
  ]
}
```

This schema mirrors the document structure so you can quickly map Adobe tags.

## 2. Tag the template in Word

1. Open the DOCX in Word.
2. Install the **Adobe Document Generation** add-in (Insert → Get Add-ins).
3. In the add-in, click **Upload JSON** and select the schema generated above.
4. For each section:
   - Highlight the heading, pick `sections[ID].heading`, and insert **Text**.
   - Highlight the paragraphs/bullets, choose `sections[ID].paragraphs`, and insert a **Repeat** with a nested Text tag.
5. Save the tagged DOCX—this becomes the reusable template.

## 3. Provide the template & schema

Commit the tagged DOCX (or drop it in shared storage) along with the schema JSON. The export service will use these to merge AI edits and produce high-fidelity DOCX/PDF.

---
Need to re-tag later? Regenerate the schema (step 1) and adjust only the affected sections. Let the engineering team know when a new template is ready so we can point the exporter at it.
