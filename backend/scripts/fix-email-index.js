/**
 * One-time migration script: fix the `email_1` unique index on the `users`
 * collection.
 *
 * Background:
 * The User model declares `email` as `unique: true, sparse: true`, but the
 * LIVE MongoDB index was created before `sparse: true` was added to the
 * schema. Mongoose only *creates* missing indexes on connect — it never
 * alters or drops existing ones — so the live `email_1` index stayed a
 * plain unique index. That index enforces uniqueness on `email: null` too,
 * so every second user created without an email (e.g. mobile-OTP signup)
 * hits:
 *
 *   E11000 duplicate key error collection: bharat-network.users index:
 *   email_1 dup key: { email: null }
 *
 * This script:
 *   1. Inspects existing indexes on `users`.
 *   2. Drops `email_1` if it isn't already a sparse/partial index that
 *      excludes null values.
 *   3. Unsets `email` on any documents where `email` is explicitly `null`
 *      (sparse/partial indexes only skip documents where the field is
 *      completely ABSENT, not documents where it's present-but-null).
 *   4. Recreates `email_1` as a partial index:
 *      { unique: true, partialFilterExpression: { email: { $type: "string" } } }
 *      which correctly excludes both missing and null email values.
 *
 * Usage:
 *   node scripts/fix-email-index.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const INDEX_NAME = "email_1";

const isAlreadyFixed = (indexInfo) => {
  if (!indexInfo) return false;

  const hasPartialFilter =
    indexInfo.partialFilterExpression &&
    JSON.stringify(indexInfo.partialFilterExpression) ===
      JSON.stringify({ email: { $type: "string" } });

  const isPlainSparse = indexInfo.sparse === true && !indexInfo.partialFilterExpression;

  return Boolean(hasPartialFilter) || isPlainSparse;
};

const run = async () => {
  let droppedIndex = false;
  let cleanedCount = 0;
  let recreatedIndex = false;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB: ${conn.connection.host}`);

    const db = conn.connection.db;
    const users = db.collection("users");

    console.log("\n--- Step 1: Inspecting existing indexes on `users` ---");
    const existingIndexes = await users.indexes();
    existingIndexes.forEach((idx) => {
      console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`, {
        unique: idx.unique || false,
        sparse: idx.sparse || false,
        partialFilterExpression: idx.partialFilterExpression || null,
      });
    });

    const emailIndex = existingIndexes.find((idx) => idx.name === INDEX_NAME);

    console.log("\n--- Step 2: Checking `email_1` index ---");
    if (!emailIndex) {
      console.log("No existing `email_1` index found. Nothing to drop.");
    } else if (isAlreadyFixed(emailIndex)) {
      console.log(
        "`email_1` index already sparse/partial in the correct shape. Skipping drop."
      );
    } else {
      console.log(
        "`email_1` index exists but is NOT sparse/partial (or has a mismatched partial filter). Dropping it.",
        {
          unique: emailIndex.unique || false,
          sparse: emailIndex.sparse || false,
          partialFilterExpression: emailIndex.partialFilterExpression || null,
        }
      );
      await users.dropIndex(INDEX_NAME);
      droppedIndex = true;
      console.log("Dropped index `email_1`.");
    }

    console.log("\n--- Step 3: Cleaning documents with email: null ---");
    const nullEmailCountBefore = await users.countDocuments({ email: null });
    console.log(`Found ${nullEmailCountBefore} document(s) with email: null.`);

    if (nullEmailCountBefore > 0) {
      const result = await users.updateMany(
        { email: null },
        { $unset: { email: "" } }
      );
      cleanedCount = result.modifiedCount;
      console.log(`Unset \`email\` field on ${cleanedCount} document(s).`);
    } else {
      console.log("No documents needed cleaning.");
    }

    console.log("\n--- Step 4: Recreating `email_1` as a partial index ---");
    const indexesAfterDrop = await users.indexes();
    const stillHasEmailIndex = indexesAfterDrop.some(
      (idx) => idx.name === INDEX_NAME
    );

    if (stillHasEmailIndex && !droppedIndex) {
      console.log(
        "`email_1` already correct — skipping recreation to avoid duplicate index error."
      );
    } else {
      await users.createIndex(
        { email: 1 },
        {
          name: INDEX_NAME,
          unique: true,
          partialFilterExpression: { email: { $type: "string" } },
        }
      );
      recreatedIndex = true;
      console.log(
        "Recreated `email_1` as a UNIQUE PARTIAL index (partialFilterExpression: { email: { $type: 'string' } })."
      );
    }

    console.log("\n--- Step 5: Final verification ---");
    const finalIndexes = await users.indexes();
    const finalEmailIndex = finalIndexes.find((idx) => idx.name === INDEX_NAME);
    console.log("Final `email_1` index definition:", JSON.stringify(finalEmailIndex, null, 2));

    const remainingNullEmails = await users.countDocuments({ email: null });
    console.log(`Documents remaining with email: null -> ${remainingNullEmails}`);

    console.log("\n=== SUMMARY ===");
    console.log(`Dropped old index:      ${droppedIndex ? "YES" : "NO (not needed)"}`);
    console.log(`Docs cleaned (unset):   ${cleanedCount}`);
    console.log(`Recreated partial idx:  ${recreatedIndex ? "YES" : "NO (already correct)"}`);
    console.log("================\n");

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

run();
