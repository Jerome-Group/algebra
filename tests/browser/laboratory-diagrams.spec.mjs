import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expectContainedMath } from "./public-math-segments.mjs";

async function checkReadingViews(page, region, info, name) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await region.screenshot({ path: info.outputPath(`${name}-${width}.png`) });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  await info.attach("axe", {
    body: JSON.stringify(audit),
    contentType: "application/json",
  });
  expect(
    audit.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);
  await expect(region.locator(".katex-error")).toHaveCount(0);
}

test("Euclid updates the actual ideal diagram together with the remainder calculation", async ({
  page,
}, info) => {
  await page.goto("/#lab:m3220-euclidean");
  const panel = page.locator(".visual-panel");
  await expect(panel.locator(".structure-node annotation")).toHaveText([
    String.raw`\langle 84,30\rangle_{\mathbb Z}`,
    String.raw`\langle 30,24\rangle_{\mathbb Z}`,
    String.raw`\langle 24,6\rangle_{\mathbb Z}`,
    String.raw`\langle 6\rangle_{\mathbb Z}`,
  ]);
  const first = panel.getByRole("slider", {
    name: "First positive integer",
    exact: true,
  });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(first).toHaveAttribute("aria-valuenow", "85");
  await expect(panel.locator(".structure-node annotation")).toHaveText([
    String.raw`\langle 85,30\rangle_{\mathbb Z}`,
    String.raw`\langle 30,25\rangle_{\mathbb Z}`,
    String.raw`\langle 25,5\rangle_{\mathbb Z}`,
    String.raw`\langle 5\rangle_{\mathbb Z}`,
  ]);
  await expect(panel.locator(".euclid-steps annotation")).toHaveText([
    String.raw`85=2\cdot 30+25`,
    String.raw`30=1\cdot 25+5`,
    String.raw`25=5\cdot 5+0`,
  ]);
  await expectContainedMath(panel, String.raw`$\gcd(85,30)=5$`);
  await panel
    .getByRole("button", { name: "Follow relationship 3", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Follow relationship 3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expectContainedMath(panel.locator(".relationship-readout"), [
    {
      kind: "math",
      tex: String.raw`\langle 25,5\rangle_{\mathbb Z}`,
      display: false,
    },
    { kind: "math", tex: String.raw`25=5\cdot5+0`, display: false },
    { kind: "prose", text: " preserves the ideal" },
    {
      kind: "math",
      tex: String.raw`\langle 5\rangle_{\mathbb Z}`,
      display: false,
    },
  ]);
  await checkReadingViews(page, panel, info, "euclid");
  await panel
    .getByRole("button", { name: "Read diagram labels", exact: true })
    .click();
  await expect(panel.locator(".diagram-viewport")).toHaveAttribute(
    "data-readable",
    "true",
  );
  await panel.getByRole("region", { name: /original-size labels/ }).focus();
  await page.keyboard.press("ArrowRight");
  await checkReadingViews(page, panel, info, "euclid-readable");
});

test("prime chains expose their own ambient ring and quotient witnesses", async ({
  page,
}, info) => {
  await page.goto("/#lab:m3220-krull");
  const panel = page.locator(".prime-chain-comparison");
  const integers = panel.getByRole("figure", {
    name: "Integer ring",
    exact: true,
  });
  const polynomials = panel.getByRole("figure", {
    name: "Polynomial ring over a field",
    exact: true,
  });
  await expectContainedMath(
    integers,
    String.raw`$$(0)\subsetneq(2)\quad\text{in }\mathbb Z$$`,
  );
  await expectContainedMath(
    polynomials,
    String.raw`$$(0)\subsetneq(X)\subsetneq(X,Y)\quad\text{in }F[X,Y]$$`,
  );
  for (const figure of [integers, polynomials])
    await figure
      .getByText("Why these ideals are prime", { exact: true })
      .click();
  await expectContainedMath(
    integers,
    String.raw`$$\mathbb Z/(2)\cong\mathbb F_2$$`,
  );
  await expectContainedMath(polynomials, String.raw`$$F[X,Y]/(X)\cong F[Y]$$`);
  await expectContainedMath(polynomials, String.raw`$$F[X,Y]/(X,Y)\cong F$$`);
  await expect(panel).toContainText("A drawn chain gives a lower bound");
  await expect(page.locator(".structure-map")).toHaveCount(0);
  await checkReadingViews(page, panel, info, "prime-chains");
});

test("tetrahedral displacement arrows and all six spring extensions follow the selected motion", async ({
  page,
}, info) => {
  await page.goto("/#lab:ureca-theory-tetrahedron-rigid-motions");
  const panel = page.locator(".tetrahedral-displacements");
  const extensions = panel
    .getByRole("table", { name: "First-order spring extensions", exact: true })
    .locator("tbody td annotation");
  const arrowPositions = () =>
    panel
      .locator("svg g line")
      .evaluateAll((lines) =>
        lines.map((line) =>
          ["x1", "y1", "x2", "y2"].map((key) => line.getAttribute(key)),
        ),
      );
  await expect(extensions).toHaveText(["0", "0", "0", "0", "0", "0"]);
  let previous = await arrowPositions();
  for (const [label, values] of [
    ["Infinitesimal rotation", ["0", "0", "0", "0", "0", "0"]],
    ["Uniform breathing strain", Array(6).fill(String.raw`\frac{8}{2\sqrt2}`)],
    [
      "Symmetric shear strain",
      [
        "0",
        "0",
        String.raw`\frac{8}{2\sqrt2}`,
        String.raw`\frac{-8}{2\sqrt2}`,
        "0",
        "0",
      ],
    ],
  ]) {
    const choice = panel.getByRole("button", { name: label, exact: true });
    await choice.focus();
    await page.keyboard.press("Enter");
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(extensions).toHaveText(values);
    const current = await arrowPositions();
    expect(current).toHaveLength(4);
    expect(current).not.toEqual(previous);
    previous = current;
  }
  await expect(panel.locator(".live-mathematics")).toContainText(
    "outside the rigid-motion kernel",
  );
  await expect(panel).toContainText("not a time simulation");
  await checkReadingViews(page, panel, info, "tetrahedral-strain");
});
