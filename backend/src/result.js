const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

router.get("/:quizId", async (req, res) => {
    const { quizId } = req.params;
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const leaderboard = await prisma.leaderboard.findMany({
        where: {
            quizId: parseInt(quizId)

        }
    });
    res.status(200).json({ results: leaderboard.map(l => ({ userId: `${l.userId}`, name: l.name, score: l.score, totalQuestions: l.totalQuestions })) });
});

module.exports = router;