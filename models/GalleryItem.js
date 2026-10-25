const mongoose = require("mongoose");

const objectId = mongoose.Schema.Types.ObjectId;

const galleryItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    caption: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: objectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

galleryItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("GalleryItem", galleryItemSchema);
