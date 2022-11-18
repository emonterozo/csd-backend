const jwt = require("jsonwebtoken");
const UUID = require("uuid-v4");

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

module.exports = { jwtSign, uploadFile };
