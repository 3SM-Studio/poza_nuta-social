import { existsSync, readFileSync } from "node:fs";

const source = readFileSync("docs/analytics/SCENARIO_MATRIX.md", "utf8");
const rows = source.split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return { id: Number(cells[0]), scenario: cells[1], identity: cells[2], acquisition: cells[3], classification: cells[4], coverage: cells[5] };
});
assert(rows.length === 74, `expected 74 scenario rows, found ${rows.length}`);
assert(rows.every((row, index) => row.id === index + 1), "scenario IDs must be contiguous 1–74");
assert(rows.every((row) => row.scenario && row.identity && row.acquisition && row.classification && row.coverage), "every scenario must define a complete contract");
assert(rows.every((row) => row.coverage === "documented" || /^(?:N|I|B|F)(?:,(?:N|I|B|F))*$/.test(row.coverage)), "coverage tags must be N/I/B/F or documented");

const documented = rows.filter((row) => row.coverage === "documented");
const byLayer = Object.fromEntries(["N", "I", "B", "F"].map((layer) => [layer, rows.filter((row) => row.coverage.split(",").includes(layer)).length]));
const traceability = readFileSync("docs/analytics/SCENARIO_TRACEABILITY.md", "utf8");
const traceRows = traceability.split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return { id: Number(cells[0]), target: cells[1], assertion: cells[2] };
});
const criticalIds = [1,13,14,16,22,23,31,33,38,50,52,55,57,65,66,67,68,69,70,71,72,73,74];
assert(new Set(traceRows.map((row) => row.id)).size === traceRows.length, "traceability IDs must be unique");
assert(criticalIds.every((id) => traceRows.some((row) => row.id === id)), "every critical scenario must have a traceability row");
assert(traceRows.every((row) => rows.some((scenario) => scenario.id === row.id) && row.target && row.assertion), "every traceability row must map an existing scenario to a concrete assertion");
const referencedFiles = [...traceability.matchAll(/`([^`/]+\/[^`]+\.(?:ts|mjs|sql|md))`/g)].map((match) => match[1]);
assert(referencedFiles.every((file) => existsSync(file)), `traceability references a missing file: ${referencedFiles.find((file) => !existsSync(file))}`);

const adminSource = readFileSync("docs/admin/ADMIN_SCENARIO_MATRIX.md", "utf8");
const [adminContracts, adminTraceability] = adminSource.split("## Concrete traceability");
assert(Boolean(adminTraceability), "Admin scenario traceability section is missing");
const adminId = /^(?:(?:S|M|I|O|R)\d+|SEC\d+)$/;
const parseAdminRows = (section) => section.split(/\r?\n/)
  .filter((line) => /^\|\s*(?:S\d+|M\d+|I\d+|O\d+|R\d+|SEC\d+)\s*\|/.test(line))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
const adminRows = parseAdminRows(adminContracts);
const adminTraceRows = parseAdminRows(adminTraceability);
assert(adminRows.length === 30, `expected 30 Admin scenario rows, found ${adminRows.length}`);
assert(adminRows.every(([id, scenario, contract, coverage]) => adminId.test(id) && scenario && contract && /^(?:N|I|C|B|F|M)(?:,(?:N|I|C|B|F|M))*$/.test(coverage)), "Admin scenario contracts or coverage tags are incomplete");
assert(new Set(adminRows.map(([id]) => id)).size === adminRows.length, "Admin scenario IDs must be unique");
assert(adminTraceRows.length === adminRows.length && new Set(adminTraceRows.map(([id]) => id)).size === adminRows.length, "every Admin scenario must have exactly one traceability row");
assert(adminTraceRows.every(([id, file, marker]) => {
  const path = file.replaceAll("`", "");
  const assertion = marker.replaceAll("`", "");
  return adminRows.some(([rowId]) => rowId === id) && existsSync(path) && assertion && readFileSync(path, "utf8").includes(assertion);
}), "Admin traceability must point to an existing file and exact test/assertion marker");
console.log(JSON.stringify({
  contractRows: rows.length,
  automationRequiredRows: rows.length - documented.length,
  documentedLimitations: documented.map((row) => ({ id: row.id, scenario: row.scenario })),
  requiredLayerCounts: byLayer,
  criticalTraceabilityRows: traceRows.length,
  contiguous: true,
  completeContracts: true,
  adminContractRows: adminRows.length,
  adminExactTraceabilityRows: adminTraceRows.length,
}, null, 2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
