import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import { Reference } from "./Sources";
export function LessonReader({
  lesson,
  lessons,
  tab,
  setTab,
  open,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  tab: string;
  setTab: (s: string) => void;
  open: (id: string) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line" className="reading-tabs">
        <TabsTrigger value="understand">Understand</TabsTrigger>
        <TabsTrigger value="example">Worked example</TabsTrigger>
        <TabsTrigger value="theorem">Theorem</TabsTrigger>
        <TabsTrigger value="proof">Proof</TabsTrigger>
      </TabsList>
      <div className="reading-prelude">
        <div>
          <p className="concept-intro">
            <Prose>{lesson.intuition}</Prose>
          </p>
          <div className="definition-strip">
            <M block>{lesson.definition}</M>
          </div>
        </div>
        <aside className="margin-note">
          <span className="section-kicker">KEEP IN MIND</span>
          <p>
            <Prose>{lesson.pitfall}</Prose>
          </p>
        </aside>
      </div>
      <div className="reading-layout">
        <article className="concept-notes">
          <div className="reading-content">
            <TabsContent value="understand">
              <h2>
                <Prose>{lesson.title}</Prose>
              </h2>
              <p>
                <Prose>{lesson.explanation}</Prose>
              </p>
              <div className="study-prompt">
                <h3>Try the idea</h3>
                <p>
                  <Prose>{lesson.prompt}</Prose>
                </p>
              </div>
            </TabsContent>
            <TabsContent value="example">
              <h2>{lesson.worked?.title || "Reason through the example"}</h2>
              {lesson.worked ? (
                <ol className="worked-steps">
                  {lesson.worked.steps.map((step, i) => (
                    <li key={i}>
                      <Prose>{step}</Prose>
                    </li>
                  ))}
                </ol>
              ) : (
                <>
                  <p>
                    <Prose>{lesson.explanation}</Prose>
                  </p>
                  <p>
                    <Prose>{lesson.proof}</Prose>
                  </p>
                </>
              )}
              <p className="reading-caption">
                Original illustration; source results linked below.
              </p>
            </TabsContent>
            <TabsContent value="theorem">
              <h2>Statement and hypotheses</h2>
              <p>
                <Prose>{lesson.explanation}</Prose>
              </p>
              <M block>{lesson.theorem}</M>
              <p>
                <Prose>{lesson.pitfall}</Prose>
              </p>
            </TabsContent>
            <TabsContent value="proof">
              <h2>Why it holds</h2>
              <p>
                <Prose>{lesson.proof}</Prose>
              </p>
              <M block>{lesson.theorem}</M>
              <p className="reading-caption">
                The visual model illustrates the argument; the linked source
                gives the full treatment.
              </p>
            </TabsContent>
          </div>
          {lesson.reading?.length ? (
            <section className="further-reading" aria-label="Deeper notes">
              <h2>Go deeper</h2>
              {lesson.reading.map((note) => (
                <details key={note.title}>
                  <summary>
                    <Prose>{note.title}</Prose>
                    <ChevronDown size={16} />
                  </summary>
                  <div>
                    {note.paragraphs.map((paragraph, i) => (
                      <p key={i}>
                        <Prose>{paragraph}</Prose>
                      </p>
                    ))}
                    <ul className="reference-list">
                      <Reference source={note.source} />
                    </ul>
                  </div>
                </details>
              ))}
            </section>
          ) : null}
          <section className="lesson-references">
            <h2>Read the source</h2>
            <ul className="reference-list">
              <Reference source={lesson.source} />
              {lesson.references?.map((s, i) => (
                <Reference key={i} source={s} />
              ))}
            </ul>
          </section>
        </article>
        <aside className="connections">
          <span className="section-kicker">CONNECTED IDEAS</span>
          {lesson.connections?.map((target) => {
            const next = lessons.find(
              (l) => l.id === target || l.aliases?.includes(target),
            );
            return next ? (
              <button key={target} onClick={() => open(target)}>
                <small>{next.subject}</small>
                <span>
                  <Prose>{next.navTitle || next.title}</Prose>
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ) : null;
          })}
          <div className="convention-note">
            <h3>Conventions</h3>
            <p>
              <Prose>
                {
                  "$D_n$ has $2n$ elements. Matrices act on column vectors; $AB$ applies $B$ first. Ring hypotheses are stated when needed."
                }
              </Prose>
            </p>
          </div>
        </aside>
      </div>
    </Tabs>
  );
}
