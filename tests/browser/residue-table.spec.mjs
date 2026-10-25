import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function contrast({ color, layers }) {
  const rgba = (value) => {
    expect(value).toMatch(/^rgba?\(/);
    const channels = value.match(/[\d.]+/g).map(Number);
    return [...channels.slice(0, 3), channels[3] ?? 1];
  };
  const over = (top, bottom) =>
    top
      .slice(0, 3)
      .map((channel, i) => channel * top[3] + bottom[i] * (1 - top[3]));
  const light = (rgb) =>
    rgb
      .map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      })
      .reduce(
        (sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i],
        0,
      );
  let background = [255, 255, 255];
  for (const layer of layers.toReversed())
    background = over(rgba(layer), background);
  const levels = [light(over(rgba(color), background)), light(background)].sort(
    (a, b) => a - b,
  );
  return (levels[1] + 0.05) / (levels[0] + 0.05);
}

function readMathematicalPaint(elements) {
  return elements.map((element) => {
    const layers = [];
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.backgroundImage !== "none" || style.opacity !== "1")
        throw Error("Contrast background requires a new measured model");
      layers.push(style.backgroundColor);
    }
    return {
      tex: element.querySelector("annotation")?.textContent,
      mathml: element.querySelectorAll("math").length,
      color: getComputedStyle(element.querySelector(".katex-html") ?? element)
        .color,
      fontSize: Number.parseFloat(
        getComputedStyle(element.querySelector(".katex") ?? element).fontSize,
      ),
      layers,
    };
  });
}

async function verifyResidueHeaders(table, operation) {
  const headers = [
    {
      role: "columnheader",
      name: operation,
      scope: "col",
      tex: operation === "Addition" ? "+" : String.raw`\times`,
    },
    ...Array.from({ length: 12 }, (_, value) => ({
      role: "columnheader",
      name: `Right operand ${value}`,
      scope: "col",
      tex: String(value),
    })),
    ...Array.from({ length: 12 }, (_, value) => ({
      role: "rowheader",
      name: `Left operand ${value}`,
      scope: "row",
      tex: String(value),
    })),
  ];
  await expect(table.locator("th")).toHaveCount(headers.length);
  for (const { role, name, scope, tex } of headers) {
    const header = table.getByRole(role, { name, exact: true });
    await expect(header).toHaveAttribute("scope", scope);
    await expect(header.locator(".katex")).toHaveCount(1);
    await expect(header.locator("annotation")).toHaveCount(1);
    await expect(header.locator("annotation")).toHaveText(tex);
    await expect(header.locator("math")).toHaveCount(1);
    expect(
      await header.locator("math").evaluate((element) => element.namespaceURI),
    ).toBe("http://www.w3.org/1998/Math/MathML");
  }
  return headers;
}

for (const width of [390, 1440])
  test(`residue table has readable typed values and named headers at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#lab:m3220-ideal-arithmetic");
    const table = page.getByRole("table", {
      name: "Residue multiplication modulo 12",
    });
    await expect(table).toBeVisible();
    await verifyResidueHeaders(table, "Multiplication");
    await expect(table.locator("[tabindex]")).toHaveCount(0);
    const readings = [];
    for (const operation of ["Multiplication", "Addition"]) {
      await page
        .getByRole("combobox", { name: "Operation", exact: true })
        .click();
      await page.getByRole("option", { name: operation, exact: true }).click();
      const current = page.getByRole("table", {
        name: `Residue ${operation.toLowerCase()} modulo 12`,
      });
      const ideal = page.getByRole("combobox", {
        name: "Principal ideal",
        exact: true,
      });
      for (let index = 0; index < 6; index++) {
        await ideal.click();
        await page.getByRole("option").nth(index).click();
        await expect(ideal).toBeFocused();
        const cells = await current
          .locator("td")
          .evaluateAll(readMathematicalPaint);
        expect(cells).toHaveLength(144);
        for (const [position, cell] of cells.entries()) {
          const row = Math.floor(position / 12),
            column = position % 12;
          expect(cell.mathml).toBe(1);
          expect(cell.fontSize).toBeGreaterThanOrEqual(16);
          expect(cell.tex).toBe(
            String(
              (operation === "Addition" ? row + column : row * column) % 12,
            ),
          );
          const ratio = contrast(cell);
          expect(
            ratio,
            `${operation}, ideal option ${index + 1}, cell ${row},${column}`,
          ).toBeGreaterThanOrEqual(4.5);
          readings.push({
            operation,
            idealOption: index + 1,
            row,
            column,
            ratio,
          });
        }
      }
    }
    await info.attach("contrast", {
      body: JSON.stringify(readings),
      contentType: "application/json",
    });
    const powerReadings = await page
      .locator(".power-chain small")
      .evaluateAll(readMathematicalPaint);
    await info.attach("power-contrast", {
      body: JSON.stringify(powerReadings),
      contentType: "application/json",
    });
    expect(powerReadings).toHaveLength(12);
    for (const [index, reading] of powerReadings.entries()) {
      expect(reading.tex).toBe(String(index + 1));
      expect(reading.mathml).toBe(1);
      expect(reading.fontSize).toBeGreaterThanOrEqual(12);
      expect(contrast(reading)).toBeGreaterThanOrEqual(4.5);
    }
    const scrollRegion = page.getByRole("region", {
      name: "Residue arithmetic table",
      exact: true,
    });
    await expect(scrollRegion).toHaveAttribute("tabindex", "0");
    await scrollRegion.focus();
    await expect(scrollRegion).toBeFocused();
    const scrollBefore = await scrollRegion.evaluate(
      (element) => element.scrollTop,
    );
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() => scrollRegion.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(scrollBefore);
    if (width === 390) {
      await expect(scrollRegion).toBeFocused();
      await info.attach("scroll-before-arrow-right", {
        body: JSON.stringify(
          await scrollRegion.evaluate((element) => ({
            focused: document.activeElement === element,
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            top: element.scrollTop,
            left: element.scrollLeft,
            scrollBehavior: getComputedStyle(element).scrollBehavior,
          })),
        ),
        contentType: "application/json",
      });
      const leftBefore = await scrollRegion.evaluate(
        (element) => element.scrollLeft,
      );
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => scrollRegion.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(leftBefore);
    }
    const operand = page.getByRole("slider", {
      name: "Element a",
      exact: true,
    });
    await operand.focus();
    await page.keyboard.press("ArrowRight");
    await expect(operand).toHaveAttribute("aria-valuenow", "3");
    await expect(page.locator(".ring-map .katex-error")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
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
    const finalTable = page.getByRole("table", {
      name: "Residue addition modulo 12",
      exact: true,
    });
    const finalHeaders = await verifyResidueHeaders(finalTable, "Addition");
    const validatedTable = await finalTable.elementHandle();
    expect(validatedTable).not.toBeNull();
    for (const finding of audit.violations.filter(
      ({ id }) => id === "empty-table-header",
    )) {
      for (const node of finding.nodes) {
        expect(node.target).toHaveLength(1);
        const reported = page.locator(node.target[0]);
        const index = await reported.evaluate(
          (element, table) =>
            [...table.querySelectorAll("th")].indexOf(element),
          validatedTable,
        );
        expect(
          index,
          `Unverified empty header: ${node.target[0]}`,
        ).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(finalHeaders.length);
        await expect(reported).toHaveAccessibleName(finalHeaders[index].name);
      }
    }
    await page
      .locator(".ring-map")
      .screenshot({ path: info.outputPath(`residues-${width}.png`) });
  });
