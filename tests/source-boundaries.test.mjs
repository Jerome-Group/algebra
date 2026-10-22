import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import ts from "typescript";

test("lint and type checks exclude retained work checkouts and include application source", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const work = path.join(root, "work");
  fs.mkdirSync(work, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(work, "source-boundary-"));
  const fixture = path.join(scratch, "excluded.ts");
  const application = path.join(root, "app/page.tsx");
  try {
    fs.writeFileSync(
      fixture,
      'let scratch: number = "unrelated worktree";\nexport { scratch };\n',
    );
    const eslint = new ESLint({ cwd: root });
    const config = ts.readConfigFile(
      path.join(root, "tsconfig.json"),
      ts.sys.readFile,
    );
    assert.equal(config.error, undefined);
    const program = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    assert.deepEqual(program.errors, []);
    assert.deepEqual(
      {
        eslintExcludesScratch: await eslint.isPathIgnored(fixture),
        typescriptExcludesScratch: !program.fileNames.includes(fixture),
        eslintIncludesApplication:
          !(await eslint.isPathIgnored(application)) &&
          Boolean(await eslint.calculateConfigForFile(application)),
        typescriptIncludesApplication: program.fileNames.includes(application),
      },
      {
        eslintExcludesScratch: true,
        typescriptExcludesScratch: true,
        eslintIncludesApplication: true,
        typescriptIncludesApplication: true,
      },
    );
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
