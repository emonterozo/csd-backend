const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const capstoneSchema = new Schema(
  {
    title: String,
    description: String,
    logo: String,
    website: String,
    documents: String,
    images: [String],
    ratings: [
      {
        rating: Number,
        count: Number,
        rate_by: [mongoose.Schema.Types.ObjectId],
      },
    ],
    approver: mongoose.Schema.Types.ObjectId,
    tags: [mongoose.Schema.Types.ObjectId],
    percentage: Number,
    comment: [
      {
        user_id: mongoose.Schema.Types.ObjectId,
        timestamp: mongoose.Schema.Types.Date,
        comment: String,
      },
    ],
  },
  { collection: "capstones" }
);

const Capstone = mongoose.model("Capstone", capstoneSchema);

module.exports = Capstone;
