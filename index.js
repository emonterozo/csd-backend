require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { jwtSign } = require("./utils/utils");
const { verifyToken } = require("./middleware/authorization");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT;
const saltRounds = 10;

// models
const User = require("./models/User");
const Role = require("./models/Role");
const Type = require("./models/Type");

app.get("/roles", async (req, res) => {
  const roles = await Role.find();
  res.status(200).json({ roles });
});

app.get("/types", async (req, res) => {
  const types = await Type.find();
  res.status(200).json({ types });
});

app.post("/register", async (req, res) => {
  const {
    username,
    password,
    first_name,
    last_name,
    email,
    status,
    attachment,
    role_id,
    type_id,
  } = req.body;

  const userUsername = await User.find({ username: username });
  const userEmail = await User.find({ email: email });

  if (!userUsername.length && !userEmail.length) {
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      const user = await User.create({
        username: username,
        password: hash,
        first_name: first_name,
        last_name: last_name,
        email: email,
        status: status,
        attachment: attachment,
        role_id: role_id,
        type_id: type_id,
      });
      const token = jwtSign(user.id);
      res.status(200).json({
        data: {
          user: user,
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

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await User.find({ username: username });

  if (users.length) {
    bcrypt.compare(password, users[0].password, (err, result) => {
      if (result) {
        const token = jwtSign(users[0].id);
        res.status(200).json({
          data: {
            user: users[0],
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
