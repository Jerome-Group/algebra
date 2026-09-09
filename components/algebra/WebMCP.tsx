"use client";
import { useEffect, type RefObject } from "react";
import { type Lesson } from "@/lib/algebra/engine";
import { useLaboratoryControls } from "./LaboratoryControls";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint: boolean };
  execute: (args: Record<string, unknown>) => unknown;
};
type ModelContext = {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => Promise<void>;
};
const schema = (properties: object = {}, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
import { visibleElements, describe } from "./InterfaceControls";
export function useLearningTools({
  lessons,
  current,
  open,
  setTab,
  setView,
  setQuery,
}: {
  lessons: Lesson[];
  current: RefObject<Lesson>;
  open: (id: string) => void;
  setTab: (tab: string) => void;
  setView: (view: string) => void;
  setQuery: (query: string) => void;
}) {
  const laboratoryControls = useLaboratoryControls();
  useEffect(() => {
    const context =
      (document as Document & { modelContext?: ModelContext }).modelContext ||
      (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context) return;
    const abort = new AbortController();
    const tools: Tool[] = [
      {
        name: "algebra_list_lessons",
        description:
          "Search concepts by mathematical subject, title and intuition.",
        inputSchema: schema({ query: { type: "string" } }),
        annotations: { readOnlyHint: true },
        execute: ({ query = "" }) =>
          lessons
            .filter((l) =>
              `${l.title} ${l.subject} ${l.intuition}`
                .toLowerCase()
                .includes(String(query).toLowerCase()),
            )
            .map(({ id, title, subject, family, connections }) => ({
              id,
              title,
              subject,
              family,
              connections,
            })),
      },
      {
        name: "algebra_open_lesson",
        description:
          "Open a concept and its visualisation, notes, examples and sources.",
        inputSchema: schema(
          { id: { type: "string", enum: lessons.map((l) => l.id) } },
          ["id"],
        ),
        execute: ({ id }) => {
          open(String(id));
          return { opened: id };
        },
      },
      {
        name: "algebra_current_lesson",
        description:
          "Read the current concept including mathematics, worked steps, source pages and connections.",
        inputSchema: schema(),
        annotations: { readOnlyHint: true },
        execute: () => current.current,
      },
      {
        name: "algebra_reading_view",
        description:
          "Select a reading tab or open the complete source library.",
        inputSchema: schema(
          {
            view: {
              type: "string",
              enum: ["understand", "example", "theorem", "proof", "sources"],
            },
          },
          ["view"],
        ),
        execute: ({ view }) => {
          if (
            !["understand", "example", "theorem", "proof", "sources"].includes(
              String(view),
            )
          )
            throw Error("Unknown reading view");
          setView(view === "sources" ? "sources" : "lesson");
          if (view !== "sources") setTab(String(view));
          return { view };
        },
      },
      {
        name: "algebra_search",
        description: "Filter the visible concept library.",
        inputSchema: schema({ query: { type: "string", maxLength: 200 } }, [
          "query",
        ]),
        execute: ({ query }) => {
          if (typeof query !== "string" || query.length > 200)
            throw Error("Invalid query");
          setQuery(query);
          return { query };
        },
      },
      {
        name: "algebra_controls",
        description:
          "List current laboratory choices and ranges plus visible buttons, editable expressions and source links. Refresh after each action; element IDs describe this snapshot only.",
        inputSchema: schema(),
        annotations: { readOnlyHint: true },
        execute: () => ({
          lesson: current.current.id,
          parameters: [...laboratoryControls].map(
            ([id, { set, ...control }]) => {
              void set;
              return { id, ...control };
            },
          ),
          elements: visibleElements().map(describe),
        }),
      },
      {
        name: "algebra_set_parameter",
        description:
          "Set a listed laboratory choice or range using its exact ID and allowed value.",
        inputSchema: schema(
          { id: { type: "string" }, value: { type: ["string", "number"] } },
          ["id", "value"],
        ),
        execute: ({ id, value }) => {
          const control = laboratoryControls.get(String(id));
          if (!control)
            throw Error("Unknown parameter; list current controls first");
          const v = String(value);
          if (control.options && !control.options.some(([key]) => key === v))
            throw Error("Choose a listed value");
          if (control.min !== undefined) {
            const n = Number(v);
            if (
              !Number.isFinite(n) ||
              n < control.min ||
              n > control.max! ||
              Math.abs(
                (n - control.min) / (control.step || 1) -
                  Math.round((n - control.min) / (control.step || 1)),
              ) > 1e-7
            )
              throw Error("Value outside range or step");
          }
          control.set(v);
          return { id, value };
        },
      },
      {
        name: "algebra_interact",
        description:
          "Activate a current button or edit an expression input. Supply the exact label from algebra_controls to guard against stale element IDs. Source links are returned without navigating away.",
        inputSchema: schema(
          {
            id: { type: "string" },
            label: { type: "string" },
            value: { type: "string", maxLength: 200 },
          },
          ["id", "label"],
        ),
        execute: ({ id, label, value }) => {
          const index = Number(String(id).replace(/^element-/, ""));
          const el = visibleElements()[index];
          if (!el || describe(el, index).label !== label)
            throw Error("Stale control; refresh algebra_controls");
          if (el instanceof HTMLAnchorElement) return { url: el.href };
          if (el instanceof HTMLInputElement) {
            if (typeof value !== "string" || value.length > 200)
              throw Error("Supply an expression under 201 characters");
            Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value",
            )!.set!.call(el, value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (el instanceof HTMLButtonElement && el.disabled)
            throw Error("Control disabled");
          else if (el instanceof HTMLElement) el.click();
          else el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return { activated: label };
        },
      },
    ];
    for (const tool of tools)
      context.registerTool(tool, { signal: abort.signal }).catch((error) => {
        if (!abort.signal.aborted)
          console.error(`WebMCP registration failed: ${tool.name}`, error);
      });
    return () => abort.abort();
  }, [lessons, current, open, setTab, setView, setQuery, laboratoryControls]);
}
