const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userVerificationSchema = new Schema(
  {
    otp: Number,
    created_at: Date,
    expires_at: Date,
    email: String,
  },
  { collection: "users_verification" }
);

const UserVerification = mongoose.model(
  "UserVerification",
  userVerificationSchema
);

module.exports = UserVerification;
