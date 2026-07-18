import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    clientTempId: {
      type: String,
      default: "",
      index: true,
    },

    // Swipe-to-reply (Instagram/WhatsApp-style quoted reply). Purely
    // additive/optional — existing messages simply have this as null and
    // render exactly as before.
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    attachments: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "file", "audio"],
        },
        publicId: String,
      },
    ],

    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    seenBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reaction: {
          type: String,
          maxlength: 16,
        },
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    hiddenFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Instagram/WhatsApp-style "edited" indicator — purely additive,
    // existing messages default to false/null and render unchanged.
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },

    // End-to-end encryption (personal DM only) — see
    // frontend/src/utils/encryption.js. When isEncrypted is true, `text`
    // above is left empty and the real content lives ONLY here, as
    // ciphertext the server can't read. Older messages (and voice
    // attachments, which aren't encrypted in this version) simply have
    // isEncrypted: false/undefined and keep using `text` exactly as before
    // — this is purely additive, nothing about the existing plaintext path
    // changes.
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    encryptedContent: {
      ciphertext: {
        type: String,
        default: "",
      },
      iv: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
