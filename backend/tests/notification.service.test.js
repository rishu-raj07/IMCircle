// Unit tests for the centralized notification service — the single place
// every controller in the app creates/removes a Notification through (see
// notification.service.js's doc comment). These tests mock the Mongoose
// model and the socket emitter, so they run with no live MongoDB and no
// live Socket.io server — the sandbox this was written in has access to
// neither. They verify the SERVICE'S OWN LOGIC (self-guard, dedupe
// mechanism, link derivation, error swallowing) at the unit level, which is
// the shared foundation every controller-level behavior in the spec's test
// list (self-like/follow produces none, duplicate like/follow produces no
// duplicate, etc.) is built on.
//
// Run with:  node --experimental-test-module-mocks --test tests/notification.service.test.js
// (from backend/). Requires Node 20.19+ / 22.7+ for --experimental-test-module-mocks.
//
// A real end-to-end pass (live MongoDB + two logged-in accounts + a real
// Socket.io connection) still needs to be run by hand against your dev/
// staging environment — see the manual testing checklist in the final
// report. Nothing here substitutes for that; it only proves the service's
// internal logic is correct in isolation.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const RECIPIENT_ID = "111111111111111111111111";
const ACTOR_ID = "222222222222222222222222";
const ENTITY_ID = "333333333333333333333333";

function createNotificationModelMock({ findOneAndUpdateResult = null, createResult = null, createError = null } = {}) {
  const calls = { create: [], findOneAndUpdate: [], deleteOne: [] };

  return {
    calls,
    Notification: {
      create: async (doc) => {
        calls.create.push(doc);
        if (createError) throw createError;
        return createResult || { _id: "notif1", ...doc };
      },
      findOneAndUpdate: async (filter, update, options) => {
        calls.findOneAndUpdate.push({ filter, update, options });
        return findOneAndUpdateResult || { _id: "notif1", ...update.$set, ...filter };
      },
      deleteOne: async (filter) => {
        calls.deleteOne.push(filter);
        return { deletedCount: 1 };
      },
    },
  };
}

function createSocketMock() {
  const calls = [];
  return {
    calls,
    emitNotification: (recipientId, notification) => {
      calls.push({ recipientId, notification });
    },
  };
}

async function loadServiceWithMocks(t, { modelOverrides, socketOverrides } = {}) {
  const modelMock = createNotificationModelMock(modelOverrides);
  const socketMock = createSocketMock();

  t.mock.module("../src/models/Notification.js", {
    defaultExport: modelMock.Notification,
  });
  t.mock.module("../src/socket/socket.js", {
    namedExports: { emitNotification: socketOverrides?.emitNotification || socketMock.emitNotification },
  });

  // Cache-bust: re-import fresh each test so mocks apply cleanly.
  const mod = await import(`../src/services/notification.service.js?t=${Date.now()}-${Math.random()}`);

  return { service: mod.default, modelMock, socketMock };
}

