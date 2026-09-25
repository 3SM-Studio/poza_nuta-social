import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AdminNotice({ tone, title, titleLevel = 2, children }: {
  tone: "error" | "success" | "info";
  title?: string;
  titleLevel?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;

  return <Alert
    variant={tone === "error" ? "destructive" : "default"}
    role={tone === "error" ? "alert" : tone === "success" ? "status" : undefined}
    className="gap-y-1 px-4 py-3"
  >
    <Icon aria-hidden="true" />
    {title ? <AlertTitle role="heading" aria-level={titleLevel} className={titleLevel === 1 ? "text-lg font-bold tracking-tight" : "text-base font-semibold"}>{title}</AlertTitle> : null}
    <AlertDescription>{children}</AlertDescription>
  </Alert>;
}
