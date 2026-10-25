const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

  
    const user = await User.findById(decoded.id).select("-password");


    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Not authorized" });
  }
};

exports.requireGovernment = (req, res, next) => {
  if (req.user?.role === "government") {
    return next();
  }
  return res.status(403).json({ error: "Government access required" });
};

exports.requireSourceManager = (req, res, next) => {
  if (req.user?.role === "government" || req.user?.canManageSources) {
    return next();
  }
  return res.status(403).json({ error: "Source management permission required" });
};
