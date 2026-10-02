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
        label: "Exact angle in degrees, currently 120",
        value: 0,
      },
      {
        kind: "spinbutton",
        label: "Exact angle in degrees, currently 0",
        value: 360,
      },
    ],
  );
  expect(result.ok).toBe(true);
  expect(result.result.mathErrors).toBe(0);
  expect(result.result.mathematicalOutput).toContain("360°");
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
