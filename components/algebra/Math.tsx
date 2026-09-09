import katex from "katex";
export function Math({
  children,
  block = false,
}: {
  children: string;
  block?: boolean;
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
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
export function Prose({ children }: { children: string }) {
  const parts = children.split(
    /(\$\$[\s\S]*?\$\$|\$[^$]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g,
  );
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("$$") ? (
          <Math key={i} block>
            {p.slice(2, -2)}
          </Math>
        ) : p.startsWith("$") ? (
          <Math key={i}>{p.slice(1, -1)}</Math>
        ) : p.startsWith("\\(") ? (
          <Math key={i}>{p.slice(2, -2)}</Math>
        ) : p.startsWith("\\[") ? (
          <Math key={i} block>
            {p.slice(2, -2)}
          </Math>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
