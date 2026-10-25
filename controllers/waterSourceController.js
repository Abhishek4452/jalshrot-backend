const WaterSource = require("../models/WaterSource");

const SOURCE_TYPES = ["well", "borewell", "river", "pond", "spring", "tap", "waterfall"];
const CONDITIONS = ["good", "moderate", "poor"];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const toDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const QUALITY_FIELDS = [
  "tds",
  "electricalConductivity",
  "turbidity",
  "totalAlkalinity",
  "totalAcidity",
  "totalHardness",
  "chlorides",
];

const buildQuality = (raw = {}) => {
  const quality = {};
  QUALITY_FIELDS.forEach((field) => {
    const value = toNumber(raw?.[field]);
    if (value !== undefined) quality[field] = value;
  });
  return quality;
};

// 🧾 Shape a document for the client (flat lat/lng makes the UI simpler)
const serialize = (doc) => {
  const source = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const [longitude, latitude] = source.location?.coordinates || [];
  return {
    ...source,
    id: source._id ? String(source._id) : source.id,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
};

const pickSourcePayload = (body = {}) => {
  const {
    name,
    sourceType,
    latitude,
    longitude,
    village,
    district,
    state,
    ph,
    isPotable,
    seasonal,
    usersPerDay,
    distanceFromVillage,
    condition,
    duration,
    notes,
    verified,
    lastTestedAt,
    lastMaintenanceAt,
    area,
    deviceId,
  } = body;

  return {
    name: name !== undefined ? String(name).trim() : undefined,
    sourceType,
    latitude: toNumber(latitude),
    longitude: toNumber(longitude),
    village: village !== undefined ? String(village).trim() : undefined,
    district: district !== undefined ? String(district).trim() : undefined,
    state: state !== undefined ? String(state).trim() : undefined,
    ph: toNumber(ph),
    isPotable: toBoolean(isPotable),
    seasonal: toBoolean(seasonal),
    usersPerDay: toNumber(usersPerDay),
    distanceFromVillage: toNumber(distanceFromVillage),
    condition,
    duration: duration !== undefined ? String(duration).trim() : undefined,
    notes: notes !== undefined ? String(notes).trim() : undefined,
    verified: toBoolean(verified),
    lastTestedAt: toDate(lastTestedAt),
    lastMaintenanceAt: toDate(lastMaintenanceAt),
    area: toNumber(area),
    deviceId:
      deviceId === undefined ? undefined : String(deviceId).trim() || undefined,
    quality: buildQuality(body.quality),
  };
};

const validate = (payload, { partial = false } = {}) => {
  if (!partial || payload.name !== undefined) {
    if (!payload.name) return "Name is required";
  }
  if (!partial || payload.sourceType !== undefined) {
    if (!payload.sourceType) return "Source type is required";
    if (!SOURCE_TYPES.includes(payload.sourceType)) return "Invalid source type";
  }
  if (!partial || payload.latitude !== undefined || payload.longitude !== undefined) {
    if (
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude) ||
      Math.abs(payload.latitude) > 90 ||
      Math.abs(payload.longitude) > 180
    ) {
      return "Valid latitude and longitude are required";
    }
  }
  if (payload.condition !== undefined && !CONDITIONS.includes(payload.condition)) {
    return "Invalid condition";
  }
  if (payload.area !== undefined && (!Number.isFinite(payload.area) || payload.area < 0)) {
    return "Area must be a positive number (m²)";
  }
  return null;
};

const applyPayload = (source, payload, { partial = false } = {}) => {
  if (!partial || payload.name !== undefined) source.name = payload.name;
  if (!partial || payload.sourceType !== undefined) source.sourceType = payload.sourceType;

  if (!partial || payload.latitude !== undefined || payload.longitude !== undefined) {
    source.location = {
      type: "Point",
      coordinates: [payload.longitude, payload.latitude],
    };
  }

  const directFields = [
    "village",
    "district",
    "state",
    "ph",
    "isPotable",
    "seasonal",
    "usersPerDay",
    "distanceFromVillage",
    "condition",
    "duration",
    "notes",
    "verified",
    "lastTestedAt",
    "lastMaintenanceAt",
    "area",
    "deviceId",
  ];

  directFields.forEach((field) => {
    if (payload[field] !== undefined) source[field] = payload[field];
  });

  if (!partial || Object.keys(payload.quality || {}).length > 0) {
    source.quality = { ...(source.quality?.toObject?.() || source.quality || {}), ...payload.quality };
  }
};

