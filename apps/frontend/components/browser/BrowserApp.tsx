"use client";

import { useState } from "react";
import type { SearchResultDto } from "@small-web/shared";
import { useBrowser } from "@/hooks/useBrowser";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { PublishPanel } from "@/components/publish/PublishPanel";
import { SearchPanel } from "@/components/search/SearchPanel";
import { BrowserToolbar } from "./BrowserToolbar";
import { PageViewer } from "./PageViewer";

type SideTab = "history" | "search" | "publish";

/**
 * Search panel state is intentionally NOT part of the Back/Forward stack.
 * It is chrome UI: query + results persist while the main viewer navigates,
 * so the demo can open a result and return to Search without losing them.
 * Each selected person still keeps an independent navigation session + visit log.
 */
export function BrowserApp() {
  const browser = useBrowser();
  const [tab, setTab] = useState<SideTab>("history");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultDto[] | null>(
    null,
  );

  if (browser.bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-[var(--ink-soft)]">
        Connecting to the small web…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] px-4 py-4 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          The Small Web
        </p>
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
          A miniature internet, and the browser that reads it
        </h1>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-5">
        <section className="browser-frame flex min-h-[70vh] flex-col overflow-hidden">
          <BrowserToolbar
            people={browser.people}
            personId={browser.personId}
            onSelectPerson={browser.selectPerson}
            address={browser.current?.address ?? ""}
            canBack={browser.canBack}
            canForward={browser.canForward}
            loading={browser.loading}
            onBack={() => void browser.back()}
            onForward={() => void browser.forward()}
            onGo={(address) => void browser.navigate(address, "address-bar")}
          />

          {browser.error && (
            <div
              className="border-b border-[var(--alert)]/30 bg-[var(--alert-tint)] px-3 py-2 text-sm text-[var(--alert)]"
              role="alert"
            >
              {browser.error}
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <PageViewer
              entry={browser.current}
              onNavigate={(address) => void browser.navigate(address, "link")}
              onScrollChange={browser.onScrollChange}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <div className="tab-row" role="tablist" aria-label="Browser tools">
            {(["history", "search", "publish"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                data-testid={`tab-${id}`}
                className={`tab-btn ${tab === id ? "tab-btn-active" : ""}`}
                onClick={() => setTab(id)}
              >
                {id}
              </button>
            ))}
          </div>

          {tab === "history" && (
            <HistoryPanel
              visits={browser.visits}
              onJump={(address) =>
                void browser.navigate(address, "history-jump")
              }
            />
          )}
          {tab === "search" && (
            <SearchPanel
              query={searchQuery}
              results={searchResults}
              onQueryChange={setSearchQuery}
              onResultsChange={setSearchResults}
              onOpen={(address) => {
                void browser.navigate(address, "search");
              }}
            />
          )}
          {tab === "publish" && (
            <PublishPanel
              people={browser.people}
              personId={browser.personId}
              onPublished={(address) =>
                void browser.navigate(address, "publish-open")
              }
            />
          )}
        </aside>
      </div>
    </div>
  );
}
