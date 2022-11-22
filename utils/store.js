const multer = require("multer");
const UUID = require("uuid-v4");
const { Storage } = require("@google-cloud/storage");

const store = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const words = file.originalname.split(".");
    const filename = `${UUID()}.${words[words.length - 1]}`;
    cb(null, filename);
  },
});

const storage = new Storage({
  keyFilename:
    "./config/project-csd-ec082-firebase-adminsdk-mjv0o-8646c43390.json",
});

module.exports = { store, storage };
