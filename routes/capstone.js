const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");

const { uploadFile } = require("../utils/utils");
const { verifyToken } = require("../middleware/authorization");

const { store, storage } = require("../utils/store");

const Capstone = require("../models/Capstone");

router.get("/list", verifyToken, async (req, res) => {
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

module.exports = router;
