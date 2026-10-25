const crypto = require("crypto");
const WaterSource = require("../models/WaterSource");
const WaterReading = require("../models/WaterReading");

const round = (value, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const UNIT_FACTORS = { m: 1, cm: 0.01, mm: 0.001 };

const safeEqual = (a, b) => {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

const readApiKey = (req) => {
  const header = req.headers["x-api-key"] || req.headers["x-hardware-key"];
  if (header) return String(header).trim();
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return "";
};

const serializeReading = (reading) => {
  const value = reading.toObject ? reading.toObject() : reading;
  return {
    id: value._id ? String(value._id) : value.id,
    sourceId: value.source ? String(value.source) : undefined,
    deviceId: value.deviceId || "",
    height: value.height,
    heightUnit: value.heightUnit || "m",
    rawHeight: value.rawHeight,
    area: value.area,
    volume: value.volume,
    recordedAt: value.recordedAt,
    createdAt: value.createdAt,
  };
};

// 📡 Hardware ingestion — authenticated with a shared device key (x-api-key)
exports.ingestReading = async (req, res) => {
  try {
    const configuredKey = process.env.HARDWARE_API_KEY;

    if (!configuredKey) {
      return res.status(503).json({
        error: "Hardware ingestion is not configured. Set HARDWARE_API_KEY on the server.",
      });
    }

    if (!safeEqual(readApiKey(req), configuredKey)) {
      return res.status(401).json({ error: "Invalid hardware API key" });
    }

    const { sourceId, deviceId, height, unit, recordedAt } = req.body || {};

    if (!sourceId && !deviceId) {
      return res.status(400).json({ error: "Provide either sourceId or deviceId" });
    }

    const rawHeight = Number(height);
    if (!Number.isFinite(rawHeight) || rawHeight < 0) {
      return res.status(400).json({ error: "height must be a positive number" });
    }

    const heightUnit = UNIT_FACTORS[unit] ? unit : "m";
    const heightMetres = rawHeight * UNIT_FACTORS[heightUnit];

    if (heightMetres > 100) {
      return res.status(400).json({ error: "height is unrealistically large (max 100 m)" });
    }

    const filter = deviceId ? { deviceId: String(deviceId).trim() } : { _id: sourceId };
    const source = await WaterSource.findOne(filter);

    if (!source) {
      return res.status(404).json({ error: "No water source matches this device" });
    }

    // First reading from a device can bind itself to the source if unset.
    if (!source.deviceId && deviceId) {
      const duplicate = await WaterSource.findOne({
        deviceId: String(deviceId).trim(),
        _id: { $ne: source._id },
      }).select("_id");
      if (!duplicate) source.deviceId = String(deviceId).trim();
    }

    const area = Number.isFinite(source.area) ? source.area : undefined;
    const volume = area === undefined ? undefined : round(area * heightMetres);
    const readingAt = recordedAt ? new Date(recordedAt) : new Date();

    source.latestHeight = round(heightMetres, 4);
    source.lastReadingAt = Number.isNaN(readingAt.getTime()) ? new Date() : readingAt;
    if (volume !== undefined) source.volume = volume;

    await source.save();

    const reading = await WaterReading.create({
      source: source._id,
      deviceId: source.deviceId || (deviceId ? String(deviceId).trim() : ""),
      height: round(heightMetres, 4),
      heightUnit,
      rawHeight,
      area,
      volume,
      recordedAt: source.lastReadingAt,
    });

    res.status(201).json({
      ok: true,
      source: {
        id: String(source._id),
        name: source.name,
        area: source.area ?? null,
        latestHeight: source.latestHeight,
        volume: source.volume ?? null,
        lastReadingAt: source.lastReadingAt,
      },
      reading: serializeReading(reading),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📈 Reading history for a source (admin / source manager)
exports.listReadings = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const readings = await WaterReading.find({ source: req.params.sourceId })
      .sort({ recordedAt: -1 })
      .limit(limit);

    res.json({ readings: readings.map(serializeReading) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
