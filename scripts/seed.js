/**
 * Optional demo data for the JalSrot registry.
 *
 *   npm run seed          → insert demo sources if the collection is empty
 *   npm run seed -- --reset → wipe sources and insert demo data again
 *
 * Never run this against a database that already holds real records
 * unless you pass --reset intentionally.
 */
require("dotenv").config();
const connectDB = require("../config/db");
const WaterSource = require("../models/WaterSource");

const DEMO_SOURCES = [
  {
    name: "Unchar Waterfall (Upper Point)",
    sourceType: "spring",
    village: "Unchar",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.17656,
    longitude: 78.69082,
    duration: "Perennial",
    ph: 7.2,
    quality: {
      tds: 50,
      electricalConductivity: 100,
      turbidity: 4,
      totalAlkalinity: 56,
      totalAcidity: 16,
      totalHardness: 62,
      chlorides: 28,
    },
    isPotable: true,
    condition: "good",
    verified: true,
    notes: "Waterfall (roadside, upper point).",
  },
  {
    name: "Unchar Waterfall (Plus Code)",
    sourceType: "spring",
    village: "Unchar",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.17866,
    longitude: 78.68805,
    duration: "Perennial",
    ph: 7.1,
    quality: { tds: 48, electricalConductivity: 96, turbidity: 3, totalAlkalinity: 54, totalAcidity: 14, totalHardness: 60, chlorides: 26 },
    isPotable: true,
    condition: "good",
    verified: true,
    notes: "Mapped using Plus Code reference.",
  },
  {
    name: "Unchar Spring / Water Channel",
    sourceType: "spring",
    village: "Unchar",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.17895,
    longitude: 78.68756,
    duration: "Perennial",
    ph: 7.3,
    quality: { tds: 52, electricalConductivity: 104, turbidity: 5, totalAlkalinity: 58, totalAcidity: 15, totalHardness: 64, chlorides: 30 },
    isPotable: true,
    condition: "good",
    verified: true,
    notes: "Community spring feeding an open channel.",
  },
  {
    name: "Unchar Water Channel (Lower Point)",
    sourceType: "spring",
    village: "Unchar",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.1806,
    longitude: 78.68418,
    duration: "Perennial",
    ph: 7.0,
    quality: { tds: 55, electricalConductivity: 110, turbidity: 6, totalAlkalinity: 60, totalAcidity: 18, totalHardness: 66, chlorides: 31 },
    isPotable: true,
    condition: "moderate",
    verified: false,
    notes: "Lower collection point, silt visible after rainfall.",
  },
  {
    name: "Khanda Vegetation / Slope Site",
    sourceType: "spring",
    village: "Khanda",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.16977,
    longitude: 78.6871,
    duration: "Seasonal",
    ph: 7.1,
    quality: { tds: 46, electricalConductivity: 92, turbidity: 3, totalAlkalinity: 50, totalAcidity: 13, totalHardness: 58, chlorides: 24 },
    isPotable: false,
    seasonal: true,
    condition: "moderate",
    notes: "Slope seepage; flow reduces sharply in summer.",
  },
  {
    name: "Kandol Gaon Stone Water Spout",
    sourceType: "tap",
    village: "Kandol Gaon",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.16598,
    longitude: 78.67687,
    duration: "Perennial",
    ph: 7.4,
    quality: { tds: 44, electricalConductivity: 88, turbidity: 2, totalAlkalinity: 48, totalAcidity: 12, totalHardness: 55, chlorides: 22 },
    isPotable: true,
    condition: "good",
    verified: true,
    notes: "Traditional stone spout used by the village.",
  },
  {
    name: "Dandapani Forest Stream",
    sourceType: "river",
    village: "Dandapani",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.17219,
    longitude: 78.68951,
    duration: "Perennial",
    ph: 7.2,
    quality: { tds: 60, electricalConductivity: 120, turbidity: 7, totalAlkalinity: 62, totalAcidity: 17, totalHardness: 70, chlorides: 33 },
    isPotable: false,
    condition: "good",
    notes: "Forest stream within the recharge zone.",
  },
  {
    name: "Khar Kota Forest Stream",
    sourceType: "river",
    village: "Khar Kota",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.13614,
    longitude: 78.77267,
    duration: "Perennial",
    ph: 7.0,
    quality: { tds: 58, electricalConductivity: 116, turbidity: 8, totalAlkalinity: 61, totalAcidity: 16, totalHardness: 68, chlorides: 32 },
    isPotable: false,
    condition: "moderate",
    notes: "Downstream site used for flow monitoring.",
  },
  {
    name: "Pauri Road Side Stream (Buakhali)",
    sourceType: "river",
    village: "Pauri",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.12096,
    longitude: 78.79078,
    duration: "Seasonal",
    ph: 6.9,
    quality: { tds: 66, electricalConductivity: 132, turbidity: 10, totalAlkalinity: 64, totalAcidity: 20, totalHardness: 74, chlorides: 36 },
    isPotable: false,
    seasonal: true,
    condition: "poor",
    notes: "Roadside runoff risk; needs protection.",
  },
  {
    name: "Toli Road Side Stream",
    sourceType: "river",
    village: "Toli",
    district: "Pauri Garhwal",
    state: "Uttarakhand",
    latitude: 30.03743,
    longitude: 78.79279,
    duration: "Seasonal",
    ph: 7.1,
    quality: { tds: 62, electricalConductivity: 124, turbidity: 9, totalAlkalinity: 59, totalAcidity: 18, totalHardness: 69, chlorides: 34 },
    isPotable: false,
    seasonal: true,
    condition: "moderate",
    notes: "Stream observed during post-monsoon survey.",
  },
];

const run = async () => {
  await connectDB();

  const reset = process.argv.includes("--reset");
  const existing = await WaterSource.estimatedDocumentCount();

  if (existing > 0 && !reset) {
    console.log(`Registry already has ${existing} source(s). Re-run with --reset to replace them.`);
    process.exit(0);
  }

  if (reset) {
    await WaterSource.deleteMany({});
    console.log("Cleared existing water sources.");
  }

  // Demo storage area (m²) and sensor height (m) so the Volume column has data.
  const AREAS = [250, 180, 220, 300, 150, 120, 400, 350, 200, 240];
  const HEIGHTS = [0.8, 0.65, 0.7, 1.1, 0.45, 0.6, 1.4, 1.2, 0.5, 0.55];
  const now = new Date();

  const docs = DEMO_SOURCES.map(({ latitude, longitude, ...rest }, index) => {
    const area = AREAS[index % AREAS.length];
    const latestHeight = HEIGHTS[index % HEIGHTS.length];
    return {
      ...rest,
      area,
      deviceId: `jalsrot-sensor-${String(index + 1).padStart(2, "0")}`,
      latestHeight,
      volume: Math.round(area * latestHeight * 1000) / 1000,
      lastReadingAt: now,
      location: { type: "Point", coordinates: [longitude, latitude] },
    };
  });

  await WaterSource.insertMany(docs);
  console.log(`Inserted ${docs.length} demo water sources.`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
