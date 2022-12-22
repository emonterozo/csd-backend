const admin = require("firebase-admin");
const path = require("path");

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(
    path.resolve(__dirname, "../config/project_csd.json")
  ),
  storageBucket: "project-csd-ec082.appspot.com",
});
// Cloud storage
const bucket = admin.storage().bucket();

module.exports = {
  bucket,
};
