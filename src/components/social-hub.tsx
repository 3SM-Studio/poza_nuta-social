"use client";

import Link from "next/link";
import { ArrowUpRight, Camera, ExternalLink, Globe2, Music2, Play, Users } from "lucide-react";
import { cn } from "cn";
import { recordOutboundChoice } from "@/lib/analytics";
import type { Destination } from "@/lib/types";

const icons = {
  instagram: Camera,
  facebook: Users,
  youtube: Play,
  music: Music2,
  globe: Globe2,
  "external-link": ExternalLink,
};

function priority(slug: string) {
  if (slug === "instagram") return 0;
  if (slug === "tiktok") return 1;
  return 2;
}

export function SocialHub({ destinations }: { destinations: Destination[] }) {
  const ordered = [...destinations].sort((a, b) => priority(a.slug) - priority(b.slug) || a.sort_order - b.sort_order);

  return (
    <nav aria-label="Oficjalne linki Poza Nutą">
      <ul>
        {ordered.map((destination) => {
          const Icon = icons[destination.icon as keyof typeof icons] || ExternalLink;
          return (
            <li key={destination.id}>
              <Link
                href={`/go/${encodeURIComponent(destination.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex min-h-20 min-w-0 items-center justify-between gap-4 border-b border-border py-4 text-left text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  destination.slug === "instagram" && "text-accent",
                  destination.slug === "facebook" && "text-muted-foreground",
                )}
                aria-label={`Otwórz ${destination.label} w nowej karcie`}
                onClick={() => recordOutboundChoice(destination.slug)}
              >
                <span className="flex min-w-0 items-center gap-4">
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block break-words text-lg font-semibold">{destination.label}</span>
                    {destination.description ? <span className="mt-1 block break-words text-sm text-muted-foreground">{destination.description}</span> : null}
                  </span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
