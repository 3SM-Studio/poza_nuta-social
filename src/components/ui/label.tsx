import * as React from "react";
import { cn } from "cn";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-sm font-bold leading-none", className)} {...props} />;
}
