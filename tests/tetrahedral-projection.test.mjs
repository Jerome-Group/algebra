import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { TetrahedralDisplacementDrawing } = await vite.ssrLoadModule(
  "/components/algebra/TetrahedralDisplacements.tsx",
);
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(([tag]) =>
    attributes(tag),
  );
const drawings = ["translation", "rotation", "breathing", "shear"].map(
  (kind) => ({
    kind,
    html: renderToStaticMarkup(
      React.createElement(TetrahedralDisplacementDrawing, { kind }),
    ),
  }),
);
const inset = 8;

for (const { kind, html } of drawings) {
  test(`${kind} keeps all four arrows, complete stroke-scaled arrowheads and labels inside the actual drawing`, () => {
    const [svg] = tags(html, "svg");
    const [left, top, width, height] = svg.viewBox.split(" ").map(Number);
    const within = ([x, y], label, radius = 0) => {
      assert(
        x - radius >= left + inset && x + radius <= left + width - inset,
        `${label}: horizontal bounds`,
      );
      assert(
        y - radius >= top + inset && y + radius <= top + height - inset,
        `${label}: vertical bounds`,
      );
    };
    const [marker] = tags(html, "marker");
    const [path] = tags(html, "path");
    const points = path.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const radiusInMarker = Math.max(
      ...Array.from({ length: points.length / 2 }, (_, i) =>
        Math.hypot(
          points[2 * i] - Number(marker.refX),
          points[2 * i + 1] - Number(marker.refY),
        ),
      ),
    );
    const arrows = tags(html, "line").filter((line) => line["marker-end"]);
    assert.equal(arrows.length, 4);
    for (const [i, arrow] of arrows.entries()) {
      const unit =
        marker.markerUnits === "userSpaceOnUse"
          ? 1
          : Number(arrow["stroke-width"]);
      within(
        [Number(arrow.x1), Number(arrow.y1)],
        `${kind} r${i + 1} start`,
        Number(arrow["stroke-width"]) / 2,
      );
      within(
        [Number(arrow.x2), Number(arrow.y2)],
        `${kind} r${i + 1} arrowhead`,
        radiusInMarker * unit,
      );
    }
    const labels = tags(html, "foreignObject");
    assert.equal(labels.length, 4);
    for (const [i, label] of labels.entries()) {
      within(
        [Number(label.x), Number(label.y)],
        `${kind} r${i + 1} label top left`,
      );
      within(
        [
          Number(label.x) + Number(label.width),
          Number(label.y) + Number(label.height),
        ],
        `${kind} r${i + 1} label bottom right`,
      );
    }
    for (const [i, circle] of tags(html, "circle").entries())
      within(
        [Number(circle.cx), Number(circle.cy)],
        `${kind} r${i + 1} mass`,
        Number(circle.r),
      );
  });
}
