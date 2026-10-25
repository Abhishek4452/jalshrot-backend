const express = require("express");
const router = express.Router();
const { ingestReading, listReadings } = require("../controllers/hardwareController");
const { protect, requireSourceManager } = require("../middleware/authMiddleware");

// Device → server. Protected by the shared x-api-key header instead of a JWT.
router.post("/readings", ingestReading);
router.post("/", ingestReading);

// Admin view of the latest sensor history for a source.
router.get("/readings/:sourceId", protect, requireSourceManager, listReadings);

module.exports = router;
