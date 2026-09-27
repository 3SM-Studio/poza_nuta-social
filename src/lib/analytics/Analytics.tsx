"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsAllowed } from "../consent-analytics-gate";
import { listenForConsentChanges, readConsentState, retryPendingAccept } from "../consent-state";
import { HUB_OUTBOUND_STATE_KEY, hubResumeProperties, parseHubOutboundState, type HubOutboundState } from "../hub-lifecycle";
import { isPublicPath } from "../public-paths";
import { track, trackPageEntry } from "./client";
import { marketingCta, marketingSection, type MarketingCtaId, type MarketingSectionId } from "./marketing-journey";

let documentEntryConsumed = false;

export function Analytics() {
  return <Suspense fallback={null}><AnalyticsLifecycle /></Suspense>;
}

function AnalyticsLifecycle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastEntry = useRef<string | null>(null);
  const recentCta = useRef(new Map<string, number>());
  const seenSections = useRef(new Set<string>());
  const search = searchParams.toString();

  useEffect(() => {
    if (!isPublicPath(pathname)) return;
    const key = `${pathname}?${search}`;
    if (lastEntry.current === key) return;
    lastEntry.current = key;
    recentCta.current.clear();
    seenSections.current.clear();
    const initialDocumentEntry = !documentEntryConsumed;
    documentEntryConsumed = true;
    trackPageEntry(pathname, search, initialDocumentEntry);
    void readConsentState().then(retryPendingAccept);
  }, [pathname, search]);

  useEffect(() => {
    if (!isPublicPath(pathname)) return;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || !analyticsAllowed()) return;
      const target = event.target;
      const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[data-cta-id]") : null;
      if (!link) return;
      const id = link.dataset.ctaId;
      const definition = marketingCta(id);
      if (!definition || definition.sourcePath !== pathname) return;
      try {
        const destination = new URL(link.href);
        if (destination.origin !== window.location.origin || destination.pathname !== definition.destinationPath) return;
      } catch { return; }
      const now = Date.now();
      if (now - (recentCta.current.get(id!) || 0) < 1200) return;
      recentCta.current.set(id!, now);
      track("cta_click", { ctaId: id as MarketingCtaId });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, search]);

  useEffect(() => {
    if (!isPublicPath(pathname) || typeof IntersectionObserver === "undefined") return;
    const timers = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.sectionId;
        const definition = marketingSection(id);
        if (!definition || definition.sourcePath !== pathname || seenSections.current.has(id!)) continue;
        if (!entry.isIntersecting || entry.intersectionRatio < 0.7) {
          window.clearTimeout(timers.get(entry.target));
          timers.delete(entry.target);
          continue;
        }
        if (timers.has(entry.target)) continue;
        timers.set(entry.target, window.setTimeout(() => {
          timers.delete(entry.target);
          const rect = entry.target.getBoundingClientRect();
          const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
          if (visible / Math.max(rect.height, 1) < 0.7 || document.visibilityState !== "visible" || !analyticsAllowed()) return;
          seenSections.current.add(id!);
          observer.unobserve(entry.target);
          track("section_view", { sectionId: id as MarketingSectionId });
        }, 800));
      }
    }, { threshold: [0, 0.7, 1] });
    document.querySelectorAll<HTMLElement>("[data-section-id]").forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); for (const timer of timers.values()) window.clearTimeout(timer); };
  }, [pathname, search]);

  useEffect(() => {
    const syncConsent = () => { void readConsentState().then(retryPendingAccept); };
    const onFocus = () => { retryPendingAccept(); syncConsent(); };
    const markHidden = () => {
      if (document.visibilityState !== "hidden" || !analyticsAllowed()) return;
      const state = readOutboundState();
      if (state) writeOutboundState({ ...state, hidden: true });
    };
    const resume = (event: Event) => {
      if (!analyticsAllowed()) return;
      const properties = hubResumeProperties(
        readOutboundState(), Date.now(), document.visibilityState, event.type,
        event instanceof PageTransitionEvent ? event.persisted : false,
      );
      if (!properties) return;
      try { sessionStorage.removeItem(HUB_OUTBOUND_STATE_KEY); } catch { /* Optional storage. */ }
      track("hub_resumed", properties);
    };
    document.addEventListener("visibilitychange", markHidden);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", onFocus);
    const stopConsentListener = listenForConsentChanges(syncConsent);
    document.documentElement.dataset.trackingLifecycle = "ready";
    return () => {
      delete document.documentElement.dataset.trackingLifecycle;
      document.removeEventListener("visibilitychange", markHidden);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", onFocus);
      stopConsentListener();
    };
  }, []);
  return null;
}

function readOutboundState() {
  try { return parseHubOutboundState(sessionStorage.getItem(HUB_OUTBOUND_STATE_KEY)); }
  catch { return null; }
}
function writeOutboundState(value: HubOutboundState) {
  try { sessionStorage.setItem(HUB_OUTBOUND_STATE_KEY, JSON.stringify(value)); }
  catch { /* Optional storage. */ }
}
