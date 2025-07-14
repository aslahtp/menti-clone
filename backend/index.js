/* eslint-disable no-undef */
const express = require("express");
const dotenv = require("dotenv");
const authRoutes = require("./src/auth");
const quizRoutes = require("./src/quiz");
const resultRoutes = require("./src/result");
const cors = require("cors");
const { initializeWebSocket } = require("./src/connection/ws");

dotenv.config();

const app = express();
const server = app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});


initializeWebSocket(server);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use("/", authRoutes);
app.use("/quiz", quizRoutes);
app.use("/result", resultRoutes);