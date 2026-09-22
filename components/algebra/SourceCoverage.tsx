import type { Lesson } from "@/lib/algebra/engine";
import { learningMetadata, teachingStatuses } from "@/lib/algebra/learning";
import gaps from "@/lib/algebra/source-gaps.json";
import { ConceptLink } from "./ConceptLink";
import { SourceLibrary } from "./Sources";

export function SourceCoverage({
  lessons,
  open,
}: {
  lessons: Lesson[];
  open: (id: string) => void;
}) {
  return (
    <section className="source-coverage">
      <p className="section-kicker">SOURCE COVERAGE</p>
      <h1 id="mode-heading" tabIndex={-1}>
        What is taught—and how deeply?
      </h1>
      <p>
        A mapped source is not a fully taught course. Statuses describe the
        material available here; source links retain their access permissions.
      </p>
      {["MH2220", "MH3220", "Odyssey Y1", "URECA Y2"].map((collection) => {
        const mapped = lessons.filter((lesson) =>
          learningMetadata(lesson).sourceCollections.includes(collection),
        );
        const missing = gaps.filter(
          (gap) =>
            gap.collection === collection &&
            !lessons.some((lesson) => lesson.id === gap.id),
        );
        return (
          <section className="source-collection" key={collection}>
            <h2>{collection}</h2>
            <p>
              {mapped.length} mapped concepts · {missing.length} identified
              topic gaps
            </p>
            {teachingStatuses.map((status) => {
              const entries = mapped.filter(
                (lesson) => learningMetadata(lesson).teachingStatus === status,
              );
              return (
                <details key={status}>
                  <summary>
                    {status.replaceAll("-", " ")} · {entries.length}
                  </summary>
                  <ul>
                    {entries.map((lesson) => (
                      <li key={lesson.id}>
                        <ConceptLink id={lesson.id} open={open}>
                          {lesson.navTitle || lesson.title}
                        </ConceptLink>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
            {missing.length > 0 && (
              <div className="missing-topics">
                <h3>Missing</h3>
                <ul>
                  {missing.map((gap) => (
                    <li key={gap.id}>{gap.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
      <p>
        <a href="#learn">Follow the integrated URECA representation route →</a>{" "}
        The 18 September direct-product teaching is reconstructed from meeting
        annotations; its{" "}
        <a href="https://github.com/Jerome-Group/algebra/blob/main/docs/audit-2026-09-22/URECA_PROVENANCE.md">
          source status
        </a>{" "}
        is explicit.
      </p>
      <details className="source-links">
        <summary>Open the complete citation library</summary>
        <SourceLibrary lessons={lessons} />
      </details>
    </section>
  );
}
