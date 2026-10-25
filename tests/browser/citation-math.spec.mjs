import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { expectExactMathRegion } from "./public-math-segments.mjs";

const lessons = JSON.parse(
  fs.readFileSync(new URL("../../lib/algebra/lessons.json", import.meta.url)),
);
const cases = [
  [
    "ureca-constructions-s5-a4-matrix",
    "role",
    "Primary reciprocity input; the displayed $S_5/A_4$ matrix and decompositions are independently computed here",
  ],
  [
    "ureca-constructions-a5-table",
    "role",
    "Primary theorem inputs; the displayed $A_5$ table is independently derived here by restriction",
  ],
  [
    "ureca-constructions-a6-table",
    "role",
    "Primary class-splitting input; the $A_6$ table is an original computation from the $S_6$ construction and index-two restriction proof",
  ],
  [
    "odyssey-character-table",
    "section",
    "§15 The Character Table: row orthogonality; $S_3$ example",
  ],
  [
    "cube-four-actions",
    "section",
    "Chapter 6, Lemma 6.2 ($24$ rotations); Theorem 6.5 (Burnside). Full $48$-element actions are original coordinate extensions.",
  ],
];

for (const width of [390, 1440]) {
  for (const id of ["T72", "T73"]) {
    test(`${id} nested Sources citation preserves the complete conjugation expression at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/#sources");
      await expect(page.locator(".algebra-app")).toHaveAttribute(
        "data-ready",
        "true",
      );
      const collection = page.locator(".source-collection").filter({
        has: page.getByRole("heading", { name: "URECA Y2", exact: true }),
      });
      const section = collection.locator(".ureca-topic-section").filter({
        has: page.locator(":scope > summary", {
          hasText: "Alternating conjugacy classes",
        }),
      });
      await section.locator(":scope > summary").click();
      const topic = section.locator(".ureca-topics > li > details").filter({
        has: page.locator("summary", { hasText: new RegExp(`^${id} ·`) }),
      });
      await topic.locator(":scope > summary").click();
      const citation = topic.locator(":scope > ul > li").filter({
        has: page.getByRole("link", {
          name: "Robert A. Wilson, The alternating groups",
          exact: true,
        }),
      });
      await expect(citation).toBeVisible();
      await expectExactMathRegion(
        citation,
        "Robert A. Wilson, The alternating groups · Sections 1.3.1-1.3.2, printed pages 5-6. The source uses right permutations composed left to right. The independently checked teaching uses left function composition and conjugation $gxg^{-1}$.",
      );
      await expect(citation.getByRole("link")).toHaveAttribute(
        "href",
        "https://webspace.maths.qmul.ac.uk/r.a.wilson/FSG/notes1.pdf",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await citation.screenshot({
        path: info.outputPath(`${id}-citation-${width}.png`),
      });
    });
  }
  for (const [id, field, presented] of cases) {
    test(`${id} citation preserves mathematical notation and bibliographic prose at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/#${id}`);
      await expect(page.locator(".algebra-app")).toHaveAttribute(
        "data-ready",
        "true",
      );
      const reference = page.getByRole("button", {
        name: "Read the reference notes and further practice",
        exact: true,
      });
      if (await reference.count()) await reference.click();
      const lesson = lessons.find((lesson) => lesson.id === id);
      let target, expected;
      if (field === "role") {
        const reading = page.locator(".further-reading details").first();
        await reading.locator("summary").click();
        target = reading.locator(".reference-list > li > a > span");
        expected = presented;
      } else {
        target = page
          .locator(".lesson-references > .reference-list > li > a > small")
          .first();
        expected =
          presented +
          (lesson.source.pages ? ` · printed pp. ${lesson.source.pages}` : "") +
          (lesson.source.pdfPages
            ? ` · PDF pp. ${lesson.source.pdfPages}`
            : "");
      }
      await expectExactMathRegion(target, expected);
      await expect(target.locator(".math-inline[tabindex]")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await target.screenshot({
        path: info.outputPath(`citation-${width}.png`),
      });
    });
  }
}
