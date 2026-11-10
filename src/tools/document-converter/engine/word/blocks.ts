export type Align = 'left' | 'center' | 'right' | 'justify';

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; runs: Run[]; align?: Align }
  | { kind: 'paragraph'; runs: Run[]; align?: Align }
  | { kind: 'list'; ordered: boolean; items: Run[][] }
  | { kind: 'table'; rows: Run[][][] };

const BLOCKED = 'script|style|iframe|object|embed|link|meta|noscript|svg|math|form|textarea|applet|base|frame|frameset|input|button|img|video|audio|source|canvas|object';

/** Buang elemen berbahaya beserta isinya. Tidak mengeksekusi HTML. */
export function sanitizeHtml(input: string): string {
  let s = input.replace(/<!--[\s\S]*?-->/g, '');
  const paired = new RegExp(`<\\s*(${BLOCKED})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, 'gi');
  const single = new RegExp(`<\\s*(${BLOCKED})\\b[^>]*\\/?>`, 'gi');
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(paired, '');
    s = s.replace(single, '');
  }
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s(?:href|src|xlink:href)\s*=\s*("\s*(?:javascript|data):[^"]*"|'\s*(?:javascript|data):[^']*'|(?:javascript|data):[^\s>]+)/gi, '');
  return s;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g, (all, ent: string) => {
    try {
      if (ent === 'amp') return '&';
      if (ent === 'lt') return '<';
      if (ent === 'gt') return '>';
      if (ent === 'quot') return '"';
      if (ent === 'apos') return "'";
      if (ent === 'nbsp') return ' ';
      const cp = ent.startsWith('#x') ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return all;
      return String.fromCodePoint(cp);
    } catch {
      return all;
    }
  });
}

interface Token {
  type: 'text' | 'open' | 'close';
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1].toLowerCase();
    if (key.startsWith('on') || key === 'srcdoc') continue;
    const val = m[3] ?? m[4] ?? m[5] ?? '';
    if (/^\s*javascript:/i.test(val) || /^\s*data:/i.test(val)) continue;
    attrs[key] = val;
  }
  return attrs;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1]) tokens.push({ type: 'close', tag: m[1].toLowerCase() });
    else if (m[2]) {
      const tag = m[2].toLowerCase();
      const raw = m[3] || '';
      tokens.push({ type: 'open', tag, attrs: parseAttrs(raw) });
      if (/^(br|hr|wbr)$/.test(tag) || /\/\s*$/.test(raw)) tokens.push({ type: 'close', tag });
    } else if (m[4]) tokens.push({ type: 'text', text: decodeEntities(m[4]) });
  }
  return tokens;
}

function alignOf(attrs: Record<string, string> | undefined): Align | undefined {
  if (!attrs) return undefined;
  const style = attrs.style || '';
  const m = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
  if (m) return m[1].toLowerCase() as Align;
  const al = (attrs.align || '').toLowerCase();
  if (al === 'left' || al === 'center' || al === 'right' || al === 'justify') return al;
  return undefined;
}

function pushRun(dest: Run[], text: string, bold: number, italic: number) {
  if (!text) return;
  dest.push({ text, bold: bold > 0 || undefined, italic: italic > 0 || undefined });
}

export function htmlToBlocks(html: string): Block[] {
  const tokens = tokenize(sanitizeHtml(html));
  const blocks: Block[] = [];
  let bold = 0;
  let italic = 0;
  let dest: Run[] = [];
  let mode: 'none' | 'p' | 'h' | 'li' | 'cell' = 'none';
  let headingLevel: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  let align: Align | undefined;
  const listStack: { ordered: boolean; items: Run[][] }[] = [];
  let tableRows: Run[][][] | null = null;
  let currentRow: Run[][] | null = null;
  let cellRuns: Run[] | null = null;

  const activeDest = () => (mode === 'cell' && cellRuns ? cellRuns : dest);

  function flushInlineBlock() {
    if (mode === 'p' && dest.some((r) => r.text.trim() || r.text === '\n')) {
      blocks.push({ kind: 'paragraph', runs: dest, align });
    } else if (mode === 'h' && dest.some((r) => r.text.trim())) {
      blocks.push({ kind: 'heading', level: headingLevel, runs: dest, align });
    } else if (mode === 'li') {
      const list = listStack[listStack.length - 1];
      if (list) list.items.push(dest.length ? dest : [{ text: '' }]);
    }
    dest = [];
    if (mode !== 'cell') mode = 'none';
  }

  for (const tok of tokens) {
    if (tok.type === 'text') {
      const text = tok.text ?? '';
      if (mode === 'none' && tableRows === null && !text.trim()) continue;
      if (mode === 'none' && tableRows === null) {
        mode = 'p';
      }
      pushRun(activeDest(), text, bold, italic);
      continue;
    }
    const tag = tok.tag || '';
    if (tok.type === 'open') {
      if (tag === 'strong' || tag === 'b') bold++;
      else if (tag === 'em' || tag === 'i') italic++;
      else if (tag === 'br') pushRun(activeDest(), '\n', bold, italic);
      else if (/^h[1-6]$/.test(tag) && tableRows === null && !listStack.length) {
        flushInlineBlock();
        mode = 'h';
        headingLevel = Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6;
        align = alignOf(tok.attrs);
        dest = [];
      } else if ((tag === 'p' || tag === 'div' || tag === 'blockquote') && mode !== 'cell' && !listStack.length && tableRows === null) {
        flushInlineBlock();
        mode = 'p';
        align = alignOf(tok.attrs);
        dest = [];
      } else if (tag === 'ul' || tag === 'ol') {
        if (mode !== 'cell') flushInlineBlock();
        listStack.push({ ordered: tag === 'ol', items: [] });
      } else if (tag === 'li' && listStack.length && mode !== 'cell') {
        mode = 'li';
        dest = [];
        align = alignOf(tok.attrs);
      } else if (tag === 'table' && tableRows === null) {
        flushInlineBlock();
        tableRows = [];
      } else if (tag === 'tr' && tableRows) {
        currentRow = [];
      } else if ((tag === 'td' || tag === 'th') && currentRow) {
        cellRuns = [];
        mode = 'cell';
      }
      continue;
    }
    if (tag === 'strong' || tag === 'b') bold = Math.max(0, bold - 1);
    else if (tag === 'em' || tag === 'i') italic = Math.max(0, italic - 1);
    else if (tag === 'li' && mode === 'li') flushInlineBlock();
    else if ((tag === 'ul' || tag === 'ol') && listStack.length) {
      if (mode === 'li') flushInlineBlock();
      const list = listStack.pop();
      if (list && list.items.length && tableRows === null) {
        blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
      }
    } else if ((tag === 'td' || tag === 'th') && currentRow && cellRuns) {
      currentRow.push(cellRuns.length ? cellRuns : [{ text: '' }]);
      cellRuns = null;
      mode = 'none';
    } else if (tag === 'tr' && tableRows && currentRow) {
      tableRows.push(currentRow);
      currentRow = null;
    } else if (tag === 'table' && tableRows) {
      if (tableRows.length) blocks.push({ kind: 'table', rows: tableRows });
      tableRows = null;
      mode = 'none';
    } else if ((tag === 'p' || tag === 'div' || tag === 'blockquote' || /^h[1-6]$/.test(tag)) && mode !== 'cell') {
      flushInlineBlock();
    }
  }
  flushInlineBlock();
  return blocks.filter((b) => {
    if (b.kind === 'table') return b.rows.length > 0;
    if (b.kind === 'list') return b.items.length > 0;
    return b.runs.some((r) => r.text.trim().length > 0 || r.text === '\n');
  });
}

export function runsToText(runs: Run[]): string {
  return runs.map((r) => r.text).join('').replace(/\u00a0/g, ' ');
}

export function blocksToPlainText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'heading' || b.kind === 'paragraph') {
      lines.push(runsToText(b.runs).replace(/\n/g, '\n'));
      lines.push('');
    } else if (b.kind === 'list') {
      b.items.forEach((item, i) => {
        const prefix = b.ordered ? `${i + 1}. ` : '- ';
        lines.push(prefix + runsToText(item).replace(/\s+/g, ' ').trim());
      });
      lines.push('');
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        lines.push(row.map((cell) => runsToText(cell).replace(/[\t\n]+/g, ' ').trim()).join('\t'));
      }
      lines.push('');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function runsHtml(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.text === '\n') return '<br>';
      let t = escapeHtml(r.text).replace(/\n/g, '<br>');
      if (r.italic) t = `<em>${t}</em>`;
      if (r.bold) t = `<strong>${t}</strong>`;
      return t;
    })
    .join('');
}

function alignAttr(align?: Align): string {
  return align && align !== 'left' ? ` style="text-align:${align}"` : '';
}

export function blocksToBodyHtml(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'heading') parts.push(`<h${b.level}${alignAttr(b.align)}>${runsHtml(b.runs)}</h${b.level}>`);
    else if (b.kind === 'paragraph') parts.push(`<p${alignAttr(b.align)}>${runsHtml(b.runs)}</p>`);
    else if (b.kind === 'list') {
      const tag = b.ordered ? 'ol' : 'ul';
      parts.push(`<${tag}>${b.items.map((item) => `<li>${runsHtml(item)}</li>`).join('')}</${tag}>`);
    } else if (b.kind === 'table') {
      const rows = b.rows
        .map((row, ri) => {
          const cell = ri === 0 ? 'th' : 'td';
          return `<tr>${row.map((c) => `<${cell}>${runsHtml(c)}</${cell}>`).join('')}</tr>`;
        })
        .join('');
      parts.push(`<table><tbody>${rows}</tbody></table>`);
    }
  }
  return parts.join('\n');
}

export function blocksToDocumentHtml(blocks: Block[], title: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  body{font-family:Georgia,serif;line-height:1.45;margin:1.25rem;color:#17191e;background:#fff}
  table{border-collapse:collapse;width:100%}
  td,th{border:1px solid #ccc;padding:.35rem .5rem;vertical-align:top}
  th{background:#f3f4f6}
</style>
</head>
<body>
${blocksToBodyHtml(blocks)}
</body>
</html>
`;
}

export function textToBlocks(text: string): Block[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.trim()) return [];
  return normalized.split(/\n{2,}/).map((para) => {
    const lines = para.split('\n');
    const runs: Run[] = [];
    lines.forEach((line, i) => {
      runs.push({ text: line });
      if (i < lines.length - 1) runs.push({ text: '\n' });
    });
    return { kind: 'paragraph' as const, runs };
  });
}
