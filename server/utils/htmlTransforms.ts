export function stripDangerousHtml(
  input?: string | null,
): string | undefined {
  if (!input) return undefined;
  const cleaned = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function htmlToPlainText(input?: string | null): string | undefined {
  const html = stripDangerousHtml(input);
  if (!html) return undefined;

  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");

  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");

  const decoded = withoutTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return decoded.length > 0 ? decoded : undefined;
}

export function textToHtml(input?: string | null): string | undefined {
  if (!input) return undefined;
  const normalized = input.replace(/\r\n/g, "\n").trim();
  if (!normalized) return undefined;

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map(
      (block) =>
        `<p>${block
          .split("\n")
          .map((line) => line.trim())
          .join("<br />")}</p>`,
    )
    .join("");

  if (!paragraphs) return undefined;

  return `<div class="maigon-contract-body">${paragraphs}</div>`;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
