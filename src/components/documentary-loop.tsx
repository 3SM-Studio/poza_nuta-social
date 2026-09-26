"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const mediaPath = "/media/events/2026-08-16-igranie";

export function DocumentaryLoop() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionQuery.matches);
    updateMotion();
    motionQuery.addEventListener("change", updateMotion);

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "100px 0px",
    });
    if (frameRef.current) observer.observe(frameRef.current);

    return () => {
      motionQuery.removeEventListener("change", updateMotion);
      observer.disconnect();
    };
  }, []);

  const showVideo = inView && !reducedMotion;

  return (
    <div ref={frameRef} className="relative aspect-[9/16] w-full overflow-hidden bg-card">
      <Image
        src={`${mediaPath}/experience-group-poster.webp`}
        alt="Dwie osoby śpiewają razem podczas wieczoru Poza Nutą."
        fill
        sizes="(max-width: 1024px) 100vw, 36vw"
        className="object-contain"
      />
      {showVideo && (
        <video
          aria-hidden="true"
          autoPlay
          muted
          playsInline
          loop
          preload="none"
          poster={`${mediaPath}/experience-group-poster.webp`}
          width="720"
          height="1280"
          className={`absolute inset-0 h-full w-full object-contain ${playing ? "opacity-100" : "opacity-0"}`}
          onPlaying={() => setPlaying(true)}
        >
          <source src={`${mediaPath}/experience-group-loop.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
