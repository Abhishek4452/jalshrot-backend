require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Add it to backend/.env for local dev and Render env.");
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
          },
          credentials: true,
        }
      : undefined
  )
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/water-sources", require("./routes/waterSourceRoutes"));
app.use("/api/hardware", require("./routes/hardwareRoutes"));
app.use("/api/gallery", require("./routes/galleryRoutes"));

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
