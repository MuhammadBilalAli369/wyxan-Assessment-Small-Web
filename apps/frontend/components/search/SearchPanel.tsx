"use client";

import { FormEvent, useState } from "react";
import type { SearchResultDto } from "@small-web/shared";
import { api } from "@/lib/api";

/**
 * Search UI state lives in the parent (BrowserApp), not the navigation stack.
 * That way opening a result and returning to the Search tab restores the query
 * and results without confusing chronological visit history with search.
 */
interface SearchPanelProps {
  query: string;
  results: SearchResultDto[] | null;
  onQueryChange: (query: string) => void;
  onResultsChange: (results: SearchResultDto[] | null) => void;
  onOpen: (address: string) => void;
}

export function SearchPanel({
  query,
  results,
  onQueryChange,
  onResultsChange,
  onOpen,
}: SearchPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const found = await api.search(query);
      onResultsChange(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      onResultsChange(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="search-heading">
      <h2 id="search-heading" className="panel-title">
        Search
      </h2>
      <p className="panel-sub">
        Matches titles and body text. Results stay here while you browse — switch
        back to this tab to return to them.
      </p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <label className="sr-only" htmlFor="search-q">
          Search query
        </label>
        <input
          id="search-q"
          data-testid="search-input"
          className="field-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="kelp, lavender, Jupiter…"
        />
        <button
          type="submit"
          className="go-btn"
          disabled={busy}
          data-testid="search-submit"
        >
          {busy ? "…" : "Find"}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {results && results.length === 0 && (
        <p className="empty-note">No pages matched that query.</p>
      )}
      {results && results.length > 0 && (
        <ul className="result-list" data-testid="search-results">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="result-item"
                data-testid={`search-result-${r.address}`}
                onClick={() => onOpen(r.address)}
              >
                <span className="result-title">{r.title}</span>
                <span className="result-address">{r.address}</span>
                <span className="result-excerpt">{r.excerpt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
