import { test, expect } from "@playwright/test";
const attack = "parent.document.documentElement.dataset.reviewXss='yes'";
const samples = [
  { pages: [{ component: { tagName: "div", script: attack } }] },
  {
    pages: [
      {
        component: {
          tagName: "img",
          attributes: { src: "/missing-image", onerror: attack },
        },
      },
    ],
  },
  {
    pages: [
      {
        component: {
          tagName: "div",
          content: "<img src=x onerror=" + JSON.stringify(attack) + ">",
        },
      },
    ],
  },
  {
    pages: [
      {
        component: {
          tagName: "iframe",
          attributes: { srcdoc: "<script>" + attack + "</script>" },
        },
      },
    ],
  },
  {
    pages: [
      {
        component: {
          tagName: "a",
          attributes: { href: "javascript:" + attack },
        },
      },
    ],
  },
  {
    pages: [
      {
        component: {
          tagName: "div",
          style: { background: "url(javascript:alert(1))" },
        },
      },
    ],
  },
];
async function signedIn(page, content) {
  await page.route("**/src/auth.mjs", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'export const authConfigured=true; export const initializeSession=async()=>true; export const getSession=async()=>({token:"synthetic-test-token",tenantId:"tenant-a"}); export const login=async()=>{}; export const logout=async()=>{};',
    }),
  );
  await page.route("**/api/v1/marketing/**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).pathname.endsWith("/projects")
        ? [{ id: "project-1", name: "Saved page", kind: "grapes", version: 1 }]
        : {
            id: "project-1",
            name: "Saved page",
            kind: "grapes",
            version: 1,
            content,
          },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("combobox", { name: "Saved projects" }),
  ).toBeEnabled();
}
for (let i = 0; i < samples.length; i++) {
  test(
    "saved project attack " + i + " cannot execute in the real editor",
    async ({ page }) => {
      await signedIn(page, samples[i]);
      await page
        .getByRole("combobox", { name: "Saved projects" })
        .selectOption("project-1");
      await expect(page.getByRole("status")).not.toHaveText(
        "Projects ready. Publishing remains disabled.",
      );
      await page.waitForTimeout(300);
      expect(
        await page.locator("html").getAttribute("data-review-xss"),
      ).toBeNull();
      await expect(page.locator(".gjs-frame")).toBeVisible();
    },
  );
}
test("safe project loads in the editor and saves versioned content through gateway", async ({
  page,
}) => {
  await signedIn(page, {
    pages: [
      {
        component: {
          type: "wrapper",
          components: [
            { tagName: "h1", type: "text", content: "Safe saved heading" },
          ],
        },
      },
    ],
    styles: [],
  });
  await page
    .getByRole("combobox", { name: "Saved projects" })
    .selectOption("project-1");
  await expect(
    page.frameLocator(".gjs-frame").getByText("Safe saved heading"),
  ).toBeVisible();
  let saved;
  await page.route(
    "**/api/v1/marketing/workspaces/tenant-a/projects/project-1",
    async (route) => {
      saved = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: "project-1",
          name: saved.name,
          kind: "grapes",
          version: 2,
          content: saved.content,
        },
      });
    },
  );
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved version 2.");
  expect(saved.version).toBe(1);
  expect(saved.content.pages.length).toBe(1);
});
test("signed-out users can edit but cannot save", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Save project" }),
  ).toBeDisabled();
  await expect(page.locator(".gjs-frame")).toBeVisible();
});

test("component ID styles survive save and reload", async ({ page }) => {
  const content = {
    pages: [
      {
        component: {
          type: "wrapper",
          components: [
            {
              tagName: "h1",
              type: "text",
              attributes: { id: "hero" },
              content: "Styled heading",
            },
          ],
        },
      },
    ],
    styles: [
      {
        selectors: [{ name: "hero", type: 2 }],
        style: { color: "rgb(255, 0, 0)" },
      },
    ],
  };
  await signedIn(page, content);
  await page
    .getByRole("combobox", { name: "Saved projects" })
    .selectOption("project-1");
  await expect(
    page.frameLocator(".gjs-frame").getByText("Styled heading"),
  ).toHaveCSS("color", "rgb(255, 0, 0)");
  let persisted = content;
  await page.route(
    "**/api/v1/marketing/workspaces/tenant-a/projects/project-1",
    async (route) => {
      if (route.request().method() === "PUT")
        persisted = route.request().postDataJSON().content;
      await route.fulfill({
        json: {
          id: "project-1",
          name: "Saved page",
          kind: "grapes",
          version: 2,
          content: persisted,
        },
      });
    },
  );
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved version 2.");
  await page.reload();
  await page
    .getByRole("combobox", { name: "Saved projects" })
    .selectOption("project-1");
  await expect(
    page.frameLocator(".gjs-frame").getByText("Styled heading"),
  ).toHaveCSS("color", "rgb(255, 0, 0)");
});
