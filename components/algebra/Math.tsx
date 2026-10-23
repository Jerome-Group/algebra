import katex from "katex";
import { presentCatalogueText } from "@/lib/algebra/math-presentation.generated";
export function Math({
  children,
  block = false,
  focusable = true,
}: {
  children: string;
  block?: boolean;
  focusable?: boolean;
}) {
  let html;
  try {
    html = katex.renderToString(children, {
      displayMode: block,
      throwOnError: true,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch {
    html = katex.renderToString(children, {
      displayMode: block,
      throwOnError: false,
      trust: false,
    });
  }
  return (
    <span
      className={block ? "math-display" : "math-inline"}
      tabIndex={focusable ? 0 : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
type ProseProps = { children: string; focusable?: boolean };

export function Prose({ children, focusable }: ProseProps) {
  return (
    <WrittenProse focusable={focusable}>
      {presentCatalogueText(children)}
    </WrittenProse>
  );
}

export function WrittenProse({ children, focusable }: ProseProps) {
  const parts = children.split(
    /(\$\$[\s\S]*?\$\$|\$[^$]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g,
  );
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("$$") ? (
          <Math key={i} block focusable={focusable}>
            {p.slice(2, -2)}
          </Math>
        ) : p.startsWith("$") ? (
          <Math key={i} focusable={focusable}>
            {p.slice(1, -1)}
          </Math>
        ) : p.startsWith("\\(") ? (
          <Math key={i} focusable={focusable}>
            {p.slice(2, -2)}
          </Math>
        ) : p.startsWith("\\[") ? (
          <Math key={i} block focusable={focusable}>
            {p.slice(2, -2)}
          </Math>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
