const jwt = require("jsonwebtoken");
const UUID = require("uuid-v4");
const _ = require("lodash");

const jwtSign = (data) => {
  return jwt.sign({ id: data }, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });
};

const uploadFile = (localFile, storage) => {
  let uuid = UUID();
  const bucketName = process.env.STORAGE_BUCKET;

  return storage
    .bucket(bucketName)
    .upload(localFile, {
      uploadType: "media",
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: uuid,
        },
      },
    })
    .then((data) => {
      let file = data[0];

      return Promise.resolve(
        "https://firebasestorage.googleapis.com/v0/b/" +
          bucketName +
          "/o/" +
          encodeURIComponent(file.name) +
          "?alt=media&token=" +
          uuid
      );
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
module.exports = { jwtSign, uploadFile, getRatings };
