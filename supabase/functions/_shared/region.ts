export type RegionTokenContext = {
  regionKey: string | null;
  governingLaw?: string | null;
  jurisdiction?: string | null;
};

function normalizeRegionHint(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const REGION_HINTS: Array<{ key: string; terms: string[] }> = [
  {
    key: "us",
    terms: [
      "united states",
      "u s",
      "usa",
      "us",
      "delaware",
      "new york",
      "california",
      "texas",
      "florida",
      "illinois",
      "massachusetts",
      "washington",
      "virginia",
    ],
  },
  {
    key: "uk",
    terms: [
      "united kingdom",
      "u k",
      "uk",
      "england",
      "wales",
      "scotland",
      "northern ireland",
    ],
  },
  {
    key: "eu",
    terms: ["european union", "eu", "eea"],
  },
  { key: "de", terms: ["germany", "german", "deutschland"] },
  { key: "fr", terms: ["france", "french"] },
  { key: "es", terms: ["spain", "spanish", "espana"] },
  { key: "it", terms: ["italy", "italian", "italia"] },
  { key: "nl", terms: ["netherlands", "dutch"] },
  { key: "se", terms: ["sweden", "swedish", "sverige"] },
  { key: "dk", terms: ["denmark", "danish", "danmark"] },
  { key: "fi", terms: ["finland", "finnish", "suomi"] },
  { key: "no", terms: ["norway", "norwegian", "norge"] },
  { key: "ie", terms: ["ireland", "irish"] },
  { key: "pt", terms: ["portugal", "portuguese"] },
  { key: "be", terms: ["belgium", "belgian", "belgie", "belgique"] },
  { key: "at", terms: ["austria", "austrian"] },
  { key: "pl", terms: ["poland", "polish"] },
  { key: "cz", terms: ["czech", "czech republic"] },
  { key: "hu", terms: ["hungary", "hungarian"] },
  { key: "ro", terms: ["romania", "romanian"] },
  { key: "bg", terms: ["bulgaria", "bulgarian"] },
  { key: "gr", terms: ["greece", "greek"] },
  { key: "hr", terms: ["croatia", "croatian"] },
  { key: "si", terms: ["slovenia", "slovenian"] },
  { key: "sk", terms: ["slovakia", "slovak"] },
  { key: "lt", terms: ["lithuania", "lithuanian"] },
  { key: "lv", terms: ["latvia", "latvian"] },
  { key: "ee", terms: ["estonia", "estonian", "eesti"] },
  { key: "lu", terms: ["luxembourg", "luxembourgish"] },
  { key: "mt", terms: ["malta", "maltese"] },
  { key: "cy", terms: ["cyprus", "cypriot"] },
  { key: "ua", terms: ["ukraine", "ukrainian", "ukraina"] },
  {
    key: "ru",
    terms: ["russia", "russian", "russian federation", "rossiya"],
  },
  { key: "tr", terms: ["turkey", "turkiye"] },
  { key: "ca", terms: ["canada", "canadian"] },
  { key: "au", terms: ["australia", "australian"] },
  { key: "nz", terms: ["new zealand", "new zealand"] },
  { key: "sg", terms: ["singapore", "singaporean"] },
  { key: "ae", terms: ["uae", "united arab emirates"] },
  { key: "ch", terms: ["switzerland", "swiss"] },
  { key: "jp", terms: ["japan", "japanese"] },
  { key: "in", terms: ["india", "indian", "bharat"] },
  {
    key: "cn",
    terms: ["china", "chinese", "prc", "people s republic of china"],
  },
  {
    key: "kr",
    terms: ["south korea", "republic of korea", "korea"],
  },
  { key: "br", terms: ["brazil", "brazilian"] },
  { key: "za", terms: ["south africa", "south african"] },
  { key: "il", terms: ["israel", "israeli"] },
];

const EU_COUNTRY_KEYS = new Set([
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "se",
  "dk",
  "fi",
  "ie",
  "pt",
  "be",
  "at",
  "pl",
  "cz",
  "hu",
  "ro",
  "bg",
  "gr",
  "hr",
  "si",
  "sk",
  "lt",
  "lv",
  "ee",
  "lu",
  "mt",
  "cy",
]);

const EURO_REGION_KEYS = new Set([
  "eu",
  "at",
  "be",
  "cy",
  "de",
  "ee",
  "es",
  "fi",
  "fr",
  "gr",
  "hr",
  "ie",
  "it",
  "lt",
  "lu",
  "lv",
  "mt",
  "nl",
  "pt",
  "si",
  "sk",
]);

function containsRegionTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeRegionHint(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(" ")) {
    return text.includes(normalizedTerm);
  }
  const tokens = text.split(" ").filter(Boolean);
  return tokens.includes(normalizedTerm);
}

