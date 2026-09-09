"use client";
import Image from "next/image";
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
          <Image
            unoptimized
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
        <main id="concept" className="concept-main">
          {view === "sources" ? (
            <SourceLibrary lessons={lessons} />
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
                  <LessonReader {...{ lesson, lessons, tab, setTab, open }} />
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
