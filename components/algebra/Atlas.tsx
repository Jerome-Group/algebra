"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  BookOpen,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Shapes,
  Compass,
  Orbit,
  Waypoints,
  PanelRightClose,
  PanelRightOpen,
  Info,
  ArrowUpRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import data from "@/lib/algebra/lessons.json";
import {
  type Lesson,
  cube,
  permutation,
  cycles,
  det,
  matrixTex,
  group,
  order,
  closure,
  cosets,
} from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import Cube from "./Cube";
import { GroupLab, PolygonLab, HomomorphismLab } from "./Groups";
import { RingLab, ProductLab, PolynomialLab, FieldLab } from "./Rings";
import {
  OrthogonalLab,
  PermutationLab,
  RepresentationLab,
  CharacterLab,
} from "./Representations";
import { StructureLab, ConjugationLab, ColoringLab } from "./Structure";
import {
  QuadraticLab,
  CyclicLab,
  MatrixFiniteLab,
  SylowCalculator,
  SemidirectLab,
  ModuleLab,
  SquareModesLab,
} from "./Advanced";
const lessons = data as Lesson[];
const tracks = [
  "Group actions",
  "MH2220",
  "MH3220",
  "Odyssey Y1",
  "URECA Y2",
  "Beyond the syllabus",
];
const isActions = (l: Lesson) =>
  ["cube", "actions", "permutation"].includes(l.machine) ||
  /(?:^|-)actions?|conjug|orbit|stabil|burnside|necklace|cayley-embedding/.test(
    l.id,
  );
