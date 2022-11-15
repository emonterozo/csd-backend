const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const typeSchema = new Schema(
  {
    description: String,
  },
  { collection: "types" }
);

const Type = mongoose.model("Type", typeSchema);

module.exports = Type;
