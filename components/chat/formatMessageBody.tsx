import { Fragment, type ReactNode } from "react";

// Lightweight, dependency-free chat text formatter - the AI assistant and
// agents send plain-text bodies that sometimes include **bold** emphasis and
// raw URLs (order confirmation links, payment retry links), both of which
// previously rendered as literal asterisks / unclickable text. Deliberately
// not a full markdown renderer (no lists/headings/code blocks) - chat
// messages are short and this covers what the backend actually sends.
const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

function linkify(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Trim trailing punctuation a sentence might have glued to the URL.
      const trimMatch = part.match(/^(.*?)([.,!?;:]*)$/);
      const [, url, trailing] = trimMatch ?? [null, part, ""];
      return (
        <Fragment key={`${keyPrefix}-l${i}`}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-1 underline-offset-2 hover:opacity-80"
          >
            {url}
          </a>
          {trailing}
        </Fragment>
      );
    }
    return <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>;
  });
}

function boldify(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(BOLD_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-b${i}`} className="font-bold">
        {part}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-p${i}`}>{linkify(part, `${keyPrefix}-${i}`)}</Fragment>
    ),
  );
}

/** Renders a chat message body with **bold** and auto-linked URLs, one line
 * (React node array) per newline-separated segment of the original text. */
export function formatMessageBody(body: string): ReactNode {
  const lines = body.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {boldify(line, `l${i}`)}
    </Fragment>
  ));
}
