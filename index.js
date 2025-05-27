const express = require("express");

const cors = require("cors");

const app = express();
const fs = require("fs");
const bcrypt = require("bcrypt");

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

    const isCorrect = await bcrypt.compare(req.body.password, user.password);

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

app.post("/api/submit", (req, res) => {
  const { email, advertisement } = req.body;

  if (
    !email ||
    !advertisement ||
    !advertisement.title ||
    !advertisement.description ||
    !advertisement.price
  ) {
    return res.status(400).json({ message: "Incorrect data" });
  }

  fs.readFile("./advertisements.json", "utf8", async (err, data) => {
    let users = [];

    if (!err && data) {
      users = JSON.parse(data);
    }

    const allAdvertisements = users.flatMap((user) => user.advertisements);
    const maxId = allAdvertisements.length
      ? Math.max(...allAdvertisements.map((ad) => ad.id))
      : 0;

    let user = users.find((u) => u.email === email);
    if (!user) {
      user = { email, advertisements: [] };
      users.push(user);
    }

    const newId = maxId + 1;
    const createdAt = new Date().toISOString();
    user.advertisements.push({ id: newId, createdAt, ...advertisement });

    fs.writeFile(
      "advertisements.json",
      JSON.stringify(users, null, 2),
      (err) => {
        if (err) {
          return res.status(500).json({ message: "Error writing file" });
        }

        res
          .status(201)
          .json({ message: "Advertisement submitted successfully" });
      }
    );
  });
});

app.get("/api/advertisements", (req, res) => {
  fs.readFile("advertisements.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ message: "Error reading file" });
      return;
    }

    try {
      const parsedData = JSON.parse(data);

      const advertisements = parsedData.flatMap((user) => user.advertisements);

      res.json(advertisements);
    } catch (error) {
      res.status(500).json({ message: "Error processing data" });
    }
  });
});

app.get("/api/advertisement/:id", (req, res) => {
  const adId = parseInt(req.params.id, 10);

  fs.readFile("advertisements.json", "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Error reading file" });
    }

    try {
      const users = JSON.parse(data);
      let foundAdvertisement = null;

      users.forEach((user) => {
        const advertisement = user.advertisements.find((ad) => ad.id === adId);
        if (advertisement) {
          foundAdvertisement = { email: user.email, ...advertisement };
        }
      });

      if (foundAdvertisement) {
        res.json(foundAdvertisement);
      } else {
        res.status(404).json({ message: "Advertisement not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error processing data" });
    }
  });
});

app.post("/api/advertisement/likes", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // Читаем файл с лайками
    const likesData = await fs.promises.readFile("likes.json", "utf8");
    const users = JSON.parse(likesData);

    // Находим пользователя
    const user = users.find((u) => u.email === email);
    if (!user || !user.likedAdvertisements.length) {
      return res
        .status(200)
        .json({ message: "Likes not found", advertisements: [] });
    }

    // Читаем все объявления
    const adsData = await fs.promises.readFile("advertisements.json", "utf8");
    const allUsers = JSON.parse(adsData);

    // Получаем массив всех объявлений
    const allAdvertisements = allUsers.flatMap((user) => user.advertisements);

    // Фильтруем объявления по лайкнутым ID
    const likedAdvertisements = allAdvertisements.filter(
      (ad) => user.likedAdvertisements.includes(ad.id.toString()) // Приводим ID к строке
    );

    res.json({ email: user.email, advertisements: likedAdvertisements });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ message: "Error reading file" });
  }
});

app.post("/api/advertisement/like", async (req, res) => {
  try {
    const { email, advertisementId } = req.body;

    if (!email || !advertisementId) {
      return res
        .status(400)
        .json({ message: "Email и advertisementId обязательны" });
    }

    // Читаем файл likes.json
    let users = [];
    try {
      const data = await fs.promises.readFile("likes.json", "utf8");
      users = JSON.parse(data);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err; // Ошибка чтения файла (если файл существует)
      }
    }

    // Находим пользователя или создаем нового
    let user = users.find((u) => u.email === email);
    if (!user) {
      user = { email, likedAdvertisements: [] };
      users.push(user);
    }

    // Добавляем лайк, если его ещё нет
    if (!user.likedAdvertisements.includes(advertisementId)) {
      user.likedAdvertisements.push(advertisementId);
    }

    // Записываем обновленные данные
    await fs.promises.writeFile("likes.json", JSON.stringify(users, null, 2));

    res.json({
      message: "Advertisement liked successfully",
    });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ message: "Error processing data" });
  }
});

app.post("/api/advertisement/unlike", async (req, res) => {
  try {
    const { email, advertisementId } = req.body;

    if (!email || !advertisementId) {
      return res
        .status(400)
        .json({ message: "Email and advertisementId are required" });
    }

    // Читаем файл likes.json
    let users = [];
    try {
      const data = await fs.promises.readFile("likes.json", "utf8");
      users = JSON.parse(data);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err; // Ошибка чтения файла (если файл существует)
      }
    }

    // Находим пользователя
    let user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Удаляем лайкнутый advertisementId
    user.likedAdvertisements = user.likedAdvertisements.filter(
      (id) => id !== advertisementId
    );

    // Записываем обновленные данные
    await fs.promises.writeFile("likes.json", JSON.stringify(users, null, 2));

    res.json({
      message: "Like removed successfully",
      likedList: user.likedAdvertisements,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error processing data" });
  }
});

app.post("/api/advertisements_email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // Читаем данные из файла
    const data = await fs.promises.readFile("advertisements.json", "utf8");
    const users = JSON.parse(data);

    // Находим пользователя по email
    const user = users.find((u) => u.email === email);

    if (!user || !user.advertisements.length) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    res.json({ advertisements: user.advertisements });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ message: "Error processing data" });
  }
});

app.listen(8080, (error) => {
  if (error) {
    console.log(error);
  }
  console.log("Server is running on port 8080");
});
