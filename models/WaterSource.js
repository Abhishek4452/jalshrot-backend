const mongoose = require("mongoose");

const objectId = mongoose.Schema.Types.ObjectId;

const qualitySchema = new mongoose.Schema(
  {
    tds: Number, // Total Dissolved Solids (mg/L)
    electricalConductivity: Number, // µS/cm
    turbidity: Number, // NTU
    totalAlkalinity: Number, // mg/L
    totalAcidity: Number, // mg/L
    totalHardness: Number, // mg/L
    chlorides: Number, // mg/L
  },
  { _id: false }
);

const waterSourceSchema = new mongoose.Schema(
  {
    // 📍 Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ["well", "borewell", "river", "pond", "spring", "tap", "waterfall"],
      required: true,
    },

    // 🌍 Location (GeoJSON for map support)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    village: String,
    district: String,
    state: String,

    // 💧 Water Quality
    ph: Number,
    quality: qualitySchema,
    isPotable: {
      type: Boolean,
      default: false,
    },
    lastTestedAt: Date,

    // 🚰 Usage & Accessibility
    duration: {
      type: String,
      trim: true,
      default: "",
    }, // e.g. "Perennial", "Seasonal (Oct - Mar)"
    seasonal: {
      type: Boolean,
      default: false,
    },
    usersPerDay: Number,
    distanceFromVillage: Number, // in km

    // 📡 Hardware & storage volume
    area: Number, // m² — configured by an administrator
    deviceId: {
      type: String,
      trim: true,
      default: undefined,
    }, // hardware sensor identifier
    latestHeight: Number, // m — last water height reported by the sensor
    volume: Number, // m³ — area × latestHeight
    lastReadingAt: Date,

    // ⚙️ Condition & Maintenance
    condition: {
      type: String,
      enum: ["good", "moderate", "poor"],
      default: "good",
    },
    lastMaintenanceAt: Date,

    // 📝 Metadata
    notes: String,
    verified: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: objectId,
      ref: "User",
    },
    updatedBy: {
      type: objectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// 🌍 Enable geospatial queries (VERY important for maps)
waterSourceSchema.index({ location: "2dsphere" });
waterSourceSchema.index({ deviceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("WaterSource", waterSourceSchema);
