import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import katex from "katex";
const lessons = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const parse = (formula, label) =>
  assert.doesNotThrow(
    () =>
      katex.renderToString(formula, {
        throwOnError: true,
        strict: "ignore",
        trust: false,
      }),
    label,
  );
test("all prose, deeper notes and diagram labels contain valid mathematical expressions", () => {
  function scan(value, path) {
    if (typeof value === "string") {
      assert.equal(
        (value.match(/\$/g) || []).length % 2,
        0,
        `unpaired delimiter: ${path}`,
      );
      for (const match of value.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g))
        parse(match[1] || match[2], path);
    } else if (Array.isArray(value))
      value.forEach((x, i) => scan(x, `${path}.${i}`));
    else if (value && typeof value === "object")
      for (const [key, v] of Object.entries(value)) scan(v, `${path}.${key}`);
  }
  for (const lesson of lessons) {
    scan(lesson, lesson.id);
    for (const key of ["definition", "theorem"])
      parse(lesson[key], `${lesson.id}.${key}`);
    for (const node of lesson.parameters?.nodes || [])
      if (typeof node === "object" && !node.text)
        parse(node.label, `${lesson.id}.node`);
  }
});
test("concept navigation resolves every connection and preserved legacy link", () => {
  const ids = new Set(lessons.map((x) => x.id));
  for (const lesson of lessons) {
    assert.ok(lesson.subject && lesson.family && lesson.navTitle, lesson.id);
    for (const id of lesson.connections || [])
      assert.ok(ids.has(id), `${lesson.id} -> ${id}`);
    for (const alias of lesson.aliases || []) {
      assert.ok(!ids.has(alias));
      ids.add(alias);
    }
    for (const source of [
      lesson.source,
      ...(lesson.references || []),
      ...(lesson.reading || []).map((x) => x.source),
    ]) {
      assert.match(source.url, /^https:\/\//);
      assert.ok(
        source.pages && source.pdfPages && source.section,
        `${lesson.id}: citation location`,
      );
    }
  }
});
