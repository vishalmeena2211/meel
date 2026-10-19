// For `pnpm ask:try` only: lets server modules that start with `import "server-only"` load outside Next.js.
/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS preload file, run by Node before anything else */
const Module = require("node:module");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("./ask-try-empty.cjs");
  return resolve.call(this, request, ...rest);
};
