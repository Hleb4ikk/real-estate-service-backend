const jwt = require("jsonwebtoken");
require("dotenv").config();

function generateToken(user) {
  const payload = {
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
  return token;
}

module.exports = { generateToken };
