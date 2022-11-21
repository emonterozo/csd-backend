require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Storage } = require("@google-cloud/storage");
const UUID = require("uuid-v4");
const multer = require("multer");
const fs = require("fs");
const _ = require("lodash");
const cors = require("cors");

const { jwtSign, uploadFile } = require("./utils/utils");
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
const saltRounds = 10;

const storage = new Storage({
  keyFilename:
    "./config/project-csd-ec082-firebase-adminsdk-mjv0o-8646c43390.json",
});

// models
const User = require("./models/User");
const Role = require("./models/Role");
const Type = require("./models/Type");

const store = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const words = file.originalname.split(".");
    const filename = `${UUID()}.${words[words.length - 1]}`;
    cb(null, filename);
  },
});

app.get("/roles_types", async (req, res) => {
  const roles = await Role.find();
  const types = await Type.find();
  res.status(200).json({ roles, types });
});

app.post("/register", async (req, res) => {
  const upload = multer({ storage: store }).single("attachment");
  upload(req, res, async () => {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      status,
      role_id,
      type_id,
    } = req.body;

    const path = `./uploads/${req.file.filename}`;

    const userUsername = await User.find({ username: username });
    const userEmail = await User.find({ email: email });

    if (!userUsername.length && !userEmail.length) {
      const attachmentLink = await uploadFile(path, storage);
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        const user = await User.create({
          username: username,
          password: hash,
          first_name: first_name,
          last_name: last_name,
          email: email,
          status: status,
          attachment: attachmentLink,
          role_id: role_id,
          type_id: type_id,
        });
        const token = jwtSign(user.id);

        const role = await Role.findById(role_id);
        const type = await Type.findById(type_id);

        const userData = _.omit(user._doc, ["role_id", "type_id"]);

        res.status(200).json({
          data: {
            user: {
              ...userData,
              role: { ...role._doc },
              type: { ...type._doc },
            },
            token: token,
          },
          errors: null,
        });
      });
    } else {
      let errors = [];
      if (userUsername.length) {
        errors.push({
          field: "username",
          error: "Username already exist",
        });
      }

      if (userEmail.length) {
        errors.push({
          field: "email",
          error: "Email already exist",
        });
      }
      res.status(200).json({ data: null, errors });
    }

    fs.unlinkSync(path);
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await User.find({ username: username });

  if (users.length) {
    bcrypt.compare(password, users[0].password, async (err, result) => {
      if (result) {
        const userData = _.omit(users[0]._doc, ["role_id", "type_id"]);

        const role = await Role.findById(users[0].role_id);
        const type = await Type.findById(users[0].type_id);

        const token = jwtSign(users[0].id);
        res.status(200).json({
          data: {
            user: {
              ...userData,
              role: { ...role._doc },
              type: { ...type._doc },
            },
            token: token,
          },
          error: null,
        });
      } else {
        res.status(200).json({ data: null, error: "Invalid credentials" });
      }
    });
  } else {
    res.status(200).json({ data: null, error: "Account does not exist" });
  }
});

app.get("/capstones", verifyToken, (req, res) => {
  res.send(200);
});

app.listen(port, () => {
  console.log(`CSD Backend app listening on port ${port}`);
});
