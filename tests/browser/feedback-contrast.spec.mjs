import { test, expect } from "@playwright/test";
import { expectExactMathRegion } from "./public-math-segments.mjs";

function feedbackPaint(element) {
  const rgba = (value) => {
    const channels = value.match(/[\d.]+/g)?.map(Number);
    if (!channels || ![3, 4].includes(channels.length))
      throw new Error(`Unsupported computed color ${value}`);
    return [...channels.slice(0, 3), channels[3] ?? 1];
  };
  const luminance = (channels) => {
    const linear = channels.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const targets = new Set([element]);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim() || node.parentElement.closest(".katex-mathml"))
      continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (
      [...range.getClientRects()].some((box) => box.width > 0 && box.height > 0)
    )
      targets.add(node.parentElement);
  }
  return [...targets].map((target) => {
    const style = getComputedStyle(target);
    const ancestors = [];
    for (let parent = target; parent; parent = parent.parentElement) {
      const computed = getComputedStyle(parent);
      ancestors.push({
        tag: parent.tagName,
        className: typeof parent.className === "string" ? parent.className : "",
        background: computed.backgroundColor,
        backgroundAlpha: rgba(computed.backgroundColor)[3],
        opacity: Number(computed.opacity),
        backgroundImage: computed.backgroundImage,
      });
    }
    const background = ancestors.find(
      ({ background }) => rgba(background)[3] === 1,
    );
    if (!background)
      throw new Error("Feedback needs a known opaque background");
    const foreground = rgba(style.color);
    const values = [
      luminance(foreground),
      luminance(rgba(background.background)),
    ];
    return {
      color: style.color,
      alpha: foreground[3],
      background: background.background,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      contrast: (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05),
      ancestors,
    };
  });
}

for (const width of [390, 1440]) {
  test(`homomorphism feedback retains exact mathematics and readable paint through native slider changes at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#lab:mh2220-homomorphism");
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const lab = page.locator(".generic-lab");
    const domain = lab.getByRole("slider", {
      name: "Domain modulus n",
      exact: true,
    });
    const codomain = lab.getByRole("slider", {
      name: "Codomain modulus m",
      exact: true,
    });
    const multiplier = lab.getByRole("slider", {
      name: "Multiplier k",
      exact: true,
    });
    const note = lab.locator(".success-note, .error-note");
    const formula = lab.locator(".lab-controls > .math-display").first();
    const inspect = async (state, modulus, text, phase) => {
      await expect(domain).toHaveAttribute("aria-valuenow", String(modulus));
      await expect(codomain).toHaveAttribute("aria-valuenow", "4");
      await expect(multiplier).toHaveAttribute("aria-valuenow", "1");
      await expect(note).toHaveClass(`${state}-note`);
      await expectExactMathRegion(note, text);
      await expectExactMathRegion(
        formula,
        `$$\\varphi:\\mathbb Z/${modulus}\\to\\mathbb Z/4,\\quad [x]\\mapsto[1x]$$`,
      );
      await expect(note).toBeVisible();
      await note.scrollIntoViewIfNeeded();
      const paint = await note.evaluate(feedbackPaint);
      await info.attach(`${phase}-paint-${width}-${modulus}`, {
        body: JSON.stringify(paint, null, 2),
        contentType: "application/json",
      });
      await lab.screenshot({
        path: info.outputPath(`${phase}-feedback-${width}-${modulus}.png`),
      });
      for (const sample of paint) {
        expect(sample.alpha).toBe(1);
        for (const ancestor of sample.ancestors) {
          expect(ancestor.opacity).toBe(1);
          expect(ancestor.backgroundImage).toBe("none");
          expect([0, 1]).toContain(ancestor.backgroundAlpha);
        }
        expect(sample.contrast).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    };
    await inspect(
      "success",
      12,
      "Well-defined group homomorphism.",
      "initial-success",
    );
    await domain.focus();
    await domain.press("ArrowRight");
    await inspect(
      "error",
      13,
      "Not well-defined on residue classes: $0$ and $13$ represent the same input but map to different residues.",
      "changed-error",
    );
    await domain.focus();
    await domain.press("ArrowLeft");
    await inspect(
      "success",
      12,
      "Well-defined group homomorphism.",
      "restored-success",
    );
  });
}
