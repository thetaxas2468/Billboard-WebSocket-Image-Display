// Read configuration from environment variables (.env)

require("dotenv").config();

const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  IMAGE_INTERVAL_MS: process.env.IMAGE_INTERVAL_MS
    ? parseInt(process.env.IMAGE_INTERVAL_MS)
    : 10000,
  IMAGE_BASE_URL: process.env.IMAGE_BASE_URL || "https://picsum.photos/512/512",
};

module.exports = config;