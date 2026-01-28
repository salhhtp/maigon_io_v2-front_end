import fs from "fs";

const basePath = "tmp/nda-base.txt";
const outputPath = "tmp/nda-edited.txt";

const base = fs.readFileSync(basePath, "utf8");

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const insertAfterHeading = (text, heading, insertion) => {
  const lines = text.split(/\r?\n/);
  const normalizedHeading = normalize(heading);
  let inserted = false;
  const result = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    result.push(line);
    if (!inserted && normalize(line).includes(normalizedHeading)) {
      result.push("");
      result.push(insertion.trim());
      result.push("");
      inserted = true;
    }
  }
  if (!inserted) {
    result.push("");
    result.push(insertion.trim());
    result.push("");
  }
  return result.join("\n");
};

const edits = [
  {
    heading: "Confidential Information",
    text:
      "Residual knowledge. The Receiving Party's obligations apply regardless of any residual knowledge retained in unaided memory. Residual knowledge does not authorize use or disclosure of Confidential Information or derivative information.",
  },
  {
    heading: "Exceptions",
    text:
      "Marking and notice. Confidential Information should be marked as confidential when disclosed in writing or electronic form. Oral or visual disclosures are Confidential Information if identified as confidential at the time of disclosure or confirmed in writing within 30 days. Unmarked information is Confidential Information when a reasonable person would understand the circumstances to indicate confidentiality.",
  },
  {
    heading: "The Receiving Party hereby undertakes",
    text:
      "Use limitation and need-to-know. The Receiving Party shall use Confidential Information solely for the Purpose and disclose it only to personnel, contractors, or Affiliates with a need to know and who are bound by confidentiality obligations at least as protective as this Agreement. The Receiving Party shall not disclose Confidential Information to any third party without the Discloser's prior written consent, except as required by law.",
  },
  {
    heading: "No Binding Commitments",
    text:
      "No license. All Confidential Information and related intellectual property remain the property of the Discloser. No license or transfer is granted or implied except the limited right to use Confidential Information for the Purpose.",
  },
  {
    heading: "term and termination",
    text:
      "Term and survival. This Agreement remains in effect for 2 years for Confidential Information that is not a trade secret. Obligations for trade secrets survive for so long as the information remains a trade secret under applicable law. Obligations that by their nature should survive, including confidentiality and return or destruction, survive termination.",
  },
  {
    heading: "MISCELLANEOUS",
    text:
      "Remedies. The Discloser may seek injunctive relief and specific performance to prevent or cure any unauthorized use or disclosure of Confidential Information, in addition to any other remedies available at law or in equity. Remedies are cumulative, and the availability of damages does not limit equitable relief.",
  },
  {
    heading: "MISCELLANEOUS",
    text:
      "Limitation of liability. Except for breaches of confidentiality, misuse of Confidential Information, willful misconduct, or infringement of intellectual property rights, each party's aggregate liability arising out of this Agreement is limited to the greater of USD 100,000 or the total fees paid (if any) under this Agreement. Neither party is liable for indirect, consequential, special, or punitive damages to the maximum extent permitted by law.",
  },
  {
    heading: "MISCELLANEOUS",
    text:
      "Export control and sanctions. Each party shall comply with applicable export control and sanctions laws. The Receiving Party shall not export, re-export, or transfer Confidential Information to any prohibited person or destination and shall not use it for any prohibited end use.",
  },
  {
    heading: "MISCELLANEOUS",
    text:
      "Non-solicitation. During the term of this Agreement and for 12 months thereafter, neither party will knowingly solicit for employment any employee of the other party who had material involvement with the Project, except through general advertisements not targeted to such employees.",
  },
];

let updated = base;
for (const edit of edits) {
  updated = insertAfterHeading(updated, edit.heading, edit.text);
}

fs.writeFileSync(outputPath, updated.trim(), "utf8");
console.log(`Wrote ${outputPath}`);
