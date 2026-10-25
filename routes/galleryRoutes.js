const express = require("express");
const router = express.Router();
const {
  listGallery,
  addGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} = require("../controllers/galleryController");
const { protect, requireSourceManager } = require("../middleware/authMiddleware");

router.get("/", listGallery);
router.post("/", protect, requireSourceManager, addGalleryItem);
router.patch("/:id", protect, requireSourceManager, updateGalleryItem);
router.delete("/:id", protect, requireSourceManager, deleteGalleryItem);

module.exports = router;
