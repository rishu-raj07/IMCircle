/**
 * One-time cleanup script: deletes previously-ingested Hacker News rows
 * from the `newsitems` collection.
 *
 * Background:
 * Hacker News was briefly enabled as a News source, ingested ~50 items
 * (providerId: "hackernews"), and was then disabled by default (see
 * backend/src/config/newsSources.config.js) after user feedback that its
 * startup/tech content didn't fit a general, Inshorts-style Indian news
 * feed. Disabling the provider only stops NEW Hacker News items from being
 * ingested — it doesn't touch rows already stored. news.controller.js also
 * excludes providerId "hackernews" from every query as a defensive
 * belt-and-suspenders fix, so those rows already stop appearing in the app
 * immediately without running this — this script is only for actually
 * removing them from the database, if you'd rather they be gone than
 * merely hidden.
 *
 * Usage:
 *   node scripts/removeHackerNewsItems.js
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

    const matchingCount = await newsItems.countDocuments({ providerId: "hackernews" });
    console.log(`Found ${matchingCount} Hacker News item(s) to remove.`);

    if (matchingCount === 0) {
      console.log("Nothing to do.");
      process.exit(0);
    }

    const idsToRemove = await newsItems
      .find({ providerId: "hackernews" })
      .project({ _id: 1 })
      .toArray();
    const ids = idsToRemove.map((doc) => doc._id);

    // Also clean up any saves/opens/not-interested rows pointing at those
    // items, so nothing is left referencing a deleted NewsItem.
    const interactionResult = await newsInteractions.deleteMany({ newsItem: { $in: ids } });
    console.log(`Removed ${interactionResult.deletedCount} related interaction row(s).`);

    const deleteResult = await newsItems.deleteMany({ providerId: "hackernews" });
    console.log(`Removed ${deleteResult.deletedCount} Hacker News news item(s).`);

    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
};

run();
