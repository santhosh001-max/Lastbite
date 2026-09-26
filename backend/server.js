const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role = "user", staffCode = "" } = req.body;
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required." });
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
    }
    if (!["user", "staff"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid account type." });
    }
    if (role === "staff" && staffCode !== process.env.STAFF_SIGNUP_CODE) {
      return res.status(403).json({ success: false, message: "Staff registration is not authorized." });
    }

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [cleanName, cleanEmail, passwordHash, role]
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: { id: result.insertId, name: cleanName, email: cleanEmail, role }
    });
  } catch (error) {
    console.error(error);

    // MySQL duplicate-key protection. The database UNIQUE(email)
    // constraint is the final protection against registering the same
    // email more than once, including simultaneous signup requests.
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead."
      });
    }

    res.status(500).json({ success: false, message: "Could not create the account." });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ success: true, message: "LastBite API and database are connected." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Database connection failed." });
  }
});

app.get("/api/foods", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM food_items WHERE status <> 'deleted' ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not fetch food items." });
  }
});

app.get("/api/foods/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM food_items WHERE id = ? AND status <> 'deleted'",
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Food item not found." });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not fetch the food item." });
  }
});

app.post("/api/foods", async (req, res) => {
  try {
    const {
      name,
      description = null,
      category = null,
      quantity = 1,
      unit = "servings",
      price = 0,
      expiry_date = null,
      image_url = null
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Food name is required." });
    }

    const [result] = await db.query(
      `INSERT INTO food_items
       (name, description, category, quantity, unit, price, expiry_date, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        description,
        category,
        Number(quantity) || 1,
        unit,
        Number(price) || 0,
        expiry_date || null,
        image_url
      ]
    );

    const [rows] = await db.query("SELECT * FROM food_items WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not add the food item." });
  }
});

app.put("/api/foods/:id", async (req, res) => {
  try {
    const {
      name,
      description = null,
      category = null,
      quantity = 1,
      unit = "servings",
      price = 0,
      expiry_date = null,
      image_url = null,
      status = "available"
    } = req.body;

    const [result] = await db.query(
      `UPDATE food_items
       SET name=?, description=?, category=?, quantity=?, unit=?, price=?,
           expiry_date=?, image_url=?, status=?
       WHERE id=?`,
      [
        name,
        description,
        category,
        Number(quantity) || 1,
        unit,
        Number(price) || 0,
        expiry_date || null,
        image_url,
        status,
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Food item not found." });
    }

    const [rows] = await db.query("SELECT * FROM food_items WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not update the food item." });
  }
});

app.delete("/api/foods/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE food_items SET status = 'deleted' WHERE id = ? AND status <> 'deleted'",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Food item not found." });
    }

    res.json({ success: true, message: "Food item deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not delete the food item." });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found." });
});

async function initializeDatabase() {
  // Create the application tables automatically on first deployment.
  // CREATE TABLE IF NOT EXISTS is non-destructive: existing data is preserved.
  await db.query(`
    CREATE TABLE IF NOT EXISTS food_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      category VARCHAR(80) NULL,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      unit VARCHAR(30) NOT NULL DEFAULT 'servings',
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      expiry_date DATETIME NULL,
      image_url TEXT NULL,
      status ENUM('available','reserved','donated','sold','expired','deleted') NOT NULL DEFAULT 'available',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_food_status (status),
      INDEX idx_food_expiry (expiry_date)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(190) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user','staff') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB
  `);
}

initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`LastBite API running on 0.0.0.0:${PORT}`);
      console.log("Database tables are ready.");
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
