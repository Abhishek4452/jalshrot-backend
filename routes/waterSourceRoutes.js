const express = require("express");
const router = express.Router();
const {
  addSource,
  getSources,
  getSourceById,
  updateSource,
  deleteSource,
  getStats,
} = require("../controllers/waterSourceController");
const { protect, requireSourceManager } = require("../middleware/authMiddleware");

router.get("/", getSources);
router.get("/stats/summary", getStats);
router.get("/:id", getSourceById);

// Kept as "/add" for backwards compatibility, plus a REST-friendly alias.
router.post("/add", protect, requireSourceManager, addSource);
router.post("/", protect, requireSourceManager, addSource);
router.patch("/:id", protect, requireSourceManager, updateSource);
router.delete("/:id", protect, requireSourceManager, deleteSource);

module.exports = router;
