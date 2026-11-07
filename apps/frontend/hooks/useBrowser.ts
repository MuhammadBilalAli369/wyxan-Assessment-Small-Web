"use client";

import { normalizeAddress, type PersonDto, type VisitDto } from "@small-web/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  BrowserNavigationState,
  NavigationEntry,
  NavigationType,
  applyBack,
  applyForward,
  canGoBack,
  canGoForward,
  createEmptyNavigation,
  finalizeStaleLoadingEntries,
  getCurrentEntry,
  navigateTo,
  needsRecovery,
  newEntryId,
  replaceEntryById,
  withUpdatedScrollForEntry,
} from "@/lib/navigation";

type SessionMap = Record<string, BrowserNavigationState>;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function visitStatusFor(
  entry: NavigationEntry,
): "success" | "not-found" | null {
  if (entry.status === "not-found") return "not-found";
  if (entry.status === "success") return "success";
  return null;
}

export function useBrowser() {
  const [people, setPeople] = useState<PersonDto[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionMap>({});
  const [visits, setVisits] = useState<VisitDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  /** Monotonic generation: any mismatch means ignore the in-flight work. */
  const navGeneration = useRef(0);
  const visitGeneration = useRef(0);
  const personIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<SessionMap>({});
  const abortRef = useRef<AbortController | null>(null);
  const visitAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    personIdRef.current = personId;
  }, [personId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const nav = personId
    ? (sessions[personId] ?? createEmptyNavigation())
    : createEmptyNavigation();
  const current = getCurrentEntry(nav);

  const updateSession = useCallback(
    (
      id: string,
      updater: (prev: BrowserNavigationState) => BrowserNavigationState,
    ) => {
      setSessions((prev) => {
        const existing = prev[id] ?? createEmptyNavigation();
        const next = updater(existing);
        const merged = { ...prev, [id]: next };
        sessionsRef.current = merged;
        return merged;
      });
    },
    [],
  );

  const invalidatePendingNavigation = useCallback(() => {
    navGeneration.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const refreshVisits = useCallback(async (id: string) => {
    visitAbortRef.current?.abort();
    const controller = new AbortController();
    visitAbortRef.current = controller;
    const gen = ++visitGeneration.current;

    try {
      const list = await api.getVisits(id, { signal: controller.signal });
      if (gen !== visitGeneration.current) return;
      if (personIdRef.current !== id) return;
      setVisits(list);
    } catch (err) {
      if (isAbortError(err)) return;
      if (gen !== visitGeneration.current) return;
      if (personIdRef.current !== id) return;
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getPeople();
        if (cancelled) return;
        setPeople(list);
        if (list.length > 0) {
          setPersonId(list[0].id);
          personIdRef.current = list[0].id;
          await refreshVisits(list[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not reach the Small Web API",
          );
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshVisits]);

  const recordVisit = useCallback(
    async (
      id: string,
      address: string,
      navigationType: NavigationType,
      status: "success" | "not-found",
    ) => {
      try {
        await api.createVisit({
          personId: id,
          address,
          navigationType,
          status,
        });
        if (personIdRef.current === id) {
          await refreshVisits(id);
        }
      } catch {
        // Visit persistence failure should not break browsing.
      }
    },
    [refreshVisits],
  );

  /**
   * Re-fetch into an existing stack entry (same id) after an interrupted load.
   * Does not append a new stack entry or truncate the forward branch.
   */
  const recoverEntry = useCallback(
    async (activePersonId: string, entry: NavigationEntry) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = ++navGeneration.current;

      updateSession(activePersonId, (prev) =>
        replaceEntryById(prev, entry.id, {
          title: "Loading…",
          htmlSnapshot: "",
          status: "loading",
        }),
      );
      setLoading(true);

      const stillValid = () =>
        generation === navGeneration.current &&
        personIdRef.current === activePersonId;

      try {
        const site = await api.getSite(entry.address, {
          signal: controller.signal,
        });
        if (!stillValid()) return;
        updateSession(activePersonId, (prev) =>
          replaceEntryById(prev, entry.id, {
            address: site.address,
            title: site.title,
            htmlSnapshot: site.html,
            status: "success",
          }),
        );
      } catch (err) {
        if (isAbortError(err)) {
          updateSession(activePersonId, (prev) =>
            replaceEntryById(prev, entry.id, {
              title: "Interrupted",
              htmlSnapshot: "",
              status: "error",
            }),
          );
          return;
        }
        if (!stillValid()) return;
        if (err instanceof ApiError && err.status === 404) {
          updateSession(activePersonId, (prev) =>
            replaceEntryById(prev, entry.id, {
              title: "Not found",
              htmlSnapshot: "",
              status: "not-found",
            }),
          );
        } else {
          updateSession(activePersonId, (prev) =>
            replaceEntryById(prev, entry.id, {
              title: "Error",
              htmlSnapshot: "",
              status: "error",
            }),
          );
        }
      } finally {
        if (generation === navGeneration.current) {
          setLoading(false);
        }
      }
    },
    [updateSession],
  );

  const navigate = useCallback(
    async (rawAddress: string, navigationType: NavigationType) => {
      const activePersonId = personIdRef.current;
      if (!activePersonId) {
        setError("Select a person before browsing");
        return;
      }

      const normalized = normalizeAddress(rawAddress);
      if (!normalized.ok) {
        setError(normalized.error);
        return;
      }

      setError(null);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = ++navGeneration.current;
      const entryId = newEntryId();

      // Finalize any leftover loading entries before appending.
      updateSession(activePersonId, (prev) =>
        navigateTo(finalizeStaleLoadingEntries(prev), {
          id: entryId,
          address: normalized.address,
          title: "Loading…",
          htmlSnapshot: "",
          scrollY: 0,
          status: "loading",
        }),
      );
      setLoading(true);

      const stillValid = () =>
        generation === navGeneration.current &&
        personIdRef.current === activePersonId;

      try {
        const site = await api.getSite(normalized.address, {
          signal: controller.signal,
        });
        if (!stillValid()) return;

        updateSession(activePersonId, (prev) =>
          replaceEntryById(prev, entryId, {
            address: site.address,
            title: site.title,
            htmlSnapshot: site.html,
            status: "success",
          }),
        );
        await recordVisit(
          activePersonId,
          site.address,
          navigationType,
          "success",
        );
      } catch (err) {
        if (isAbortError(err)) {
          // Keep the stack consistent: never leave a permanent Loading… entry.
          updateSession(activePersonId, (prev) =>
            replaceEntryById(prev, entryId, {
              address: normalized.address,
              title: "Interrupted",
              htmlSnapshot: "",
              status: "error",
            }),
          );
          return;
        }
        if (!stillValid()) return;

        if (err instanceof ApiError && err.status === 404) {
          updateSession(activePersonId, (prev) =>
            replaceEntryById(prev, entryId, {
              address: normalized.address,
              title: "Not found",
              htmlSnapshot: "",
              status: "not-found",
            }),
          );
          await recordVisit(
            activePersonId,
            normalized.address,
            navigationType,
            "not-found",
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Navigation failed";
          setError(message);
          updateSession(activePersonId, (prev) =>
            replaceEntryById(prev, entryId, {
              address: normalized.address,
              title: "Error",
              htmlSnapshot: "",
              status: "error",
            }),
          );
        }
      } finally {
        if (generation === navGeneration.current) {
          setLoading(false);
        }
      }
    },
    [updateSession, recordVisit],
  );

  const back = useCallback(async () => {
    const activePersonId = personIdRef.current;
    if (!activePersonId) return;

    const before =
      sessionsRef.current[activePersonId] ?? createEmptyNavigation();
    const { state: after, destination, moved } = applyBack(before);
    if (!moved || !destination) return;

    invalidatePendingNavigation();
    updateSession(activePersonId, () => after);

    if (needsRecovery(destination)) {
      await recoverEntry(activePersonId, destination);
      return;
    }

    const status = visitStatusFor(destination);
    if (status) {
      await recordVisit(activePersonId, destination.address, "back", status);
    }
  }, [invalidatePendingNavigation, updateSession, recordVisit, recoverEntry]);

  const forward = useCallback(async () => {
    const activePersonId = personIdRef.current;
    if (!activePersonId) return;

    const before =
      sessionsRef.current[activePersonId] ?? createEmptyNavigation();
    const { state: after, destination, moved } = applyForward(before);
    if (!moved || !destination) return;

    invalidatePendingNavigation();
    updateSession(activePersonId, () => after);

    if (needsRecovery(destination)) {
      await recoverEntry(activePersonId, destination);
      return;
    }

    const status = visitStatusFor(destination);
    if (status) {
      await recordVisit(
        activePersonId,
        destination.address,
        "forward",
        status,
      );
    }
  }, [invalidatePendingNavigation, updateSession, recordVisit, recoverEntry]);

  const selectPerson = useCallback(
    async (id: string) => {
      invalidatePendingNavigation();
      const previousId = personIdRef.current;
      if (previousId) {
        updateSession(previousId, finalizeStaleLoadingEntries);
      }
      setPersonId(id);
      personIdRef.current = id;
      setError(null);
      setVisits([]);
      setSessions((prev) => {
        const next = prev[id]
          ? prev
          : { ...prev, [id]: createEmptyNavigation() };
        sessionsRef.current = next;
        return next;
      });
      await refreshVisits(id);
    },
    [invalidatePendingNavigation, refreshVisits, updateSession],
  );

  const onScrollChange = useCallback(
    (entryId: string, scrollY: number) => {
      const activePersonId = personIdRef.current;
      if (!activePersonId) return;
      updateSession(activePersonId, (prev) =>
        withUpdatedScrollForEntry(prev, entryId, scrollY),
      );
    },
    [updateSession],
  );

  return {
    people,
    personId,
    selectPerson,
    nav,
    current,
    canBack: canGoBack(nav),
    canForward: canGoForward(nav),
    loading,
    error,
    setError,
    bootstrapping,
    visits,
    navigate,
    back,
    forward,
    onScrollChange,
    refreshVisits,
  };
}
