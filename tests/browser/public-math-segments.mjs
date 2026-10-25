import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";
import {
  delimiterParts,
  validateTex,
} from "../../scripts/lib/math-presentation.mjs";

export function collectMathSegments(root, { visibility = "rendered" } = {}) {
  const tokens = [];
  const normalize = (text) => text.replace(/\s+/gu, " ");
  const appendProse = (text) => {
    if (!text) return;
    const previous = tokens.at(-1);
    if (previous?.kind === "prose") previous.text += text;
    else tokens.push({ kind: "prose", text });
  };
  const allowedByStyle = (element) => {
    if (visibility === "all") return true;
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        Number(style.opacity) === 0
      )
        return false;
    }
    return true;
  };
  const hasBox = (node) => {
    if (visibility === "all") return true;
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].some(
      (box) => box.width > 0 && box.height > 0,
    );
  };
  const visit = (node) => {
    if (node.nodeType === 3) {
      if (
        allowedByStyle(node.parentElement) &&
        (hasBox(node) ||
          (/^\s+$/u.test(node.textContent) && hasBox(node.parentElement)))
      )
        appendProse(node.textContent);
      return;
    }
    if (node.nodeType !== 1 || !allowedByStyle(node)) return;
    if (node.matches("script,style,template")) return;
    if (node.matches(".katex-error")) throw Error("Observed KaTeX error");
    if (node.matches(".katex")) {
      if (!hasBox(node)) return;
      if (node.querySelector(".katex-error"))
        throw Error("Observed KaTeX error");
      const annotations = node.querySelectorAll(
        'annotation[encoding="application/x-tex"]',
      );
      const mathml = [...node.querySelectorAll("math")].filter(
        (element) =>
          element.namespaceURI === "http://www.w3.org/1998/Math/MathML",
      );
      if (annotations.length !== 1 || !annotations[0].textContent.trim())
        throw Error(
          "Each KaTeX root needs exactly one nonempty TeX annotation",
        );
      const semantics = mathml[0]?.querySelector("semantics");
      if (
        mathml.length !== 1 ||
        !semantics ||
        !mathml[0].contains(annotations[0]) ||
        ![...semantics.children].some(
          (child) =>
            child.namespaceURI === mathml[0].namespaceURI &&
            !["annotation", "annotation-xml"].includes(child.localName),
        )
      )
        throw Error("Each KaTeX root needs real MathML with its annotation");
      if (node.querySelector(".katex")) throw Error("Nested KaTeX root");
      tokens.push({
        kind: "math",
        tex: annotations[0].textContent,
        display: Boolean(node.closest(".katex-display")),
      });
      return;
    }
    for (const child of node.childNodes) visit(child);
  };
  if (!root || root.nodeType !== 1) throw Error("Expected a DOM element");
  visit(root);
  return tokens
    .map((token) =>
      token.kind === "prose"
        ? { ...token, text: normalize(token.text) }
        : token,
    )
    .filter((token) => token.kind !== "prose" || token.text.length > 0);
}

export function normalizeSegments(tokens) {
  const result = [];
  for (const token of tokens) {
    assert(["prose", "math"].includes(token.kind), "Unknown semantic segment");
    if (token.kind === "math") {
      assert.equal(typeof token.tex, "string");
      assert(token.tex.trim(), "Empty mathematical expression");
      validateTex(token.tex);
      result.push({
        kind: "math",
        tex: token.tex,
        display: token.display ?? false,
      });
    } else {
      assert.equal(typeof token.text, "string");
      const text = token.text.replace(/\s+/gu, " ");
      if (result.at(-1)?.kind === "prose") result.at(-1).text += text;
      else if (text) result.push({ kind: "prose", text });
    }
  }
  for (const token of result)
    if (token.kind === "prose") token.text = token.text.replace(/\s+/gu, " ");
  if (result[0]?.kind === "prose") result[0].text = result[0].text.trimStart();
  if (result.at(-1)?.kind === "prose")
    result.at(-1).text = result.at(-1).text.trimEnd();
  return result.filter((token) => token.kind !== "prose" || token.text);
}

export function sourceSegments(presented, parts = delimiterParts) {
  return normalizeSegments(
    parts(presented).map((part) =>
      part.kind === "text"
        ? { kind: "prose", text: part.text }
        : { kind: "math", tex: part.text, display: part.kind === "block" },
    ),
  );
}

export function assertExactSegments(actual, expected) {
  assert.deepEqual(
    normalizeSegments(actual),
    normalizeSegments(expected),
    "Complete public region differs from its reviewed prose and whole expressions",
  );
}

