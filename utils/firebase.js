const admin = require("firebase-admin");

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(
    "../config/project-csd-ec082-firebase-adminsdk-mjv0o-8646c43390.json.json"
  ),
  storageBucket: "project-csd-ec082.appspot.com",
});
// Cloud storage
const bucket = admin.storage().bucket();

module.exports = {
  bucket,
};
