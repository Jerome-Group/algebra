import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { selectChoice, expectChoiceValue } from "./choice-controls.mjs";
import {
  expectContainedMath,
  expectExactMathRegion,
  observeDeclaredMathRegions,
  recordPublicMathResources,
} from "./public-math-segments.mjs";

const contracts = JSON.parse(
  readFileSync(
    new URL("../../lib/algebra/lab-contracts.json", import.meta.url),
    "utf8",
  ),
);
const routes = {
  "orthogonal-axis-angle": { prediction: true, model: ".axis-angle-lab" },
  "orthogonal-metric-orientation": {
    prediction: true,
    model: ".metric-orientation-lab",
  },
  "mh2220-congruence": { prediction: false, model: ".generic-lab" },
  "mh2220-double-cosets": { prediction: false, model: ".generic-lab" },
  "mh2220-commutator": { prediction: false, model: ".conjugacy-orbits" },
  "mh2220-quaternion": { prediction: false, model: ".generic-lab" },
  "cube-signed-permutations": { prediction: false, model: ".point-row" },
};

async function openLab(page, id) {
  const route = routes[id];
  expect(route, `explicit route prerequisite for ${id}`).toBeDefined();
  expect(Object.hasOwn(contracts, id)).toBe(route.prediction);
  await page.goto(`/#lab:${id}`);
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const experiment = page.locator(".exploration");
  const prediction = experiment.getByRole("textbox", {
    name: "Your mathematical prediction",
    exact: true,
  });
  if (route.prediction) {
    await expect(prediction).toBeVisible();
    await prediction.fill(
      "I will compare each exact input with its numerical and group interpretation.",
    );
    await experiment
      .getByRole("button", { name: "Test my prediction", exact: true })
      .click();
  } else {
    await expect(prediction).toHaveCount(0);
  }
  await expect(experiment.locator(route.model)).toBeVisible();
  return experiment;
}

async function setAxis(lab, values) {
  for (const [i, coordinate] of ["x", "y", "z"].entries()) {
    const input = lab.getByRole("spinbutton", {
      name: `Axis ${coordinate} component`,
      exact: true,
    });
    await input.fill(values[i]);
    await expect
      .poll(async () => Number(await input.inputValue()))
      .toBe(Number(values[i]));
  }
}

async function expectAxisLine(lab, direction) {
  const line = lab.locator('line[stroke="#9b5427"][stroke-dasharray="4 5"]');
  await expect(line).toHaveCount(1);
  const project = (scale) => {
    const [a, b, c] = direction.map((value) => scale * value);
    const x = Math.cos(0.62) * a + Math.sin(0.62) * c;
    const z = -Math.sin(0.62) * a + Math.cos(0.62) * c;
    const y = Math.cos(-0.38) * b - Math.sin(-0.38) * z;
    const depth = Math.sin(-0.38) * b + Math.cos(-0.38) * z;
    return [280 + (650 * x) / (7 - depth), 192 - (650 * y) / (7 - depth)];
  };
  const expected = [...project(-1.8), ...project(1.8)];
  const actual = await line.evaluate((element) =>
    ["x1", "y1", "x2", "y2"].map((name) => Number(element.getAttribute(name))),
  );
  actual.forEach((value, i) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(value - expected[i])).toBeLessThan(1e-9);
  });
}

