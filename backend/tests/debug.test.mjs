import { test } from "node:test";

test("debug no mocks", async () => {
  try {
    const mod = await import("../src/services/notification.service.js");
    console.log("MOD KEYS (no mock):", Object.keys(mod));
    console.log("typeof default:", typeof mod.default);
  } catch (e) {
    console.log("IMPORT ERROR:", e);
  }
});
