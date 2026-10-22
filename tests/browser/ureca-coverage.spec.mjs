import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const lessons = JSON.parse(
  readFileSync(new URL("../../lib/algebra/lessons.json", import.meta.url)),
);
const guides = JSON.parse(
  readFileSync(
    new URL("../../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);
const additions = lessons.filter(({ id }) =>
  /^ureca-(foundations|constructions|theory)-/.test(id),
);

test("retained square lessons show explicit conventions before their examples", async ({
  page,
}) => {
  const ids = new Set([
    "foundations-linear-algebra",
    "ureca-linear-action",
    "ureca-permutation-module",
    "ureca-invariant-subspaces",
    "ureca-intertwiners",
    "representations-maschke",
    "tensor-products",
  ]);
  await page.setViewportSize({ width: 390, height: 1000 });
  for (const lesson of lessons.filter(({ id }) => ids.has(id))) {
    await page.goto(`/#${lesson.id}`);
    const reader = page.locator(".guided-reader");
    await reader.getByRole("button", { name: "Define", exact: true }).click();
    const conventions = reader.locator(".guided-conventions");
    await expect(conventions).toBeInViewport();
    await expect(conventions).toContainText(lesson.conventions);
    await expect(conventions).toContainText("D₈");
    await expect(conventions).toContainText("D₄");
    const position = await conventions.boundingBox();
    const example = await reader
      .locator(".guided-example")
      .first()
      .boundingBox();
    expect(position.y + position.height).toBeLessThanOrEqual(example.y);
  }
});

for (const lesson of additions)
  test(`${lesson.id} exposes its complete guided teaching and working checkpoint`, async ({
    page,
  }, info) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(`/#${lesson.id}`);
    await expect(page.locator("#lesson-heading")).toContainText(lesson.title);
    const reader = page.locator(".guided-reader");
    await expect(reader.locator(".guided-conventions")).toBeVisible();
    await expect(reader.locator(".guided-example")).toHaveCount(
      guides[lesson.id].examples.length,
    );
    await expect(reader.locator(".learning-checkpoint")).toHaveCount(4);
    await reader
      .getByRole("button", { name: "Work examples", exact: true })
      .click();
    await expect(page.locator(`[id="${lesson.id}-examples"]`)).toBeFocused();
    await reader
      .getByRole("button", {
        name: "Hide proof steps and reconstruct",
        exact: true,
      })
      .click();
    const proof = reader.locator(`[id="${lesson.id}-proof-steps"]`);
    await expect(proof).toBeHidden();
    await reader
      .getByRole("button", {
        name: "Reveal justified proof steps",
        exact: true,
      })
      .click();
    await expect(proof.locator(":scope > li")).toHaveCount(
      guides[lesson.id].proofSteps.length,
    );
    const checkpoint = reader.locator(".learning-checkpoint").filter({
      has: page.getByText("Check the hypothesis", { exact: true }),
    });
    await checkpoint
      .getByRole("radio")
      .nth(guides[lesson.id].boundaryCheck.answer)
      .check();
    await expect(reader.locator(".competency-progress")).toContainText(
      "0 of 3",
    );
    await checkpoint
      .getByRole("button", { name: "Check reasoning", exact: true })
      .click();
    await expect(checkpoint.getByRole("status")).toContainText("Correct.");
    await expect(reader.locator(".competency-progress")).toContainText(
      "1 of 3",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await expect(page.locator(".katex-error")).toHaveCount(0);
    if (
      [
        "ureca-foundations-abelian-weights",
        "ureca-constructions-diagonal-tensor",
        "ureca-theory-mackey-orbits",
      ].includes(lesson.id)
    )
      await page.screenshot({ path: info.outputPath(`${lesson.id}-390.png`) });
    expect(errors).toEqual([]);
  });

for (const width of [390, 1440])
  test(`reviewed topic evidence opens its teaching at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#sources");
    const coverage = page.locator(".ureca-coverage");
    await expect(coverage).toContainText("86 of 86 required topics");
    await expect(coverage).toContainText("74 exercise methods");
    const section = coverage
      .locator(".ureca-topic-section")
      .filter({ hasText: "T18 ·" });
    await section.locator(":scope > summary").click();
    const topic = section
      .locator(".ureca-topics > li > details")
      .filter({ hasText: "T18 ·" });
    await topic.locator(":scope > summary").click();
    await expect(topic.locator(".ureca-topic-status")).toHaveText(
      "Reviewed teaching",
    );
    await expect(
      topic.getByRole("link", {
        name: "Independent mathematics review",
        exact: true,
      }),
    ).toHaveAttribute("href", /docs\/research\/ureca-foundations-review\.md$/);
    await page.screenshot({
      path: info.outputPath(`topic-evidence-${width}.png`),
    });
    await topic
      .getByRole("link", {
        name: "All complex irreducibles of finite abelian groups",
        exact: true,
      })
      .click();
    await expect(page.locator("#lesson-heading")).toBeFocused();
    await expect(page.locator(".guided-example")).toHaveCount(4);
    await expect(page.locator(".guided-reader")).toContainText(
      "Two displayed factors can need only one faithful character",
    );
    await expect(page.locator(".guided-reader")).toContainText(
      "A condition on every square and an impossible involution pattern",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
