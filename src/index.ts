import fs from "fs-extra";
import path from "path";
import { setupServer as mswSetupServerNode } from "msw/node";
import { RequestHandler, HttpResponse, http } from "msw";

function makeHandlers(existingJson: unknown[]): RequestHandler[] {
  const methods = {
    GET: http.get,
    POST: http.post,
    PUT: http.put,
    DELETE: http.delete,
    OPTIONS: http.options,
    HEAD: http.head,
    PATCH: http.patch,
  };

  return existingJson.map((handler: any) => {
    const method = handler.request.method as keyof typeof methods;
    const builder = methods[method];

    return builder(handler.request.url, () =>
      HttpResponse.json(handler.response.body, {
        status: handler.response.status,
      })
    );
  });
}

interface Config {
  cassetteDir: string;
  onUnhandledRequest: "error" | "record";
}

export function setupServer(config: Config, ...handlers: RequestHandler[]) {
  function listen(name: string) {
    const cassetteFile = path.resolve(config.cassetteDir, `${name}.json`);
    const requests = new Map();
    const transactions = new Set();

    const existingJson = fs.pathExistsSync(cassetteFile)
      ? ((fs.readJsonSync(cassetteFile) ?? []) as unknown[])
      : [];

    const server = mswSetupServerNode(
      ...makeHandlers(existingJson),
      ...handlers
    );

    server.events.on("request:start", ({ requestId, request }) => {
      // Record every dispatched request.
      requests.set(requestId, request);
    });

    // server.events.on("request:match", (request) => {
    //   console.log("%s %s has a handler", request.method, request.url.href);
    // });

    // server.events.on("request:unhandled", (request) => {
    //   console.log("%s %s has no handler", request.method, request.url.href);
    // });

    // Since we're not providing any request handlers
    // to the "setupServer" call, all responses will be
    // bypassed (performed as-is). This will allow us to
    // collect the actual responses.
    server.events.on("response:bypass", ({ response, requestId }) => {
      const request_ = requests.get(requestId);

      const request = JSON.parse(JSON.stringify(request_));
      request.headers = request_.headers;

      const response_ = JSON.parse(JSON.stringify(response));
      response_.headers = response.headers;

      transactions.add({ request, response: response_ });
    });

    function write() {
      const json = existingJson;

      transactions.forEach((transaction) => {
        json.push(transaction);
      });

      fs.outputFileSync(cassetteFile, JSON.stringify(json, null, 2));
    }

    const onUnhandledRequest = { error: "error", record: "bypass" } as const;

    server.listen({
      onUnhandledRequest: onUnhandledRequest[config.onUnhandledRequest],
    });

    return function close() {
      server.close();
      write();
    };
  }

  async function cassette<T>(
    name: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const close = listen(name);
    return callback().finally(() => close());
  }

  return {
    listen,
    cassette,
  };
}
