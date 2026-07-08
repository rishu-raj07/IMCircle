import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      default: "general",
      index: true,
    },
    title: {
      type: String,
      default: "Notification",
    },
    message: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    // Normalized target info so the frontend can navigate straight to the
    // right detail screen without guessing from `type`. Values used across
    // the app: "post", "journey", "journey_milestone", "learning", "circle",
    // "user". Populated at creation time where possible, and always
    // re-derived defensively in getNotifications() for older documents that
    // predate these fields (schema is `strict:false`, so nothing here is a
    // breaking change to existing ad hoc fields like `post`/`connection`).
    targetType: {
      type: String,
      default: "",
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: undefined,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

notificationSchema.pre("save", function normalizeNotification() {
  if (!this.recipient && this.receiver) this.recipient = this.receiver;
  if (!this.receiver && this.recipient) this.receiver = this.recipient;
  if (!this.user && this.recipient) this.user = this.recipient;
  if (!this.sender && this.actor) this.sender = this.actor;
  if (!this.actor && this.sender) this.actor = this.sender;
  if (this.isRead && !this.read) this.read = this.isRead;
  if (this.read && !this.isRead) this.isRead = this.read;
});

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
