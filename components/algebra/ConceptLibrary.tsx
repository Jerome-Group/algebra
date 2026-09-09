import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Lesson } from "@/lib/algebra/engine";
import { Prose } from "./Math";
export function ConceptLibrary({
  lessons,
  subjects,
  id,
  subject,
  query,
  menu,
  expanded,
  open,
  setSubject,
  setQuery,
  setExpanded,
}: {
  lessons: Lesson[];
  subjects: string[];
  id: string;
  subject: string;
  query: string;
  menu: boolean;
  expanded: string | undefined;
  open: (id: string) => void;
  setSubject: (s: string) => void;
  setQuery: (s: string) => void;
  setExpanded: (s: string | undefined) => void;
}) {
  const filtered = lessons.filter((l) =>
    query
      ? `${l.title} ${l.intuition} ${l.family} ${l.subject}`
          .toLowerCase()
          .includes(query.toLowerCase())
      : l.subject === subject,
  );
  return (
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
                  lessons.filter((l) => l.subject === s).map((l) => l.family),
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
  );
}
