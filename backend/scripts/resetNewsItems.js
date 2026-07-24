/**
 * One-time cleanup script: wipes the `newsitems` and `newsinteractions`
 * collections entirely.
 *
 * Why this exists:
 * News classification/scoring/image-extraction logic (newsClassifier.js,
 * RssNewsProvider.js) went through several rounds of bug fixes during
 * initial development (word-boundary matching, industry-taxonomy
 * alignment, media:content image parsing, requiring an image to store an
 * item at all). Because ingestion upserts with `$setOnInsert` — see
 * newsIngestion.service.js's runProvider() — it NEVER re-classifies or
 * re-processes an already-stored item, even after the code that produced
 * it improves. Anything ingested before a given fix stays stuck with the
 * OLD (wrong) categories/industries/image forever, which is exactly why
 * "select the Career chip, see unrelated results" or "some cards have no
 * image" could still happen even after those fixes shipped — the fix only
 * applies to items ingested AFTER it, not what's already in the database.
 *
 * Safe to run any time in development: the next scheduled/on-boot
 * ingestion run (see newsIngestionScheduler.service.js) repopulates
 * everything from scratch using the current code. Not something you'd run
 * against a production database with real user saves/interactions on
 * items you want to keep — it deletes those too.
 *
 * Usage:
 *   node scripts/resetNewsItems.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB: ${conn.connection.host}`);

    const newsItems = conn.connection.db.collection("newsitems");
    const newsInteractions = conn.connection.db.collection("newsinteractions");

    const itemCount = await newsItems.countDocuments({});
    const interactionCount = await newsInteractions.countDocuments({});
    console.log(`Found ${itemCount} news item(s) and ${interactionCount} interaction row(s).`);

    const interactionResult = await newsInteractions.deleteMany({});
    console.log(`Removed ${interactionResult.deletedCount} interaction row(s).`);

    const itemResult = await newsItems.deleteMany({});
    console.log(`Removed ${itemResult.deletedCount} news item(s).`);

    console.log(
      "\nDone. Restart the backend (or wait for the next hourly tick) to re-ingest fresh content under the current code."
    );

    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
};

run();
