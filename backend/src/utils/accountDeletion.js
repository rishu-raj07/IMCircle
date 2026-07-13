import mongoose from "mongoose";

import CirclePost from "../models/CirclePost.js";
import Journey from "../models/Journey.js";
import JourneyMilestone from "../models/JourneyMilestone.js";
import Learning from "../models/Learning.js";
import Message from "../models/Message.js";
import Opportunity from "../models/Opportunity.js";
import Post from "../models/Post.js";
import Project from "../models/Project.js";
import ProjectUpdate from "../models/ProjectUpdate.js";

const OWNED_CONTENT = [
  { model: Post, ownerField: "author" },
  { model: Learning, ownerField: "creator" },
  { model: Journey, ownerField: "creator" },
  { model: JourneyMilestone, ownerField: "creator" },
  { model: Project, ownerField: "creator" },
  { model: ProjectUpdate, ownerField: "creator" },
  { model: CirclePost, ownerField: "author" },
  { model: Opportunity, ownerField: "creator" },
  { model: Message, ownerField: "sender" },
];

const toObjectId = (userId) =>
  userId instanceof mongoose.Types.ObjectId
    ? userId
    : new mongoose.Types.ObjectId(String(userId));

export const hideContentForDeletedAccount = async (userId) => {
  const ownerId = toObjectId(userId);

  await Promise.all(
    OWNED_CONTENT.map(({ model, ownerField }) =>
      model.collection.updateMany(
        { [ownerField]: ownerId, isDeleted: { $ne: true } },
        {
          $set: {
            isDeleted: true,
            hiddenByAccountDeletion: true,
          },
        }
      )
    )
  );
};

export const restoreContentForDeletedAccount = async (userId) => {
  const ownerId = toObjectId(userId);

  await Promise.all(
    OWNED_CONTENT.map(({ model, ownerField }) =>
      model.collection.updateMany(
        { [ownerField]: ownerId, hiddenByAccountDeletion: true },
        {
          $set: { isDeleted: false },
          $unset: { hiddenByAccountDeletion: "" },
        }
      )
    )
  );
};
