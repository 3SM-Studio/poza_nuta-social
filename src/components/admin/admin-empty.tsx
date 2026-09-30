import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function AdminEmpty({ title, description, action, headingLevel = 3 }: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  return <Empty className="border bg-card">
    <EmptyHeader>
      <EmptyTitle role="heading" aria-level={headingLevel} className="text-base font-semibold">{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
    {action ? <EmptyContent>{action}</EmptyContent> : null}
  </Empty>;
}
