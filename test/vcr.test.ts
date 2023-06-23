import { setupServer } from "msw-vcr";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { rest } from "msw";

async function exampleGithubFetch() {
  return fetch("https://api.github.com/orgs/nodejs", {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((response) => response.json() as Promise<unknown>);
}

describe("msw-vcr", () => {
  it("records an unhandled github API call", async () => {
    const cassetteDir = fs.mkdtempSync(path.join(os.tmpdir(), "msw-vcr-"));

    const vcr = setupServer({
      cassetteDir: cassetteDir,
      onUnhandledRequest: "record",
    });

    const res = await vcr.cassette("github", exampleGithubFetch);
    expect(res).toMatchObject({ login: "nodejs" });

    const recording = path.resolve(cassetteDir, "github.json");
    expect(fs.pathExistsSync(recording)).toEqual(true);
  });

  it("errors on unhandled github API call", async () => {
    const cassetteDir = fs.mkdtempSync(path.join(os.tmpdir(), "msw-vcr-"));

    const vcr = setupServer({
      cassetteDir: cassetteDir,
      onUnhandledRequest: "error",
    });

    function throws() {
      return vcr.cassette("github", exampleGithubFetch);
    }

    await expect(throws).rejects.toThrowError("Failed to fetch");
  });

  it("uses cassette handlers", async () => {
    const cassetteDir = path.join(__dirname, "vcr");

    const vcr = setupServer({
      cassetteDir: cassetteDir,
      onUnhandledRequest: "error",
    });

    await vcr.cassette("github", exampleGithubFetch);
  });

  it("uses handlers overrides", async () => {
    const cassetteDir = fs.mkdtempSync(path.join(os.tmpdir(), "msw-vcr-"));

    const vcr = setupServer(
      {
        cassetteDir: cassetteDir,
        onUnhandledRequest: "error",
      },
      rest.get("https://api.github.com/orgs/nodejs", (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ foo: 1 }))
      )
    );

    const res = await vcr.cassette("test", exampleGithubFetch);
    expect(res).toMatchObject({ foo: 1 });
  });
});
