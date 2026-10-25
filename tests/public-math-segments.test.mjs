import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  collectMathSegments,
  sourceSegments,
  assertExactSegments,
  assertContainsSegments,
  expectExactMathRegion,
  expectContainedMath,
  expectAbsentMath,
  readMathNativeControl,
} from "./browser/public-math-segments.mjs";

test("SYNTHETIC observed native controls refuse missing numeric attributes and wrong input kinds", () => {
  class Input {
    constructor(type, value, attrs = {}) {
      Object.assign(this, {
        type,
        value,
        valueAsNumber: Number(value),
        checked: false,
        attrs,
      });
    }
    getAttribute(name) {
      return this.attrs[name] ?? null;
    }
  }
  class Select {
    constructor(value) {
      this.value = value;
    }
  }
  class TextArea {
    constructor(value) {
      this.value = value;
    }
  }
  const read = runInNewContext(`(${readMathNativeControl.toString()})`, {
    HTMLInputElement: Input,
    HTMLSelectElement: Select,
    HTMLTextAreaElement: TextArea,
  });
  assert.equal(read(new Input("number", "90"), "number"), 90);
  assert.equal(
    read(new Input("range", "90", { "aria-valuenow": "90" }), "aria-valuenow"),
    90,
  );
  assert.equal(read(new Input("checkbox", "on"), "checked"), false);
  assert.equal(read(new Select("one"), "selected-value"), "one");
  assert.equal(read(new TextArea("12"), "value"), "12");
  for (const [input, mode] of [
    [new Input("range", "0"), "aria-valuenow"],
    [new Input("range", "0", { "aria-valuenow": "" }), "aria-valuenow"],
    [new Input("range", "0", { "aria-valuenow": "NaN" }), "aria-valuenow"],
    [new Input("text", "0"), "number"],
    [new Input("number", "NaN"), "number"],
    [new Input("number", "0"), "checked"],
    [new TextArea("one"), "selected-value"],
    [new Input("text", "0"), "unknown"],
  ])
    assert.throws(() => read(input, mode));
});

