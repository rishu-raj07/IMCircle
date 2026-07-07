import Learning from "../models/Learning.js";

const LEARNING_VISIBLE_HOURS = 24;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const getExpiredLearningDate = () => {
  const date = new Date();
  date.setHours(date.getHours() - LEARNING_VISIBLE_HOURS);
  return date;
};

export const deleteExpiredLearnings = async () => {
  const result = await Learning.updateMany(
    {
      isDeleted: false,
      createdAt: { $lt: getExpiredLearningDate() },
    },
    {
      $set: { isDeleted: true },
    }
  );

  return result.modifiedCount || 0;
};

export const startLearningExpiryJob = () => {
  const runCleanup = async () => {
    try {
      const deletedCount = await deleteExpiredLearnings();

      if (deletedCount > 0) {
        console.log(`Expired learnings deleted: ${deletedCount}`);
      }
    } catch (error) {
      console.error("Learning expiry cleanup error:", error);
    }
  };

  runCleanup();
  return setInterval(runCleanup, CLEANUP_INTERVAL_MS);
};
