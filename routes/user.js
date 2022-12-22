const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const _ = require("lodash");

const { jwtSign, uploadFile, uploadToStorage } = require("../utils/utils");

const saltRounds = 10;

const User = require("../models/User");
const Role = require("../models/Role");
const Type = require("../models/Type");
const { verifyToken } = require("../middleware/authorization");

router.post("/register", uploadFile.any(), async (req, res) => {
  const { username, password, first_name, last_name, email, type_id } =
    req.body;

  const userUsername = await User.find({ username: username });
  const userEmail = await User.find({ email: email });

  if (!userUsername.length && !userEmail.length) {
    const links = await uploadToStorage(req.files);
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      const role = await Role.findOne({ description: "User" });

      const user = await User.create({
        username: username,
        password: hash,
        first_name: first_name,
        last_name: last_name,
        email: email,
        status: "pending",
        attachment: links[0].value,
        role: role._id,
        type: type_id,
      });
      const token = jwtSign(user.id);

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
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await User.find({ username: username })
    .populate("role")
    .populate("type");

  if (users.length) {
    bcrypt.compare(password, users[0].password, async (err, result) => {
      if (result) {
        const token = jwtSign(users[0]._doc.id);
        res.status(200).json({
          data: {
            user: {
              ...users[0]._doc,
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

router.get("/list", async (req, res) => {
  const users = await User.find().populate("type").populate("role");
  res.status(200).json({ users });
});

router.post("/update_status", verifyToken, async (req, res) => {
  const { user: userId, status } = req.body;
  const filter = {
    _id: userId,
  };
  const update = {
    status,
  };
  const updatedUser = await User.findOneAndUpdate(filter, update, {
    new: true,
  });

  return res.status(200).json({ user: updatedUser });
});
module.exports = router;
