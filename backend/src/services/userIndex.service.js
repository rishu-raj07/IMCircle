import User from "../models/User.js";

export const ensureUserIndexes = async () => {
  const collection = User.collection;
  const indexes = await collection.indexes();
  const emailIndex = indexes.find((index) => index.name === "email_1");

  const hasSafeEmailIndex =
    emailIndex?.unique === true &&
    emailIndex?.partialFilterExpression?.email?.$type === "string";

  if (emailIndex && !hasSafeEmailIndex) {
    await collection.dropIndex("email_1");
  }

  await collection.createIndex(
    { email: 1 },
    {
      name: "email_1",
      unique: true,
      partialFilterExpression: { email: { $type: "string" } },
    }
  );
};
