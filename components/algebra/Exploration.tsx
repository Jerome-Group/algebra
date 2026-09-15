"use client";
import { useState } from "react";
import { Minus, Plus, Maximize2, Minimize2 } from "lucide-react";
import type { Lesson } from "@/lib/algebra/engine";
import Laboratory from "./Laboratory";
import { Prose } from "./Math";

export default function Exploration({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(true),
    [expanded, setExpanded] = useState(false);
  return (
    <section
      className={`exploration ${expanded ? "expanded" : "compact"}`}
      aria-label="Interactive mathematical experience"
      id="experiment"
      tabIndex={-1}
    >
      <div className="exploration-heading">
        <span className="exploration-label">Explore</span>
        <span className="exploration-description">Test an example</span>
        <div className="exploration-actions">
          {open && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-label={
                expanded ? "Compact visualisation" : "Enlarge visualisation"
              }
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{expanded ? "Compact" : "Enlarge"}</span>
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="laboratory-content"
          >
            {open ? "Minimise" : "Explore"}
            {open ? <Minus size={17} /> : <Plus size={17} />}
          </button>
        </div>
      </div>
      <div
        hidden={!open}
        id="laboratory-content"
        className="visual-panel"
        data-machine={lesson.machine}
      >
        <div className="experiment-context">
          <p>
            <Prose>{lesson.prompt}</Prose>
          </p>
          <p className="reading-caption">{lesson.labScope}</p>
        </div>
        <Laboratory key={lesson.id} l={lesson} />
      </div>
    </section>
  );
}
