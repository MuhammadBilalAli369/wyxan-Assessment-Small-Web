/**
 * Browser navigation state machine.
 *
 * Session stack (Back/Forward) is separate from chronological visit history.
 * - navigate(): append (truncating any forward branch)
 * - back()/forward(): move index only; restore entry snapshot
 * - Each person keeps an independent BrowserNavigationState
 */

export type EntryStatus = "success" | "not-found" | "loading" | "error";

export interface NavigationEntry {
  id: string;
  address: string;
  title: string;
  htmlSnapshot: string;
  scrollY: number;
  status: EntryStatus;
}

export interface BrowserNavigationState {
  entries: NavigationEntry[];
  currentIndex: number;
}

export type NavigationType =
  | "address-bar"
  | "link"
  | "back"
  | "forward"
  | "history-jump"
  | "search"
  | "publish-open";

export function createEmptyNavigation(): BrowserNavigationState {
  return { entries: [], currentIndex: -1 };
}

export function getCurrentEntry(
  state: BrowserNavigationState,
): NavigationEntry | null {
  if (state.currentIndex < 0 || state.currentIndex >= state.entries.length) {
    return null;
  }
  return state.entries[state.currentIndex];
}

export function canGoBack(state: BrowserNavigationState): boolean {
  return state.currentIndex > 0;
}

export function canGoForward(state: BrowserNavigationState): boolean {
  return state.currentIndex >= 0 && state.currentIndex < state.entries.length - 1;
}

export function newEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `nav-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function withUpdatedScroll(
  state: BrowserNavigationState,
  scrollY: number,
): BrowserNavigationState {
  const current = getCurrentEntry(state);
  if (!current) return state;
  const entries = state.entries.slice();
  entries[state.currentIndex] = { ...current, scrollY };
  return { ...state, entries };
}

/** Append a new entry, truncating any forward branch. */
export function navigateTo(
  state: BrowserNavigationState,
  entry: Omit<NavigationEntry, "id"> & { id?: string },
): BrowserNavigationState {
  const nextEntry: NavigationEntry = {
    id: entry.id ?? newEntryId(),
    address: entry.address,
    title: entry.title,
    htmlSnapshot: entry.htmlSnapshot,
    scrollY: entry.scrollY ?? 0,
    status: entry.status,
  };

  const truncated =
    state.currentIndex < 0
      ? []
      : state.entries.slice(0, state.currentIndex + 1);

  const entries = [...truncated, nextEntry];
  return { entries, currentIndex: entries.length - 1 };
}

export function goBack(state: BrowserNavigationState): BrowserNavigationState {
  if (!canGoBack(state)) return state;
  return { ...state, currentIndex: state.currentIndex - 1 };
}

export function goForward(
  state: BrowserNavigationState,
): BrowserNavigationState {
  if (!canGoForward(state)) return state;
  return { ...state, currentIndex: state.currentIndex + 1 };
}

/** Replace the current entry in place (e.g. loading → success/not-found). */
export function replaceCurrent(
  state: BrowserNavigationState,
  patch: Partial<NavigationEntry>,
): BrowserNavigationState {
  const current = getCurrentEntry(state);
  if (!current) return state;
  const entries = state.entries.slice();
  entries[state.currentIndex] = { ...current, ...patch };
  return { ...state, entries };
}

/**
 * Patch a specific stack entry by id.
 * Safe for async navigation: a late response never mutates a different entry
 * that became current after Back / Forward / a newer navigate.
 */
export function replaceEntryById(
  state: BrowserNavigationState,
  entryId: string,
  patch: Partial<NavigationEntry>,
): BrowserNavigationState {
  const idx = state.entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return state;
  const entries = state.entries.slice();
  entries[idx] = { ...entries[idx], ...patch };
  return { ...state, entries };
}

/** Update scroll for a specific entry (ignores if entry is no longer current). */
export function withUpdatedScrollForEntry(
  state: BrowserNavigationState,
  entryId: string,
  scrollY: number,
): BrowserNavigationState {
  const current = getCurrentEntry(state);
  if (!current || current.id !== entryId) return state;
  return withUpdatedScroll(state, scrollY);
}

/**
 * Convert abandoned `loading` entries into a terminal `error` state.
 * Prevents Forward from landing on an indefinite Loading… screen after
 * a request was aborted by Back / a newer navigation / person switch.
 */
export function finalizeStaleLoadingEntries(
  state: BrowserNavigationState,
): BrowserNavigationState {
  let changed = false;
  const entries = state.entries.map((entry) => {
    if (entry.status !== "loading") return entry;
    changed = true;
    return {
      ...entry,
      title: "Interrupted",
      htmlSnapshot: "",
      status: "error" as const,
    };
  });
  return changed ? { ...state, entries } : state;
}

/** Pure Back transition: returns next state + destination (or null if no move). */
export function applyBack(state: BrowserNavigationState): {
  state: BrowserNavigationState;
  destination: NavigationEntry | null;
  moved: boolean;
} {
  if (!canGoBack(state)) {
    return { state, destination: getCurrentEntry(state), moved: false };
  }
  const cleaned = finalizeStaleLoadingEntries(state);
  const next = goBack(cleaned);
  return { state: next, destination: getCurrentEntry(next), moved: true };
}

/** Pure Forward transition: returns next state + destination (or null if no move). */
export function applyForward(state: BrowserNavigationState): {
  state: BrowserNavigationState;
  destination: NavigationEntry | null;
  moved: boolean;
} {
  if (!canGoForward(state)) {
    return { state, destination: getCurrentEntry(state), moved: false };
  }
  const cleaned = finalizeStaleLoadingEntries(state);
  const next = goForward(cleaned);
  return { state: next, destination: getCurrentEntry(next), moved: true };
}

/** Entries that were interrupted mid-fetch can be recovered by reloading. */
export function needsRecovery(entry: NavigationEntry | null): boolean {
  if (!entry) return false;
  if (entry.status === "loading") return true;
  return entry.status === "error" && entry.title === "Interrupted";
}
