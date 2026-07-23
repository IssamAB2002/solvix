// ─── MARKDOWN (LITE) ─────────────────────────────────────────────────────────
// Minimal renderer for project descriptions — only what's needed: # headings,
// [text](url) links and **bold**. Builds React elements directly (no
// dangerouslySetInnerHTML), so there's no HTML-injection surface even though
// this content is only ever admin-authored.

import { Fragment } from "react";
import C from "../styles/colors";

const SAFE_HREF = /^(https?:|mailto:|\/)/i;
const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/;

function parseInline(text, keyPrefix) {
  const nodes = [];
  let remaining = text;
  let key = 0;
  while (remaining) {
    const match = INLINE.exec(remaining);
    if (!match) {
      nodes.push(remaining);
      break;
    }
    if (match.index > 0) nodes.push(remaining.slice(0, match.index));
    if (match[1] !== undefined) {
      const href = SAFE_HREF.test(match[2]) ? match[2] : "#";
      nodes.push(
        <a key={`${keyPrefix}-${key++}`} href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "underline" }}>
          {match[1]}
        </a>
      );
    } else {
      nodes.push(<strong key={`${keyPrefix}-${key++}`}>{match[3]}</strong>);
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return nodes;
}

const HEADING_SIZE = { 1: 24, 2: 20, 3: 17 };

export default function MarkdownLite({ text }) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, i) => {
        const heading = /^(#{1,3})\s+(.*)$/.exec(block.trim());
        if (heading) {
          const level = heading[1].length;
          const Tag = `h${level + 2}`; // md h1-h3 → visual h3-h5, doesn't clash with page headings
          return (
            <Tag key={i} style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: HEADING_SIZE[level], color: "#fff", margin: "18px 0 10px" }}>
              {parseInline(heading[2], `h${i}`)}
            </Tag>
          );
        }
        return (
          <p key={i} style={{ margin: "0 0 14px", lineHeight: 1.9 }}>
            {block.split("\n").map((line, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {parseInline(line, `p${i}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
