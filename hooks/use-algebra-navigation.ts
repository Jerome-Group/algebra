import { useCallback, useEffect, useState } from "react";
import { currentArgumentLesson } from "@/lib/algebra/argument-catalogue";
import {
  capstoneTargetId,
  lessonUnit,
  parseDestination,
  workTargetId,
  type ArgumentSupport,
  type Destination,
  type ProductMode,
} from "@/lib/algebra/navigation";
import type { Lesson } from "@/lib/algebra/engine";
import type { LearningUnit } from "@/lib/algebra/routes";
import { useNavigationFocus } from "./use-navigation-focus";

type Location = { destination: Destination; unitId: string | null };

export function useAlgebraNavigation(
  beforeNavigate: () => void,
  onLesson: (lesson: Lesson) => void,
) {
  const focusHeading = useNavigationFocus();
  const [locationState, setLocation] = useState<Location>({
    destination: { mode: "home" },
    unitId: null,
  });
  const [selectedLessonId, setSelectedLessonId] = useState(
    "foundations-functions",
  );
  const apply = useCallback(
    (hash: string, state: unknown) => {
      beforeNavigate();
      let destination = parseDestination(hash);
      let unitId: string | null = null;
      if (destination.mode === "lesson") {
        const lesson = currentArgumentLesson(destination.id);
        if (lesson) {
          destination = { ...destination, id: lesson.id };
          unitId = lessonUnit(
            lesson.id,
            state && typeof state === "object" && "unit" in state
              ? state.unit
              : null,
          );
          setSelectedLessonId(lesson.id);
          onLesson(lesson);
        } else destination = { mode: "reference" };
      } else if (destination.mode === "work") {
        setSelectedLessonId(destination.targetId);
        unitId = destination.unitId;
      }
      setLocation({ destination, unitId });
      if (destination.mode === "capstone")
        focusHeading(capstoneTargetId(destination.unit), { scroll: "target" });
      else if (destination.mode === "work")
        focusHeading(destination.support ? "support-heading" : "work-heading");
      else
        focusHeading(
          destination.mode === "lesson" ? "lesson-heading" : "mode-heading",
        );
    },
    [beforeNavigate, onLesson, focusHeading],
  );
  const commit = useCallback(
    (target: string, unitId: string | null = null) => {
      const hash = `#${target}`;
      if (window.location.hash !== hash || history.state?.unit !== unitId)
        history.pushState({ unit: unitId }, "", hash);
      apply(hash, { unit: unitId });
    },
    [apply],
  );
  useEffect(() => {
    const sync = () => apply(window.location.hash, history.state);
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [apply]);
  const open = useCallback(
    (id: string, unitId?: string) => {
      const lesson = currentArgumentLesson(id);
      if (!lesson) throw new Error("Unknown concept");
      commit(lesson.id, lessonUnit(lesson.id, unitId));
    },
    [commit],
  );
  const navigate = useCallback((mode: ProductMode) => commit(mode), [commit]);
  const openLab = useCallback((id: string) => commit(`lab:${id}`), [commit]);
  const openCapstone = useCallback(
    (unit: LearningUnit) => commit(capstoneTargetId(unit)),
    [commit],
  );
  const openWork = useCallback(
    (id: string, unitId?: string | null, support?: ArgumentSupport) => {
      commit(workTargetId(id, unitId, support));
    },
    [commit],
  );
  const requestFocus = useCallback(
    (id: string) => focusHeading(id, { scroll: "target" }),
    [focusHeading],
  );
  return {
    ...locationState,
    lesson: currentArgumentLesson(selectedLessonId)!,
    open,
    navigate,
    openLab,
    openCapstone,
    openWork,
    requestFocus,
  };
}