describe("notificationService.create", () => {
  test("never notifies a user about their own action (self-like/self-follow guard)", async (t) => {
    const { service, modelMock, socketMock } = await loadServiceWithMocks(t);

    const result = await service.create({
      recipientId: ACTOR_ID,
      actorId: ACTOR_ID,
      type: "like",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "liked their own post",
    });

    assert.equal(result, null);
    assert.equal(modelMock.calls.create.length, 0);
    assert.equal(modelMock.calls.findOneAndUpdate.length, 0);
    assert.equal(socketMock.calls.length, 0);
  });

  test("allowSelf bypasses the self-guard for system-generated types (e.g. badge)", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    const result = await service.create({
      recipientId: ACTOR_ID,
      actorId: ACTOR_ID,
      type: "badge",
      entityType: "badge",
      entityId: ENTITY_ID,
      message: "You earned a badge",
      allowSelf: true,
    });

    assert.notEqual(result, null);
    assert.equal(modelMock.calls.create.length, 1);
  });

  test("missing recipientId, actorId, or type creates nothing", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.create({ actorId: ACTOR_ID, type: "like" });
    await service.create({ recipientId: RECIPIENT_ID, type: "like" });
    await service.create({ recipientId: RECIPIENT_ID, actorId: ACTOR_ID });

    assert.equal(modelMock.calls.create.length, 0);
    assert.equal(modelMock.calls.findOneAndUpdate.length, 0);
  });

  test("dedupe:false (e.g. a comment/reply — each is its own event) uses Notification.create, not upsert", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "comment",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "commented on your post",
    });

    assert.equal(modelMock.calls.create.length, 1);
    assert.equal(modelMock.calls.findOneAndUpdate.length, 0);
    assert.equal(modelMock.calls.create[0].recipient, RECIPIENT_ID);
    assert.equal(modelMock.calls.create[0].actor, ACTOR_ID);
    assert.equal(modelMock.calls.create[0].type, "comment");
  });

  test("dedupe:true (e.g. like/follow) upserts on a stable key instead of inserting a new row", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "like",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "liked your post",
      dedupe: true,
    });

    assert.equal(modelMock.calls.create.length, 0);
    assert.equal(modelMock.calls.findOneAndUpdate.length, 1);

    const call = modelMock.calls.findOneAndUpdate[0];
    assert.equal(call.filter.deduplicationKey, `like:post:${ENTITY_ID}:${ACTOR_ID}:${RECIPIENT_ID}`);
    assert.equal(call.options.upsert, true);
  });

  test("repeating the same dedupe'd action twice always targets the identical key (proves duplicate like/follow can't create two rows)", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    const payload = {
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "follow",
      entityType: "user",
      entityId: ACTOR_ID,
      message: "started following you",
      dedupe: true,
    };

    await service.create(payload);
    await service.create(payload);

    assert.equal(modelMock.calls.findOneAndUpdate.length, 2);
    assert.equal(
      modelMock.calls.findOneAndUpdate[0].filter.deduplicationKey,
      modelMock.calls.findOneAndUpdate[1].filter.deduplicationKey
    );
  });

  test("emits the created notification to the recipient over the socket", async (t) => {
    const { service, socketMock } = await loadServiceWithMocks(t);

    await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "comment",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "commented on your post",
    });

    assert.equal(socketMock.calls.length, 1);
    assert.equal(socketMock.calls[0].recipientId, RECIPIENT_ID);
    assert.ok(socketMock.calls[0].notification);
  });

  test("an explicit link always wins over the auto-derived one", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "mention",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "mentioned you",
      link: "/custom/route",
    });

    assert.equal(modelMock.calls.create[0].link, "/custom/route");
  });

  const linkCases = [
    { entityType: "post", entityId: ENTITY_ID, metadata: {}, expected: `/post/${ENTITY_ID}` },
    { entityType: "journey", entityId: ENTITY_ID, metadata: {}, expected: `/journey/${ENTITY_ID}` },
    {
      entityType: "journey_milestone",
      entityId: ENTITY_ID,
      metadata: { journeyId: "j1" },
      expected: "/journey/j1",
    },
    { entityType: "learning", entityId: ENTITY_ID, metadata: {}, expected: `/learning-view/${ENTITY_ID}` },
    { entityType: "circle", entityId: ENTITY_ID, metadata: {}, expected: `/circles/${ENTITY_ID}` },
    { entityType: "message", entityId: ENTITY_ID, metadata: {}, expected: `/chat/${ENTITY_ID}` },
    { entityType: "user", entityId: ENTITY_ID, metadata: {}, expected: `/profile/user/${ENTITY_ID}` },
    { entityType: "user", entityId: ENTITY_ID, metadata: { username: "asha" }, expected: "/profile/asha" },
    { entityType: "spotlight", entityId: ENTITY_ID, metadata: {}, expected: "/spotlight" },
    { entityType: "badge", entityId: ENTITY_ID, metadata: {}, expected: "/profile" },
    { entityType: "", entityId: ENTITY_ID, metadata: {}, expected: "" },
    { entityType: "unknown_type", entityId: ENTITY_ID, metadata: {}, expected: "" },
  ];

  for (const testCase of linkCases) {
    test(`derives the correct link for entityType "${testCase.entityType || "(none)"}" ${testCase.metadata?.username ? "with a username" : ""}`, async (t) => {
      const { service, modelMock } = await loadServiceWithMocks(t);

      await service.create({
        recipientId: RECIPIENT_ID,
        actorId: ACTOR_ID,
        type: "mention",
        entityType: testCase.entityType,
        entityId: testCase.entityId,
        metadata: testCase.metadata,
        message: "test",
      });

      assert.equal(modelMock.calls.create[0].link, testCase.expected);
    });
  }

  test("never throws when the model rejects — swallows the error and returns null", async (t) => {
    const { service } = await loadServiceWithMocks(t, {
      modelOverrides: { createError: new Error("Mongo is down") },
    });

    const result = await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "comment",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "commented",
    });

    assert.equal(result, null);
  });

  test("swallows a duplicate-key race (code 11000) on a dedupe upsert without treating it as a real failure", async (t) => {
    const raceError = Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
    const modelMock = createNotificationModelMock();
    modelMock.Notification.findOneAndUpdate = async () => {
      throw raceError;
    };

    const t2 = t;
    t2.mock.module("../src/models/Notification.js", { defaultExport: modelMock.Notification });
    t2.mock.module("../src/socket/socket.js", { namedExports: { emitNotification: () => {} } });

    const mod = await import(`../src/services/notification.service.js?t=${Date.now()}-race`);
    const result = await mod.default.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "like",
      entityType: "post",
      entityId: ENTITY_ID,
      message: "liked your post",
      dedupe: true,
    });

    assert.equal(result, null);
  });

  test("resolves the default title from DEFAULT_TITLES when no explicit title is given", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "follow",
      entityType: "user",
      entityId: ACTOR_ID,
      message: "started following you",
    });

    assert.equal(modelMock.calls.create[0].title, "New follower");
  });

  test("an explicit title overrides the default", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.create({
      recipientId: RECIPIENT_ID,
      actorId: ACTOR_ID,
      type: "circle_message",
      title: "My Circle",
      message: "Asha: hey there",
    });

    assert.equal(modelMock.calls.create[0].title, "My Circle");
  });
});

