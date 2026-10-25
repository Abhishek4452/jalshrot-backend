const GalleryItem = require("../models/GalleryItem");

const MEDIA_TYPES = ["image", "video"];

const serialize = (item) => {
  const value = item.toObject ? item.toObject() : item;
  return {
    ...value,
    id: value._id ? String(value._id) : value.id,
  };
};

const parseUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { error: "Media URL is required" };
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { error: "Only http(s) media links are supported" };
    }
    return { url: url.toString() };
  } catch {
    return { error: "Enter a valid media URL (http or https)" };
  }
};

const detectType = (url = "") => {
  if (/youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return "video";
  }
  return "image";
};

const normalizePayload = (body = {}, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.title !== undefined) {
    payload.title = String(body.title || "").trim();
  }
  if (body.caption !== undefined) payload.caption = String(body.caption || "").trim();
  if (body.thumbnailUrl !== undefined) payload.thumbnailUrl = String(body.thumbnailUrl || "").trim();

  let resolvedUrl;
  if (!partial || body.url !== undefined) {
    const parsed = parseUrl(body.url);
    if (parsed.error) return { error: parsed.error };
    resolvedUrl = parsed.url;
    payload.url = resolvedUrl;
  }

  if (!partial || body.type !== undefined) {
    const requested = String(body.type || "").toLowerCase();
    if (requested && !MEDIA_TYPES.includes(requested)) {
      return { error: "Media type must be image or video" };
    }
    payload.type = requested || detectType(resolvedUrl || "");
  } else if (resolvedUrl) {
    payload.type = detectType(resolvedUrl);
  }

  return { payload };
};

exports.listGallery = async (req, res) => {
  try {
    const items = await GalleryItem.find().sort({ createdAt: -1 });
    res.json({ items: items.map(serialize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addGalleryItem = async (req, res) => {
  try {
    const { error, payload } = normalizePayload(req.body);
    if (error) return res.status(400).json({ error });
    if (!payload.title) return res.status(400).json({ error: "Title is required" });

    const item = await GalleryItem.create({
      ...payload,
      createdBy: req.user?._id,
    });

    res.status(201).json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateGalleryItem = async (req, res) => {
  try {
    const { error, payload } = normalizePayload(req.body, { partial: true });
    if (error) return res.status(400).json({ error });

    if (payload.title !== undefined && !payload.title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const item = await GalleryItem.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!item) return res.status(404).json({ error: "Gallery item not found" });
    res.json(serialize(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await GalleryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Gallery item not found" });
    res.json({ message: "Gallery item deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
