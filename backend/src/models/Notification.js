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