describe("notificationService.removeByDedupeKey", () => {
  test("deletes using the exact same key format create() would have used (so unlike/un-repost/reject always finds the right row)", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.removeByDedupeKey({
      type: "like",
      entityType: "post",
      entityId: ENTITY_ID,
      actorId: ACTOR_ID,
      recipientId: RECIPIENT_ID,
    });

    assert.equal(modelMock.calls.deleteOne.length, 1);
    assert.equal(
      modelMock.calls.deleteOne[0].deduplicationKey,
      `like:post:${ENTITY_ID}:${ACTOR_ID}:${RECIPIENT_ID}`
    );
  });

  test("no-ops (does not throw, does not call deleteOne) when actorId or recipientId is missing", async (t) => {
    const { service, modelMock } = await loadServiceWithMocks(t);

    await service.removeByDedupeKey({ type: "like", entityType: "post", entityId: ENTITY_ID });

    assert.equal(modelMock.calls.deleteOne.length, 0);
  });

  test("never throws even if the model rejects", async (t) => {
    const modelMock = createNotificationModelMock();
    modelMock.Notification.deleteOne = async () => {
      throw new Error("Mongo is down");
    };

    t.mock.module("../src/models/Notification.js", { defaultExport: modelMock.Notification });
    t.mock.module("../src/socket/socket.js", { namedExports: { emitNotification: () => {} } });

    const mod = await import(`../src/services/notification.service.js?t=${Date.now()}-delerr`);

    await assert.doesNotReject(() =>
      mod.default.removeByDedupeKey({
        type: "like",
        entityType: "post",
        entityId: ENTITY_ID,
        actorId: ACTOR_ID,
        recipientId: RECIPIENT_ID,
      })
    );
  });
});
