const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");
const _ = require("lodash");

const { uploadFile, getRatings } = require("../utils/utils");
const { verifyToken } = require("../middleware/authorization");

const { store, storage } = require("../utils/store");

const Capstone = require("../models/Capstone");

router.get("/list", async (req, res) => {
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

router.post("/add", verifyToken, async (req, res) => {
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
      website_views: 0,
      percentage: 0,
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
      rate: 0,
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

router.post("/update/rating", verifyToken, async (req, res) => {
  const { id, rating, user } = req.body;

  const data = await Capstone.findOne({
    _id: id,
    "ratings.rate_by": { $in: mongoose.Types.ObjectId(user) },
  }).select("ratings");

  const { ratings } = await Capstone.findById(id).select("ratings");

  if (_.isNull(data)) {
    // new rating
    const addRatings = ratings.map((item) => {
      if (_.isEqual(item.rating, parseInt(rating, 10))) {
        return {
          rating: item.rating,
          count: item.count + 1,
          rate_by: [...item.rate_by, user],
          _id: item._id,
        };
      } else {
        return item;
      }
    });

    Capstone.findByIdAndUpdate(id, {
      ratings: addRatings,
      rate: getRatings(addRatings),
    })
      .then(() => res.sendStatus(200))
      .catch(() => res.sendStatus(500));
  } else {
    // update rating

    const removeRatings = ratings.map((item) => {
      if (item.rate_by.includes(user)) {
        return {
          rating: item.rating,
          count: item.count - 1,
          rate_by: item.rate_by.filter(
            (value) => !_.isEqual(value.toString(), user)
          ),
          _id: item._id,
        };
      } else {
        return item;
      }
    });

    const addRatings = removeRatings.map((item) => {
      if (_.isEqual(item.rating, parseInt(rating, 10))) {
        return {
          rating: item.rating,
          count: item.count + 1,
          rate_by: [...item.rate_by, user],
          _id: item._id,
        };
      } else {
        return item;
      }
    });

    Capstone.findByIdAndUpdate(id, {
      ratings: addRatings,
      rate: getRatings(addRatings),
    })
      .then(() => res.sendStatus(200))
      .catch(() => res.sendStatus(500));
  }
});

router.post("/update/percentage", verifyToken, async (req, res) => {
  const { id, percentage } = req.body;

  Capstone.findByIdAndUpdate(id, { percentage })
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(500));
});

router.post("/update/views", verifyToken, (req, res) => {
  const { id } = req.body;

  Capstone.findByIdAndUpdate(id, {
    $inc: { website_views: 1 },
  })
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(500));
});

router.post("/add/comment", verifyToken, (req, res) => {
  const { id, comment, user } = req.body;
  Capstone.findByIdAndUpdate(id, {
    $push: {
      comments: {
        user: user,
        comment: comment,
        timestamp: new Date(),
      },
    },
  })
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(500));
});

router.get("/comments/:id", async (req, res) => {
  const comments = await Capstone.findById(req.params.id)
    .populate({
      path: "comments.user",
      select: "first_name last_name",
    })
    .select("comments");
  res.status(200).json(comments);
});

router.get("/list/:id", async (req, res) => {
  const capstone = await Capstone.findById({ _id: req.params.id })
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

  res.status(200).json({ capstone });
});

router.get("/dashboard", verifyToken, async (req, res) => {
  const capstone = await Capstone.find()
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
    })
    .sort({ rate: -1 })
    .limit(5);

  res.status(200).json({ capstone });
});

module.exports = router;