test("ordinary, subnormal and huge finite axes share the matrix, readout and drawn direction", async ({
  page,
}, testInfo) => {
  const finishResources = await recordPublicMathResources(testInfo, page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const lab = (await openLab(page, "orthogonal-axis-angle")).locator(
    ".axis-angle-lab",
  );
  const angle = lab.getByRole("spinbutton", {
    name: "Exact angle in degrees",
    exact: true,
  });
  await angle.fill("90");
  for (const components of [
    ["1", "1", "0"],
    ["5e-324", "5e-324", "0"],
  ]) {
    await setAxis(lab, components);
    await expectContainedMath(
      lab.locator(".live-mathematics"),
      String.raw`$n\approx(0.707, 0.707, 0.000)$`,
    );
    await expectContainedMath(
      lab.locator(".live-mathematics"),
      String.raw`$$R\approx\begin{pmatrix}0.50&0.50&0.71\\0.50&0.50&-0.71\\-0.71&0.71&0\end{pmatrix}$$`,
    );
    await expectAxisLine(lab, [Math.SQRT1_2, Math.SQRT1_2, 0]);
    await observeDeclaredMathRegions(testInfo, page);
  }
  await setAxis(lab, ["1.7e308", "1.7e308", "1.7e308"]);
  await expect(angle).toHaveValue("90");
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$n\approx(0.577, 0.577, 0.577)$`,
  );
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$$R\approx\begin{pmatrix}0.33&-0.24&0.91\\0.91&0.33&-0.24\\-0.24&0.91&0.33\end{pmatrix}$$`,
  );
  await expectAxisLine(lab, [
    1 / Math.sqrt(3),
    1 / Math.sqrt(3),
    1 / Math.sqrt(3),
  ]);
  await observeDeclaredMathRegions(testInfo, page);
  await angle.fill("120");
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$n\approx(0.577, 0.577, 0.577)$`,
  );
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$$R\approx\begin{pmatrix}0&0&1.00\\1.00&0&0\\0&1.00&0\end{pmatrix}$$`,
  );
  await expectAxisLine(lab, [
    1 / Math.sqrt(3),
    1 / Math.sqrt(3),
    1 / Math.sqrt(3),
  ]);
  await expect(lab.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByText("Laboratory unavailable", { exact: true }),
  ).toHaveCount(0);
  await observeDeclaredMathRegions(testInfo, page);
  await finishResources();
  expect(errors).toEqual([]);
});

