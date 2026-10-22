"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Search, X } from "lucide-react";
import data from "@/lib/algebra/lessons.json";
import { type Lesson } from "@/lib/algebra/engine";
import { Prose } from "./Math";
import {
  LearningProgressProvider,
  AccountProgressStatus,
  useLearningProgress,
} from "./LearningProgress";
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
  capstoneTargetId,
  productModes,
  type ViewMode,
} from "@/lib/algebra/navigation";
import { LessonReader } from "./LessonReader";
import { LaboratoryProvider } from "./LaboratoryControls";
import { useLearningTools } from "./WebMCP";
import { RepresentationObjectProvider } from "./RepresentationObject";
import { useAlgebraNavigation } from "@/hooks/use-algebra-navigation";
import { useConceptSidebar } from "@/hooks/use-concept-sidebar";
import { curriculumSubjects as subjects } from "@/lib/algebra/argument-catalogue";
import {
  ArgumentDesk,
  ArgumentReturnBar,
  ArgumentStartLink,
} from "./ArgumentDesk";
const lessons = data as Lesson[];
export default function Algebra() {
  return (
    <LaboratoryProvider>
      <LearningProgressProvider lessons={lessons}>
        <RepresentationObjectProvider>
          <AccountLearningExperience />
        </RepresentationObjectProvider>
      </LearningProgressProvider>
    </LaboratoryProvider>
  );
}
function AccountLearningExperience() {
  const { account } = useLearningProgress();
  return <LearningExperience key={account?.id ?? "guest"} />;
}
function LearningExperience() {
  const { mastered, preferences, setResume, phase } = useLearningProgress();
  const resumeId = preferences.resumeLessonId;
  const [subject, setSubject] = useState(subjects[0]);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ReadingView>("guided");
  const [expanded, setExpanded] = useState<string | undefined>(
    "Groups & generators",
  );
  const {
    narrow,
    expanded: conceptsExpanded,
    modalOpen,
    dialog,
    toggleButton,
    toggle: toggleConcepts,
    show: showConcepts,
    dismiss: dismissConcepts,
    closeForNavigation,
    containFocus,
  } = useConceptSidebar();
  const selectLesson = useCallback(
    (next: Lesson) => {
      setResume(next.id);
      setSubject(next.subject || subjects[0]);
      setExpanded(next.family);
      setTab("guided");
      setQuery("");
    },
    [setResume],
  );
  const {
    destination: screen,
    unitId,
    lesson,
    open,
    navigate,
    openLab,
    openCapstone,
    openWork,
    requestFocus,
  } = useAlgebraNavigation(closeForNavigation, selectLesson);
  const view = screen.mode === "capstone" ? "learn" : screen.mode;
  const id = lesson.id;
  const route = unitId ?? "";
  const laboratory = screen.mode === "lesson" && screen.laboratory;
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
    setReady(true);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    current.current = lesson;
  }, [lesson]);
  useEffect(() => {
    if (phase === "ready" && view === "lesson") setResume(lesson.id);
  }, [phase, view, lesson.id, setResume]);
  const setView = useCallback(
    (mode: ViewMode) => {
      if (mode === "lesson") open(lesson.id, unitId ?? undefined);
      else navigate(mode);
    },
    [lesson.id, unitId, open, navigate],
  );
  const searchConcepts = useCallback(
    (value: string) => {
      setQuery(value);
      showConcepts();
    },
    [showConcepts],
  );
  useLearningTools({
    lessons,
    current,
    open,
    setTab,
    setView,
    setQuery: searchConcepts,
  });
  const openUnitCapstone = useCallback(
    (id: string) => {
      const unit = learningRoutes.find((entry) => entry.id === id);
      if (unit) openCapstone(unit);
    },
    [openCapstone],
  );
  const library = (
    <ConceptLibrary
      hidden={!narrow && !conceptsExpanded}
      ready={ready}
      {...{
        lessons,
        subjects,
        id,
        subject,
        query,
        expanded,
        open,
        setSubject,
        setQuery,
        setExpanded,
      }}
    />
  );
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
          ref={toggleButton}
          aria-controls="concept-library"
          aria-haspopup={narrow ? "dialog" : undefined}
          aria-expanded={narrow ? modalOpen : conceptsExpanded}
          aria-label={
            narrow
              ? "Concepts"
              : conceptsExpanded
                ? "Collapse concepts"
                : "Expand concepts"
          }
          onClick={toggleConcepts}
          disabled={!ready}
        >
          {(narrow ? modalOpen : conceptsExpanded) ? (
            <X size={18} />
          ) : (
            <Search size={18} />
          )}{" "}
          Concepts
        </button>
        <ArgumentReturnBar navigate={openWork} />
      </header>
      <AccountProgressStatus />
      {narrow && (
        <dialog
          ref={dialog}
          className="library-dialog"
          aria-label="Concept library"
          onKeyDown={containFocus}
          onCancel={(event) => {
            event.preventDefault();
            dismissConcepts();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              dismissConcepts();
          }}
        >
          <button
            className="library-close"
            onClick={dismissConcepts}
            aria-label="Close concepts"
          >
            <X size={18} /> Close
          </button>
          {library}
        </dialog>
      )}
      <div
        className={`algebra-layout ${view !== "lesson" ? "mode-layout" : ""} ${!narrow && conceptsExpanded ? "with-library" : ""}`}
      >
        {!narrow && library}
        <main id="concept" tabIndex={-1} className="concept-main">
          {screen.mode === "work" ? (
            <ArgumentDesk
              targetId={screen.targetId}
              unitId={screen.unitId}
              support={screen.support}
              navigate={openWork}
              openLesson={open}
              openCapstone={openUnitCapstone}
              requestFocus={requestFocus}
            />
          ) : view === "home" ? (
            <LearningHome
              lessons={lessons}
              resume={lessons.find((entry) => entry.id === resumeId)}
              open={open}
              navigate={navigate}
            />
          ) : view === "learn" ? (
            <LearningRoutes
              {...{ lessons, route, open }}
              capstone={screen.mode === "capstone" ? screen.unit : null}
            />
          ) : view === "explore" ? (
            <LaboratoryGallery lessons={lessons} open={openLab} />
          ) : view === "reference" ? (
            <ReferenceAtlas lessons={lessons} mastered={mastered} open={open} />
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
              <ArgumentStartLink
                lessonId={lesson.id}
                unitId={activeRoute?.id}
                navigate={openWork}
              />
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
                {siblings[index + 1] ? (
                  <button
                    onClick={() =>
                      open(siblings[index + 1].id, activeRoute?.id)
                    }
                  >
                    Next: {siblings[index + 1].navTitle}{" "}
                    <ArrowRight size={16} />
                  </button>
                ) : activeRoute ? (
                  <a
                    href={`#${capstoneTargetId(activeRoute)}`}
                    onClick={(event) => {
                      if (
                        !event.metaKey &&
                        !event.ctrlKey &&
                        !event.shiftKey &&
                        !event.altKey
                      ) {
                        event.preventDefault();
                        openCapstone(activeRoute);
                      }
                    }}
                  >
                    Return to unit capstone <ArrowRight size={16} />
                  </a>
                ) : (
                  <span>End of reading list</span>
                )}
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
