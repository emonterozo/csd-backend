require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const _ = require("lodash");
const mongoose = require("mongoose");

const {
  jwtSign,
  uploadFile,
  uploadToStorage,
  sendMail,
  emailVerificationMessage,
  generateOTP,
} = require("../utils/utils");
const moment = require("moment");

const saltRounds = 10;

const User = require("../models/User");
const Role = require("../models/Role");
const Type = require("../models/Type");
const Capstone = require("../models/Capstone");
const UserVerification = require("../models/UserVerification");
const { verifyToken } = require("../middleware/authorization");

router.post("/register", uploadFile.any(), async (req, res) => {
  const {
    username,
    password,
    first_name,
    last_name,
    email,
    type_id,
    professor_id,
  } = req.body;

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
        is_verified: false,
        role: role._id,
        type: type_id,
        professor: _.isEmpty(professor_id) ? null : professor_id,
      });

      const otp = generateOTP();

      const info = await sendMail(
        email,
        "Email Verification",
        emailVerificationMessage(first_name, last_name, email, otp)
      );
      if (info.accepted.length > 0) {
        await UserVerification.create({
          otp: otp,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
          email: email,
        });

        res.sendStatus(200);
      }
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
  const user = await User.findOne({ username: username })
    .populate("role")
    .populate("type")
    .populate({
      path: "professor",
      select: "first_name last_name username email _id",
    });

  if (user) {
    bcrypt.compare(password, user.password, async (err, result) => {
      if (result) {
        const token = jwtSign(user._doc.id);
        res.status(200).json({
          data: {
            user: {
              ...user._doc,
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

router.post("/update", verifyToken, async (req, res) => {
  const { id, username, first_name, last_name, email, professor_id } = req.body;
  console.log(req.body);

  const userId = mongoose.Types.ObjectId(id);

  const userUsername = await User.find({
    username: username,
    _id: { $ne: userId },
  });
  const userEmail = await User.find({ email: email, _id: { $ne: userId } });

  if (!userEmail.length && !userUsername.length) {
    await User.findByIdAndUpdate(userId, {
      first_name: first_name,
      last_name: last_name,
      username: username,
      email: email,
      professor: _.isEmpty(professor_id) ? null : professor_id,
    });

    if (!_.isEmpty(professor_id)) {
      await Capstone.findOneAndUpdate(
        { uploaded_by: userId },
        { approver: professor_id }
      );
    }

    const users = await User.findById(userId)
      .populate("role")
      .populate("type")
      .populate({
        path: "professor",
        select: "first_name last_name username email _id",
      });

    if (users) {
      res.status(200).json({
        data: {
          user: {
            ...users._doc,
          },
        },
        errors: null,
      });
    }
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

router.post("/verify_otp", async (req, res) => {
  const { otp, email } = req.body;

  let user = await UserVerification.findOne({
    email: email,
  }).sort({ created_at: -1 });

  if (user) {
    const isExpired = moment(user.expires_at).isBefore(moment());
    if (isExpired) {
      res.status(200).json({ error: "OTP expired" });
    } else {
      console.log(otp, user.otp);
      if (_.isEqual(parseInt(otp, 10), user.otp)) {
        await User.findOneAndUpdate({ email: email }, { is_verified: true });

        res.status(200).json({ error: null });
      } else {
        res.status(200).json({ error: "Incorrect OTP" });
      }
    }
  } else {
    res.status(200).json({ error: "Email not exist." });
  }
});

router.post("/resend_otp", async (req, res) => {
  const { first_name, last_name, email } = req.body;
  const otp = generateOTP();

  const info = await sendMail(
    email,
    "Email Verification",
    emailVerificationMessage(first_name, last_name, email, otp)
  );
  if (info.accepted.length > 0) {
    await UserVerification.create({
      otp: otp,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      email: email,
    });

    res.sendStatus(200);
  }
});

router.post("/forgot_password", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email });

  if (user) {
    const info = await sendMail(
      user.email,
      "Reset Password",
      `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">CSD Project</a>
        </div>
        <p style="font-size:1.1em">Hi, ${user.first_name} ${user.last_name}</p>
        <p>We received a request to reset the password for your account. To reset your password click the button below.</p>
        <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;"><a style="text-decoration:none;color:white" href="https:localhost:4000">Reset Password</a></h2>
        <p style="font-size:0.9em;">Regards,<br />CSD Team</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>CSD Project</p>
          <p>2341 Sample Address</p>
          <p>Philippines</p>
        </div>
      </div>
    </div>`
    );
    if (info.accepted.length > 0) {
      res.sendStatus(200);
    }
  } else {
    res.status(200).json({ error: "Email address not exist." });
  }
});

router.post("/update_password", async (req, res) => {
  const { email, password } = req.body;

  bcrypt.hash(password, saltRounds, async (err, hash) => {
    await User.findOneAndUpdate({ email: email }, { password: hash });

    res.sendStatus(200);
  });
});

module.exports = router;
