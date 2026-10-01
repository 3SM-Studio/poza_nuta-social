"use client";

import Link from "next/link";
import { ArrowUpRight, Camera, ExternalLink, Globe2, Music2, Play, Users } from "lucide-react";
import { recordOutboundChoice } from "@/lib/analytics";
import type { Destination } from "@/lib/types";
import { cn } from "@/lib/utils";

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

export function SocialHub({ destinations, listClassName, linkClassName }: { destinations: Destination[]; listClassName?: string; linkClassName?: string }) {
  const ordered = [...destinations].sort((a, b) => priority(a.slug) - priority(b.slug) || a.sort_order - b.sort_order);

  return (
    <nav aria-label="Oficjalne linki Poza Nutą" className="ed-social-hub">
      <ul className={cn("ed-social-hub__list", listClassName)}>
        {ordered.map((destination) => {
          const Icon = icons[destination.icon as keyof typeof icons] || ExternalLink;
          return (
            <li key={destination.id}>
              <Link
                href={`/go/${encodeURIComponent(destination.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("ed-social-hub__link", linkClassName)}
                data-channel={destination.slug}
                aria-label={`Otwórz ${destination.label} w nowej karcie`}
                onClick={() => recordOutboundChoice(destination.slug)}
              >
                <span className="ed-social-hub__content">
                  <Icon className="ed-social-hub__icon" aria-hidden="true" />
                  <span className="ed-social-hub__copy">
                    <span className="ed-social-hub__name">{destination.label}</span>
                    {destination.description ? <span className="ed-social-hub__description">{destination.description}</span> : null}
                  </span>
                </span>
                <ArrowUpRight className="ed-social-hub__arrow" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