export function resolveRegionKeyFromText(text: string): string | null {
  const normalized = normalizeRegionHint(text);
  if (!normalized) return null;
  for (const entry of REGION_HINTS) {
    if (entry.terms.some((term) => containsRegionTerm(normalized, term))) {
      return entry.key;
    }
  }
  return null;
}

export function resolveRegionKeyFromSummary(
  governingLaw?: string | null,
  jurisdiction?: string | null,
): string | null {
  const combined = [governingLaw ?? "", jurisdiction ?? ""]
    .filter(Boolean)
    .join(" ");
  return resolveRegionKeyFromText(combined);
}

export function resolveRegionFallbacks(regionKey: string): string[] {
  if (!regionKey) return [];
  if (EU_COUNTRY_KEYS.has(regionKey)) return ["eu", "global"];
  if (regionKey === "no" || regionKey === "ch") return ["eu", "global"];
  if (regionKey === "uk") return ["global"];
  if (regionKey === "us") return ["global"];
  if (regionKey === "eu") return ["global"];
  return ["global"];
}

export function resolveCurrencyForRegion(regionKey: string | null): string {
  if (regionKey && EURO_REGION_KEYS.has(regionKey)) return "EUR";
  switch (regionKey) {
    case "uk":
      return "GBP";
    case "se":
      return "SEK";
    case "dk":
      return "DKK";
    case "no":
      return "NOK";
    case "ca":
      return "CAD";
    case "au":
      return "AUD";
    case "nz":
      return "NZD";
    case "sg":
      return "SGD";
    case "ae":
      return "AED";
    case "ch":
      return "CHF";
    case "jp":
      return "JPY";
    case "in":
      return "INR";
    case "cn":
      return "CNY";
    case "kr":
      return "KRW";
    case "tr":
      return "TRY";
    case "ua":
      return "UAH";
    case "ru":
      return "RUB";
    case "br":
      return "BRL";
    case "za":
      return "ZAR";
    default:
      return "USD";
  }
}

export function resolveTaxTermForRegion(regionKey: string | null): string {
  if (regionKey && (regionKey === "eu" || EU_COUNTRY_KEYS.has(regionKey))) {
    return "VAT";
  }
  switch (regionKey) {
    case "uk":
    case "no":
    case "tr":
    case "ua":
    case "ru":
    case "cn":
    case "kr":
      return "VAT";
    case "ca":
      return "GST/HST";
    case "au":
    case "nz":
    case "sg":
      return "GST";
    case "jp":
      return "consumption tax";
    case "in":
      return "GST";
    default:
      return "sales and use taxes";
  }
}

export function resolveDataProtectionLaw(regionKey: string | null): string {
  switch (regionKey) {
    case "se":
      return "GDPR and the Swedish Data Protection Act (2018:218)";
    case "ee":
      return "GDPR and the Estonian Personal Data Protection Act";
    case "fr":
      return "GDPR and the French Data Protection Act (Loi Informatique et Libertes)";
    case "de":
      return "GDPR and the German Federal Data Protection Act (BDSG)";
    case "es":
      return "GDPR and the Spanish Organic Law 3/2018 (LOPDGDD)";
    case "it":
      return "GDPR and the Italian Privacy Code (Legislative Decree 196/2003 as amended)";
    case "be":
      return "GDPR and the Belgian Data Protection Act (2018)";
    case "dk":
      return "GDPR and the Danish Data Protection Act";
    case "fi":
      return "GDPR and the Finnish Data Protection Act";
    case "no":
      return "GDPR and the Norwegian Personal Data Act";
    case "tr":
      return "KVKK (Law No. 6698)";
    case "ru":
      return "Federal Law No. 152-FZ (Personal Data)";
    case "ua":
      return "Law of Ukraine on Personal Data Protection";
    case "in":
      return "DPDP Act 2023";
    case "jp":
      return "APPI";
    case "cn":
      return "PIPL";
    case "kr":
      return "PIPA";
    default:
      break;
  }
  if (regionKey && EU_COUNTRY_KEYS.has(regionKey)) {
    return "GDPR";
  }
  switch (regionKey) {
    case "eu":
      return "GDPR";
    case "uk":
      return "UK GDPR and Data Protection Act 2018";
    case "us":
      return "CCPA/CPRA and applicable state privacy laws";
    case "ca":
      return "PIPEDA and applicable provincial privacy laws";
    case "au":
      return "Australian Privacy Act 1988";
    case "nz":
      return "New Zealand Privacy Act 2020";
    case "sg":
      return "PDPA";
    case "ae":
      return "UAE Data Protection Law";
    case "ch":
      return "Swiss FADP";
    case "br":
      return "LGPD";
    case "za":
      return "POPIA";
    case "il":
      return "Israeli Privacy Protection Law";
    default:
      return "applicable data protection laws";
  }
}

