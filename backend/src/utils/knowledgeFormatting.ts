const escapeHtml = (value = ""): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const decodeHtmlEntities = (value = ""): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");

export const plainTextToHtml = (value = ""): string =>
  String(value || "")
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

export const sanitizeKnowledgeHtml = (html = ""): string => {
  let safe = String(html || "");
  const allowedTags = new Set([
    "strong",
    "b",
    "em",
    "i",
    "u",
    "p",
    "br",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote"
  ]);

  safe = safe
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s(on\w+)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag, attrs) => {
      const normalizedTag = String(tag || "").toLowerCase();
      const closing = /^<\//.test(match);

      if (!allowedTags.has(normalizedTag)) return "";
      if (normalizedTag === "br") return "<br>";
      if (closing) return `</${normalizedTag}>`;

      if (normalizedTag === "a") {
        const hrefMatch = String(attrs || "").match(/href=(["'])(.*?)\1/i);
        const href = hrefMatch?.[2] || "";
        const safeHref = /^https?:\/\//i.test(href) ? ` href="${escapeHtml(href)}"` : "";
        return `<a${safeHref}>`;
      }

      return `<${normalizedTag}>`;
    });

  return safe.trim();
};

export const htmlToPlainText = (html = ""): string =>
  decodeHtmlEntities(
    sanitizeKnowledgeHtml(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h1|h2|h3|h4|li|blockquote)>/gi, "\n")
      .replace(/<li>/gi, "- ")
      .replace(/<\/?(strong|b|em|i|u|p|ul|ol|a|h1|h2|h3|h4|blockquote)>/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
  );

export const htmlToWhatsAppText = (html = ""): string =>
  decodeHtmlEntities(
    sanitizeKnowledgeHtml(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<(strong|b)>/gi, "*")
      .replace(/<\/(strong|b)>/gi, "*")
      .replace(/<(em|i)>/gi, "_")
      .replace(/<\/(em|i)>/gi, "_")
      .replace(/<u>/gi, "")
      .replace(/<\/u>/gi, "")
      .replace(/<h[1-4]>/gi, "*")
      .replace(/<\/h[1-4]>/gi, "*\n\n")
      .replace(/<blockquote>/gi, "> ")
      .replace(/<\/blockquote>/gi, "\n\n")
      .replace(/<li>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/(p|ul|ol)>/gi, "\n\n")
      .replace(/<p>/gi, "")
      .replace(/<a href="([^"]+)">([\s\S]*?)<\/a>/gi, "$2 ($1)")
      .replace(/<\/?(ul|ol|a)>/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
  );
