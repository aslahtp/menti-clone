/* eslint-disable no-undef */
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { verifyToken } = require("./middlewares/jwt");

router.post("/signup", async (req, res) => {
    const { name, email, password, role } = req.body;

    await prisma.users.create({
        data: {
            name,
            email,
            password,
            role,
        }
    });

    res.status(200).json({ message: "Signup successful" });
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({
        where: {
            email,
            password,
        }
    });

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

    res.status(200).json({ token, message: "Signin successful" });
});

router.get("/profile", verifyToken, async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await prisma.users.findUnique({
        where: { id: decoded.id }
    });

    res.status(200).json({ id: `${user.id}`, name: user.name, email: user.email, role: user.role });
});

module.exports = router;