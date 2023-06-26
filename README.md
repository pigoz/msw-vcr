msw-vcr
=======

msw wrapper to record and replay network requests

### Usage
```typescript
import { setupServer } from "msw-vcr";

async function exampleGithubFetch() {
  return fetch("https://api.github.com/orgs/nodejs", {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((response) => response.json() as Promise<unknown>);
}

const cassetteDir = path.join(__dirname, "vcr");

const vcr = setupServer({
  cassetteDir: cassetteDir,
  onUnhandledRequest: process.env['VCR'] ? "record" : "error",
});

await vcr.cassette("github", exampleGithubFetch);
```
