// Light formatting for module text: "# " and "## " headings, "- " or "* " lists, blank lines between paragraphs, and web links.
// Text only: nothing here produces HTML, so what a trainer types can never run as code.

export type TextPart = { kind: 'text'; value: string } | { kind: 'link'; href: string; value: string };
export type TextBlock =
  | { kind: 'heading'; level: 1 | 2; parts: TextPart[] }
  | { kind: 'list'; items: TextPart[][] }
  | { kind: 'paragraph'; lines: TextPart[][] };

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

export function parseInline(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    // A full stop or bracket closing the sentence is not part of the address.
    const href = match[0].replace(/[.,;:!?)\]]+$/, '');
    const start = match.index;
    if (start > cursor) parts.push({ kind: 'text', value: text.slice(cursor, start) });
    parts.push({ kind: 'link', href, value: href });
    cursor = start + href.length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', value: text.slice(cursor) });
  return parts;
}

export function parseRichText(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const last = blocks[blocks.length - 1];
    if (!trimmed) {
      blocks.push({ kind: 'paragraph', lines: [] });
      continue;
    }
    const heading = /^(#{1,2})\s+(.+)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2, parts: parseInline(heading[2]) });
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(trimmed);
    if (item) {
      if (last?.kind === 'list') last.items.push(parseInline(item[1]));
      else blocks.push({ kind: 'list', items: [parseInline(item[1])] });
      continue;
    }
    if (last?.kind === 'paragraph') last.lines.push(parseInline(trimmed));
    else blocks.push({ kind: 'paragraph', lines: [parseInline(trimmed)] });
  }
  return blocks.filter((block) => block.kind !== 'paragraph' || block.lines.length > 0);
}
