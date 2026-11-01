import { describe, expect, it } from 'vitest';
import { parseInline, parseRichText } from './rich-text';

describe('parseInline', () => {
  it('finds links and leaves closing punctuation out', () => {
    expect(parseInline('See https://a.org/x. Then stop')).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'link', href: 'https://a.org/x', value: 'https://a.org/x' },
      { kind: 'text', value: '. Then stop' },
    ]);
  });
  it('never makes a link of anything but a web address', () => {
    expect(parseInline('javascript:alert(1)')).toEqual([{ kind: 'text', value: 'javascript:alert(1)' }]);
  });
});

describe('parseRichText', () => {
  it('reads headings, lists and paragraphs', () => {
    const blocks = parseRichText('# Title\n\nFirst line\nSecond line\n\n- one\n- two\n\n## Next');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'list', 'heading']);
    expect(blocks[1].kind === 'paragraph' && blocks[1].lines).toHaveLength(2);
    expect(blocks[2].kind === 'list' && blocks[2].items).toHaveLength(2);
  });
  it('keeps old plain text as paragraphs', () => {
    expect(parseRichText('One.\n\nTwo.').map((b) => b.kind)).toEqual(['paragraph', 'paragraph']);
  });
  it('reads a sources block with links', () => {
    const [, sources] = parseRichText('Body\n\nSources:\nUNEP: https://u.org/a.pdf');
    expect(sources.kind === 'paragraph' && sources.lines[1].some((p) => p.kind === 'link')).toBe(true);
  });
  it('handles empty text', () => {
    expect(parseRichText('')).toEqual([]);
  });
});
