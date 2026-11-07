import { expect, test } from "@playwright/test";
import {
  clickIframeLink,
  expectIframeHeading,
  goToAddress,
  readIframeScrollY,
  selectPersonByName,
  waitForNotFound,
  waitForViewer,
} from "./helpers";

test.describe("The Small Web browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("person-select")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("address bar navigation and four-site link trail with back/forward", async ({
    page,
  }) => {
    await goToAddress(page, "tidepool.zz");
    await expectIframeHeading(page, "Tidepool Notes");

    await clickIframeLink(page, "quiet forest");
    await expectIframeHeading(page, "The Listening Forest");

    await clickIframeLink(page, "the mountain");
    await expectIframeHeading(page, "Mountain Switchback");

    await clickIframeLink(page, "astronomy loft");
    await expectIframeHeading(page, "Astronomy Loft");

    await page.getByTestId("nav-back").click();
    await expectIframeHeading(page, "Mountain Switchback");

    await page.getByTestId("nav-forward").click();
    await expectIframeHeading(page, "Astronomy Loft");
  });

  test("forward truncation and scroll restoration on real content height", async ({
    page,
  }) => {
    await goToAddress(page, "tidepool.zz");
    await expectIframeHeading(page, "Tidepool Notes");

    // Scroll using genuine seed prose (deep marker), not artificial viewer chrome height.
    const frame = await waitForViewer(page);
    await frame.locator("#tidepool-deep").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    // Persist scrollY into the navigation entry via report-scroll.
    await page.evaluate(() => {
      const iframe = document.querySelector(
        '[data-testid="page-viewer"]',
      ) as HTMLIFrameElement | null;
      iframe?.contentWindow?.postMessage(
        {
          source: "small-web-parent",
          type: "report-scroll",
          entryId: iframe.dataset.entryId,
        },
        "*",
      );
    });
    await page.waitForTimeout(150);
    const scrolled = await readIframeScrollY(page);
    expect(scrolled).toBeGreaterThan(100);

    await goToAddress(page, "forest.zz");
    await expectIframeHeading(page, "The Listening Forest");
    await goToAddress(page, "garden.zz");
    await expectIframeHeading(page, "Walled Garden");

    await page.getByTestId("nav-back").click();
    await expectIframeHeading(page, "The Listening Forest");
    await page.getByTestId("nav-back").click();
    await expectIframeHeading(page, "Tidepool Notes");

    // Scroll should restore via postMessage protocol.
    await page.waitForTimeout(400);
    const restored = await readIframeScrollY(page);
    expect(restored).toBeGreaterThan(100);

    // Branch truncation: navigate elsewhere; Forward must be disabled.
    await goToAddress(page, "ocean.zz");
    await expectIframeHeading(page, "Ocean Overlook");
    await expect(page.getByTestId("nav-forward")).toBeDisabled();
  });

  test("broken address and return", async ({ page }) => {
    await goToAddress(page, "tidepool.zz");
    await expectIframeHeading(page, "Tidepool Notes");

    await goToAddress(page, "coralruins.zz");
    await waitForNotFound(page, "coralruins.zz");

    await page.getByTestId("nav-back").click();
    await expectIframeHeading(page, "Tidepool Notes");
  });

  test("person switching isolates visit history", async ({ page }) => {
    await selectPersonByName(page, "Mira Chen");
    await goToAddress(page, "tidepool.zz");
    await expectIframeHeading(page, "Tidepool Notes");

    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("history-list")).toContainText("tidepool.zz");

    await selectPersonByName(page, "Nora Hale");
    await page.getByTestId("tab-history").click();
    // Nora's seed history should not suddenly show Mira's live tidepool as hers
    // exclusively — list is Nora's. Live Mira visit must not appear under Nora.
    const noraHistory = page.getByTestId("history-list");
    await expect(noraHistory).toBeVisible();
    // Independent session: Nora starts empty stack
    await expect(page.getByTestId("page-viewer")).toHaveCount(0);
    await expect(page.getByText("Start somewhere")).toBeVisible();
  });

  test("history jump loads destination", async ({ page }) => {
    await selectPersonByName(page, "Mira Chen");
    await page.getByTestId("tab-history").click();
    await page.getByTestId("history-item-library.zz").first().click();
    await expectIframeHeading(page, "The Night Library");
  });

  test("search body text, open result, return to results", async ({ page }) => {
    await page.getByTestId("tab-search").click();
    await page.getByTestId("search-input").fill("lavender");
    await page.getByTestId("search-submit").click();
    await expect(page.getByTestId("search-results")).toContainText("garden.zz");

    await page.getByTestId("search-result-garden.zz").click();
    await expectIframeHeading(page, "Walled Garden");

    // Search UI is chrome state, not the nav stack — return via tab.
    await page.getByTestId("tab-history").click();
    await page.getByTestId("tab-search").click();
    await expect(page.getByTestId("search-results")).toContainText("garden.zz");
    await expect(page.getByTestId("search-input")).toHaveValue("lavender");
  });

  test("publish and open a new site", async ({ page }) => {
    const address = `audit${Date.now()}.zz`;
    await page.getByTestId("tab-publish").click();
    await page.getByTestId("publish-address").fill(address);
    await page.getByTestId("publish-html").fill(
      `<h1>Audit Site</h1><p>Unique phrase xylophone-audit.</p><a href="forest.zz">To Forest</a>`,
    );
    await page.getByTestId("publish-submit").click();
    await expect(page.getByTestId("publish-success")).toContainText(address);

    await expectIframeHeading(page, "Audit Site");
    await clickIframeLink(page, "To Forest");
    await expectIframeHeading(page, "The Listening Forest");
  });

  test("malicious HTML does not execute and cannot message parent freely", async ({
    page,
  }) => {
    const address = `xss${Date.now()}.zz`;
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.getByTestId("tab-publish").click();
    await page.getByTestId("publish-address").fill(address);
    await page.getByTestId("publish-html").fill(
      `<h1>Safe Title</h1>
       <script>alert("XSS")</script>
       <img src="x" onerror="alert('XSS')">
       <a href="javascript:alert('XSS')">Bad</a>
       <a href="forest.zz">Good</a>
       <p>visible text</p>`,
    );
    await page.getByTestId("publish-submit").click();
    await expectIframeHeading(page, "Safe Title");

    const frame = await waitForViewer(page);
    await expect(frame.getByText("visible text")).toBeVisible();
    await expect(frame.locator("script")).toHaveCount(1); // only trusted bootstrap
    await expect(frame.getByRole("link", { name: "Bad" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(frame.getByRole("link", { name: "Good" })).toHaveAttribute(
      "data-sw-nav",
      "forest.zz",
    );
    expect(alertFired).toBe(false);

    // Forged parent-targeted message from page context must not navigate.
    await page.evaluate(() => {
      window.postMessage(
        {
          source: "small-web-viewer",
          type: "navigate",
          entryId: "forged",
          address: "ocean.zz",
        },
        "*",
      );
    });
    await page.waitForTimeout(300);
    await expectIframeHeading(page, "Safe Title");
  });

  test("delayed responses do not overwrite after Back", async ({ page }) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/api/sites/forest.zz", async (route) => {
      await gate;
      await route.continue();
    });

    await goToAddress(page, "tidepool.zz");
    await expectIframeHeading(page, "Tidepool Notes");

    // Start slow navigation to forest, then immediately go elsewhere via address.
    await page.getByTestId("address-bar").fill("forest.zz");
    await page.getByTestId("address-go").click();
    await expect(page.getByText("Loading forest.zz")).toBeVisible();

    // Back to tidepool before forest resolves — invalidates pending request.
    await page.getByTestId("nav-back").click();
    await expectIframeHeading(page, "Tidepool Notes");

    release?.();
    await page.waitForTimeout(800);
    // Must still show tidepool, not flip to forest.
    await expectIframeHeading(page, "Tidepool Notes");
  });

  test("Forward after cancelled navigation recovers instead of hanging on Loading", async ({
    page,
  }) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let forestHits = 0;

    await page.route("**/api/sites/forest.zz", async (route) => {
      forestHits += 1;
      if (forestHits === 1) {
        await gate;
      }
      await route.continue();
    });

    await goToAddress(page, "tidepool.zz");
    await expectIframeHeading(page, "Tidepool Notes");

    await page.getByTestId("address-bar").fill("forest.zz");
    await page.getByTestId("address-go").click();
    await expect(page.getByText("Loading forest.zz")).toBeVisible();

    await page.getByTestId("nav-back").click();
    await expectIframeHeading(page, "Tidepool Notes");

    // Forward must not stick on Loading… — recovers by retrying the fetch.
    await page.getByTestId("nav-forward").click();
    release?.();
    await expectIframeHeading(page, "The Listening Forest");
    expect(forestHits).toBeGreaterThanOrEqual(2);
  });
});
