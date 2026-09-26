import type { ReactNode } from "react";
import { cn } from "cn";

export function PublicPageMain({ children, width = "reading", className }: {
  children: ReactNode;
  width?: "reading" | "links";
  className?: string;
}) {
  return <main id="main-content" tabIndex={-1} className={cn("mx-auto flex w-full flex-1 flex-col px-5 sm:px-8", width === "links" ? "max-w-xl" : "max-w-2xl", className)}>{children}</main>;
}