const round = (value, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// 💧 Volume (m³) = configured area (m²) × latest sensor height (m)
const recalculateVolume = (source) => {
  if (Number.isFinite(source.area) && Number.isFinite(source.latestHeight)) {
    source.volume = round(source.area * source.latestHeight);
  }
  return source;
};

const ensureDeviceIdAvailable = async (deviceId, excludeId) => {
  if (!deviceId) return true;
  const filter = { deviceId };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await WaterSource.findOne(filter).select("_id");
  return !existing;
};

// ➕ Add new water source
exports.addSource = async (req, res) => {
  try {
    const payload = pickSourcePayload(req.body);
    const error = validate(payload);
    if (error) return res.status(400).json({ error });

    const source = new WaterSource();
    applyPayload(source, payload);

    if (!(await ensureDeviceIdAvailable(payload.deviceId))) {
      return res.status(409).json({ error: "That device ID is already linked to another source" });
    }

    recalculateVolume(source);
    source.createdBy = req.user?._id;
    source.updatedBy = req.user?._id;

    await source.save();
    res.status(201).json(serialize(source));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update a water source
exports.updateSource = async (req, res) => {
  try {
    const payload = pickSourcePayload(req.body);
    const error = validate(payload, { partial: true });
    if (error) return res.status(400).json({ error });

    const source = await WaterSource.findById(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found" });

    if (!(await ensureDeviceIdAvailable(payload.deviceId, source._id))) {
      return res.status(409).json({ error: "That device ID is already linked to another source" });
    }

    applyPayload(source, payload, { partial: true });
    recalculateVolume(source);
    source.updatedBy = req.user?._id;

    await source.save();
    res.json(serialize(source));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📄 Get all sources
exports.getSources = async (req, res) => {
  try {
    const { state, district, sourceType, condition, potable, search } = req.query;
    const filter = {};

    if (typeof state === "string" && state.trim()) {
      filter.state = { $regex: `^${escapeRegex(state.trim())}$`, $options: "i" };
    }

    if (typeof district === "string" && district.trim()) {
      filter.district = {
        $regex: `^${escapeRegex(district.trim())}$`,
        $options: "i",
      };
    }

    if (typeof sourceType === "string" && sourceType.trim()) {
      const types = sourceType
        .split(",")
        .map((type) => type.trim().toLowerCase())
        .filter((type) => SOURCE_TYPES.includes(type));
      if (types.length) filter.sourceType = { $in: types };
    }

    if (typeof condition === "string" && condition.trim()) {
      filter.condition = condition.trim().toLowerCase();
    }

    if (typeof potable === "string" && potable.trim()) {
      filter.isPotable = potable === "true";
    }

    if (typeof search === "string" && search.trim()) {
      const term = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { village: { $regex: term, $options: "i" } },
        { district: { $regex: term, $options: "i" } },
        { state: { $regex: term, $options: "i" } },
      ];
    }

    const sources = await WaterSource.find(filter).sort({ createdAt: -1 });
    res.json(sources.map(serialize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔎 Get a single source
exports.getSourceById = async (req, res) => {
  try {
    const source = await WaterSource.findById(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found" });
    res.json(serialize(source));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Delete a water source
exports.deleteSource = async (req, res) => {
  try {
    const source = await WaterSource.findByIdAndDelete(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found" });
    res.json({ message: "Source deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📊 Summary used by the admin dashboard and map filters
exports.getStats = async (req, res) => {
  try {
    const sources = await WaterSource.find().select(
      "sourceType condition isPotable verified state district"
    );

    const countBy = (field) =>
      sources.reduce((acc, source) => {
        const key = source[field] || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    res.json({
      total: sources.length,
      potable: sources.filter((source) => source.isPotable).length,
      verified: sources.filter((source) => source.verified).length,
      goodCondition: sources.filter((source) => source.condition === "good").length,
      byType: countBy("sourceType"),
      byCondition: countBy("condition"),
      byState: countBy("state"),
      byDistrict: countBy("district"),
      states: [...new Set(sources.map((source) => source.state).filter(Boolean))].sort(),
      districts: [...new Set(sources.map((source) => source.district).filter(Boolean))].sort(),
      types: [...new Set(sources.map((source) => source.sourceType).filter(Boolean))].sort(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.SOURCE_TYPES = SOURCE_TYPES;
