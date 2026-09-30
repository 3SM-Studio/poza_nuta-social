import * as React from "react";
import { cn } from "cn";
import { Table } from "@/components/ui/table";

const mobileCards = "max-md:block max-md:[&_thead]:sr-only max-md:[&_tbody]:block max-md:[&_tr]:mb-3 max-md:[&_tr]:block max-md:[&_tr]:rounded-lg max-md:[&_tr]:border max-md:[&_tr]:border-border max-md:[&_tr]:p-4 max-md:[&_td]:block max-md:[&_td]:p-0 max-md:[&_td]:pt-3 max-md:[&_td:first-child]:pt-0 max-md:[&_td_button]:min-h-11";

export function AdminResponsiveTable({ className, ...props }: React.ComponentProps<typeof Table>) {
  return <Table className={cn(mobileCards, className)} {...props} />;
}
