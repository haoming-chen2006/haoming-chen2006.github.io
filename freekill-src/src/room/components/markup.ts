/**
 * The game log arrives as HTML-ish markup the engine has already rendered —
 * `<font color="#0598BC"><b>身份模式</b></font>` and so on. See the same
 * conversion on the test side in `test/lua/lib/ui.lua`.
 *
 * It is engine output, but player screen names flow through it, so it is passed
 * through a tag allowlist before it reaches `dangerouslySetInnerHTML`. Anything
 * outside the allowlist becomes text.
 */
const ALLOWED = new Set(['b', 'i', 'u', 's', 'br', 'font', 'span', 'em', 'strong']);
const COLOR = /^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]{3,20}$/;

export function sanitizeMarkup(html: string): string {
  if (typeof document === 'undefined') return stripTags(html);
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  scrub(tpl.content);
  return tpl.innerHTML;
}

function scrub(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* text */) continue;
    if (child.nodeType !== 1 /* element */) { child.remove(); continue; }
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED.has(tag)) {
      // Keep the words, drop the element.
      const text = document.createTextNode(el.textContent ?? '');
      el.replaceWith(text);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const ok =
        (tag === 'font' && attr.name === 'color' && COLOR.test(attr.value)) ||
        (tag === 'span' && attr.name === 'style' && /^color:\s*[#\w()., ]+;?$/.test(attr.value));
      if (!ok) el.removeAttribute(attr.name);
    }
    scrub(el);
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
