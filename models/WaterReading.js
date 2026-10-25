const mongoose = require("mongoose");

const objectId = mongoose.Schema.Types.ObjectId;

/**
 * A single water-level measurement pushed by a field sensor.
 * `height` is always stored in metres; `volume` in cubic metres.
 */
const waterReadingSchema = new mongoose.Schema(
  {
    source: {
      type: objectId,
      ref: "WaterSource",
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    height: {
      type: Number,
      required: true,
      min: 0,
    }, // metres
    heightUnit: {
      type: String,
      enum: ["m", "cm", "mm"],
      default: "m",
    }, // unit supplied by the device
    rawHeight: Number, // original value before normalisation
    area: Number, // m² snapshot used for the volume calculation
    volume: Number, // m³
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

waterReadingSchema.index({ source: 1, recordedAt: -1 });

module.exports = mongoose.model("WaterReading", waterReadingSchema);
