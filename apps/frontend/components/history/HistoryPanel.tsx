"use client";

import type { VisitDto } from "@small-web/shared";

interface HistoryPanelProps {
  visits: VisitDto[];
  onJump: (address: string) => void;
}

export function HistoryPanel({ visits, onJump }: HistoryPanelProps) {
  return (
    <section className="panel" aria-labelledby="history-heading">
      <h2 id="history-heading" className="panel-title">
        History
      </h2>
      <p className="panel-sub">
        Chronological visits for the selected person — separate from Back/Forward.
      </p>
      {visits.length === 0 ? (
        <p className="empty-note">No visits yet for this person.</p>
      ) : (
        <ul className="history-list" data-testid="history-list">
          {visits.map((visit) => (
            <li key={visit.id}>
              <button
                type="button"
                className="history-item"
                data-testid={`history-item-${visit.address}`}
                onClick={() => onJump(visit.address)}
              >
                <span className="history-address">{visit.address}</span>
                <span className="history-meta">
                  {visit.status === "not-found" ? "not found · " : ""}
                  {visit.navigationType} ·{" "}
                  {new Date(visit.timestamp).toLocaleString("en-PK", {
                    timeZone: "Asia/Karachi",
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  (Asia/Karachi)
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
