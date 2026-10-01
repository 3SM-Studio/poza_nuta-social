import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const literal = /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/gi;
const frontendRoots = ["src/app", "src/components", "src/lib"];
const frontendExtensions = /\.(?:css|js|jsx|ts|tsx)$/;
const compatibilityFile = "src/lib/color-compat.ts";
const chartFile = "src/components/ui/chart.tsx";

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

export function designColorLiteralErrors(file, source) {
  const errors = [];
  for (const match of source.matchAll(literal)) {
    const value = match[0];
    const start = match.index;
    const line = source.slice(0, start).split("\n").length;
    // Recharts emits these exact stroke attributes. The selectors match its markup.
    const preceding = source.slice(Math.max(0, start - 8), start);
    const following = source.slice(start + value.length, start + value.length + 2);
    const rechartsDefault = file === chartFile && ["#ccc", "#fff"].includes(value.toLowerCase()) && preceding.endsWith("stroke='") && following.startsWith("'");
    if (!rechartsDefault) errors.push(`${file}:${line}: design color literal '${value}'`);
  }
  return errors;
}

function oklchToHex(value) {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
  if (!match) throw new Error(`Expected canonical OKLCH value: ${value}`);
  const [, lightness, chroma, hue] = match;
  const L = Number(lightness);
  const a = Number(chroma) * Math.cos(Number(hue) * Math.PI / 180);
  const b = Number(chroma) * Math.sin(Number(hue) * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return `#${channels.map((linear) => {
    const srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, srgb)) * 255).toString(16).padStart(2, "0");
  }).join("")}`;
}

export function compatibilityColorErrors(css, compatibility, icon) {
  const pairs = {
    brandInk: "--brand-ink",
    brandPaper: "--brand-paper",
    brandPink: "--brand-pink",
    brandWhite: "--brand-white",
    rootBackground: "--root-background",
    nearBlack: "--output-near-black",
  };
  const errors = [];
  for (const [key, token] of Object.entries(pairs)) {
    const cssValue = new RegExp(`${token}: (oklch\\([^;]+\\));`).exec(css)?.[1];
    const outputValue = new RegExp(`${key}: "(#[\\da-f]+)"`).exec(compatibility)?.[1];
    if (!cssValue || !outputValue || oklchToHex(cssValue) !== outputValue) errors.push(`${compatibilityFile}: ${key} must encode ${token} as sRGB HEX`);
  }
  const outputLiterals = [...compatibility.matchAll(literal)].map((match) => match[0].toLowerCase());
  if (outputLiterals.join(",") !== "#101010,#f7f6f3,#ff4fa3,#ffffff,#080808,#0d0b0d") {
    errors.push(`${compatibilityFile}: only the six checked output encodings are allowed`);
  }
  // The standalone icon cannot load CSS variables; it embeds the checked output colors.
  const iconColors = [...icon.matchAll(literal)].map((match) => match[0].toLowerCase());
  if (iconColors.join(",") !== "#ff4fa3,#0d0b0d") errors.push("public/icon.svg: expected only the checked brand pink and near-black output colors");
  return errors;
}

export function checkColorContract() {
  const errors = [];
  for (const root of frontendRoots) {
    for (const path of filesUnder(root)) {
      const file = relative(process.cwd(), path).replaceAll("\\", "/");
      if (!frontendExtensions.test(file) || file.endsWith(".test.ts") || file.endsWith(".test.tsx") || file === compatibilityFile) continue;
      errors.push(...designColorLiteralErrors(file, readFileSync(path, "utf8")));
    }
  }
  const css = readFileSync("src/app/globals.css", "utf8");
  const compatibility = readFileSync(compatibilityFile, "utf8");
  const icon = readFileSync("public/icon.svg", "utf8");
  errors.push(...compatibilityColorErrors(css, compatibility, icon));
  return errors;
}
