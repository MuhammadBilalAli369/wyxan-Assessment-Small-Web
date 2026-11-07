import { expect, type Page } from "@playwright/test";

export async function goToAddress(page: Page, address: string) {
  await page.getByTestId("address-bar").fill(address);
  await page.getByTestId("address-go").click();
}

export async function waitForViewer(page: Page) {
  await expect(page.getByTestId("page-viewer")).toBeVisible({ timeout: 20_000 });
  return page.frameLocator('[data-testid="page-viewer"]');
}

export async function waitForNotFound(page: Page, address: string) {
  await expect(page.getByText("No site at")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("body")).toContainText(address);
}

export async function clickIframeLink(page: Page, linkText: string) {
  const frame = await waitForViewer(page);
  await frame.getByRole("link", { name: linkText }).click();
}

export async function selectPersonByName(page: Page, name: string) {
  await page.getByTestId("person-select").selectOption({ label: name });
  // Give history a moment to refresh for the new person.
  await page.waitForTimeout(400);
}

export async function expectIframeHeading(page: Page, text: string) {
  const frame = await waitForViewer(page);
  await expect(frame.getByRole("heading", { name: text })).toBeVisible();
}

/** Ask the trusted iframe bootstrap for its current scrollY (opaque origin). */
export async function readIframeScrollY(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const iframe = document.querySelector(
      '[data-testid="page-viewer"]',
    ) as HTMLIFrameElement | null;
    if (!iframe?.contentWindow) return -1;
    const entryId = iframe.dataset.entryId;

    return await new Promise<number>((resolve) => {
      const timer = window.setTimeout(() => resolve(-1), 4000);
      function onMessage(event: MessageEvent) {
        if (event.source !== iframe.contentWindow) return;
        const data = event.data;
        if (!data || data.source !== "small-web-viewer") return;
        if (data.type === "scroll" && data.entryId === entryId) {
          window.clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          resolve(Number(data.scrollY) || 0);
        }
      }
      window.addEventListener("message", onMessage);
      iframe.contentWindow.postMessage(
        {
          source: "small-web-parent",
          type: "report-scroll",
          entryId,
        },
        "*",
      );
    });
  });
}

export async function scrollIframeTo(page: Page, y: number) {
  await page.evaluate(async (targetY) => {
    const iframe = document.querySelector(
      '[data-testid="page-viewer"]',
    ) as HTMLIFrameElement | null;
    if (!iframe?.contentWindow) throw new Error("no iframe");
    const entryId = iframe.dataset.entryId;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error("scroll restore timeout")),
        4000,
      );
      function onMessage(event: MessageEvent) {
        if (event.source !== iframe.contentWindow) return;
        const data = event.data;
        if (
          data?.source === "small-web-viewer" &&
          data.type === "scroll-restored" &&
          data.entryId === entryId
        ) {
          window.clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          resolve();
        }
      }
      window.addEventListener("message", onMessage);
      iframe.contentWindow!.postMessage(
        {
          source: "small-web-parent",
          type: "restore-scroll",
          entryId,
          scrollY: targetY,
        },
        "*",
      );
    });
  }, y);
  // Parent stores scroll via the accompanying scroll event (after restoring flag clears).
  await page.waitForTimeout(200);
  // Force a report so parent onScrollChange definitely receives the value.
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
}
