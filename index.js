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
const Tag = require("./models/Tag");
const Capstone = require("./models/Capstone");

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

app.get("/types", async (req, res) => {
  const types = await Type.find();
  res.status(200).json({ types });
});

app.post("/register", async (req, res) => {
  const upload = multer({ storage: store }).single("attachment");
  upload(req, res, async () => {
    const { username, password, first_name, last_name, email, type_id } =
      req.body;

    const path = `./uploads/${req.file.filename}`;

    const userUsername = await User.find({ username: username });
    const userEmail = await User.find({ email: email });

    if (!userUsername.length && !userEmail.length) {
      const attachmentLink = await uploadFile(path, storage);
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        const role = await Role.findOne({ description: "User" });

        const user = await User.create({
          username: username,
          password: hash,
          first_name: first_name,
          last_name: last_name,
          email: email,
          status: "pending",
          attachment: attachmentLink,
          role_id: role._id,
          type_id: type_id,
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

app.get("/tags_professor", verifyToken, async (req, res) => {
  const tags = await Tag.find();

  const type = await Type.find({ description: "Professor" });
  const list = await User.find({ type_id: type[0]._id });
  const professor = list.map((item) => ({
    _id: item._id,
    name: `${item.first_name} ${item.last_name}`,
  }));
  res.status(200).json({ tags, professor });
});

app.get("/capstones", async (req, res) => {
  const capstones = await Capstone.find()
    .populate("tags")
    .populate({
      path: "uploaded_by",
      select: "first_name last_name",
    })
    .populate({
      path: "approver",
      select: "first_name last_name",
    })
    .populate({
      path: "comments.user",
      select: "first_name last_name",
    })
    .populate({
      path: "ratings.rate_by",
      select: "first_name last_name",
    });

  res.status(200).json({ capstones });
});

app.post("/add_capstone", verifyToken, async (req, res) => {
  const upload = multer({ storage: store }).fields([
    {
      name: "logo",
      maxCount: 1,
    },
    {
      name: "images",
      maxCount: 3,
    },
    {
      name: "document",
      maxCount: 1,
    },
  ]);
  upload(req, res, async () => {
    const { title, description, website, tags, professor, uploaded_by } =
      req.body;

    const images = req.files.images.map((image) => image.path);

    const documentPath = await uploadFile(req.files.document[0].path, storage);
    const logoPath = await uploadFile(req.files.logo[0].path, storage);

    let imagesPath = [];
    for (const image of images) {
      const path = await uploadFile(image, storage);
      imagesPath.push(path);
    }

    Capstone.create({
      title: title,
      description: description,
      website: website,
      tags: tags,
      approver: professor,
      uploaded_by: uploaded_by,
      documents: documentPath,
      logo: logoPath,
      images: imagesPath,
      ratings: [
        {
          rating: 1,
          count: 0,
          rate_by: [],
        },
        {
          rating: 2,
          count: 0,
          rate_by: [],
        },
        {
          rating: 3,
          count: 0,
          rate_by: [],
        },
        {
          rating: 4,
          count: 0,
          rate_by: [],
        },
        {
          rating: 5,
          count: 0,
          rate_by: [],
        },
      ],
    })
      .then(() => {
        const dir = "./uploads";
        fs.readdirSync(dir).forEach((f) => fs.rmSync(`${dir}/${f}`));
        res.sendStatus(200);
      })
      .catch(() => {
        res.sendStatus(500);
      });
  });
});

app.listen(port, () => {
  console.log(`CSD Backend app listening on port ${port}`);
});
