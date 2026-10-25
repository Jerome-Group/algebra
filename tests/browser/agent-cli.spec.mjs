import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
async function inspect(origin, id, actions = []) {
  const { stdout } = await execute(
    process.execPath,
    [
      "scripts/algebra.mjs",
      "inspect",
      id,
      "--url",
      origin,
      "--actions",
      JSON.stringify(actions),
    ],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

test("CLI replays spinbutton boundaries through its declared accessible action schema", async ({}, testInfo) => {
  const result = await inspect(
    testInfo.project.use.baseURL,
    "orthogonal-axis-angle",
    [
      {
        kind: "spinbutton",
        label: "Exact angle in degrees",
        value: 0,
      },
      {
        kind: "spinbutton",
        label: "Exact angle in degrees",
        value: 360,
      },
    ],
  );
  expect(result.ok).toBe(true);
  expect(result.result.mathErrors).toBe(0);
  expect(
    result.result.controls.find(
      (control) => control.label === "Exact angle in degrees",
    ),
  ).toMatchObject({
    kind: "input",
    value: "360",
    min: "0",
    max: "360",
  });
  expect(result.result.mathematicalExpressions).toContain(
    String.raw`360^\circ`,
  );
  expect(result.result.mathematicalExpressions).toContain(
    String.raw`Rn=n,\quad\operatorname{tr}(R)=1+2\cos(360^\circ)`,
  );
  expect(
    result.evidence.find((item) => item.kind === "browser-observation").actions,
  ).toHaveLength(2);
});

test("CLI discovers and replays a custom select option", async ({}, testInfo) => {
  const initial = await inspect(
    testInfo.project.use.baseURL,
    "mh2220-subgroups",
  );
  const choice = initial.result.customChoices.find((control) =>
    control.options.some((option) => !option.disabled),
  );
  expect(choice).toBeTruthy();
  const option = choice.options.find((candidate) => !candidate.disabled);
  const result = await inspect(
    testInfo.project.use.baseURL,
    "mh2220-subgroups",
    [{ kind: "combobox", label: choice.label, value: option.index }],
  );
  expect(result.ok).toBe(true);
  expect(result.result.mathErrors).toBe(0);
});

test("CLI discovers all custom controls and replays plain labels sequentially", async ({}, testInfo) => {
  const origin = testInfo.project.use.baseURL;
  const lesson = "mh2220-double-cosets";
  const initial = await inspect(origin, lesson);
  expect(initial.result.customChoices.map(({ label }) => label)).toEqual([
    "Finite group",
    "Parameter n",
    "Element a",
    "Element b",
  ]);
  const cyclic = initial.result.customChoices[0].options[0];
  expect(cyclic.label).toBe("Cyclic group C n");
  const six = await inspect(origin, lesson, [
    { kind: "combobox", label: "Finite group", value: cyclic.label },
    { kind: "combobox", label: "Parameter n", value: "n equals 6" },
  ]);
  const a = six.result.customChoices.find(({ label }) => label === "Element a");
  const b = six.result.customChoices.find(({ label }) => label === "Element b");
  expect(a.options[2].label).toBe("a equals residue 2");
  expect(b.options[3].label).toBe("b equals residue 3");
  const result = await inspect(origin, lesson, [
    { kind: "combobox", label: "Finite group", value: cyclic.label },
    { kind: "combobox", label: "Parameter n", value: "n equals 6" },
    { kind: "combobox", label: a.label, value: a.options[2].label },
    { kind: "combobox", label: b.label, value: b.options[3].label },
    { kind: "button", label: "Generate H using both a and b" },
  ]);
  expect(result.ok).toBe(true);
  expect(result.result.mathErrors).toBe(0);
  expect(result.result.customChoices).toHaveLength(4);
  expect(result.result.mathematicalExpressions).toContain(
    String.raw`H=\langle a,b\rangle`,
  );
  expect(result.result.mathematicalExpressions).toContain(
    String.raw`H=\{0,1,2,3,4,5\}`,
  );
  expect(result.result.mathematicalExpressions).toContain(
    String.raw`K=\langle b\rangle`,
  );
});

test("CLI completes a choice whose accessible label changes with its value", async ({}, testInfo) => {
  const origin = testInfo.project.use.baseURL;
  const lesson = "ureca-external-tensor-products";
  const initial = await inspect(origin, lesson);
  const factor = initial.result.customChoices.find(
    ({ label }) => label === "Cyclic factor G, currently C3",
  );
  expect(factor).toBeTruthy();
  const down = {
    kind: "combobox",
    label: factor.label,
    value: factor.options[0].label,
  };
  const changed = await inspect(origin, lesson, [down]);
  expect(changed.ok).toBe(true);
  const current = changed.result.customChoices.find(
    ({ label }) => label === "Cyclic factor G, currently C2",
  );
  expect(current).toBeTruthy();
  expect(changed.result.mathematicalExpressions).toContain(
    String.raw`(-1)\times(-2)=2`,
  );
  const restored = await inspect(origin, lesson, [
    down,
    {
      kind: "combobox",
      label: current.label,
      value: current.options[1].label,
    },
  ]);
  expect(restored.ok).toBe(true);
  expect(
    restored.result.customChoices.some(({ label }) => label === factor.label),
  ).toBe(true);
  expect(restored.result.mathematicalExpressions).toContain(
    String.raw`(\omega)\times(-2)=-2\omega`,
  );
  expect(restored.result.mathErrors).toBe(0);
});

test("CLI operates custom cyclic sliders at minimum, maximum and interior values", async ({}, testInfo) => {
  const origin = testInfo.project.use.baseURL;
  const initial = await inspect(origin, "ureca-cyclic-eigenvalues");
  const slider = initial.result.controls.find(
    (control) =>
      control.role === "slider" && control.label.startsWith("Exponent"),
  );
  expect(slider).toBeTruthy();
  expect(slider.kind).not.toBe("input");
  const minimum = Number(slider.min),
    maximum = Number(slider.max);
  for (const value of [minimum, maximum, minimum + 1]) {
    const result = await inspect(origin, "ureca-cyclic-eigenvalues", [
      { kind: "slider", label: slider.label, value },
    ]);
    expect(result.ok).toBe(true);
    expect(result.result.mathErrors).toBe(0);
    expect(
      Number(
        result.result.controls.find(
          (control) =>
            control.role === "slider" && control.label === slider.label,
        ).value,
      ),
    ).toBe(value);
  }
  let rejected;
  try {
    await inspect(origin, "ureca-cyclic-eigenvalues", [
      { kind: "slider", label: slider.label, value: minimum + 0.5 },
    ]);
  } catch (error) {
    rejected = JSON.parse(error.stdout);
    expect(error.code).toBe(1);
  }
  expect(rejected.ok).toBe(false);
  expect(rejected.errors[0].message).toContain("keyboard step");
  expect(
    rejected.evidence.some((item) => item.kind === "browser-observation"),
  ).toBe(false);
});
