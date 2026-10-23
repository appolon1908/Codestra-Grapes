import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const kind = "grapes";
test("downloads only the saved reference after unsaved edits", async ({
  page,
}) => {
  const id = "00000000-0000-4000-8000-000000000001";
  const project = {
    id,
    tenant_id: "tenant-a",
    name: "Saved reference",
    kind,
    version: 3,
    content:
      kind === "grapes"
        ? {
            pages: [
              {
                component: {
                  type: "wrapper",
                  components: [
                    { tagName: "h1", type: "text", content: "Saved title" },
                  ],
                },
              },
            ],
            styles: [],
          }
        : {
            nodes: [
              {
                id: "start",
                position: { x: 0, y: 0 },
                data: { label: "Saved title" },
              },
            ],
            edges: [],
          },
  };
  await page.route("**/src/auth.mjs", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'export const authConfigured=true; export const initializeSession=async()=>true; export const getSession=async()=>({token:"synthetic-private-token",tenantId:"tenant-a"}); export const login=async()=>{}; export const logout=async()=>{};',
    }),
  );
  await page.route("**/api/v1/marketing/**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).pathname.endsWith("/projects")
        ? [project]
        : project,
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Export saved reference" }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "Saved projects" }).selectOption(id);
  await expect(page.getByRole("status")).toHaveText("Project loaded.");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Unsaved private change");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved reference" }).click();
  const download = await downloading;
  const text = await readFile(await download.path(), "utf8");
  expect(JSON.parse(text)).toEqual({
    schemaVersion: 1,
    source: { workspaceId: "tenant-a", projectId: id, kind, revision: 3 },
    purpose: "authoring-reference",
    publishAuthorized: false,
    executionAuthorized: false,
  });
  expect(text).not.toMatch(
    /synthetic-private-token|Unsaved private change|Saved title|content/,
  );
  await page.getByRole("button", { name: "New draft" }).click();
  await expect(
    page.getByRole("button", { name: "Export saved reference" }),
  ).toBeDisabled();
});
