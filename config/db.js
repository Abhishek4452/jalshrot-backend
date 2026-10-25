const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGO_URI (or MONGODB_URI) is missing");
    }

    // Atlas URIs sometimes omit the database name — fall back to a named DB.
    const hasDatabase = /^mongodb(\+srv)?:\/\/[^/]+\/[^?/]+/.test(uri);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      ...(hasDatabase ? {} : { dbName: process.env.MONGO_DB || "jalsrot" }),
    });
    console.log(`MongoDB Connected (${mongoose.connection.name})`);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
};

module.exports = connectDB;
