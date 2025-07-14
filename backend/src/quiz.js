const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { title, questions } = req.body;
    console.log(title, questions);

    const isAdmin = await prisma.users.findUnique({
        where: {
            id: decoded.id,
            role: "ADMIN"
        }
    });
    if (!isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const quiz = await prisma.quiz.create({
        data: {
            title,
            adminId: decoded.id,
        }
    });
    if (!quiz) {
        return res.status(400).json({ message: "Failed to create quiz" });
    }
    for (const q of questions) {
        const { title, option1, option2, option3, option4, answer } = q;
        const question = await prisma.questions.create({
            data: {
                title,
                answer,
                quizId: quiz.id,
            }
        });

        for (const o of [option1, option2, option3, option4]) {
            await prisma.options.create({
                data: {
                    title: o,
                    questionId: question.id,
                }
            });
        }


    }
    res.status(200).json({ "quizId": `${quiz.id}`, "message": "Quiz created successfully" });
});

router.get("/", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const quizzes = await prisma.quiz.findMany({
        where: {
            adminId: decoded.id
        }
    });
    res.status(200).json({ quizzes });
})


router.get("/:quizId", async (req, res) => {
    const { quizId } = req.params;
    console.log(quizId);
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const quiz = await prisma.quiz.findUnique({
        where: { id: parseInt(quizId) },
        include: {
            questions: {
                include: {
                    options: true,
                }
            },
        },
    });
    if (!quiz) {
        return res.status(400).json({ message: "Quiz not found" });
    }
    res.status(200).json({ id: `${quiz.id}`, title: quiz.title, questions: quiz.questions.map(q => ({ id: `${q.id}`, title: q.title, option1: q.options[0].title, option2: q.options[1].title, option3: q.options[2].title, option4: q.options[3].title })) });
});

router.get("/admin/:quizId", async (req, res) => {
    const { quizId } = req.params;
    console.log(quizId);
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const quiz = await prisma.quiz.findUnique({
        where: { id: parseInt(quizId), adminId: decoded.id },
        include: {
            questions: {
                include: {
                    options: true,
                }
            },
        },
    });
    if (!quiz) {
        return res.status(400).json({ message: "Quiz not found" });
    }
    res.status(200).json({ id: `${quiz.id}`, title: quiz.title, questions: quiz.questions.map(q => ({ id: `${q.id}`, title: q.title, option1: q.options[0].title, option2: q.options[1].title, option3: q.options[2].title, option4: q.options[3].title, answer: q.answer })) });
});

router.post("/:quizId/submit", async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body;
    //console.log(quizId, answers);
    const total = answers.length;
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    let score = 0;
    for (const op of answers) {
        const question = await prisma.questions.findUnique({
            where: {
                id: parseInt(op.questionId),
                answer: op.selectedOption,
                quizId: parseInt(quizId)
            }
        });
        //console.log(question);
        if (question) {
            score++;
        }
    }

    const name = await prisma.users.findUnique({
        where: {
            id: decoded.id
        }
    });

    const leaderboard = await prisma.leaderboard.create({
        data: {
            userId: decoded.id,
            name: name.name,
            score,
            totalQuestions: total,
            quizId: parseInt(quizId),
        }
    });
    if (!leaderboard) {
        console.log("Failed to add to leaderboard");
        return res.status(400).json({ message: "Failed to add to leaderboard" });
    }
    res.status(200).json({ score, total, message: "Submission evaluated" });
});

module.exports = router;
