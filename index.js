const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const fs = require("fs");

app.use(express.json());

app.post("/api/register", async (req, res) => {
  await fs.readFile("./users.json", "utf8", async (err, data) => {
    let users = [];

    if (!err && data) {
      users = JSON.parse(data);
    } else {
      return res.status(500).json({ message: "Internal server error" });
    }

    if (req.body === null || JSON.stringify(req.body) === "{}") {
      return res.status(400).json({ message: "Fields are required" });
    }

    if (users.find((user) => user.email === req.body.email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    users.push(req.body);
    await fs.writeFile("users.json", JSON.stringify(users, null, 2), (err) => {
      if (err) {
        console.error("Ошибка записи в файл:", err);
      } else {
        console.log("Данные успешно записаны!");
      }
    });
    res.status(200).json({ message: "success" });
  });
});

app.listen(8080, (error) => {
  if (error) {
    console.log(error);
  }
  console.log("Server is running on port 8080");
});