const labs = [
  [
    "cube-four-actions",
    "Cube & its actions",
    "48 symmetries · four natural sets",
    "cube",
  ],
  [
    "mh2220-dihedral",
    "Polygon symmetries",
    "Compose rotations and reflections",
    "polygon",
  ],
  [
    "mh2220-conjugacy",
    "Actions on a group",
    "Conjugation versus left translation",
    "actions",
  ],
  [
    "mh2220-necklaces",
    "Coloring & counting",
    "Necklaces, bracelets and Burnside",
    "colorings",
  ],
  [
    "mh2220-cosets",
    "Finite group machine",
    "Cosets, orders and subgroups",
    "cayley",
  ],
  [
    "mh2220-homomorphism",
    "Homomorphism machine",
    "Kernels, fibers and quotients",
    "map",
  ],
  [
    "mh2220-permutations",
    "Permutation machine",
    "Cycles, parity and matrices",
    "permutation",
  ],
  [
    "orthogonal-plane",
    "Orthogonal transformations",
    "Move continuously through O(2) and O(3)",
    "orthogonal",
  ],
  [
    "m3220-rings",
    "Residue ring machine",
    "Units, ideals and zero divisors",
    "ring",
  ],
  [
    "m3220-crt",
    "Product & CRT machine",
    "Residues as independent coordinates",
    "product",
  ],
  [
    "m3220-polynomial",
    "Polynomial machine",
    "Coefficient convolution and roots",
    "polynomial",
  ],
  ["m3220-finite-field-four", "Finite field machine", "Compute in 𝔽₄", "field"],
  [
    "m3220-gaussian-division",
    "Gaussian integer machine",
    "Norm, conjugation and division",
    "field",
  ],
  [
    "ureca-permutation-module",
    "Representation machine",
    "Invariant pieces of a permutation module",
    "representation",
  ],
  [
    "odyssey-character-table",
    "Character machine",
    "Tensor products and multiplicities",
    "characters",
  ],
];
const trackDescriptions: Record<string, string> = {
  "Group actions": "The path from movement to structure",
  MH2220: "Algebra I · 7 chapters",
  MH3220: "Algebra II · 6 chapters",
  "Odyssey Y1": "Selected bridges · Alperin–Bell",
  "URECA Y2": "Selected representation readings",
  "Beyond the syllabus": "Symmetry & representation extensions",
};
function NavLesson({
  l,
  active,
  onClick,
  index,
}: {
  l: Lesson;
  active: boolean;
  onClick: () => void;
  index: number;
}) {
  const s = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className="lesson-link"
        onClick={() => {
          onClick();
          if (s.isMobile) s.setOpenMobile(false);
        }}
      >
        <span className="lesson-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span>{l.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
function Machine({ l }: { l: Lesson }) {
  if (l.id === "representations-actions-modules") return <Cube lesson={l} />;
  if (["m3220-modules", "m3220-submodules"].includes(l.id))
    return <ModuleLab />;
  if (
    ["representations-square-modes", "representations-maschke"].includes(l.id)
  )
    return <SquareModesLab />;
  if (l.id === "m3220-quadratic-integers") return <QuadraticLab />;
  if (l.id === "mh2220-finite-matrices") return <MatrixFiniteLab />;
  if (l.id === "mh2220-semidirect") return <SemidirectLab />;
  if (l.machine === "sylow")
    return (
      <>
        <SylowCalculator />
        <GroupLab lesson={l} />
      </>
    );
  if (/cyclic-eigenvalues|real-complex|orthogonal-axis-angle/.test(l.id))
    return <CyclicLab />;
  if (/conjugacy|p-groups|commutator|actions-regular-conjugation/.test(l.id))
    return <ConjugationLab />;
  if (/necklace|burnside$/.test(l.id) && !l.id.includes("cube"))
    return <ColoringLab />;
  if (l.id === "mh2220-units" || l.id === "mh2220-euler-fermat")
    return (
      <RingLab
        lesson={{
          ...l,
          parameters: { ...l.parameters, n: l.id.includes("euler") ? 10 : 8 },
        }}
      />
    );
  switch (l.machine) {
    case "cube":
    case "actions":
      return <Cube lesson={l} />;
    case "polygon":
      return <PolygonLab />;
    case "cayley":
    case "subgroups":
    case "cosets":
    case "sylow":
      return <GroupLab lesson={l} />;
    case "homomorphism":
      return <HomomorphismLab lesson={l} />;
    case "product":
      return <ProductLab lesson={l} />;
    case "permutation":
      return <PermutationLab />;
    case "orthogonal":
      return <OrthogonalLab />;
    case "representation":
      return <RepresentationLab lesson={l} />;
    case "characters":
      return <CharacterLab lesson={l} />;
    case "ring":
      return <RingLab lesson={l} />;
    case "polynomial":
      return <PolynomialLab lesson={l} />;
    case "field":
      return <FieldLab lesson={l} />;
    default:
      return <StructureLab lesson={l} />;
  }
}
export default function Atlas() {
  const [id, setId] = useState("cube-four-actions"),
    [track, setTrack] = useState("Group actions"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState("learn"),
    [noteTab, setNoteTab] = useState("intuition"),
    [sources, setSources] = useState(false);
  const l = lessons.find((x) => x.id === id) || lessons[0],
    cur = useRef(l);
  cur.current = l;
  const initial = useRef(true);
  const open = (id: string) => {
    const next = lessons.find((l) => l.id === id);
    if (!next) return;
    setId(next.id);
    setPage("learn");
    setNoteTab("intuition");
    if (!isActions(next)) setTrack(next.track);
    history.replaceState({}, "", `#${next.id}`);
  };
  useEffect(() => {
    const h = location.hash.slice(1);
    if (lessons.some((l) => l.id === h)) open(h);
    const onHash = () => {
      const h = location.hash.slice(1);
      if (lessons.some((l) => l.id === h)) open(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const ctx =
      (document as any).modelContext || (navigator as any).modelContext;
    if (!ctx?.registerTool) return;
    const ctrl = new AbortController();
    const tools = [
      {
        name: "algebra_list_lessons",
        description:
          "List source-grounded algebra lessons with course, chapter, and visualization type.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
        },
        annotations: { readOnlyHint: true },
        execute: async ({ query = "" }: { query?: string }) =>
          JSON.stringify(
            lessons
              .filter((l) =>
                (l.title + " " + l.track + " " + l.section)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map(({ id, title, track, section, machine }) => ({
                id,
                title,
                track,
                section,
                machine,
              })),
          ),
      },
      {
        name: "algebra_open_lesson",
        description:
          "Open an algebra lesson in the visible companion and place its rigorous mathematics next to the visualization.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", enum: lessons.map((l) => l.id) },
          },
          required: ["id"],
        },
        execute: async ({ id }: { id: string }) => {
          if (!lessons.some((l) => l.id === id)) throw Error("Unknown lesson");
          open(id);
          return "Opened " + id;
        },
      },
      {
        name: "algebra_current_lesson",
        description: "Read current lesson mathematics, explanation and source.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => JSON.stringify(cur.current),
      },
      {
        name: "algebra_cube_action",
        description:
          "Compute an exact signed-permutation cube symmetry and optionally show its action.",
        inputSchema: {
          type: "object",
          properties: {
            element: { type: "integer", minimum: 0, maximum: 47 },
            set: {
              type: "string",
              enum: ["vertices", "edges", "faces", "diagonals"],
            },
            show: { type: "boolean" },
          },
          required: ["element", "set"],
        },
        execute: async ({
          element,
          set,
          show,
        }: {
          element: number;
          set: any;
          show?: boolean;
        }) => {
          if (
            !Number.isInteger(element) ||
            element < 0 ||
            element > 47 ||
            !["vertices", "edges", "faces", "diagonals"].includes(set)
          )
            throw Error("Invalid cube parameters");
          const g = cube[element],
            p = permutation(g.matrix, set);
          if (show) {
            open("cube-four-actions");
            setTimeout(
              () =>
                window.dispatchEvent(
                  new CustomEvent("algebra-cube-config", {
                    detail: { element, set },
                  }),
                ),
              150,
            );
          }
          return JSON.stringify({
            matrix: g.matrix,
            word: g.word,
            determinant: det(g.matrix),
            permutation: p.map((i) => i + 1),
            cycles: cycles(p).map((c) => c.map((i) => i + 1)),
            convention: "column vectors; rightmost factor first",
          });
        },
      },
      {
        name: "algebra_finite_group",
        description:
          "Compute element order, generated subgroup and left cosets in Cn, Dn, V4 or Q8.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["C", "D", "V", "Q"] },
            n: { type: "integer", minimum: 3, maximum: 12 },
            element: { type: "integer", minimum: 0, maximum: 23 },
          },
          required: ["type", "n", "element"],
        },
        annotations: { readOnlyHint: true },
        execute: async ({
          type,
          n,
          element,
        }: {
          type: string;
          n: number;
          element: number;
        }) => {
          if (
            !["C", "D", "V", "Q"].includes(type) ||
            !Number.isInteger(n) ||
            n < 3 ||
            n > 12
          )
            throw Error("Invalid group");
          const g = group(type, n);
          if (
            !Number.isInteger(element) ||
            element < 0 ||
            element >= g.labels.length
          )
            throw Error("Invalid element");
          const H = closure(g, [element]);
          return JSON.stringify({
            group: g.name,
            order: g.labels.length,
            element: g.labels[element],
            elementOrder: order(g, element),
            subgroup: H.map((i) => g.labels[i]),
            cosets: cosets(g, H).map((c) => c.map((i) => g.labels[i])),
          });
        },
      },
    ];
    for (const tool of tools) {
      try {
        const result = ctx.registerTool(tool, { signal: ctrl.signal });
        Promise.resolve(result).catch(() => {});
      } catch {}
    }
    return () => {
      ctrl.abort();
      if (ctx.unregisterTool)
        for (const t of tools)
          try {
            ctx.unregisterTool(t.name);
          } catch {}
    };
  }, []);
  const filtered = useMemo(
    () =>
      lessons.filter(
        (x) =>
          (search
            ? true
            : track === "Group actions"
              ? isActions(x)
              : x.track === track) &&
          (!search ||
            (x.title + " " + x.section + " " + x.intuition + " " + x.id)
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [track, search],
  );
  const chapter = (x: Lesson) => {
    if (search) return x.track;
    if (track === "Group actions") {
      if (/cube|actions-cycle|faithful|stabilizer-kernel/.test(x.id))
        return "The cube laboratory";
      if (/burnside|necklace|cycle-index|solid-color/.test(x.id))
        return "Counting through actions";
      if (/permutation|alternating/.test(x.id))
        return "From movements to permutations";
      if (/conjug|p-group|sylow/.test(x.id))
        return "Structure from self-actions";
      if (/representation|linear-action|invariant/.test(x.id))
        return "The representation bridge";
      return "The language of actions";
    }
    if (x.track === "MH2220") {
      const k = Number(x.section.match(/^([1-7])/)?.[1]);
      return (
        [
          "",
          "1 · Foundations of groups",
          "2 · Groups you can see",
          "3 · Maps, cosets and order",
          "4 · Building new groups",
          "5 · Isomorphism and classification",
          "6 · Group actions and counting",
          "7 · Sylow and finite groups",
        ][k] || x.section
      );
    }
    if (x.track === "MH3220") {
      const k = Number(
        x.source.section.match(/(?:§§?|Chapter\s*)([1-6])/i)?.[1] ||
          x.section.match(/(?:§§?|Chapter\s*)([1-6])/i)?.[1],
      );
      return (
        [
          "",
          "1 · Rings and arithmetic",
          "2 · Ideals, quotients and maps",
          "3 · Localisation",
          "4 · Factorisation domains",
          "5 · Polynomial rings",
          "6 · Finiteness and modules",
        ][k] || x.section
      );
    }
    return x.track === "Beyond the syllabus" ? x.section : "Selected concepts";
  };
  const sections = [...new Set(filtered.map(chapter))];
  const idx = filtered.findIndex((x) => x.id === id);
  const sourceLink = l.source?.url;
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "264px" } as React.CSSProperties}
    >
      <Sidebar className="atlas-sidebar">
        <SidebarHeader className="brand-block">
          <a
            className="brand"
            href="#cube-four-actions"
            onClick={() => open("cube-four-actions")}
          >
            <span className="brand-mark">
              <Orbit size={24} />
            </span>
            <span>
              Algebra <b>Atlas</b>
            </span>
          </a>
          <span className="brand-meta">A VISUAL MATHEMATICS COMPANION</span>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-mode">
            <button
              className={page === "learn" ? "active" : ""}
              onClick={() => setPage("learn")}
            >
              <BookOpen size={16} />
              Explore concepts
            </button>
            <button
              className={page === "machines" ? "active" : ""}
              onClick={() => setPage("machines")}
            >
              <Boxes size={16} />
              Open a machine
            </button>
          </div>
          <div className="nav-search">
            <Search size={15} />
            <Input
              aria-label="Find a concept"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage("learn");
              }}
              placeholder="Find a concept…"
            />
          </div>
          <div className="track-list">
            {tracks.map((t) => (
              <button
                key={t}
                className={t === track && !search ? "active" : ""}
                onClick={() => {
                  setTrack(t);
                  setSearch("");
                  setPage("learn");
                }}
              >
                <span>
                  {t === "Group actions" ? (
                    <Waypoints size={15} />
                  ) : (
                    <span className="track-dash" />
                  )}
                  {t}
                </span>
                <small>
                  {
                    lessons.filter((l) =>
                      t === "Group actions" ? isActions(l) : l.track === t,
                    ).length
                  }
                </small>
              </button>
            ))}
          </div>
          <div className="chapter-heading">
            {search
              ? `${filtered.length} MATCHING CONCEPTS`
              : trackDescriptions[track]}
          </div>
          {sections.map((section, i) => (
            <SidebarGroup key={section}>
              <SidebarGroupLabel className="chapter-label">
                {section}
              </SidebarGroupLabel>
              <SidebarMenu>
                {filtered
                  .filter((x) => chapter(x) === section)
                  .map((x) => (
                    <NavLesson
                      key={x.id}
                      l={x}
                      active={id === x.id}
                      index={filtered.indexOf(x)}
                      onClick={() => open(x.id)}
                    />
                  ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
          {!filtered.length && (
            <p className="empty-search">
              No matching concepts. Try “orbit”, “ideal” or “character”.
            </p>
          )}
        </SidebarContent>
        <SidebarFooter className="nav-footer">
          <button onClick={() => setSources(true)}>
            <Info size={16} /> Coverage & sources <ArrowUpRight size={14} />
          </button>
          <span>{lessons.length} concepts · 4 source collections</span>
        </SidebarFooter>
      </Sidebar>
      <main className="atlas-main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>{page === "learn" ? l.track : "The workbench"}</span>
            <ChevronRight size={14} />
            <span>
              {page === "learn"
                ? l.machine === "cube"
                  ? "Symmetry lab"
                  : l.section
                : "Visual machines"}
            </span>
          </div>
          <button className="source-top" onClick={() => setSources(true)}>
            <BookOpen size={15} /> Source guide
          </button>
        </header>
        {page === "machines" ? (
          <div className="machines-page">
            <span className="eyebrow">THE WORKBENCH</span>
            <h1>Choose a mathematical machine.</h1>
            <p>
              Change the data. Follow the structure. Keep the definitions in
              view.
            </p>
            <div className="machine-cards">
              {labs.map(([target, title, description, kind]) => {
                const actual = lessons.some((l) => l.id === target)
                  ? target
                  : lessons.find((l) => l.machine === kind)?.id ||
                    "cube-four-actions";
                return (
                  <button key={title} onClick={() => open(actual)}>
                    <span className="machine-icon">
                      {kind === "cube" ? (
                        <Boxes />
                      ) : kind === "actions" ? (
                        <Waypoints />
                      ) : (
                        <Shapes />
                      )}
                    </span>
                    <h2>{title}</h2>
                    <p>{description}</p>
                    <ArrowUpRight size={17} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="lesson-heading">
              <div>
                <span className="eyebrow">
                  {l.track === "Beyond the syllabus"
                    ? "SYMMETRY EXTENSION"
                    : l.track === "Odyssey Y1" || l.track === "URECA Y2"
                      ? "SELECTED READING"
                      : l.track}{" "}
                  <span> / </span>{" "}
                  {l.machine === "diagram"
                    ? "STRUCTURE MAP"
                    : "INTERACTIVE EXPERIENCE"}
                </span>
                <h1>{l.title}</h1>
              </div>
              <div className="lesson-arrows">
                <button
                  title="Previous concept"
                  disabled={idx <= 0}
                  onClick={() => open(filtered[idx - 1].id)}
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  title="Next concept"
                  disabled={idx < 0 || idx >= filtered.length - 1}
                  onClick={() => open(filtered[idx + 1].id)}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>
            <div className="learning-workspace">
              <section
                className="visual-panel"
                aria-label="Interactive mathematical experience"
              >
                <div className="visual-panel-heading">
                  <span>
                    <span className="live-glyph" />{" "}
                    {l.machine === "diagram"
                      ? "Trace the structure"
                      : "Explore the action"}
                  </span>
                  <small>
                    {l.machine === "cube"
                      ? "3D · EXACT FINITE ACTION"
                      : "LIVE MATHEMATICAL MODEL"}
                  </small>
                </div>
                <div className="machine-scroll" key={l.id}>
                  <Machine l={l} />
                </div>
              </section>
              <aside
                className="notes-panel"
                aria-label="Rigorous companion mathematics"
              >
                <div className="math-anchor">
                  <span className="eyebrow">THE MATHEMATICS</span>
                  <div className="core-definition">
                    <M block>{l.definition}</M>
                  </div>
                </div>
                <Tabs
                  value={noteTab}
                  onValueChange={setNoteTab}
                  className="note-tabs"
                >
                  <TabsList variant="line">
                    <TabsTrigger value="intuition">Intuition</TabsTrigger>
                    <TabsTrigger value="theorem">Theorem</TabsTrigger>
                    <TabsTrigger value="proof">Why it holds</TabsTrigger>
                  </TabsList>
                  <div className="note-content">
                    <TabsContent value="intuition">
                      <p className="intuition-lead">
                        <Prose>{l.intuition}</Prose>
                      </p>
                      <p>
                        <Prose>{l.explanation}</Prose>
                      </p>
                      <div className="observe-box">
                        <span>TRY TO SEE</span>
                        <p>
                          <Prose>{l.prompt}</Prose>
                        </p>
                      </div>
                      <div className="pitfall-box">
                        <span>KEEP THIS DISTINCTION</span>
                        <p>
                          <Prose>{l.pitfall}</Prose>
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="theorem">
                      <span className="note-label">Statement & hypotheses</span>
                      <p>
                        <Prose>{l.explanation}</Prose>
                      </p>
                      <div className="theorem-math">
                        <M block>{l.theorem}</M>
                      </div>
                      <p>
                        <Prose>{l.pitfall}</Prose>
                      </p>
                      <p className="small-note">
                        The visualization illustrates the statement on the
                        displayed examples. It does not replace the proof or
                        remove any hypothesis.
                      </p>
                    </TabsContent>
                    <TabsContent value="proof">
                      <span className="note-label">Argument</span>
                      <p className="proof-text">
                        <Prose>{l.proof}</Prose>
                      </p>
                      <div className="theorem-math">
                        <M block>{l.theorem}</M>
                      </div>
                      <p className="small-note">
                        A proof idea is identified as such. Consult the linked
                        notes for the full course treatment and exercises.
                      </p>
                    </TabsContent>
                  </div>
                </Tabs>
                <a
                  className="source-foot"
                  href={sourceLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <BookOpen size={17} />
                  <span>
                    <b>{l.source.title}</b>
                    <small>{l.source.section}</small>
                  </span>
                  <ExternalLink size={14} />
                </a>
              </aside>
            </div>
            <footer className="workspace-footer">
              <span>Column vectors · rightmost transformation first</span>
              <span>Explore → formulate → prove</span>
            </footer>
          </>
        )}
        <Dialog open={sources} onOpenChange={setSources}>
          <DialogContent className="sources-dialog">
            <DialogHeader>
              <DialogTitle>Coverage & mathematical conventions</DialogTitle>
              <DialogDescription>
                A companion to the source notes, with original explanations and
                interactive finite examples.
              </DialogDescription>
            </DialogHeader>
            <div className="sources-body">
              <div className="coverage-grid">
                {tracks.slice(1).map((t) => (
                  <div key={t}>
                    <b>{t}</b>
                    <span>
                      {lessons.filter((l) => l.track === t).length} concepts
                    </span>
                  </div>
                ))}
              </div>
              <h3>The source collections</h3>
              <p>
                MH2220 follows all seven chapters: group basics, examples,
                properties, constructions, isomorphism theorems, actions and
                Sylow theorems. MH3220 follows all six chapters: rings, ideals
                and quotients, localisation, factorisation domains, polynomials,
                and Noetherian/Artinian rings and modules.
              </p>
              <p>
                Odyssey and URECA are selected bridges into representations,
                modules and characters. URECA links refer to the available
                meeting readings and guided notes; they are not presented as
                completed research. Some James–Liebeck PDF text was unreadable,
                so selected statements were checked against readable project
                materials and independent mathematical arguments.
              </p>
              <div className="source-folders">
                {[
                  [
                    "MH2220",
                    "https://drive.google.com/drive/folders/1inwJLOsEkTSG1fnywaCko6re76LmOLgp",
                  ],
                  [
                    "MH3220",
                    "https://drive.google.com/drive/folders/1fXVOCStCNIAulcFEj-V-sOcWgkIV-7tW",
                  ],
                  [
                    "Odyssey Y1",
                    "https://drive.google.com/drive/folders/1qtCCvXueJqM2Ka8u3otuL_VRn1uenvZ8",
                  ],
                  [
                    "URECA Y2",
                    "https://drive.google.com/drive/folders/1DulIUCElslLv9l5fhVwjHWfIxcHfek7z",
                  ],
                ].map(([t, url]) => (
                  <a key={t} href={url} target="_blank" rel="noreferrer">
                    {t}
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
              <h3>Conventions that matter</h3>
              <p>
                Dₙ has 2n elements. Matrices act on column vectors from the
                left, so AB applies B first. Ring conventions in MH3220 allow
                nonunital rings and nonunital homomorphisms; individual theorems
                explicitly add commutativity and identity assumptions where
                needed. Character computations use finite-dimensional complex
                representations of finite groups.
              </p>
              <h3>Examples and source corrections</h3>
              <p>
                The zero ideal is prime in ℤ. The element 3 in ℤ[√−5] is
                irreducible but not prime. Q₈ has a unique element of order 2,
                not order 8. The companion corrects these source
                inconsistencies. A finite diagram cannot establish an infinite
                chain condition.
              </p>
              <h3>Using WebMCP</h3>
              <p>
                In browsers supporting WebMCP, an assistant can discover
                lessons, open an experience and compute exact cube actions or
                finite group data through structured tools. The visual controls
                work independently of WebMCP support.
              </p>
              <a
                href="https://developer.chrome.com/docs/ai/webmcp/imperative-api"
                target="_blank"
                rel="noreferrer"
              >
                WebMCP browser documentation <ExternalLink size={13} />
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </SidebarProvider>
  );
}
