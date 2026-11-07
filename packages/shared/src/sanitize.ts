/**
 * Sanitize untrusted published HTML.
 * Used on write (Nest) and again before render (Next).
 *
 * Tradeoffs:
 * - Authors cannot use scripts, forms, iframes, or event-driven markup.
 * - Safe structural tags and internal .zz links are preserved.
 * - External / dangerous URLs are neutralized.
 * - Images cannot load remote resources (src stripped).
 */

export interface SanitizeResult {
  html: string;
  title: string;
  textContent: string;
}

const ALLOWED_TAGS = [
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "li",
  "main",
  "mark",
  "nav",
  "ol",
  "p",
  "pre",
  "q",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
];

const ALLOWED_ATTR = [
  "href",
  "title",
  "alt",
  "colspan",
  "rowspan",
  "scope",
  "class",
  "id",
  "data-sw-nav",
  "role",
  "aria-disabled",
];

function stripDangerousUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("blob:")
  ) {
    return null;
  }
  return trimmed;
}

function isInternalAddressHref(href: string): boolean {
  const lower = href.trim().toLowerCase();
  if (/^[a-z][a-z0-9+.-]*:/i.test(lower) || lower.startsWith("//")) {
    return false;
  }
  const bare = lower.split("#")[0].split("?")[0].replace(/\/+$/, "");
  return /^[a-z0-9][a-z0-9.-]*\.zz(?:\/[a-z0-9][a-z0-9-]*)?$/.test(bare);
}

export interface DomPurifyLike {
  sanitize: (
    dirty: string | Node,
    config?: Record<string, unknown>,
  ) => string;
}

export interface DocumentFactory {
  createHTMLDocument(title?: string): Document;
}

/**
 * @param dirty Raw author HTML
 * @param purify DOMPurify instance (isomorphic-dompurify or browser DOMPurify)
 * @param documentFactory Optional document factory (jsdom or browser document.implementation)
 */
export function sanitizePublishedHtml(
  dirty: string,
  purify: DomPurifyLike,
  options?: { titleHint?: string; documentFactory?: DocumentFactory },
): SanitizeResult {
  const cleaned = purify.sanitize(dirty ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "option",
      "link",
      "meta",
      "base",
      "svg",
      "math",
    ],
    FORBID_ATTR: [
      "style",
      "srcset",
      "src",
      "action",
      "formaction",
      "xlink:href",
    ],
    KEEP_CONTENT: true,
  });

  let title = options?.titleHint?.trim() || "";
  let textContent = "";
  let html = cleaned;

  const factory =
    options?.documentFactory ??
    (typeof globalThis !== "undefined" &&
    "document" in globalThis &&
    (globalThis as { document?: Document }).document?.implementation
      ? (globalThis as { document: Document }).document.implementation
      : undefined);

  if (factory) {
    const doc = factory.createHTMLDocument("site");
    doc.body.innerHTML = cleaned;

    if (!title) {
      const h1 = doc.body.querySelector("h1");
      title = h1?.textContent?.trim() || "Untitled site";
    }

    doc.body.querySelectorAll("a").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      const safe = stripDangerousUrl(href);
      anchor.removeAttribute("href");
      if (safe && isInternalAddressHref(safe)) {
        const bare = safe
          .split("#")[0]
          .split("?")[0]
          .replace(/\/+$/, "")
          .toLowerCase();
        anchor.setAttribute("data-sw-nav", bare);
        anchor.setAttribute("href", `#nav:${bare}`);
      } else {
        anchor.removeAttribute("data-sw-nav");
        anchor.setAttribute("role", "link");
        anchor.setAttribute("aria-disabled", "true");
      }
    });

    doc.body.querySelectorAll("img").forEach((img) => {
      img.removeAttribute("src");
      img.setAttribute("alt", img.getAttribute("alt") || "");
    });

    // Prefer spaced text from block-ish elements so search excerpts read cleanly.
    const blocks = Array.from(
      doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,pre"),
    )
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    textContent =
      blocks.length > 0
        ? blocks.join(" ")
        : (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    html = doc.body.innerHTML;
  } else {
    textContent = cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!title) {
      const match = cleaned.match(/<h1[^>]*>(.*?)<\/h1>/i);
      title = match
        ? match[1].replace(/<[^>]+>/g, "").trim() || "Untitled site"
        : "Untitled site";
    }
  }

  return { html, title, textContent };
}