export function assertContainsSegments(actual, expected) {
  const haystack = normalizeSegments(actual),
    needle = normalizeSegments(expected);
  assert(needle.length, "Empty containment expectation");
  assert(
    needle.some((token) => token.kind === "math"),
    "Mathematical containment requires a complete mathematical expression",
  );
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    let matches = true;
    for (let index = 0; index < needle.length; index++) {
      const observed = haystack[start + index],
        wanted = needle[index];
      if (observed.kind !== wanted.kind) {
        matches = false;
        break;
      }
      if (wanted.kind === "math") {
        if (observed.tex !== wanted.tex || observed.display !== wanted.display)
          matches = false;
      } else {
        const text = observed.text,
          expectedText = wanted.text;
        const atFirst = index === 0,
          atLast = index === needle.length - 1;
        if (
          atFirst && atLast
            ? !text.includes(expectedText)
            : atFirst
              ? !text.endsWith(expectedText)
              : atLast
                ? !text.startsWith(expectedText)
                : text !== expectedText
        )
          matches = false;
      }
      if (!matches) break;
    }
    if (matches) return;
  }
  assert.fail(
    "Reviewed semantic sequence is absent; mathematical expressions match only whole tokens",
  );
}

export async function expectExactMathRegion(locator, presented, options = {}) {
  const expected =
    typeof presented === "string" ? sourceSegments(presented) : presented;
  await expect(async () => {
    assertExactSegments(await locator.evaluate(collectMathSegments), expected);
  }).toPass({ timeout: 5000, ...options });
}

export async function expectContainedMath(locator, presented, options = {}) {
  const expected =
    typeof presented === "string" ? sourceSegments(presented) : presented;
  await expect(async () => {
    assertContainsSegments(
      await locator.evaluate(collectMathSegments),
      expected,
    );
  }).toPass({ timeout: 5000, ...options });
}

export async function expectAbsentMath(locator, presented, options = {}) {
  const expected =
    typeof presented === "string" ? sourceSegments(presented) : presented;
  await expect(async () => {
    const actual = await locator.evaluate(collectMathSegments);
    assert.throws(
      () => assertContainsSegments(actual, expected),
      /whole tokens/,
    );
  }).toPass({ timeout: 5000, ...options });
}

export function readMathNativeControl(element, read) {
  if (read === "checked") {
    if (
      !(element instanceof HTMLInputElement) ||
      !["checkbox", "radio"].includes(element.type)
    )
      throw Error("Expected native checkable input");
    return element.checked;
  }
  if (read === "aria-valuenow") {
    const raw = element.getAttribute("aria-valuenow");
    const nativeNumeric =
      element instanceof HTMLInputElement &&
      ["number", "range"].includes(element.type);
    if (
      (!nativeNumeric &&
        !["slider", "spinbutton"].includes(element.getAttribute("role"))) ||
      raw === null ||
      raw.trim() === "" ||
      !Number.isFinite(Number(raw))
    )
      throw Error("Expected finite actual numeric control ARIA value");
    return Number(raw);
  }
  if (read === "selected-value") {
    if (!(element instanceof HTMLSelectElement))
      throw Error("Expected native select");
    return element.value;
  }
  if (!(
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ))
    throw Error("Expected native input value");
  if (read === "number") {
    if (
      !(element instanceof HTMLInputElement) ||
      !["number", "range"].includes(element.type) ||
      !Number.isFinite(element.valueAsNumber)
    )
      throw Error("Expected finite native numeric input");
    return element.valueAsNumber;
  }
  if (read !== "value") throw Error("Unknown native control read");
  return element.value;
}

