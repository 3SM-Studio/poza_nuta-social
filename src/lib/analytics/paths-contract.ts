import type { ReportingScope } from "./reporting-scope";

export const PATH_RANKING_LIMIT = 10;
export const PATH_MAX_DEPTH = 3;
export type PathNode = { type: "page"; path: string };
export type PathCount = { path: string; sessions: number };
export type ShortPathCount = { paths: string[]; sessions: number };
export type PathsReport = {
  scope: ReportingScope;
  fromDate: string;
  toDateExclusive: string;
  nodeType: "page";
  maxDepth: 3;
  rankingLimit: 10;
  pathSessions: number;
  entries: PathCount[];
  shortPaths: ShortPathCount[];
  selectedPath: string | null;
  selectedSessions: number;
  next: PathCount[];
  previous: PathCount[];
  noNextInRange: number;
  noPreviousInRange: number;
};

// Accept stored page identities, including historical paths no longer in the public route list.
// This is a bounded value, never a SQL fragment or a page title.
export function parsePathNode(value: unknown): PathNode | null {
  return typeof value === "string" && value.length <= 160 && /^\/[A-Za-z0-9/_-]*$/.test(value)
    ? { type: "page", path: value } : null;
}

export function isPathsReport(value: unknown, scope: ReportingScope, selectedPath: string | null): value is PathsReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PathsReport>;
  const row = (x: unknown): x is PathCount => !!x && typeof x === "object"
    && parsePathNode((x as PathCount).path) !== null && count((x as PathCount).sessions);
  return v.scope === scope && v.nodeType === "page" && v.maxDepth === PATH_MAX_DEPTH
    && v.rankingLimit === PATH_RANKING_LIMIT && v.selectedPath === selectedPath
    && count(v.pathSessions) && count(v.selectedSessions) && count(v.noNextInRange)
    && count(v.noPreviousInRange) && Array.isArray(v.entries) && v.entries.length <= PATH_RANKING_LIMIT
    && v.entries.every(row) && Array.isArray(v.next) && v.next.length <= PATH_RANKING_LIMIT
    && v.next.every(row) && Array.isArray(v.previous) && v.previous.length <= PATH_RANKING_LIMIT
    && v.previous.every(row) && Array.isArray(v.shortPaths) && v.shortPaths.length <= PATH_RANKING_LIMIT
    && v.shortPaths.every((p) => count(p.sessions) && Array.isArray(p.paths)
      && p.paths.length >= 1 && p.paths.length <= PATH_MAX_DEPTH && p.paths.every((path) => parsePathNode(path) !== null));
}

function count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }

export function share(sessions: number, population: number): number | null {
  return population > 0 ? Math.round(1000 * sessions / population) / 10 : null;
}
