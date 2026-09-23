import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src/app", "src/components"];
const forbiddenPackages = ["@mui/", "@chakra-ui/", "antd", "@mantine/", "react-bootstrap", "bootstrap"];
const rawControls = ["<button", "<input", "<textarea", "<select"];
const errors = [];

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
for (const forbidden of ["@mui/material", "@chakra-ui/react", "antd", "@mantine/core", "react-bootstrap"]) {
  if (deps[forbidden]) errors.push(`package.json: competing UI library '${forbidden}' is not allowed`);
}
for (const required of ["@base-ui/react", "cn", "class-variance-authority"]) {
  if (!deps[required]) errors.push(`package.json: current shadcn base dependency '${required}' is missing`);
}
if (deps.clsx || deps["tailwind-merge"]) errors.push("package.json: project should use current shadcn 'cn' package instead of legacy clsx/tailwind-merge helper");

const components = JSON.parse(readFileSync("components.json", "utf8"));
if (components.style !== "base-nova") errors.push("components.json: expected approved shadcn style 'base-nova'");
if (components.iconLibrary !== "lucide") errors.push("components.json: expected approved icon library 'lucide'");

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry)) inspect(full);
  }
}
function inspect(file) {
  const src = readFileSync(file, "utf8");
  const rel = relative(process.cwd(), file).replaceAll("\\", "/");
  for (const pkgName of forbiddenPackages) if (src.includes(pkgName)) errors.push(`${rel}: competing UI library reference '${pkgName}'`);
  const isUiPrimitive = rel.startsWith("src/components/ui/");
  if (!isUiPrimitive) for (const tag of rawControls) if (src.includes(tag)) errors.push(`${rel}: raw control '${tag}' bypasses shadcn UI layer`);
}
for (const root of roots) walk(root);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("ui-guard: ok");
