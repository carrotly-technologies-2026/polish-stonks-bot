import ReactMarkdown from 'react-markdown';

/** Safe markdown: raw HTML is dropped, links open as normal external links. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-report">
      <ReactMarkdown
        skipHtml
        components={{ a: ({ href, children: c }) => <a href={href} rel="noopener noreferrer">{c}</a> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