export function resolveDataProtectionLawShort(regionKey: string | null): string {
  if (regionKey && (regionKey === "no" || EU_COUNTRY_KEYS.has(regionKey))) {
    return "GDPR";
  }
  switch (regionKey) {
    case "eu":
      return "GDPR";
    case "uk":
      return "UK GDPR";
    case "us":
      return "CCPA/CPRA";
    case "ca":
      return "PIPEDA";
    case "au":
      return "Privacy Act 1988";
    case "nz":
      return "Privacy Act 2020";
    case "sg":
      return "PDPA";
    case "ae":
      return "UAE Data Protection Law";
    case "ch":
      return "FADP";
    case "jp":
      return "APPI";
    case "in":
      return "DPDP Act";
    case "cn":
      return "PIPL";
    case "kr":
      return "PIPA";
    case "tr":
      return "KVKK";
    case "ru":
      return "152-FZ";
    case "ua":
      return "Personal Data Protection Law";
    case "br":
      return "LGPD";
    case "za":
      return "POPIA";
    case "il":
      return "Israeli Privacy Protection Law";
    default:
      return "data protection laws";
  }
}

export function resolveCountryName(regionKey: string | null): string {
  switch (regionKey) {
    case "us":
      return "United States";
    case "uk":
      return "United Kingdom";
    case "eu":
      return "European Union";
    case "se":
      return "Sweden";
    case "ee":
      return "Estonia";
    case "ua":
      return "Ukraine";
    case "ru":
      return "Russia";
    case "fr":
      return "France";
    case "de":
      return "Germany";
    case "es":
      return "Spain";
    case "it":
      return "Italy";
    case "be":
      return "Belgium";
    case "in":
      return "India";
    case "jp":
      return "Japan";
    case "cn":
      return "China";
    case "kr":
      return "South Korea";
    case "no":
      return "Norway";
    case "dk":
      return "Denmark";
    case "fi":
      return "Finland";
    case "tr":
      return "Turkey";
    case "ca":
      return "Canada";
    case "au":
      return "Australia";
    case "nz":
      return "New Zealand";
    case "sg":
      return "Singapore";
    case "ae":
      return "United Arab Emirates";
    case "ch":
      return "Switzerland";
    case "br":
      return "Brazil";
    case "za":
      return "South Africa";
    case "il":
      return "Israel";
    default:
      return "the applicable jurisdiction";
  }
}

export function applyRegionTokens(
  text: string,
  context: RegionTokenContext,
): string {
  let output = text;
  const governingLaw = context.governingLaw ?? "";
  const jurisdiction = context.jurisdiction ?? "";
  const regionKey = context.regionKey ?? null;
  const currency = resolveCurrencyForRegion(regionKey);
  const taxTerm = resolveTaxTermForRegion(regionKey);
  const dataProtectionLaw = resolveDataProtectionLaw(regionKey);
  const dataProtectionLawShort = resolveDataProtectionLawShort(regionKey);
  const countryName = resolveCountryName(regionKey);
  const fallbackGoverningLaw = governingLaw || "the applicable jurisdiction";
  const fallbackJurisdiction = jurisdiction || "the applicable courts";
  const replaceToken = (value: string, token: string, replacement: string) =>
    replacement ? value.split(token).join(replacement) : value;
  output = replaceToken(output, "[GOVERNING_LAW]", fallbackGoverningLaw);
  output = replaceToken(output, "[JURISDICTION]", fallbackJurisdiction);
  output = replaceToken(output, "[CURRENCY]", currency);
  output = replaceToken(output, "[TAX_TERM]", taxTerm);
  output = replaceToken(output, "[DATA_PROTECTION_LAW]", dataProtectionLaw);
  output = replaceToken(
    output,
    "[DATA_PROTECTION_LAW_SHORT]",
    dataProtectionLawShort,
  );
  output = replaceToken(output, "[COUNTRY_NAME]", countryName);
  return output;
}
