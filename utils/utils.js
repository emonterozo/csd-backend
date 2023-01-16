const jwt = require("jsonwebtoken");
const UUID = require("uuid-v4");
const _ = require("lodash");
const multer = require("multer");
const firebase = require("./firebase");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

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

const isUrl = (s) => {
  const regexp =
    /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  return regexp.test(s);
};

const sendMail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: subject,
    html: html,
  };

  return transporter.sendMail(mailOptions);
};

const emailVerificationMessage = (first_name, last_name, email, otp) => {
  return `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">CSD Project</a>
        </div>
        <p style="font-size:1.1em">Hi ${first_name} ${last_name},</p>
        <p>Use the following OTP to complete your Sign Up procedures. OTP is valid for 5 minutes.</p>
        <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
        <p>Or click this link
        <br/>
        <a href="http://localhost?email=${email}">http://localhost?email=${email}</a>
        </p>
        <p style="font-size:0.9em;">Regards,<br />CSD Team</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>CSD Project</p>
          <p>2341 Sample Address</p>
          <p>Philippines</p>
        </div>
      </div>
    </div>`;
};

const generateOTP = () => {
  const otp = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  return otp;
};

module.exports = {
  jwtSign,
  uploadFile,
  uploadToStorage,
  getRatings,
  isUrl,
  sendMail,
  emailVerificationMessage,
  generateOTP,
};
