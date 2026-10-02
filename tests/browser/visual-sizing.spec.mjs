import fs from "node:fs";
import { test, expect } from "@playwright/test";

const lessons = JSON.parse(
  fs.readFileSync(new URL("../../lib/algebra/lessons.json", import.meta.url)),
);
const widths = [320, 375, 768, 1280];
test.describe.configure({ mode: "parallel" });

async function openLaboratory(page, id, guided = false) {
  await page.goto(`/#${guided ? "" : "lab:"}${id}`);
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const panel = page.locator(".visual-panel");
  const prediction = panel.locator(".experiment-context textarea");
  if (await prediction.count()) {
    await prediction.fill(
      "I will compare the example and its mathematical output.",
    );
    await panel.locator(".experiment-context > button").click();
  }
  await expect(page.locator(".laboratory-loading")).toHaveCount(0);
  await expect(page.locator(".laboratory-load-error")).toHaveCount(0);
  await expect(panel.locator(".katex").first()).toBeVisible();
  return panel;
}

async function measureLaboratory(panel) {
  return panel.evaluate((root) => {
    const visible = (element) => element.getClientRects().length > 0;
    const bounds = root.getBoundingClientRect();
    const identify = (element) =>
      element.getAttribute("aria-label") ||
      element.className?.baseVal ||
      element.className ||
      element.tagName;
    const clipped = [];
    const controls = root.querySelectorAll(
      "button, input, select, textarea, [role=slider]",
    );
    for (const control of controls) {
      if (!visible(control)) continue;
      const rect = control.getBoundingClientRect();
      let locallyScrollable = false;
      for (
        let parent = control.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        const box = parent.getBoundingClientRect();
        if (
          ["hidden", "clip"].includes(style.overflowX) &&
          (rect.left < box.left - 2 || rect.right > box.right + 2)
        ) {
          clipped.push({
            control: identify(control),
            ancestor: identify(parent),
          });
          break;
        }
        if (["auto", "scroll"].includes(style.overflowX)) {
          locallyScrollable = true;
          break;
        }
        if (parent === root) break;
      }
      if (
        !locallyScrollable &&
        (rect.left < bounds.left - 2 || rect.right > bounds.right + 2)
      )
        clipped.push({
          control: identify(control),
          ancestor: "laboratory width",
        });
    }
    const diagrams = [...root.querySelectorAll("svg[viewBox]")]
      .filter(
        (svg) =>
          !svg.ownerSVGElement &&
          visible(svg) &&
          !svg.closest(".katex") &&
          (svg.matches('[role="img"], [role="group"]') ||
            svg.closest(".diagram")),
      )
      .map((svg) => {
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        return {
          label: identify(svg),
          width: rect.width,
          height: rect.height,
          expectedHeight: (rect.width * viewBox.height) / viewBox.width,
          left: rect.left,
          right: rect.right,
          smallIllustration: viewBox.width < 150,
        };
      });
    const verticalTraps = [...root.children]
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          ["auto", "scroll", "hidden", "clip"].includes(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 3
        );
      })
      .map(identify);
    const squeezedColumns = [
      ...root.querySelectorAll(
        ".two-cols, .three-cols, .matrix-controls, .coset-map, .coset-tiles",
      ),
    ]
      .filter(visible)
      .filter((element) => element.getBoundingClientRect().width < 450)
      .flatMap((element) => {
        const children = [...element.children].filter(visible);
        return children
          .slice(1)
          .filter((child, index) => {
            const previous = children[index].getBoundingClientRect();
            const current = child.getBoundingClientRect();
            return (
              Math.abs(previous.top - current.top) < 2 && current.width < 150
            );
          })
          .map(identify);
      });
    return {
      panel: { left: bounds.left, right: bounds.right, width: bounds.width },
      clipped,
      diagrams,
      verticalTraps,
      squeezedColumns,
    };
  });
}

async function expectUsableLaboratory(panel, width, info, label) {
  const measurement = await measureLaboratory(panel);
  await info.attach(`${label}-${width}`, {
    body: JSON.stringify(measurement),
    contentType: "application/json",
  });
  expect(
    measurement.clipped,
    `${label}: controls must remain reachable`,
  ).toEqual([]);
  expect(
    measurement.verticalTraps,
    `${label}: whole models must not be trapped in a short inner scroller`,
  ).toEqual([]);
  expect(
    measurement.squeezedColumns,
    `${label}: narrow controls must reflow`,
  ).toEqual([]);
  for (const diagram of measurement.diagrams) {
    expect(diagram.left, diagram.label).toBeGreaterThanOrEqual(
      measurement.panel.left - 2,
    );
    expect(diagram.right, diagram.label).toBeLessThanOrEqual(
      measurement.panel.right + 2,
    );
    expect(diagram.width, diagram.label).toBeLessThanOrEqual(640);
    if (diagram.smallIllustration) continue;
    expect(diagram.width, diagram.label).toBeGreaterThanOrEqual(150);
    expect(diagram.height, diagram.label).toBeLessThanOrEqual(470);
    expect(
      Math.abs(diagram.height - diagram.expectedHeight),
      `${diagram.label}: intrinsic aspect avoids oversized blank frames`,
    ).toBeLessThanOrEqual(3);
  }
}

