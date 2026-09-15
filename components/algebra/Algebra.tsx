"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import data from "@/lib/algebra/lessons.json";
import { type Lesson } from "@/lib/algebra/engine";
import { Prose } from "./Math";
import Exploration from "./Exploration";
import { ConceptLibrary } from "./ConceptLibrary";
import { ConceptLink } from "./ConceptLink";
import { LearningRoutes } from "./LearningRoutes";
import type { ReadingView } from "@/lib/algebra/reading-views";
import { learningRoutes } from "@/lib/algebra/routes";
import { SourceLibrary } from "./Sources";
import { LessonReader } from "./LessonReader";
import { LaboratoryProvider } from "./LaboratoryControls";
import { useLearningTools } from "./WebMCP";
const lessons = data as Lesson[];
const subjects = [
  "Groups & symmetry",
  "Maps & quotients",
  "Rings & arithmetic",
  "Fields & polynomials",
  "Modules & representations",
];
export default function Algebra() {
  return (
    <LaboratoryProvider>
      <LearningExperience />
    </LaboratoryProvider>
  );
}
function LearningExperience() {
  const [id, setId] = useState("foundations-functions"),
    [subject, setSubject] = useState(subjects[0]),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState<ReadingView>("guided"),
    [route, setRoute] = useState("actions"),
    [menu, setMenu] = useState(false),
    [view, setView] = useState("lesson"),
    [expanded, setExpanded] = useState<string | undefined>(
      "Groups & generators",
    );
  const lesson = lessons.find((l) => l.id === id) || lessons[0];
  const current = useRef(lesson);
  useEffect(() => {
    current.current = lesson;
  }, [lesson]);
  const selectLesson = useCallback((target: string) => {
    const next = lessons.find(
      (l) => l.id === target || l.aliases?.includes(target),
    );
    if (!next) throw Error("Unknown concept");
    setId(next.id);
    setSubject(next.subject || subjects[0]);
    setExpanded(next.family);
    setTab("guided");
    setView("lesson");
    setMenu(false);
    setQuery("");

    requestAnimationFrame(() => {
      document.getElementById("lesson-heading")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    });
  }, []);
  const open = useCallback(
    (target: string) => {
      if (location.hash !== `#${target}`)
        history.pushState({}, "", `#${target}`);
      selectLesson(target);
    },
    [selectLesson],
  );
  useEffect(() => {
    const sync = () => {
      const target = location.hash.slice(1) || "foundations-functions";
      if (lessons.some((l) => l.id === target || l.aliases?.includes(target)))
        selectLesson(target);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [selectLesson]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        document.getElementById("library-toggle")?.focus();
      }
    };
    document
      .querySelector<HTMLInputElement>('[aria-label="Search concepts"]')
      ?.focus();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);
  useLearningTools({ lessons, current, open, setTab, setView, setQuery });
  const activeRoute = learningRoutes.find(
    (item) => item.id === route && item.lessons.includes(id),
  );
  const siblings = activeRoute
      ? activeRoute.lessons.map((target) =>
          lessons.find((item) => item.id === target)!,
        )
      : lessons.filter((l) => l.subject === lesson.subject),
    index = siblings.indexOf(lesson);
  return (
    <div className="algebra-app">
      <a className="skip-link" href="#concept">
        Skip to concept
      </a>
      <header className="algebra-header">
        <a
          className="wordmark"
          href="#foundations-functions"
          onClick={(event) => {
            if (
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              open("foundations-functions");
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Serve the generated mark without an image-transformation service. */}
          <img
            className="brand-logo"
            src="/logo.png"
            width={36}
            height={36}
            alt=""
          />
          <span>Abstract Algebra</span>
        </a>
        <div className="header-context">
          {lesson.subject}
          <span>/</span>
          {lesson.family}
        </div>
        <button
          id="library-toggle"
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
        <ConceptLibrary
          {...{
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
          }}
        />
        <main id="concept" className="concept-main" inert={menu || undefined}>
          {view === "sources" ? (
            <SourceLibrary lessons={lessons} />
          ) : (
            <>
              <LearningRoutes {...{ lessons, route, setRoute, open }} />
              {activeRoute && (
                <p className="route-progress">
                  {activeRoute.title} · Lesson {index + 1} of {siblings.length}
                </p>
              )}
              <div className="concept-heading">
                <div>
                  <p className="section-kicker">
                    {lesson.subject} <span>/ {lesson.family}</span>
                  </p>
                  <h1 id="lesson-heading" tabIndex={-1}>
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
                    aria-label={`Previous: ${siblings[index - 1]?.navTitle || "start of route"}`}
                    disabled={index <= 0}
                    onClick={() => open(siblings[index - 1].id)}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    aria-label={`Next: ${siblings[index + 1]?.navTitle || "end of route"}`}
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
                      <ConceptLink
                        id={l.id}
                        open={open}
                        key={l.id}
                        aria-current={l.id === id ? "page" : undefined}
                      >
                        <Prose>{l.navTitle || l.title}</Prose>
                      </ConceptLink>
                    ))}
                </div>
              </details>
              <div className="study-workspace">
                <div className="study-reading">
                  <LessonReader {...{ lesson, lessons, tab, setTab, open }} />
                </div>
                <aside className="right-lab">
                  <Exploration key={lesson.id} lesson={lesson} />
                </aside>
              </div>
              <footer className="concept-end">
                <span>Abstract Algebra</span>
                <button
                  disabled={index === siblings.length - 1}
                  onClick={() => open(siblings[index + 1].id)}
                >
                  {siblings[index + 1]
                    ? `Next: ${siblings[index + 1].navTitle}`
                    : "Route complete · revisit any concept"}{" "}
                  <ArrowRight size={16} />
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
