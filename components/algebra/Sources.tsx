import { ArrowUpRight } from "lucide-react";
import type { Lesson, Citation } from "@/lib/algebra/engine";
export function Reference({ source }: { source: Citation }) {
  return (
    <li>
      <a href={source.url} target="_blank" rel="noreferrer">
        <span>{source.role || "Primary source"}</span>
        <strong>{source.title}</strong>
        <small>
          {source.section}
          {source.pages ? ` · printed pp. ${source.pages}` : ""}
          {source.pdfPages ? ` · PDF pp. ${source.pdfPages}` : ""}
        </small>
        <ArrowUpRight size={16} />
      </a>
      {source.chapterUrl && (
        <a
          className="chapter-source"
          href={source.chapterUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open chapter extract <ArrowUpRight size={14} />
        </a>
      )}
    </li>
  );
}

export function SourceLibrary({ lessons }: { lessons: Lesson[] }) {
  return (
    <article className="source-catalog">
      <p className="section-kicker">REFERENCE LIBRARY</p>
      <h1>
        Follow the mathematics
        <br />
        to its source.
      </h1>
      <p>
        Official lecture notes set the definitions and hypotheses. Textbook
        readings add examples and geometric intuition. These links retain their
        existing access permissions.
      </p>
      <p>
        Printed pages refer to the book or notes; PDF pages count from the first
        page of the linked file. Original examples are identified separately
        from the results they illustrate.
      </p>
      <ul className="reference-list">
        {Array.from(
          new Map(
            lessons
              .flatMap((l) => [l.source, ...(l.references || [])])
              .map((s) => [s.url + s.section, s]),
          ).values(),
        ).map((s, i) => (
          <Reference key={i} source={s} />
        ))}
      </ul>
    </article>
  );
}
