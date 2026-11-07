"use client";

import { useEffect, useMemo, useRef } from "react";
import type { NavigationEntry } from "@/lib/navigation";
import {
  VIEWER_CHILD_SOURCE,
  VIEWER_PARENT_SOURCE,
  buildViewerSrcDoc,
} from "@/lib/viewer-document";

interface PageViewerProps {
  entry: NavigationEntry | null;
  onNavigate: (address: string) => void;
  onScrollChange: (entryId: string, scrollY: number) => void;
}

export function PageViewer({
  entry,
  onNavigate,
  onScrollChange,
}: PageViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeEntryId = useRef<string | null>(null);

  const srcDoc = useMemo(() => {
    if (!entry || entry.status === "loading") return "";
    if (entry.status === "not-found") return "";
    if (entry.status === "error") return "";
    return buildViewerSrcDoc(entry.htmlSnapshot, entry.title, entry.id);
  }, [entry]);

  useEffect(() => {
    activeEntryId.current = entry?.id ?? null;
  }, [entry?.id]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;

      const data = event.data;
      if (!data || data.source !== VIEWER_CHILD_SOURCE) return;
      if (typeof data.entryId !== "string") return;

      // Ignore messages from a previous iframe / entry.
      if (
        activeEntryId.current &&
        data.entryId !== activeEntryId.current
      ) {
        return;
      }
      if (entry && data.entryId !== entry.id) return;

      if (data.type === "navigate" && typeof data.address === "string") {
        onNavigate(data.address);
        return;
      }

      if (data.type === "scroll" && typeof data.scrollY === "number") {
        onScrollChange(data.entryId, data.scrollY);
        return;
      }

      if (data.type === "ready") {
        const targetY = entry?.scrollY ?? 0;
        // Opaque-origin iframe: parent cannot call scrollTo. Ask the bootstrap.
        iframe.contentWindow?.postMessage(
          {
            source: VIEWER_PARENT_SOURCE,
            type: "restore-scroll",
            entryId: data.entryId,
            scrollY: targetY,
          },
          "*",
        );
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [entry, onNavigate, onScrollChange]);

  if (!entry) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 bg-[var(--viewer-empty)] px-6 text-center">
        <p className="font-display text-2xl text-[var(--ink)]">Start somewhere</p>
        <p className="max-w-md text-sm text-[var(--ink-soft)]">
          Type a fictional address like <code className="font-mono">tidepool.zz</code>{" "}
          or pick a page from history / search.
        </p>
      </div>
    );
  }

  if (entry.status === "loading") {
    return (
      <div
        className="flex h-full min-h-[320px] items-center justify-center bg-[var(--viewer-empty)]"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--ink-soft)]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
          Loading {entry.address}…
        </div>
      </div>
    );
  }

  if (entry.status === "not-found") {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 bg-[var(--viewer-empty)] px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--alert)]">
          Nowhere
        </p>
        <p className="font-display text-2xl text-[var(--ink)]">
          No site at <span className="font-mono text-[var(--accent)]">{entry.address}</span>
        </p>
        <p className="max-w-md text-sm text-[var(--ink-soft)]">
          The address is recorded in history. Back still works. You can publish this
          address later if you want it to exist.
        </p>
      </div>
    );
  }

  if (entry.status === "error") {
    return (
      <div
        className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-[var(--viewer-empty)] px-6 text-center"
        data-testid="page-error"
      >
        <p className="font-display text-xl text-[var(--alert)]">
          {entry.title === "Interrupted" ? "Navigation interrupted" : "Could not load page"}
        </p>
        <p className="text-sm text-[var(--ink-soft)]">{entry.address}</p>
        {entry.title === "Interrupted" && (
          <p className="max-w-md text-sm text-[var(--ink-soft)]">
            This request was cancelled. Forward here will retry the load.
          </p>
        )}
      </div>
    );
  }

  return (
    <iframe
      key={entry.id}
      ref={iframeRef}
      title={entry.title || entry.address}
      className="h-full min-h-[320px] w-full border-0 bg-white"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      referrerPolicy="no-referrer"
      data-entry-id={entry.id}
      data-testid="page-viewer"
    />
  );
}
