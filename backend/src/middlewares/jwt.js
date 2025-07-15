/* eslint-disable no-undef */
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log(decoded);
    next();
}

function verifyWSToken(token) {
    try {
        if (!token) {
            return { success: false, error: "No token provided" };
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { success: true, decoded };
    } catch (err) {
        return { success: false, error: err.message || "Invalid token" };
    }
}

module.exports = { verifyToken, verifyWSToken };