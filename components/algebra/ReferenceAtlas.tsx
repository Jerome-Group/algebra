import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  learningMetadata,
  prerequisitesMet,
  teachingStatuses,
  visualisationTypes,
} from "@/lib/algebra/learning";
import { searchLessons } from "@/lib/algebra/search";
import { ConceptLink } from "./ConceptLink";
import { Prose } from "./Math";

export function ReferenceAtlas({
  lessons,
  mastered,
  open,
}: {
  lessons: Lesson[];
  mastered: ReadonlySet<string>;
  open: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [visual, setVisual] = useState("");
  const [minutes, setMinutes] = useState("");
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState("");
  const sources = [
    ...new Set(
      lessons.flatMap((lesson) => learningMetadata(lesson).sourceCollections),
    ),
  ].sort();
  const results = searchLessons(lessons, query).filter(({ lesson }) => {
    const item = learningMetadata(lesson);
    return (
      (!kind || item.conceptKind === kind) &&
      (!tier || item.courseTier === tier) &&
      (!status || item.teachingStatus === status) &&
      (!source || item.sourceCollections.includes(source)) &&
      (!visual || item.visualisationType === visual) &&
      (!minutes || item.estimatedMinutes <= Number(minutes)) &&
      (!ready || prerequisitesMet(lesson, mastered, lessons))
    );
  });
  return (
    <section className="reference-atlas">
      <p className="section-kicker">REFERENCE ATLAS</p>
      <h1 id="mode-heading" tabIndex={-1}>
        Find a mathematical idea.
      </h1>
      <p>
        Every entry stays available. Teaching status describes its depth; a
        reference entry is not a completed guided lesson.
      </p>
      <label className="atlas-search">
        Search the atlas
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kernel, Sylow, polynomial…"
        />
      </label>
      <div className="atlas-filters">
        <label>
          Concept kind
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="">Objects, theorems and techniques</option>
            {["object", "theorem", "technique"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Course tier
          <select
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          >
            <option value="">All tiers</option>
            {["foundation", "core", "advanced"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Teaching status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All teaching statuses</option>
            {teachingStatuses.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source collection
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">All sources</option>
            {sources.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Visualisation type
          <select
            value={visual}
            onChange={(event) => setVisual(event.target.value)}
          >
            <option value="">All visualisations</option>
            {visualisationTypes.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Study time
          <select
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          >
            <option value="">Any duration</option>
            <option value="15">Up to 15 minutes</option>
            <option value="30">Up to 30 minutes</option>
            <option value="45">Up to 45 minutes</option>
          </select>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={ready}
            onChange={(event) => setReady(event.target.checked)}
          />{" "}
          Prerequisites demonstrated
        </label>
      </div>
      <p role="status">{results.length} matching concepts</p>
      <ul className="atlas-results">
        {results.map(({ lesson }) => {
          const item = learningMetadata(lesson);
          return (
            <li key={lesson.id}>
              <ConceptLink id={lesson.id} open={open}>
                <Prose>{lesson.navTitle || lesson.title}</Prose>
              </ConceptLink>
              <p>
                {item.teachingStatus.replaceAll("-", " ")} · {item.courseTier} ·
                about {item.estimatedMinutes} minutes
              </p>
              <p>
                <Prose>{lesson.objective || lesson.intuition}</Prose>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
