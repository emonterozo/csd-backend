require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const { verifyToken } = require("./middleware/authorization");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT;

// models
const User = require("./models/User");
const Type = require("./models/Type");
const Tag = require("./models/Tag");

const userRouter = require("./routes/user");
const capstoneRouter = require("./routes/capstone");

app.use("/user", userRouter);
app.use("/capstone", capstoneRouter);

app.get("/types", async (req, res) => {
  const types = await Type.find();
  res.status(200).json({ types });
});

app.get("/tags", verifyToken, async (req, res) => {
  const tags = await Tag.find();

  res.status(200).json({ tags });
});

app.get("/professors", async (req, res) => {
  const type = await Type.find({ description: "Professor" });
  const list = await User.find({ type: type[0]._id });
  const professors = list.map((item) => ({
    _id: item._id,
    description: `${item.honorific} ${item.first_name} ${item.last_name}`,
  }));
  res.status(200).json({ professors });
});

app.listen(port, () => {
  console.log(`CSD Backend app listening on port ${port}`);
});
