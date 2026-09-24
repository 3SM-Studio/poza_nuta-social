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
import { recordOutboundChoice } from "@/lib/analytics";

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
    <div className="grid min-w-0 grid-cols-1 gap-3" aria-label="Oficjalne linki Poza Nutą">
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
              "group w-full min-w-0 justify-between whitespace-normal text-left",
            )}
            aria-label={`Otwórz ${destination.label}`}
            onClick={() => recordOutboundChoice(destination.slug)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block break-words">{destination.label}</span>
                {destination.description ? (
                  <span className="mt-0.5 block break-words text-xs font-medium">
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
