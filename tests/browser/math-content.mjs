import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  readCatalogue,
  compileManifest,
  delimiterParts,
} from "../../scripts/lib/math-presentation.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const catalogue = await readCatalogue(root);
const manifest = JSON.parse(
  await readFile(
    new URL(
      "../../lib/algebra/math-presentation/annotations.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const presentations = new Map(
  compileManifest(catalogue, manifest).mappings.map(({ text, presented }) => [
    text,
    presented,
  ]),
);
const normalize = (text) => text.replace(/\s+/g, " ").trim();
export const cataloguePresentation = (text) => presentations.get(text) ?? text;

export async function expectCatalogueText(locator, text, { prefix = "" } = {}) {
  const parts = delimiterParts(presentations.get(text) ?? text);
  await expect(locator.locator("annotation")).toHaveText(
    parts.filter(({ kind }) => kind !== "text").map(({ text }) => text),
  );
  await expect(locator.locator(".katex-error")).toHaveCount(0);
  const prose = await locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const pieces = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (
        !node.parentElement.closest(
          ".math-inline, .math-display, .chapter-number",
        )
      )
        pieces.push(node.textContent);
    return pieces.join("");
  });
  expect(normalize(prose)).toBe(
    normalize(
      prefix +
        parts
          .filter(({ kind }) => kind === "text")
          .map(({ text }) => text)
          .join(""),
    ),
  );
}
