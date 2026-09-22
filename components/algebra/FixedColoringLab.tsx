"use client";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import { PolygonColoringLab } from "./PolygonColoringLab";
import { CubeColoringLab } from "./CubeColoringLab";

export function FixedColoringLab({ lesson }: { lesson: Lesson }) {
  return (
    <div className="foundation-lab fixed-coloring-lab">
      <M block>
        {"|X/G|=\\frac{1}{|G|}\\sum_{g\\in G}|\\operatorname{Fix}_X(g)|"}
      </M>
      {lesson.id === "mh2220-solid-colorings" ? (
        <CubeColoringLab />
      ) : (
        <PolygonColoringLab lessonId={lesson.id} />
      )}
    </div>
  );
}
