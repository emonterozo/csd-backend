const jwt = require("jsonwebtoken");
const UUID = require("uuid-v4");
const _ = require("lodash");
const multer = require("multer");
const firebase = require("./firebase");

const jwtSign = (data) => {
  return jwt.sign({ id: data }, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });
};

const uploadFile = multer({
  storage: multer.memoryStorage(),
});

const uploadToStorage = async (files) => {
  let links = [];

  _.forEach(files, (value) => {
    let uuid = UUID();
    const bucketName = process.env.STORAGE_BUCKET;
    const { originalname, buffer, mimetype, fieldname } = value;

    const filename = `${uuid}.${originalname.split(".").pop()}`;

    const blob = firebase.bucket.file(filename);

    const promise = new Promise((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: mimetype,
          firebaseStorageDownloadTokens: uuid,
        },
      });
      blobStream
        .on("error", () => {
          reject(`Unable to upload image, something went wrong`);
        })
        .on("finish", async () => {
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
            filename
          )}?alt=media&token=${uuid}
    `;
          resolve({
            key: fieldname,
            value: publicUrl,
          });
        })
        .end(buffer);
    });
    links.push(promise);
  });
  return Promise.all(links).then((links) => {
    return links;
  });
};

const getRatings = (ratings) => {
  const five = ratings
    .filter((item) => _.isEqual(item.rating, 5))
    .map((item) => item.count);
  const four = ratings
    .filter((item) => _.isEqual(item.rating, 4))
    .map((item) => item.count);
  const three = ratings
    .filter((item) => _.isEqual(item.rating, 3))
    .map((item) => item.count);
  const two = ratings
    .filter((item) => _.isEqual(item.rating, 2))
    .map((item) => item.count);
  const one = ratings
    .filter((item) => _.isEqual(item.rating, 1))
    .map((item) => item.count);

  const rate =
    (5 * five[0] + 4 * four[0] + 3 * three[0] + 2 * two[0] + 1 * one[0]) /
    (five[0] + four[0] + three[0] + two[0] + one[0]);

  return _.round(rate, 1) || 0;
};

module.exports = {
  jwtSign,
  uploadFile,
  uploadToStorage,
  getRatings,
};
