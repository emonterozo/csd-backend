const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: String,
    password: String,
    first_name: String,
    last_name: String,
    email: String,
    status: String,
    attachment: String,
    role_id: mongoose.Schema.Types.ObjectId,
    type_id: mongoose.Schema.Types.ObjectId,
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
