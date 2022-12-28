const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const _ = require("lodash");

const { uploadFile, getRatings, uploadToStorage } = require("../utils/utils");
const { verifyToken } = require("../middleware/authorization");

const Capstone = require("../models/Capstone");

router.get("/list", async (req, res) => {
  const capstones = await Capstone.find({ percentage: 100 })
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

router.get("/assigned/:id", async (req, res) => {
  const capstones = await Capstone.find({
    approver: mongoose.Types.ObjectId(req.params.id),
  })
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

router.get("/owned/:id", async (req, res) => {
  const capstones = await Capstone.find({
    uploaded_by: mongoose.Types.ObjectId(req.params.id),
  })
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

router.post("/add", verifyToken, uploadFile.any(), async (req, res) => {
  const { title, description, website, tags, professor, uploaded_by } =
    req.body;
  const links = await uploadToStorage(req.files);

  const initialDocuments = [
    {
      key: "chapter 1",
      path: "",
      status: "",
    },
    {
      key: "chapter 2",
      path: "",
      status: "",
    },
    {
      key: "chapter 3",
      path: "",
      status: "",
    },
    {
      key: "chapter 4",
      path: "",
      status: "",
    },
    {
      key: "chapter 5",
      path: "",
      status: "",
    },
  ];

  const uploadedDocuments = links
    .filter((link) => link.key.includes("chapter"))
    .map((link) => ({
      key: link.key,
      path: link.value,
      status: "pending",
    }));

  const documents = [
    ...uploadedDocuments,
    ...initialDocuments.filter(
      (el1) => !uploadedDocuments.some((el2) => el2.key === el1.key)
    ),
  ].sort((a, b) => {
    if (a.key < b.key) {
      return -1;
    }
    if (a.key > b.key) {
      return 1;
    }
    return 0;
  });

  const logo = links.filter((link) => link.key === "logo");
  const images = links
    .filter((link) => link.key === "images")
    .map((link) => link.value);

  Capstone.create({
    title: title,
    description: description,
    website: website,
    website_views: 0,
    percentage: 0,
    tags: tags,
    approver: professor,
    uploaded_by: uploaded_by,
    documents: documents,
    logo: logo[0].value,
    images: images,
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
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
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
  const { id, status, chapter } = req.body;

  const capstone = await Capstone.findById(id).select("documents");

  const documents = capstone.documents.map((document) => {
    return _.isEqual(document.key, chapter.toLowerCase())
      ? { ...document._doc, status: status }
      : { ...document._doc };
  });
  Capstone.findByIdAndUpdate(id, {
    documents: documents,
    $inc: { percentage: _.isEqual(status, "approved") ? 20 : 0 },
  })
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

router.get("/dashboard/most_rated", async (req, res) => {
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

router.get("/dashboard/most_view", async (req, res) => {
  const capstone = await Capstone.find({ website_views: { $gte: 1 } })
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
    .sort({ website_views: -1 })
    .limit(5);

  res.status(200).json({ capstone });
});

router.post(
  "/upload_document",
  verifyToken,
  uploadFile.any(),
  async (req, res) => {
    const { id } = req.body;
    const links = await uploadToStorage(req.files);

    const initialDocuments = await Capstone.findById(id).select("documents");

    const uploadedDocuments = links.map((link) => ({
      key: link.key,
      path: link.value,
      status: "pending",
    }));

    const documents = [
      ...uploadedDocuments,
      ...initialDocuments.documents.filter(
        (el1) => !uploadedDocuments.some((el2) => el2.key === el1.key)
      ),
    ].sort((a, b) => {
      if (a.key < b.key) {
        return -1;
      }
      if (a.key > b.key) {
        return 1;
      }
      return 0;
    });

    Capstone.findByIdAndUpdate(id, {
      documents: documents,
    })
      .then(() => res.sendStatus(200))
      .catch(() => res.sendStatus(500));
  }
);

module.exports = router;