for (const lesson of lessons) {
  test(`${lesson.id}: model bounds and control reflow at four widths`, async ({
    page,
  }, info) => {
    const panel = await openLaboratory(page, lesson.id);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await expectUsableLaboratory(panel, width, info, lesson.id);
    }
  });
}

for (const id of [
  "cube-signed-permutations",
  "mh2220-second-isomorphism",
  "mh2220-subgroups",
  "linear-quotient",
  "foundations-functions",
  "m3220-polynomial",
]) {
  test(`${id}: guided and enlarged models remain usable`, async ({
    page,
  }, info) => {
    const panel = await openLaboratory(page, id, true);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await expectUsableLaboratory(panel, width, info, `${id}-guided`);
      await page
        .getByRole("button", { name: "Enlarge visualisation", exact: true })
        .click();
      await expectUsableLaboratory(panel, width, info, `${id}-enlarged`);
      const reading = await page.locator(".study-reading").boundingBox();
      expect(
        reading.width,
        "enlarging must preserve readable prose width",
      ).toBeGreaterThanOrEqual(Math.min(260, width - 40));
      await page
        .getByRole("button", { name: "Compact visualisation", exact: true })
        .click();
    }
  });
}

for (const id of [
  "cube-signed-permutations",
  "mh2220-subgroups",
  "mh2220-second-isomorphism",
  "foundations-functions",
]) {
  test(`${id}: original diagram labels can be read and panned by keyboard`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    const panel = await openLaboratory(page, id);
    const read = panel
      .getByRole("button", { name: "Read diagram labels", exact: true })
      .first();
    const viewportId = await read.getAttribute("aria-controls");
    await read.focus();
    await page.keyboard.press("Enter");
    const viewport = page.locator(`[id="${viewportId}"]`);
    await expect(viewport).toHaveAttribute("role", "region");
    await expect(viewport).toHaveAccessibleName(/original-size labels/);
    await expect(viewport).toHaveAttribute("tabindex", "0");
    const dimensions = await viewport.evaluate((element) => {
      const svg = element.querySelector("svg");
      return {
        availableWidth: element.clientWidth,
        contentWidth: element.scrollWidth,
        renderedWidth: svg.getBoundingClientRect().width,
        coordinateWidth: svg.viewBox.baseVal.width,
      };
    });
    expect(dimensions.renderedWidth).toBeGreaterThanOrEqual(
      dimensions.coordinateWidth - 1,
    );
    expect(dimensions.contentWidth).toBeGreaterThan(dimensions.availableWidth);
    await viewport.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await expect(viewport).toBeFocused();
    await panel
      .getByRole("button", { name: "Fit diagram to panel", exact: true })
      .first()
      .click();
    await expect(viewport).toHaveAccessibleName(/fitted view/);
    expect(
      await viewport.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBeLessThanOrEqual(2);
  });
}

test("wide polynomial multiplication retains its two-dimensional locally pannable grid", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const panel = await openLaboratory(page, "m3220-polynomial");
  await panel
    .getByRole("textbox", { name: "Polynomial f coefficients", exact: true })
    .fill("1,2,3,4,5,6,7,8,9");
  await panel
    .getByRole("textbox", { name: "Polynomial g coefficients", exact: true })
    .fill("1,2,3,4,5,6,7,8,9");
  const grid = panel.locator(".convolution-grid");
  const observation = await grid.evaluate((element) => {
    const first = element.firstElementChild.getBoundingClientRect();
    const next = element.children[1].getBoundingClientRect();
    const availableWidth = element.clientWidth;
    const contentWidth = element.scrollWidth;
    element.scrollLeft = contentWidth;
    return {
      availableWidth,
      contentWidth,
      scrollLeft: element.scrollLeft,
      sameRow: Math.abs(first.top - next.top) < 2,
      columnCount:
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
    };
  });
  expect(observation.sameRow).toBe(true);
  expect(observation.columnCount).toBe(10);
  expect(observation.contentWidth).toBeGreaterThan(observation.availableWidth);
  expect(observation.scrollLeft).toBeGreaterThan(0);
  const last = await grid
    .locator(".contents")
    .last()
    .locator(":scope > span")
    .last()
    .boundingBox();
  const visible = await grid.boundingBox();
  expect(last.x + last.width).toBeLessThanOrEqual(
    visible.x + visible.width + 2,
  );
});

test("phone cube remains keyboard and touch operable after resizing", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: { width: 320, height: 1000 },
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    const panel = await openLaboratory(page, "cube-signed-permutations");
    const scene = panel.getByRole("group", {
      name: /Interactive three-dimensional cube projection/,
    });
    await scene.scrollIntoViewIfNeeded();
    const initial = await scene.getAttribute("aria-label");
    await scene.focus();
    await page.keyboard.press("ArrowRight");
    await expect(scene).not.toHaveAttribute("aria-label", initial);
    await expect(scene).toBeFocused();
    await page.keyboard.press("Home");
    await expect(scene).toHaveAttribute("aria-label", initial);
    const box = await scene.boundingBox();
    const client = await context.newCDPSession(page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x + 30, y: point.y + 15 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(scene).not.toHaveAttribute("aria-label", initial);
    await scene.focus();
    await page.keyboard.press("Home");
    await expect(scene).toHaveAttribute("aria-label", initial);
  } finally {
    await context.close();
  }
});
