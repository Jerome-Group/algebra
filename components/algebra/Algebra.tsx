"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import data from "@/lib/algebra/lessons.json";
import { type Lesson, type Citation } from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import Exploration from "./Exploration";
import { useLearningTools } from "./WebMCP";
const lessons = data as Lesson[];
const subjects = [
  "Groups & symmetry",
  "Maps & quotients",
  "Rings & arithmetic",
  "Fields & polynomials",
  "Modules & representations",
];
function Reference({ source }: { source: Citation }) {
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
export default function Algebra() {
  const [id, setId] = useState("cube-four-actions"),
    [subject, setSubject] = useState(subjects[0]),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("understand"),
    [menu, setMenu] = useState(false),
    [view, setView] = useState("lesson"),
    [expanded, setExpanded] = useState<string | undefined>(
      "Actions & counting",
    );
  const lesson = lessons.find((l) => l.id === id) || lessons[0];
  const current = useRef(lesson);
  useEffect(() => {
    current.current = lesson;
  }, [lesson]);
  const open = useCallback((target: string) => {
    const next = lessons.find(
      (l) => l.id === target || l.aliases?.includes(target),
    );
    if (!next) throw Error("Unknown concept");
    setId(next.id);
    setSubject(next.subject || subjects[0]);
    setExpanded(next.family);
    setTab("understand");
    setView("lesson");
    setMenu(false);
    setQuery("");
    history.replaceState({}, "", `#${next.id}`);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const sync = () => {
      const target = location.hash.slice(1);
      if (lessons.some((l) => l.id === target || l.aliases?.includes(target)))
        open(target);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [open]);
  useLearningTools({ lessons, current, open, setTab, setView, setQuery });
  const filtered = lessons.filter((l) =>
    query
      ? `${l.title} ${l.intuition} ${l.family} ${l.subject}`
          .toLowerCase()
          .includes(query.toLowerCase())
      : l.subject === subject,
  );
  const siblings = lessons.filter((l) => l.subject === lesson.subject),
    index = siblings.indexOf(lesson);
  return (
    <div className="algebra-app">
      <a className="skip-link" href="#concept">
        Skip to concept
      </a>
      <header className="algebra-header">
        <a
          className="wordmark"
          href="#cube-four-actions"
          onClick={() => open("cube-four-actions")}
        >
          Abstract Algebra
        </a>
        <div className="header-context">
          {lesson.subject}
          <span>/</span>
          {lesson.family}
        </div>
        <button
          className="library-toggle"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={18} /> : <Search size={18} />} Concepts
        </button>
        <button
          className="header-sources"
          onClick={() => setView(view === "sources" ? "lesson" : "sources")}
        >
          <BookOpen size={17} /> Sources
        </button>
      </header>
      <div className="algebra-layout">
        <nav
          className={`concept-library ${menu ? "is-open" : ""}`}
          aria-label="Concept library"
        >
          <div className="library-search">
            <Search size={17} />
            <Input
              aria-label="Search concepts"
              placeholder="Find an idea…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="subject-navigation">
            {subjects.map((s, i) => (
              <details key={s} open={s === subject && !query}>
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    setSubject(s === subject ? "" : s);
                    setQuery("");
                  }}
                >
                  <span className="subject-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="library-results">
                  {[
                    ...new Set(
                      lessons
                        .filter((l) => l.subject === s)
                        .map((l) => l.family),
                    ),
                  ].map((f) => (
                    <details key={f} open={expanded === f}>
                      <summary
                        onClick={(e) => {
                          e.preventDefault();
                          setExpanded(expanded === f ? undefined : f);
                        }}
                      >
                        <span>{f}</span>
                        <ChevronDown size={13} />
                      </summary>
                      <div className="chapter-concepts">
                        {lessons
                          .filter((l) => l.subject === s && l.family === f)
                          .map((l) => (
                            <button
                              key={l.id}
                              aria-current={l.id === id ? "page" : undefined}
                              onClick={() => open(l.id)}
                            >
                              <Prose>{l.navTitle || l.title}</Prose>
                            </button>
                          ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {query && (
            <div className="library-results search-results" aria-live="polite">
              <p className="library-count">{filtered.length} matches</p>
              <div className="chapter-concepts">
                {filtered.map((l) => (
                  <button key={l.id} onClick={() => open(l.id)}>
                    <Prose>{l.navTitle || l.title}</Prose>
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="library-footer">
            One subject. Connected chapters.
            <br />
            Explore. Conjecture. Prove.
          </p>
        </nav>
        <main id="concept" className="concept-main">
          {view === "sources" ? (
            <article className="source-catalog">
              <p className="section-kicker">REFERENCE LIBRARY</p>
              <h1>
                Follow the mathematics
                <br />
                to its source.
              </h1>
              <p>
                Official lecture notes set the definitions and hypotheses.
                Textbook readings add examples and geometric intuition. These
                links retain their existing access permissions.
              </p>
              <p>
                Printed pages refer to the book or notes; PDF pages count from
                the first page of the linked file. Original examples are
                identified separately from the results they illustrate.
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
          ) : (
            <>
              <div className="concept-heading">
                <div>
                  <p className="section-kicker">
                    {lesson.subject} <span>/ {lesson.family}</span>
                  </p>
                  <h1>
                    <span className="chapter-number">
                      {String(
                        subjects.indexOf(lesson.subject || "") + 1,
                      ).padStart(2, "0")}
                    </span>
                    <Prose>{lesson.navTitle || lesson.title}</Prose>
                  </h1>
                </div>
                <div className="concept-paging">
                  <button
                    aria-label="Previous concept"
                    disabled={index <= 0}
                    onClick={() => open(siblings[index - 1].id)}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    aria-label="Next concept"
                    disabled={index === siblings.length - 1}
                    onClick={() => open(siblings[index + 1].id)}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
              <details className="chapter-switcher">
                <summary>
                  In this chapter ·{" "}
                  <Prose>{lesson.navTitle || lesson.title}</Prose>
                  <ChevronDown size={14} />
                </summary>
                <div>
                  {lessons
                    .filter((l) => l.family === lesson.family)
                    .map((l) => (
                      <button
                        key={l.id}
                        aria-current={l.id === id ? "page" : undefined}
                        onClick={() => open(l.id)}
                      >
                        <Prose>{l.navTitle || l.title}</Prose>
                      </button>
                    ))}
                </div>
              </details>
              <div className="study-workspace">
                <div className="study-reading">
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
                            <h2>
                              {lesson.worked?.title ||
                                "Reason through the example"}
                            </h2>
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
                              Original illustration; source results linked
                              below.
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
                              The visual model illustrates the argument; the
                              linked source gives the full treatment.
                            </p>
                          </TabsContent>
                        </div>
                        {lesson.reading?.length ? (
                          <section
                            className="further-reading"
                            aria-label="Deeper notes"
                          >
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
                            (l) =>
                              l.id === target || l.aliases?.includes(target),
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
                </div>
                <aside className="right-lab">
                  <Exploration lesson={lesson} />
                </aside>
              </div>
              <footer className="concept-end">
                <span>Abstract Algebra</span>
                <button
                  disabled={index === siblings.length - 1}
                  onClick={() => open(siblings[index + 1].id)}
                >
                  Continue to the next idea <ArrowRight size={16} />
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
