"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  return (
    <div className="inline-flex max-w-full flex-col items-start gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopyFailed(false);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopyFailed(true);
          }
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Skopiowano" : "Kopiuj"}
      </Button>
      {copyFailed ? <div className="w-full max-w-64 space-y-1"><p role="alert" className="text-xs text-destructive">Nie udało się skopiować. Zaznacz adres poniżej.</p><Input aria-label="Adres linku do ręcznego skopiowania" readOnly value={value} onFocus={(event) => event.currentTarget.select()} /></div> : null}
    </div>
  );
}
