const express = require("express");

const cors = require("cors");

const app = express();
const fs = require("fs");
const bcrypt = require("bcrypt");
// const { generateToken } = require("./actions/jwt");
app.use(express.json());
app.use(cors());

app.post("/api/register", async (req, res) => {
  await fs.readFile("./users.json", "utf8", async (err, data) => {
    let users = [];

    if (!err && data) {
      users = JSON.parse(data);
    }

    if (req.body === null || JSON.stringify(req.body) === "{}") {
      return res.status(400).json({ message: "Fields are required" });
    }
    if (req.body.role !== "realtor" && req.body.role !== "client") {
      return res.status(400).json({ message: "Role type is incorrect" });
    }

    if (users.find((user) => user.email === req.body.email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    users.push(req.body);
    await fs.writeFile("users.json", JSON.stringify(users, null, 2), (err) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    res.status(200).json({
      message: "Registration successful",
      user: {
        email: users.find((user) => user.email === req.body.email).email,
        role: users.find((user) => user.email === req.body.email).role,
      },
    });
  });
});

app.post("/api/login", async (req, res) => {
  await fs.readFile("./users.json", "utf8", async (err, data) => {
    let users = [];

    if (!err && data) {
      users = JSON.parse(data);
    }

    if (req.body === null || JSON.stringify(req.body) === "{}") {
      return res.status(400).json({ message: "Fields are required" });
    }

    const user = users.find((user) => user.email === req.body.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCorrect = bcrypt.compare(req.body.password, user.password);
    if (!isCorrect) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        email: users.find((user) => user.email === req.body.email).email,
        role: users.find((user) => user.email === req.body.email).role,
      },
    });
  });
});

app.listen(8080, (error) => {
  if (error) {
    console.log(error);
  }
  console.log("Server is running on port 8080");
});
