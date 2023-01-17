const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: String,
    password: String,
    honorific: String,
    first_name: String,
    last_name: String,
    email: String,
    status: String,
    attachment: String,
    is_verified: Boolean,
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    type: { type: mongoose.Schema.Types.ObjectId, ref: "Type" },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
