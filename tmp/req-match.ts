import { findRequirementMatch } from '../shared/ai/reliability.ts';

const clauseText = `The Confidential Information shall not include information, technical data or know-how which: is in the possession of the Receiving Party or known by the Receiving Party at the time of disclosure as shown by the Receiving Party’s files and records; prior or after the time of disclosure becomes part of the public knowledge or literature, not as a result of any breach of this Agreement by the Receiving Party; is lawfully obtained from a third party who did not to the best knowledge of the Receiving Party acquire the information, directly or indirectly, from the Discloser under an obligation of confidence; and; is approved for release by the respective Discloser in writing; is developed independently by by an employee of the Receiving Party, the said employee having no knowledge of the disclosure pursuant to this Agreement and having had no access to any of the Discloser's information; provided, however, that information shall not be deemed to be excepted from the definition of Confidential Information merely because it is (i) embraced by more general information in Receiving Party’s possession or (ii) in public literature in general terms not specifically in accordance with the Confidential Information. In the event that the Receiving Party is required by law, any court of competent jurisdiction, or any other rules and regulations (including regulatory requirements) to make any disclosures otherwise prohibited under clause 2.1 above, the Receiving Party shall promptly (and, in any event, before complying with any such requirement) notify Discloser in writing of the same and of the action which is proposed to be taken in response, and consult with and assist Discloser in seeking a protective order or other appropriate remedy, in each case to the extent possible and allowed under the applicable laws.`;

const clauses = [
  {
    id: 'exceptions',
    clauseId: 'exceptions',
    title: 'Exceptions',
    originalText: clauseText,
    normalizedText: clauseText,
  },
];

const content = clauseText;

const signals = [
  'Prompt notice of legal/process requests',
  'Cooperation to limit disclosure and protective order option',
];

for (const signal of signals) {
  const result = findRequirementMatch(signal, clauses, content);
  console.log(signal, '=>', result);
}
