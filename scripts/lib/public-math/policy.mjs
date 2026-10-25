export const publicReviewFile =
  "lib/algebra/math-presentation/public-ui-review.json";
export const runtimeRoots = [
  "app",
  "components",
  "lib",
  "hooks",
  "worker",
  "db",
  "public",
];
export const supplementalSources = ["vendor/shadcn-tailwind-4.13.0.css"];
export const cssImports = new Set(["tailwindcss", "tw-animate-css"]);
export const codeExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".cts",
]);
export const configurationNames =
  /^(?:package(?:-lock)?\.json|tsconfig(?:\.[\w-]+)?\.json|(?:vite|next|postcss|drizzle|playwright)\.config\.[\w]+|wrangler\.[\w]+)$/;
export const contractFiles = [
  ".github/workflows/ci.yml",
  "scripts/lib/public-math-v2.mjs",
  "scripts/algebra.mjs",
  "scripts/algebra-contract.mjs",
  "scripts/algebra-identity.mjs",
  "scripts/algebra-playwright-setup.mjs",
  "scripts/public-math-build.mjs",
  "scripts/public-math-node-reporter.mjs",
  "scripts/public-math-playwright-reporter.mjs",
  "scripts/lib/math-presentation.mjs",
  "scripts/lib/math-review.mjs",
  "scripts/math-presentation.mjs",
];
export const packageImports = new Set([
  "cloudflare:workers",
  "clsx",
  "katex",
  "katex/dist/katex.min.css",
  "lucide-react",
  "next/headers",
  "next/navigation",
  "radix-ui",
  "react",
  "tailwind-merge",
  "vinext/server/app-router-entry",
  "vinext/server/image-optimization",
  "zod",
]);
