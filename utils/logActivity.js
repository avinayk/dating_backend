const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const moment = require("moment-timezone");
const logActivity = (userId, description) => {
  const query = `
    INSERT INTO logsactivity (user_id, description, date)
    VALUES (?, ?, NOW())
  `;
  console.log(query);
  db.query(query, [userId, description], (err, result) => {
    if (err) {
      console.error("Error inserting log activity:", err);
    }
  });
};
