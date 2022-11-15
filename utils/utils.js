const jwt = require("jsonwebtoken");

const jwtSign = (data) => {
  return jwt.sign({ id: data }, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });
};

module.exports = { jwtSign };
