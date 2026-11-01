import { parseRichText, type TextPart } from '@/lib/rich-text';

function Inline({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, index) => (part.kind === 'link'
        ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-blue-700 underline hover:text-blue-900">{part.value}</a>
        : <span key={index}>{part.value}</span>))}
    </>
  );
}

/** Module text with its headings, lists and clickable links. See lib/rich-text.ts for what a trainer can type. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 break-words text-sm leading-7 text-gray-700 ${className ?? ''}`}>
      {parseRichText(text).map((block, index) => {
        if (block.kind === 'heading') {
          return block.level === 1
            ? <h3 key={index} className="pt-2 text-lg font-bold text-gray-900"><Inline parts={block.parts} /></h3>
            : <h4 key={index} className="pt-1 text-base font-semibold text-gray-900"><Inline parts={block.parts} /></h4>;
        }
        if (block.kind === 'list') {
          return <ul key={index} className="list-disc space-y-1 pl-5">{block.items.map((item, i) => <li key={i}><Inline parts={item} /></li>)}</ul>;
        }
        return <p key={index}>{block.lines.map((line, i) => <span key={i} className="block"><Inline parts={line} /></span>)}</p>;
      })}
    </div>
  );
}