const mathNamespace = "http://www.w3.org/1998/Math/MathML";
const text = (textContent, rangeRects) => ({
  nodeType: 3,
  textContent,
  rangeRects,
});
function element(
  name,
  attributes = {},
  children = [],
  namespaceURI = "http://www.w3.org/1999/xhtml",
) {
  const node = {
    nodeType: 1,
    localName: name,
    attributes,
    childNodes: children,
    namespaceURI,
  };
  Object.defineProperty(node, "children", {
    get: () => children.filter((child) => child.nodeType === 1),
  });
  Object.defineProperty(node, "textContent", {
    get: () => children.map((child) => child.textContent).join(""),
  });
  node.matches = (selector) =>
    selector.split(",").some((part) => {
      part = part.trim();
      if (part.startsWith("."))
        return (attributes.class ?? "").split(" ").includes(part.slice(1));
      if (part === 'annotation[encoding="application/x-tex"]')
        return (
          name === "annotation" && attributes.encoding === "application/x-tex"
        );
      return part === name;
    });
  node.closest = (selector) =>
    node.matches(selector)
      ? node
      : (node.parentElement?.closest(selector) ?? null);
  node.querySelectorAll = (selector) =>
    children.flatMap((child) =>
      child.nodeType === 1
        ? [
            ...(child.matches(selector) ? [child] : []),
            ...child.querySelectorAll(selector),
          ]
        : [],
    );
  node.querySelector = (selector) => node.querySelectorAll(selector)[0] ?? null;
  node.contains = (target) =>
    node === target ||
    children.some((child) => child.nodeType === 1 && child.contains(target));
  children.forEach((child) => {
    child.parentElement = node;
  });
  return node;
}
function math(
  tex,
  {
    annotations = 1,
    namespace = mathNamespace,
    presentation = true,
    display = false,
  } = {},
) {
  const formula = element("span", { class: "katex" }, [
    element("span", { class: "katex-mathml" }, [
      element(
        "math",
        {},
        [
          element(
            "semantics",
            {},
            [
              ...(presentation
                ? [
                    element(
                      "mi",
                      {},
                      [text("MathML presentation text")],
                      namespace,
                    ),
                  ]
                : []),
              ...Array.from({ length: annotations }, () =>
                element(
                  "annotation",
                  { encoding: "application/x-tex" },
                  [text(tex)],
                  namespace,
                ),
              ),
            ],
            namespace,
          ),
        ],
        namespace,
      ),
    ]),
    element("span", { class: "katex-html" }, [
      text("Visual presentation text"),
    ]),
  ]);
  return display
    ? element("span", { class: "katex-display" }, [formula])
    : formula;
}
const collect = (root) => collectMathSegments(root, { visibility: "all" });
function collectRendered(root) {
  const globals = {
    document: {
      createRange: () => {
        let selected;
        return {
          selectNodeContents: (node) => (selected = node),
          getClientRects: () =>
            selected.rangeRects ?? [{ width: 100, height: 18 }],
        };
      },
    },
    getComputedStyle: (node) => ({
      display: "inline",
      visibility: "visible",
      opacity: "1",
      ...node.computedStyle,
    }),
  };
  const previous = Object.fromEntries(
    Object.keys(globals).map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  try {
    Object.assign(globalThis, globals);
    return collectMathSegments(root);
  } finally {
    for (const [name, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

const citationTitle = "Robert A. Wilson, The alternating groups";
const citationDetails =
  "Sections 1.3.1-1.3.2, printed pages 5-6. The source uses right permutations composed left to right. The independently checked teaching uses left function composition and conjugation ";
const citationExpected = `${citationTitle} · ${citationDetails}$gxg^{-1}$.`;
function citation(separatorRects) {
  const root = element("li", {}, [
    element("a", {}, [element("span", {}, [text(citationTitle)])]),
    text(" ", [{ width: 4.1875, height: 18 }]),
    text("·", [{ width: 4.4375, height: 18 }]),
    text(" ", separatorRects),
    element("span", {}, [text(citationDetails)]),
    math("gxg^{-1}"),
    element("span", {}, [text(".")]),
  ]);
  root.computedStyle = { display: "list-item" };
  return root;
}

for (const [width, separatorRects] of [
  [390, []],
  [1440, [{ width: 4.1875, height: 18 }]],
])
  test(`rendered citation preserves its source separator at ${width}px`, () => {
    assertExactSegments(
      collectRendered(citation(separatorRects)),
      sourceSegments(citationExpected),
    );
  });

test("rendered collection never inserts an absent source separator", () => {
  const root = citation([]);
  root.childNodes.splice(3, 1);
  const actual = collectRendered(root);
  assertExactSegments(
    actual,
    sourceSegments(`${citationTitle} ·${citationDetails}$gxg^{-1}$.`),
  );
  assert.throws(
    () => assertExactSegments(actual, sourceSegments(citationExpected)),
    /Complete public region/,
  );
});

test("rendered whitespace and prose reject hidden owners and ancestors", () => {
  for (const computedStyle of [
    { display: "none" },
    { visibility: "hidden" },
    { visibility: "collapse" },
    { opacity: "0" },
  ]) {
    for (const nested of [false, true]) {
      const owner = element("span", {}, [text(" ", []), text("hidden")]);
      const hidden = nested ? element("span", {}, [owner]) : owner;
      hidden.computedStyle = computedStyle;
      assertExactSegments(
        collectRendered(
          element("p", {}, [text("groups ·"), hidden, text("Sections")]),
        ),
        sourceSegments("groups ·Sections"),
      );
    }
  }
});

test("rendered whitespace needs a positive owner range box", () => {
  for (const rangeRects of [
    [],
    [{ width: 0, height: 18 }],
    [{ width: 4, height: 0 }],
  ]) {
    const owner = element("span", {}, [text(" ", [])]);
    owner.rangeRects = rangeRects;
    assertExactSegments(
      collectRendered(
        element("p", {}, [text("groups ·"), owner, text("Sections")]),
      ),
      sourceSegments("groups ·Sections"),
    );
  }
});

test("rendered nonwhitespace and mathematics still need their own boxes", () => {
  for (const rangeRects of [
    [],
    [{ width: 0, height: 18 }],
    [{ width: 4, height: 0 }],
  ]) {
    const unrenderedMath = math("x=2");
    unrenderedMath.rangeRects = rangeRects;
    assertExactSegments(
      collectRendered(
        element("p", {}, [
          text("Result "),
          text("missing ", rangeRects),
          unrenderedMath,
          math("x=1"),
          text("."),
        ]),
      ),
      sourceSegments("Result $x=1$."),
    );
  }
  for (const computedStyle of [
    { display: "none" },
    { visibility: "hidden" },
    { opacity: "0" },
  ]) {
    const hidden = math("x=2");
    hidden.computedStyle = computedStyle;
    assertExactSegments(
      collectRendered(element("p", {}, [hidden, math("x=1")])),
      sourceSegments("$x=1$"),
    );
  }
});

test("rendered mathematical roots retain whole-expression and display checks", () => {
  const actual = collectRendered(math("gxg^{-1}", { display: true }));
  assertExactSegments(actual, sourceSegments("$$gxg^{-1}$$"));
  assert.throws(
    () => assertExactSegments(actual, sourceSegments("$gxg^{-1}$")),
    /Complete public region/,
  );
  assert.throws(
    () => assertContainsSegments(actual, sourceSegments("$$g$$")),
    /whole tokens/,
  );
  for (const options of [
    { annotations: 0 },
    { annotations: 2 },
    { namespace: "http://www.w3.org/1999/xhtml" },
    { presentation: false },
  ])
    assert.throws(
      () => collectRendered(math("gxg^{-1}", options)),
      /Each KaTeX root/,
    );
});

test("rendered annotations reject malformed commands even beside a valid whole formula", () => {
  for (const invalid of [
    String.raw`A/J(A)\congF`,
    String.raw`A/J(A)\congM_2(F)`,
  ]) {
    const actual = collect(
      element("section", {}, [math("x=1"), math(invalid)]),
    );
    assert.throws(
      () => assertContainsSegments(actual, sourceSegments("$x=1$")),
      /Undefined control sequence/,
    );
    assert.throws(
      () => assertExactSegments(actual, actual),
      /Undefined control sequence/,
    );
  }
  assertContainsSegments(
    collect(
      element("section", {}, [math("x=1"), math(String.raw`A/J(A)\cong F`)]),
    ),
    sourceSegments("$x=1$"),
  );
});

test("public mathematics preserves ordered complete formula tokens and all prose", () => {
  assertExactSegments(
    sourceSegments(" A $RK$-module "),
    sourceSegments("A $RK$-module"),
  );
  assertContainsSegments(
    sourceSegments("Prefix. A $RK$-module. Suffix."),
    sourceSegments("A $RK$-module"),
  );
  assertExactSegments(
    collect(
      element("p", {}, [
        text("The result is "),
        math("k^2\\equiv k\\pmod m"),
        text("."),
      ]),
    ),
    sourceSegments("The result is $k^2\\equiv k\\pmod m$."),
  );
  const mutations = [
    ["English article changed to variable", "$A$ $RK$-module", "A $RK$-module"],
    ["raw subscript", "$I$_2", "$I_2$"],
    ["raw equality", "$g$ = $h$", "$g=h$"],
    ["raw modulus", "$k^2\\equiv k$ (mod m)", "$k^2\\equiv k\\pmod m$"],
    ["raw arrow", "$f$ : $X$ → $Y$", "$f\\colon X\\to Y$"],
    ["changed sign", "$-12$", "$12$"],
    ["missing digit", "$1$", "$12$"],
    ["changed formula order", "$H$ then $G$", "$G$ then $H$"],
    ["extra raw value beside valid formula", "$g=h$ and 12", "$g=h$"],
    [
      "raw count beside valid formula",
      "$C_{12}$ has 3 elements",
      "$C_{12}$ has $3$ elements",
    ],
    ["missing prose", "$g=h$", "$g=h$ because the action is faithful"],
    ["wrong display mode", "$$g=h$$", "$g=h$"],
  ];
  for (const [label, actual, expected] of mutations)
    assert.throws(
      () =>
        assertExactSegments(sourceSegments(actual), sourceSegments(expected)),
      /Complete public region/,
      label,
    );
  assert.throws(
    () =>
      assertContainsSegments(sourceSegments("$I_2$"), sourceSegments("$I$")),
    /whole tokens/,
  );
  assert.throws(
    () =>
      assertContainsSegments(
        sourceSegments("$q=X^2+X+1$"),
        sourceSegments("$X^2+X+1$"),
      ),
    /whole tokens/,
  );
  assert.throws(
    () =>
      assertContainsSegments(
        sourceSegments("$G$ then $H$"),
        sourceSegments("$H$ then $G$"),
      ),
    /whole tokens/,
  );
  assert.throws(
    () => assertContainsSegments(sourceSegments("$G$"), []),
    /Empty containment/,
  );
  assert.throws(
    () =>
      assertContainsSegments(
        sourceSegments("The result is $G$."),
        sourceSegments("The result"),
      ),
    /requires a complete mathematical expression/,
  );
});

test("one KaTeX root produces one formula while SVG and native controls retain prose", () => {
  const fixture = element("section", {}, [
    text("A "),
    math("RK"),
    text("-module "),
    element("svg", {}, [element("text", {}, [text("12")])]),
    element("button", {}, [text("Run 2")]),
    element("select", {}, [element("option", {}, [text("Choice 3")])]),
  ]);
  const actual = collect(fixture);
  assertExactSegments(actual, sourceSegments("A $RK$-module 12Run 2Choice 3"));
  assert.equal(actual.filter((part) => part.kind === "math").length, 1);
  assert.throws(
    () => assertExactSegments(actual, sourceSegments("A $RK$-module")),
    /Complete public region/,
  );
  assertExactSegments(
    collect(math("g=h", { display: true })),
    sourceSegments("$$g=h$$"),
  );
});

test("annotations require actual MathML presentation and reject malformed roots", () => {
  for (const [label, options] of [
    ["missing annotation", { annotations: 0 }],
    ["duplicate annotations", { annotations: 2 }],
    ["HTML element named math", { namespace: "http://www.w3.org/1999/xhtml" }],
    ["annotation without presentation", { presentation: false }],
  ])
    assert.throws(() => collect(math("RK", options)), /Each KaTeX root/, label);
  assert.throws(() => collect(math(" ")), /nonempty/);
  assert.throws(
    () => collect(element("span", { class: "katex-error" }, [text("bad")])),
    /KaTeX error/,
  );
  const nested = math("RK");
  nested.childNodes.push(math("G"));
  assert.throws(() => collect(nested), /Each KaTeX root|Nested KaTeX root/);
});

test("Playwright assertions retry exact, bounded and absent sequences", async () => {
  for (const [assertion, before, after] of [
    [expectExactMathRegion, "$-12$", "$12$"],
    [expectContainedMath, "Result: $-12$.", "Result: $12$."],
    [expectAbsentMath, "$12$", "$-12$"],
  ]) {
    let observations = 0;
    const locator = {
      evaluate: async () =>
        sourceSegments(++observations === 1 ? before : after),
    };
    await assertion(locator, "$12$", { timeout: 1000, intervals: [1] });
    assert.equal(observations, 2);
  }
});
