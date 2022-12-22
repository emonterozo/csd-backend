const admin = require("firebase-admin");

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert("../config/project_csd.json"),
  storageBucket: "project-csd-ec082.appspot.com",
});
// Cloud storage
const bucket = admin.storage().bucket();

module.exports = {
  bucket,
};
