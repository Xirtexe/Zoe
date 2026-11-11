require("dotenv").config();
const { Sequelize } = require("sequelize");
const { loadEnv } = require("badan-ser");
const fs = require("fs");

if (fs.existsSync("config.env")) {
  loadEnv("config.env");
}

const DATABASE_URL = process.env.DATABASE_URL || "./database.db";

const toBool = (x) =>
  (x && (x.toLowerCase() === "true" || x.toLowerCase() === "on")) || false;

module.exports = {
  HANDLER: process.env.HANDLER || "null",
  HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || "",
  HEROKU_API_KEY: process.env.HEROKU_API_KEY || "",
  RAILWAY_API: process.env.RAILWAY_API || process.env.RAILWAY_API_KEY,
  KOYEB_API: process.env.KOYEB_API || process.env.KOYEB_API_KEY,
  KOYEB_APP_NAME: process.env.KOYEB_APP_NAME || process.env.KOYEB_NAME,
  RENDER_API: process.env.RENDER_API || process.env.RENDER_API_KEY,
  RENDER_APP_NAME: process.env.RENDER_APP_NAME || process.env.RENDER_NAME,
  RAILWAY_PROJECT_NAME:
    process.env.RAILWAY_PROJECT_NAME || process.env.PROJECT_NAME,
  MODE: (process.env.MODE || "private").toLowerCase(),
  ERROR_MSG: toBool(process.env.ERROR_MSG) || true,
  LOG_MSG: toBool(process.env.LOG_MSG) || true,
  READ_CMD: toBool(process.env.READ_CMD),
  READ_MSG: toBool(process.env.READ_MSG),
  ANTI_DELETE: toBool(process.env.ANTI_DELETE) || false,
  WARN_COUNT: process.env.WARN_COUNT || "3",
  BOT_INFO:
    process.env.BOT_INFO || " Team - Xd ;https://files.catbox.moe/zwnnx6.png",
  AUDIO_DATA:
    process.env.AUDIO_DATA ||
    ' Zoe - Xd ; Badan - Ser ;https://files.catbox.moe/zwnnx6.png',
  STICKER_PACKDATA: process.env.STICKER_PACKDATA || ' Zoe - Xd ; Badan - Ser ',
  SUDO: process.env.SUDO || "919747257996",
  SESSION: process.env.SESSION || "Zoe-XD^1iablh_badan",
  LANGUAGE: process.env.LANGUAGE || "english",
  AUTOCLEAN_MESSAGES: {
    enabled: false,
    limit: 100
  },
  DATABASE:
    DATABASE_URL === "./database.db"
      ? new Sequelize({
        dialect: "sqlite",
        storage: "./database.db",
        logging: false,
      })
      : new Sequelize(DATABASE_URL, {
        dialect: "postgres",
        ssl: true,
        protocol: "postgres",
        dialectOptions: {
          native: true,
          ssl: { require: true, rejectUnauthorized: false },
        },
        logging: false,
      }),
};
