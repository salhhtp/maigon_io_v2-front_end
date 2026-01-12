import { tokenizeForMatch, isStructuralToken, tokenVariants, hasStructuralMatch } from '../shared/ai/reliability.ts';

const requirement = 'Prompt notice of legal/process requests';
const clauseText = `In the event that the Receiving Party is required by law, any court of competent jurisdiction, or any other rules and regulations (including regulatory requirements) to make any disclosures otherwise prohibited under clause 2.1 above, the Receiving Party shall promptly (and, in any event, before complying with any such requirement) notify Discloser in writing of the same and of the action which is proposed to be taken in response, and consult with and assist Discloser in seeking a protective order or other appropriate remedy, in each case to the extent possible and allowed under the applicable laws.`;

const reqTokens = tokenizeForMatch(requirement);
const structTokens = reqTokens.filter((token) => isStructuralToken(token));
const clauseTokens = tokenizeForMatch(clauseText);
const clauseSet = new Set(clauseTokens);

console.log('reqTokens', reqTokens);
console.log('structTokens', structTokens);
console.log('clauseTokens contains promptly?', clauseSet.has('promptly'));
console.log('clauseTokens contains notify?', clauseSet.has('notify'));
console.log('clauseTokens contains law?', clauseSet.has('law'));
console.log('clauseTokens contains required?', clauseSet.has('required'));

for (const token of structTokens) {
  const variants = tokenVariants(token);
  const hit = variants.find((variant) => clauseSet.has(variant));
  console.log('token', token, 'variants', variants.slice(0,6), 'hit', hit ?? 'none');
}

console.log('hasStructuralMatch', hasStructuralMatch(structTokens, clauseTokens));
