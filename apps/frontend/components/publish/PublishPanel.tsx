"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PersonDto } from "@small-web/shared";
import { api } from "@/lib/api";

interface PublishPanelProps {
  people: PersonDto[];
  personId: string | null;
  onPublished: (address: string) => void;
}

const SAMPLE = `<h1>My First Website</h1>
<p>Welcome to my miniature website.</p>
<a href="forest.zz">Explore the Forest</a>`;

export function PublishPanel({
  people,
  personId,
  onPublished,
}: PublishPanelProps) {
  const [address, setAddress] = useState("");
  const [html, setHtml] = useState(SAMPLE);
  const [authorId, setAuthorId] = useState(personId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (personId) setAuthorId(personId);
  }, [personId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const site = await api.createSite({
        address,
        html,
        authorId: authorId || personId || "",
      });
      setMessage(`Published ${site.address}`);
      onPublished(site.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="publish-heading">
      <h2 id="publish-heading" className="panel-title">
        Publish
      </h2>
      <p className="panel-sub">
        One address, one page of HTML. Scripts and unsafe markup are stripped.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label className="field-label" htmlFor="publish-author">
          Publisher
        </label>
        <select
          id="publish-author"
          className="person-select w-full"
          value={authorId || personId || ""}
          onChange={(e) => setAuthorId(e.target.value)}
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="publish-address">
          Address
        </label>
        <input
          id="publish-address"
          data-testid="publish-address"
          className="field-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="myfirstsite.zz"
          spellCheck={false}
        />

        <label className="field-label" htmlFor="publish-html">
          HTML
        </label>
        <textarea
          id="publish-html"
          data-testid="publish-html"
          className="field-textarea"
          rows={8}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
        />

        <button
          type="submit"
          className="go-btn self-start"
          data-testid="publish-submit"
          disabled={busy}
        >
          {busy ? "Publishing…" : "Publish site"}
        </button>
      </form>
      {message && (
        <p className="success-text" data-testid="publish-success">
          {message}
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
