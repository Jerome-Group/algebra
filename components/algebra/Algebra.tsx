"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Search, X } from "lucide-react";
import data from "@/lib/algebra/lessons.json";
import { type Lesson } from "@/lib/algebra/engine";
import { Prose } from "./Math";
import Exploration from "./Exploration";
import { ConceptLibrary } from "./ConceptLibrary";
import { ConceptLink } from "./ConceptLink";
import { LearningRoutes } from "./LearningRoutes";
import type { ReadingView } from "@/lib/algebra/reading-views";
import { learningRoutes } from "@/lib/algebra/routes";
import { SourceCoverage } from "./SourceCoverage";
import { LearningHome } from "./LearningHome";
import { ReferenceAtlas } from "./ReferenceAtlas";
import { LaboratoryGallery } from "./LaboratoryGallery";
import {
  parseDestination,
  productModes,
  type ProductMode,
} from "@/lib/algebra/navigation";
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
    [view, setView] = useState("home"),
    [laboratory, setLaboratory] = useState(false),
    [resumeId, setResumeId] = useState<string | null>(null),
    [expanded, setExpanded] = useState<string | undefined>(
      "Groups & generators",
    );
  const lesson = lessons.find((l) => l.id === id) || lessons[0];
  const current = useRef(lesson);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const updateHeight = () =>
      element.parentElement?.style.setProperty(
        "--algebra-header-height",
        `${element.getBoundingClientRect().height}px`,
      );
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    element.parentElement?.setAttribute("data-ready", "true");
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    current.current = lesson;
  }, [lesson]);
  const selectLesson = useCallback((target: string) => {
    const next = lessons.find(
      (l) => l.id === target || l.aliases?.includes(target),
    );
    if (!next) throw Error("Unknown concept");
    setId(next.id);
    setLaboratory(false);
    setResumeId(next.id);
    try {
      localStorage.setItem("algebra-resume-v1", next.id);
    } catch {
      /* Storage may be disabled. */
    }
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
    (target: string, unit?: string) => {
      if (
        location.hash !== `#${target}` ||
        history.state?.unit !== (unit ?? null)
      )
        history.pushState({ unit: unit ?? null }, "", `#${target}`);
      setRoute(unit ?? "");
      selectLesson(target);
    },
    [selectLesson],
  );
  const navigate = useCallback((mode: ProductMode) => {
    if (location.hash !== `#${mode}`) history.pushState({}, "", `#${mode}`);
    setView(mode);
    setMenu(false);
    requestAnimationFrame(() => {
      document.getElementById("mode-heading")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    });
  }, []);
  const openLab = useCallback(
    (target: string) => {
      history.pushState({}, "", `#lab:${target}`);
      selectLesson(target);
      setLaboratory(true);
    },
    [selectLesson],
  );
  useEffect(() => {
    const sync = () => {
      const destination = parseDestination(location.hash);
      if (destination.mode !== "lesson") {
        setView(destination.mode);
        setMenu(false);
        try {
          setResumeId(localStorage.getItem("algebra-resume-v1"));
        } catch {
          /* Optional device progress. */
        }
        requestAnimationFrame(() =>
          document.getElementById("mode-heading")?.focus(),
        );
      } else if (
        lessons.some(
          (l) => l.id === destination.id || l.aliases?.includes(destination.id),
        )
      ) {
        setRoute(
          typeof history.state?.unit === "string" ? history.state.unit : "",
        );
        selectLesson(destination.id);
        setLaboratory(destination.laboratory);
      } else {
        setView("reference");
      }
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
      <a
        className="skip-link"
        href="#concept"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("concept")?.focus();
        }}
      >
        Skip to concept
      </a>
      <header ref={header} className="algebra-header">
        <a
          className="wordmark"
          href="#home"
          onClick={(event) => {
            if (
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              navigate("home");
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
        <nav className="product-navigation" aria-label="Learning modes">
          {productModes
            .filter((mode) => mode !== "home")
            .map((mode) => (
              <a
                key={mode}
                href={`#${mode}`}
                aria-current={view === mode ? "page" : undefined}
                onClick={(event) => {
                  if (
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault();
                    navigate(mode);
                  }
                }}
              >
                {mode === "learn"
                  ? "Learn"
                  : mode === "explore"
                    ? "Explore"
                    : mode === "reference"
                      ? "Reference"
                      : "Sources"}
              </a>
            ))}
        </nav>
        <button
          id="library-toggle"
          className="library-toggle"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={18} /> : <Search size={18} />} Concepts
        </button>
      </header>
      <div
        className={`algebra-layout ${view !== "lesson" ? "mode-layout" : ""}`}
      >
        {(view === "lesson" || menu) && (
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
        )}
        <main
          id="concept"
          tabIndex={-1}
          className="concept-main"
          inert={menu || undefined}
        >
          {view === "home" ? (
            <LearningHome
              resume={lessons.find((entry) => entry.id === resumeId)}
              open={open}
              navigate={navigate}
            />
          ) : view === "learn" ? (
            <LearningRoutes {...{ lessons, route, setRoute, open }} />
          ) : view === "explore" ? (
            <LaboratoryGallery lessons={lessons} open={openLab} />
          ) : view === "reference" ? (
            <ReferenceAtlas
              lessons={lessons}
              mastered={new Set()}
              open={open}
            />
          ) : view === "sources" ? (
            <SourceCoverage lessons={lessons} open={open} />
          ) : (
            <>
              {activeRoute && (
                <p className="route-progress">
                  {activeRoute.title} · Reading position {index + 1} of{" "}
                  {siblings.length}
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
                    onClick={() =>
                      open(siblings[index - 1].id, activeRoute?.id)
                    }
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    aria-label={`Next: ${siblings[index + 1]?.navTitle || "end of route"}`}
                    disabled={index === siblings.length - 1}
                    onClick={() =>
                      open(siblings[index + 1].id, activeRoute?.id)
                    }
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
              {laboratory ? (
                <Exploration key={lesson.id} lesson={lesson} />
              ) : (
                <div className="study-workspace">
                  <div className="study-reading">
                    <LessonReader {...{ lesson, lessons, tab, setTab, open }} />
                  </div>
                  <aside
                    className="right-lab"
                    aria-label="Mathematical laboratory"
                  >
                    <Exploration key={lesson.id} lesson={lesson} />
                  </aside>
                </div>
              )}
              <footer className="concept-end">
                <span>Abstract Algebra</span>
                <button
                  disabled={index === siblings.length - 1}
                  onClick={() => open(siblings[index + 1].id, activeRoute?.id)}
                >
                  {siblings[index + 1]
                    ? `Next: ${siblings[index + 1].navTitle}`
                    : "End of reading list · return to unit capstone"}{" "}
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
