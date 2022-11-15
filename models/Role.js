const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roleSchema = new Schema(
  {
    description: String,
  },
  { collection: "roles" }
);

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
