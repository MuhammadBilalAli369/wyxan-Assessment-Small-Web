import {
  applyBack,
  applyForward,
  canGoBack,
  canGoForward,
  createEmptyNavigation,
  finalizeStaleLoadingEntries,
  getCurrentEntry,
  goBack,
  goForward,
  navigateTo,
  needsRecovery,
  replaceEntryById,
  withUpdatedScroll,
  withUpdatedScrollForEntry,
} from "./navigation";

function entry(address: string, title = address) {
  return {
    address,
    title,
    htmlSnapshot: `<h1>${title}</h1>`,
    scrollY: 0,
    status: "success" as const,
  };
}

describe("navigation state machine", () => {
  it("supports initial navigation", () => {
    let state = createEmptyNavigation();
    state = navigateTo(state, entry("tidepool.zz"));
    expect(getCurrentEntry(state)?.address).toBe("tidepool.zz");
    expect(canGoBack(state)).toBe(false);
    expect(canGoForward(state)).toBe(false);
  });

  it("builds a stack and moves back/forward without duplicating", () => {
    let state = createEmptyNavigation();
    state = navigateTo(state, entry("a.zz"));
    state = navigateTo(state, entry("b.zz"));
    state = navigateTo(state, entry("c.zz"));
    state = navigateTo(state, entry("d.zz"));
    expect(state.entries.map((e) => e.address)).toEqual([
      "a.zz",
      "b.zz",
      "c.zz",
      "d.zz",
    ]);

    state = goBack(state);
    expect(getCurrentEntry(state)?.address).toBe("c.zz");
    expect(state.entries).toHaveLength(4);

    state = goForward(state);
    expect(getCurrentEntry(state)?.address).toBe("d.zz");
    expect(state.entries).toHaveLength(4);
  });

  it("truncates the forward branch on new navigation", () => {
    let state = createEmptyNavigation();
    for (const a of ["a.zz", "b.zz", "c.zz", "d.zz"]) {
      state = navigateTo(state, entry(a));
    }
    state = goBack(state);
    state = goBack(state);
    expect(getCurrentEntry(state)?.address).toBe("b.zz");

    state = navigateTo(state, entry("newsite.zz"));
    expect(state.entries.map((e) => e.address)).toEqual([
      "a.zz",
      "b.zz",
      "newsite.zz",
    ]);
    expect(canGoForward(state)).toBe(false);
  });

  it("restores scroll when returning", () => {
    let state = navigateTo(createEmptyNavigation(), entry("a.zz"));
    state = withUpdatedScroll(state, 240);
    state = navigateTo(state, entry("b.zz"));
    state = goBack(state);
    expect(getCurrentEntry(state)?.scrollY).toBe(240);
  });

  it("keeps not-found entries in the stack", () => {
    let state = navigateTo(createEmptyNavigation(), entry("a.zz"));
    state = navigateTo(state, {
      ...entry("missing.zz", "Not found"),
      status: "not-found",
      htmlSnapshot: "",
    });
    expect(getCurrentEntry(state)?.status).toBe("not-found");
    state = goBack(state);
    expect(getCurrentEntry(state)?.address).toBe("a.zz");
  });

  it("allows repeated addresses as distinct entries", () => {
    let state = navigateTo(createEmptyNavigation(), entry("a.zz"));
    state = navigateTo(state, entry("b.zz"));
    state = navigateTo(state, entry("a.zz"));
    expect(state.entries).toHaveLength(3);
    expect(state.entries.filter((e) => e.address === "a.zz")).toHaveLength(2);
  });

  it("replaceEntryById updates only the intended entry after back", () => {
    let state = navigateTo(createEmptyNavigation(), {
      ...entry("a.zz"),
      id: "id-a",
    });
    state = navigateTo(state, {
      ...entry("pending.zz", "Loading…"),
      id: "id-pending",
      status: "loading",
      htmlSnapshot: "",
    });
    state = goBack(state);
    expect(getCurrentEntry(state)?.id).toBe("id-a");

    state = replaceEntryById(state, "id-pending", {
      title: "Arrived late",
      htmlSnapshot: "<h1>Late</h1>",
      status: "success",
    });

    expect(getCurrentEntry(state)?.address).toBe("a.zz");
    expect(state.entries[1].title).toBe("Arrived late");
    expect(state.entries[1].status).toBe("success");
  });

  it("replaceEntryById is a no-op when the entry was truncated away", () => {
    let state = navigateTo(createEmptyNavigation(), {
      ...entry("a.zz"),
      id: "id-a",
    });
    state = navigateTo(state, {
      ...entry("old.zz"),
      id: "id-old",
    });
    state = goBack(state);
    state = navigateTo(state, {
      ...entry("new.zz"),
      id: "id-new",
    });

    const after = replaceEntryById(state, "id-old", {
      title: "should not appear",
      status: "success",
    });
    expect(after.entries.map((e) => e.id)).toEqual(["id-a", "id-new"]);
    expect(after).toEqual(state);
  });

  it("only records scroll for the active entry id", () => {
    let state = navigateTo(createEmptyNavigation(), {
      ...entry("a.zz"),
      id: "id-a",
    });
    state = withUpdatedScrollForEntry(state, "id-a", 90);
    expect(getCurrentEntry(state)?.scrollY).toBe(90);
    state = withUpdatedScrollForEntry(state, "id-other", 999);
    expect(getCurrentEntry(state)?.scrollY).toBe(90);
  });

  it("finalizeStaleLoadingEntries converts abandoned loading entries", () => {
    let state = navigateTo(createEmptyNavigation(), {
      ...entry("a.zz"),
      id: "id-a",
    });
    state = navigateTo(state, {
      ...entry("slow.zz", "Loading…"),
      id: "id-slow",
      status: "loading",
      htmlSnapshot: "",
    });
    state = finalizeStaleLoadingEntries(state);
    expect(state.entries[1].status).toBe("error");
    expect(state.entries[1].title).toBe("Interrupted");
    expect(needsRecovery(state.entries[1])).toBe(true);
  });

  it("applyBack returns destination without mutating via side effects", () => {
    let state = navigateTo(createEmptyNavigation(), {
      ...entry("a.zz"),
      id: "id-a",
    });
    state = navigateTo(state, {
      ...entry("b.zz"),
      id: "id-b",
    });
    const result = applyBack(state);
    expect(result.moved).toBe(true);
    expect(result.destination?.id).toBe("id-a");
    expect(result.state.currentIndex).toBe(0);
    // Original untouched.
    expect(state.currentIndex).toBe(1);
  });

  it("applyBack finalizes loading entries so Forward never lands on loading", () => {
    let state = navigateTo(createEmptyNavigation(), {
      ...entry("a.zz"),
      id: "id-a",
    });
    state = navigateTo(state, {
      ...entry("pending.zz", "Loading…"),
      id: "id-pending",
      status: "loading",
      htmlSnapshot: "",
    });
    const back = applyBack(state);
    expect(back.destination?.id).toBe("id-a");
    expect(back.state.entries[1].status).toBe("error");
    expect(back.state.entries[1].title).toBe("Interrupted");

    const fwd = applyForward(back.state);
    expect(fwd.moved).toBe(true);
    expect(fwd.destination?.status).not.toBe("loading");
    expect(needsRecovery(fwd.destination)).toBe(true);
  });
});
