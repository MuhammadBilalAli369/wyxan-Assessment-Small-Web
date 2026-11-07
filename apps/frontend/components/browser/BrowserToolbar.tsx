"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { PersonDto } from "@small-web/shared";

interface BrowserToolbarProps {
  people: PersonDto[];
  personId: string | null;
  onSelectPerson: (id: string) => void;
  address: string;
  canBack: boolean;
  canForward: boolean;
  loading: boolean;
  onBack: () => void;
  onForward: () => void;
  onGo: (address: string) => void;
}

export function BrowserToolbar({
  people,
  personId,
  onSelectPerson,
  address,
  canBack,
  canForward,
  loading,
  onBack,
  onForward,
  onGo,
}: BrowserToolbarProps) {
  const [draft, setDraft] = useState(address);

  useEffect(() => {
    setDraft(address);
  }, [address]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onGo(draft);
  }

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--line)] bg-[var(--chrome)] px-3 py-2.5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="toolbar-btn"
          aria-label="Back"
          data-testid="nav-back"
          disabled={!canBack}
          onClick={onBack}
        >
          ←
        </button>
        <button
          type="button"
          className="toolbar-btn"
          aria-label="Forward"
          data-testid="nav-forward"
          disabled={!canForward}
          onClick={onForward}
        >
          →
        </button>
      </div>

      <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2">
        <label className="sr-only" htmlFor="address-bar">
          Address
        </label>
        <input
          id="address-bar"
          data-testid="address-bar"
          className="address-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="tidepool.zz"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className="go-btn"
          data-testid="address-go"
          disabled={loading}
        >
          {loading ? "…" : "Go"}
        </button>
      </form>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="person-select">
          Browsing as
        </label>
        <select
          id="person-select"
          data-testid="person-select"
          className="person-select"
          value={personId ?? ""}
          onChange={(e) => onSelectPerson(e.target.value)}
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