export async function observePublicMathRegion(testInfo, requirement, locator) {
  assert.equal(
    await locator.count(),
    1,
    "An observation owns exactly one region",
  );
  assert(await locator.isVisible(), "Observation region must be visible");
  assert(
    await locator.evaluate(
      (element, selector) =>
        document.querySelectorAll(selector).length === 1 &&
        document.querySelector(selector) === element,
      requirement.presentation.region,
    ),
    "Observation locator differs from declared unique region",
  );
  const controls = [];
  for (const binding of requirement.presentation.inputs) {
    const control = locator.page().locator(binding.selector);
    assert.equal(
      await control.count(),
      1,
      "An observed native input must be unique",
    );
    const value = await control.evaluate(readMathNativeControl, binding.read);
    controls.push({ ...binding, value });
  }
  const inputs = Object.fromEntries(
    controls.map(({ path, value }) => [path, value]),
  );
  const region = {
    selector: requirement.presentation.region,
    count: 1,
    visible: true,
    mode: "rendered",
    route: new URL(locator.page().url()).hash,
    viewport: locator.page().viewportSize(),
  };
  let observation;
  if (requirement.kind === "content") {
    const segments = normalizeSegments(
      await locator.evaluate(collectMathSegments, { visibility: "rendered" }),
    );
    observation = {
      id: requirement.id,
      kind: "content",
      inputs,
      producer: requirement.producer,
      region,
      controls,
      segments,
    };
  } else if (requirement.kind === "svg-geometry") {
    const identity = await locator.evaluate((element) => ({
      namespace: element.namespaceURI,
      tag: element.localName,
      viewBox: element.getAttribute("viewBox"),
    }));
    assert.equal(identity.namespace, "http://www.w3.org/2000/svg");
    assert.equal(identity.tag, "svg");
    const writers = [];
    for (const writer of requirement.writers) {
      const target = locator.locator(writer.selector);
      assert.equal(
        await target.count(),
        1,
        "An SVG writer observation must be unique",
      );
      const actual = await target.evaluate((element) => {
        const finite = (raw) => {
          if (
            raw === null ||
            raw.trim() === "" ||
            !Number.isFinite(Number(raw))
          )
            throw Error("Nonfinite or missing SVG coordinate");
          return Number(raw);
        };
        const value =
          element.localName === "line"
            ? Object.fromEntries(
                ["x1", "y1", "x2", "y2"].map((key) => [
                  key,
                  finite(element.getAttribute(key)),
                ]),
              )
            : element
                .getAttribute("points")
                .trim()
                .split(/\s+/)
                .map((pair) => {
                  const values = pair.split(",");
                  if (values.length !== 2)
                    throw Error("SVG points require ordered finite pairs");
                  return values.map(finite);
                });
        return {
          namespace: element.namespaceURI,
          tag: element.localName,
          value,
        };
      });
      writers.push({
        id: writer.id,
        selector: writer.selector,
        count: 1,
        ...actual,
      });
    }
    observation = {
      id: requirement.id,
      kind: "svg-geometry",
      inputs,
      producer: requirement.producer,
      region,
      controls,
      ...identity,
      writers,
    };
  } else throw Error("Unsupported browser observation kind");
  await testInfo.attach("public-math-observation-v2", {
    body: Buffer.from(JSON.stringify(observation)),
    contentType: "application/json",
  });
  return observation;
}

export async function observeDeclaredMathRegions(testInfo, page) {
  if (!process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR) return;
  const descriptor = JSON.parse(
    readFileSync(process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR, "utf8"),
  );
  const file = path
    .relative(descriptor.root, testInfo.file)
    .split(path.sep)
    .join("/");
  const cases = new Set(
    descriptor.cases
      .filter(
        ({ declaration }) =>
          declaration.runner === "playwright" &&
          declaration.source.file === file &&
          declaration.project === testInfo.project.name &&
          declaration.repeat === testInfo.repeatEachIndex &&
          JSON.stringify(
            testInfo.titlePath.slice(-declaration.titlePath.length),
          ) === JSON.stringify(declaration.titlePath),
      )
      .map(({ id }) => id),
  );
  for (const requirement of descriptor.requirements) {
    if (
      !cases.has(requirement.fixture) ||
      !requirement.presentation ||
      !["content", "svg-geometry"].includes(requirement.kind)
    )
      continue;
    const actual = {};
    for (const binding of requirement.presentation.inputs) {
      const control = page.locator(binding.selector);
      if ((await control.count()) !== 1) continue;
      actual[binding.path] = await control.evaluate(
        readMathNativeControl,
        binding.read,
      );
    }
    if (
      JSON.stringify(Object.entries(actual).sort()) ===
      JSON.stringify(Object.entries(requirement.inputs).sort())
    )
      await observePublicMathRegion(
        testInfo,
        requirement,
        page.locator(requirement.presentation.region),
      );
  }
}

export async function recordPublicMathResources(testInfo, page) {
  if (!process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR) return async () => {};
  const descriptor = JSON.parse(
    readFileSync(process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR, "utf8"),
  );
  const manifest = descriptor.manifest.filter(
    ({ file }) => file.startsWith("client/") && !file.endsWith(".map"),
  );
  const resources = [],
    errors = [],
    pending = new Set();
  const response = (response) => {
    const url = new URL(response.url());
    const base = new URL(testInfo.project.use.baseURL).origin;
    if (url.origin !== base || url.search || url.hash) return;
    const asset = manifest.find(
      ({ file }) => `/${file.slice(7)}` === url.pathname,
    );
    if (!asset) return;
    const work = (async () => {
      try {
        if (response.status() !== 200)
          throw Error(`Public static resource HTTP ${response.status()}`);
        const bytes = await response.body();
        resources.push({
          file: asset.file,
          url: url.href,
          status: response.status(),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes: bytes.length,
        });
      } catch (error) {
        errors.push(error.message);
      }
    })();
    pending.add(work);
    work.finally(() => pending.delete(work));
  };
  page.on("response", response);
  return async () => {
    page.off("response", response);
    await Promise.all(pending);
    await testInfo.attach("public-math-resources-v2", {
      body: Buffer.from(JSON.stringify({ resources, errors })),
      contentType: "application/json",
    });
  };
}
