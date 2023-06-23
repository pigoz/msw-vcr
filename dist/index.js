'use strict';

var fs = require('fs-extra');
var path = require('path');
var node = require('msw/node');
var msw = require('msw');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var fs__default = /*#__PURE__*/_interopDefault(fs);
var path__default = /*#__PURE__*/_interopDefault(path);

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
function makeHandlers(existingJson) {
  const methods = {
    GET: msw.rest.get,
    POST: msw.rest.post,
    PUT: msw.rest.put,
    DELETE: msw.rest.delete,
    OPTIONS: msw.rest.options,
    HEAD: msw.rest.head,
    PATCH: msw.rest.patch
  };
  return existingJson.map((handler) => {
    const method = handler.request.method;
    const builder = methods[method];
    return builder(
      handler.request.url,
      (_req, res, ctx) => res(ctx.status(handler.response.status), ctx.body(handler.response.body))
    );
  });
}
function setupServer(config, ...handlers) {
  function listen(name) {
    var _a;
    const cassetteFile = path__default.default.resolve(config.cassetteDir, `${name}.json`);
    const requests = /* @__PURE__ */ new Map();
    const transactions = /* @__PURE__ */ new Set();
    const existingJson = fs__default.default.pathExistsSync(cassetteFile) ? (_a = fs__default.default.readJsonSync(cassetteFile)) != null ? _a : [] : [];
    const server = node.setupServer(
      ...makeHandlers(existingJson),
      ...handlers
    );
    server.events.on("request:start", (request) => {
      requests.set(request.id, request);
    });
    server.events.on("response:bypass", (response_, requestId) => {
      const request_ = requests.get(requestId);
      const request = JSON.parse(JSON.stringify(request_));
      request.headers = request_.headers.raw();
      const response = JSON.parse(JSON.stringify(response_));
      response.headers = response_.headers.raw();
      transactions.add({ request, response });
    });
    function write() {
      const json = existingJson;
      transactions.forEach((transaction) => {
        json.push(transaction);
      });
      fs__default.default.outputFileSync(cassetteFile, JSON.stringify(json, null, 2));
    }
    const onUnhandledRequest = { error: "error", record: "bypass" };
    server.listen({
      onUnhandledRequest: onUnhandledRequest[config.onUnhandledRequest]
    });
    return function close() {
      server.close();
      write();
    };
  }
  function cassette(name, callback) {
    return __async(this, null, function* () {
      const close = listen(name);
      return callback().finally(() => close());
    });
  }
  return {
    listen,
    cassette
  };
}

exports.setupServer = setupServer;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map