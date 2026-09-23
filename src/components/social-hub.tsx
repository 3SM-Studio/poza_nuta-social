"use client";

import Link from "next/link";
import {
  Camera,
  ExternalLink,
  Globe2,
  Music2,
  Play,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/types";
import { HUB_OUTBOUND_STATE_KEY } from "@/lib/analytics-client";

const icons = {
  instagram: Camera,
  facebook: Users,
  youtube: Play,
  music: Music2,
  globe: Globe2,
  "external-link": ExternalLink,
};

export function SocialHub({ destinations }: { destinations: Destination[] }) {
  return (
    <div className="grid gap-3" aria-label="Oficjalne linki Poza Nutą">
      {destinations.map((destination, index) => {
        const Icon = icons[destination.icon as keyof typeof icons] || ExternalLink;
        return (
          <Link
            key={destination.id}
            href={`/go/${encodeURIComponent(destination.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: index === 0 ? "accent" : "secondary", size: "xl" }),
              "group w-full justify-between text-left",
            )}
            aria-label={`Otwórz ${destination.label}`}
            onClick={() => {
              try { sessionStorage.setItem(HUB_OUTBOUND_STATE_KEY, JSON.stringify({ destination: destination.slug, at: Date.now(), hidden: false })); } catch { /* storage is optional */ }
            }}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">{destination.label}</span>
                {destination.description ? (
                  <span className="mt-0.5 block truncate text-xs font-medium opacity-70">
                    {destination.description}
                  </span>
                ) : null}
              </span>
            </span>
            <ExternalLink className="size-4 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
