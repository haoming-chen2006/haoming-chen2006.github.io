/**
 * Two small renderers for text that comes out of the Lua translation tables.
 *
 * Skill and card descriptions carry a fixed scrap of HTML — `<br />`, `<b>`,
 * `<font color='red'>` — and the mode description is Markdown with tables. Both
 * are engine data, not user input, but they are still parsed into elements
 * rather than injected as HTML: the day a player-supplied string reaches one of
 * these by accident should not be the day it becomes an XSS.
 */
import type { ReactNode } from 'react';

const TAG = /<(\/?)(br|b|i|u|font)([^>]*)>/gi;

/** The `<b>` / `<font color=…>` subset the i18n tables actually use. */
export function renderMarkup(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const stack: { tag: string; color?: string; children: ReactNode[] }[] = [
    { tag: 'root', children: out },
  ];
  let last = 0;
  let key = 0;
  const push = (node: ReactNode) => stack[stack.length - 1].children.push(node);

  for (const m of text.matchAll(TAG)) {
    if (m.index! > last) push(text.slice(last, m.index));
    last = m.index! + m[0].length;
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (tag === 'br') { push(<br key={key++} />); continue; }
    if (closing) {
      const frame = stack.pop();
      if (!frame || stack.length === 0) { stack.push(frame ?? { tag, children: [] }); continue; }
      const style = frame.color ? { color: frame.color } : undefined;
      const El = frame.tag === 'b' ? 'b' : frame.tag === 'i' ? 'i' : frame.tag === 'u' ? 'u' : 'span';
      push(<El key={key++} style={style}>{frame.children}</El>);
    } else {
      const color = /color\s*=\s*['"]?([#\w]+)/i.exec(attrs ?? '')?.[1];
      stack.push({ tag, color, children: [] });
    }
  }
  if (last < text.length) push(text.slice(last));
  // Unbalanced tags in the source must not swallow the text after them.
  while (stack.length > 1) {
    const frame = stack.pop()!;
    stack[stack.length - 1].children.push(...frame.children);
  }
  return out;
}

/** Enough Markdown for the mode rules: headings, rules, tables, lists, bold. */
export function renderMarkdown(src: string): ReactNode {
  const lines = src.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;

  const inline = (s: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let i = 0;
    for (const m of s.matchAll(/\*\*(.+?)\*\*/g)) {
      if (m.index! > i) parts.push(s.slice(i, m.index));
      parts.push(<b key={key++}>{m[1]}</b>);
      i = m.index! + m[0].length;
    }
    if (i < s.length) parts.push(s.slice(i));
    return parts;
  };

  const flushPara = () => {
    if (para.length) { blocks.push(<p key={key++}>{inline(para.join(' '))}</p>); para = []; }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={key++}>{list.map((li, n) => <li key={n}>{inline(li)}</li>)}</ul>);
      list = [];
    }
  };
  const flush = () => { flushPara(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flush(); continue; }
    if (/^(___+|---+|\*\*\*+)$/.test(line)) { flush(); blocks.push(<hr key={key++} />); continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const H = (['h1', 'h2', 'h3', 'h4'] as const)[h[1].length - 1];
      blocks.push(<H key={key++}>{h[2]}</H>);
      continue;
    }
    if (line.startsWith('|')) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().slice(1, -1).split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      const [head, ...body] = rows;
      blocks.push(
        <table key={key++}>
          <thead><tr>{head.map((c, n) => <th key={n}>{c}</th>)}</tr></thead>
          <tbody>{body.map((r, n) => <tr key={n}>{r.map((c, m) => <td key={m}>{c}</td>)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(line) ?? /^\d+[.、]\s+(.*)$/.exec(line);
    if (li) { flushPara(); list.push(li[1]); continue; }
    flushList();
    para.push(line);
  }
  flush();
  return <div className="markdown">{blocks}</div>;
}