test("zero and out-of-range controls retain a native recovery path", async ({
  page,
}) => {
  const lab = (await openLab(page, "orthogonal-axis-angle")).locator(
    ".axis-angle-lab",
  );
  await setAxis(lab, ["0", "0", "0"]);
  await expect(lab.getByRole("alert")).toHaveText(
    "Enter a nonzero finite axis vector.",
  );
  await expect(lab.locator(".live-mathematics")).toHaveCount(0);
  await lab
    .getByRole("button", { name: "Use face axis (1,0,0)", exact: true })
    .click();
  await expect(lab.getByRole("alert")).toHaveCount(0);
  const angle = lab.getByRole("spinbutton", {
    name: "Exact angle in degrees",
    exact: true,
  });
  await expect(angle).toHaveAttribute("type", "number");
  await angle.fill("361");
  await expect(angle).toHaveValue("361");
  await expect(lab.getByRole("alert")).toContainText("Enter an angle from");
  await expect(
    lab.getByRole("slider", { name: "Rotation angle in degrees", exact: true }),
  ).toHaveCount(0);
  await angle.fill("90");
  await expect(lab.getByRole("alert")).toHaveCount(0);
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$$R\approx\begin{pmatrix}1&0&0\\0&0&-1\\0&1&0\end{pmatrix}$$`,
  );
  await angle.fill("");
  await expect(angle).toHaveValue("0");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "At the identity rotation every axis is possible",
  );
});

test("scientific readouts and near-boundary angles distinguish numeric candidates from exact rotations", async ({
  page,
}) => {
  const lab = (await openLab(page, "orthogonal-axis-angle")).locator(
    ".axis-angle-lab",
  );
  const x = lab.getByRole("spinbutton", {
    name: "Axis x component",
    exact: true,
  });
  await x.fill("1e21");
  await expectContainedMath(x.locator(".."), "$10^{21}$");
  await lab
    .getByRole("button", {
      name: "Use cube body diagonal (1,1,1)",
      exact: true,
    })
    .click();
  const angle = lab.getByRole("spinbutton", {
    name: "Exact angle in degrees",
    exact: true,
  });
  const live = lab.locator(".live-mathematics");
  await angle.fill("1e-7");
  await expectContainedMath(
    live,
    String.raw`$$Rn=n,\quad\operatorname{tr}(R)=1+2\cos(\left(10^{-7}\right)^{\circ})$$`,
  );
  await expectContainedMath(
    lab
      .locator(".range-control")
      .filter({ hasText: "Rotation angle in degrees" }),
    "$10^{-7}$",
  );
  await expectContainedMath(
    live,
    String.raw`Numerical cube candidate found (entrywise tolerance $10^{-8}$). Candidate vertex permutation (images of $1$–$8$): $(1, 2, 3, 4, 5, 6, 7, 8)$. Candidate generator word: $I$.`,
  );
  await expect(live).toContainText("does not assert exact cube membership");
  await angle.fill("1e-10");
  await expect(live).not.toContainText("At the identity rotation");
  await angle.fill("179.9999999999");
  await expect(live).not.toContainText("the axis line is determined");
  await angle.fill("180");
  await expectContainedMath(
    live,
    String.raw`At $180^\circ$ the axis line is determined, but $n$ and $-n$ describe the same rotation.`,
  );
});

test("C and V keep additive values through controls, table, graph, cosets and scope", async ({
  page,
}) => {
  const lab = (await openLab(page, "mh2220-congruence")).locator(
    ".generic-lab",
  );
  const a = lab.getByRole("combobox", { name: "Element a", exact: true });
  const b = lab.getByRole("combobox", { name: "Element b", exact: true });
  await selectChoice(page, a, "2");
  await selectChoice(page, b, "3");
  await expectContainedMath(lab, String.raw`$$a+b=5,\quad b+a=5,\quad -a=4$$`);
  await expect(
    lab.getByRole("img", { name: "Finite group addition graph", exact: true }),
  ).toBeVisible();
  await expect(lab).toContainText("ADDING THE SELECTED ELEMENT");
  await lab
    .getByRole("button", { name: "Addition table", exact: true })
    .click();
  await expectExactMathRegion(
    lab.locator(".cayley-table thead th").first(),
    "$a+b$",
  );
  await expectExactMathRegion(
    lab.locator(".cayley-table tbody tr").nth(2).locator("td").nth(3),
    "$5$",
  );
  await lab.getByText("Conventions and scope", { exact: true }).click();
  await expectContainedMath(
    lab,
    String.raw`$$C_{6}=\mathbb Z/6\mathbb Z,\quad 0\text{ is the identity}$$`,
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Finite group", exact: true }),
    "V",
  );
  await expectChoiceValue(page, a, "1");
  await expectChoiceValue(page, b, "2");
  await expectContainedMath(
    lab,
    String.raw`$$a+b=(1,1),\quad b+a=(1,1),\quad -a=(1,0)$$`,
  );
  await expect(a).toHaveAccessibleDescription("a equals pair 1, 0");
  await expectContainedMath(
    lab,
    String.raw`$$V_4=(\mathbb Z/2\mathbb Z)^2,\quad (a,b)+(c,d)=(a+c,b+d)\pmod 2$$`,
  );
  const cosets = (await openLab(page, "mh2220-double-cosets")).locator(
    ".generic-lab",
  );
  await selectChoice(
    page,
    cosets.getByRole("combobox", { name: "Finite group", exact: true }),
    "C",
  );
  await expectContainedMath(cosets.locator(".coset-bin").first(), "$H+0+K$");
  await expectContainedMath(cosets, "$$b+H-b=\\{0,1,2\\}$$");
});

test("orbit names identify actual D, S, Q and C elements and preserve action values", async ({
  page,
}) => {
  await openLab(page, "mh2220-commutator");
  const experiment = page.locator(".exploration");
  const names = experiment.locator(".conjugacy-orbits");
  await expect(
    names.getByRole("button", {
      name: "Select orbit element identity",
      exact: true,
    }),
  ).toBeVisible();
  await names
    .getByRole("button", {
      name: "Select orbit element r to power 2",
      exact: true,
    })
    .click();
  await expectContainedMath(
    experiment,
    String.raw`$$\operatorname{Stab}(r^{2})=\{e,r,r^{2},r^{3},s,rs,r^{2}s,r^{3}s\}$$`,
  );
  const group = experiment.getByRole("combobox", {
    name: "Group acting on itself",
    exact: true,
  });
  await selectChoice(page, group, "S");
  await expect(
    names.getByRole("button", {
      name: "Select orbit element cycle 2 3",
      exact: true,
    }),
  ).toBeVisible();
  await selectChoice(page, group, "Q");
  await names
    .getByRole("button", { name: "Select orbit element minus i", exact: true })
    .click();
  await expectContainedMath(
    experiment,
    String.raw`$$\operatorname{Stab}(-i)=\{1,i,-1,-i\}$$`,
  );
  await selectChoice(page, group, "C");
  await expect(
    names.getByRole("button", {
      name: "Select orbit element residue 0",
      exact: true,
    }),
  ).toBeVisible();
  const action = experiment.getByRole("combobox", {
    name: "Action on group",
    exact: true,
  });
  await selectChoice(page, action, "regular");
  await expect(action).toHaveAccessibleDescription(
    "Left translation, h plus x",
  );
  await expectContainedMath(
    experiment,
    String.raw`$$G\curvearrowright G,\quad h\cdot x=h+x$$`,
  );
  await expectContainedMath(experiment, "since $h+x=x$ implies $h=0$");
  await selectChoice(page, action, "conjugation");
  await expectContainedMath(
    experiment,
    String.raw`$$G\curvearrowright G,\quad h\cdot x=h+x-h$$`,
  );
  await selectChoice(page, group, "D");
  await selectChoice(page, action, "regular");
  await expect(action).toHaveAccessibleDescription(
    "Left translation, h times x",
  );
  await expectContainedMath(
    experiment,
    String.raw`$$G\curvearrowright G,\quad h\cdot x=hx$$`,
  );
  await expect(names).toHaveCount(1);
});

test("rounded orientation matrices keep exact invariant claims about the selected map", async ({
  page,
}) => {
  const lab = (await openLab(page, "orthogonal-metric-orientation")).locator(
    ".metric-orientation-lab",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Transformation", exact: true }),
    "rotation3",
  );
  const slider = lab.getByRole("slider", {
    name: "Spatial rotation angle in degrees",
    exact: true,
  });
  await slider.focus();
  await slider.press("Home");
  for (let i = 0; i < 45; i++) await slider.press("ArrowRight");
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$$Q\approx\begin{pmatrix}0.71&-0.71&0\\0.71&0.71&0\\0&0&1\end{pmatrix},\quad Q^TQ=I_3,\quad\det Q=1$$`,
  );
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Numerical cube candidate",
  );
});

test("quaternion products and cube point mappings retain actual multiplicative values", async ({
  page,
}) => {
  const lab = (await openLab(page, "mh2220-quaternion")).locator(
    ".generic-lab",
  );
  await expectContainedMath(
    lab,
    String.raw`$$ab=k,\quad ba=-k,\quad a^{-1}=-i$$`,
  );
  await lab
    .getByRole("button", { name: "Multiplication table", exact: true })
    .click();
  await expectExactMathRegion(
    lab.locator(".cayley-table thead th").first(),
    "$ab$",
  );
  await expectExactMathRegion(
    lab.locator(".cayley-table tbody tr").nth(1).locator("td").nth(2),
    "$k$",
  );
  const cube = await openLab(page, "cube-signed-permutations");
  await cube
    .getByRole("button", { name: "Apply A, rotate about x", exact: true })
    .click();
  const images = [3, 1, 4, 2, 7, 5, 8, 6];
  for (const [i, image] of images.entries()) {
    const button = cube.getByRole("button", {
      name: `Follow point ${i + 1}, image ${image}`,
      exact: true,
    });
    await expectExactMathRegion(button, `$${i + 1}\\mapsto ${image}$`);
    await button.click();
    await expect(button).toHaveClass(/selected/);
  }
});
