import { cn } from "cn";

/** The mask uses the supplied SVG verbatim, so only its color changes with the surface. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block aspect-square shrink-0 bg-current", className)}
      style={{ maskImage: "url('/brand/poza-nuta-logo.svg')", maskPosition: "center", maskRepeat: "no-repeat", maskSize: "contain" }}
    />
  );
}
