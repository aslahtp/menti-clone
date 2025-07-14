# <p align="center">Real-Time Quiz Application</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"></a>
  <a href="#"><img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/WebSocket-000000?style=for-the-badge&logo=socket.io&logoColor=white" alt="WebSocket"></a>
  <a href="#"><img src="https://img.shields.io/badge/JSON%20Web%20Tokens-black?style=for-the-badge&logo=JSON-Web-Tokens" alt="JSON Web Tokens"></a>
  <a href="#"><img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios"></a>
  <a href="#"><img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma"></a>
  <a href="#"><img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
</p>

## Introduction

This project is a real-time quiz application built with React, Express, and WebSockets. It allows administrators to create and manage quizzes, and users to join and participate in them in real-time.  The application leverages JWT for authentication and Prisma for database interactions, providing a scalable and secure platform. This project is my implementation of the live quiz feature of the application [mentimeter](https://www.mentimeter.com/).

## Table of Contents

1.  [Key Features](#key-features)
2.  [Installation Guide](#installation-guide)
3.  [Usage](#usage)
4.  [Environment Variables](#environment-variables)
5.  [Project Structure](#project-structure)
6.  [Technologies Used](#technologies-used)
7.  [License](#license)

## Key Features

*   **Real-time Quiz Experience:** Participants receive questions and updates in real-time via WebSockets.
*   **Admin Control Panel:** Administrators can create, start, and end quizzes, and monitor participant progress.
*   **User Authentication:** Secure user authentication using JWT (JSON Web Tokens).
*   **Role-Based Authorization:** Restricts access to admin functionalities based on user roles.
*   **Quiz Creation:** A user-friendly interface for creating quizzes with multiple questions and options.
*   **Leaderboard:** Displays quiz results and rankings.
*   **Session Management:** Manages active quiz sessions using the `QuizSession` class and the `activeSessions` map.
*   **Cached Authentication:** Authentication tokens are cached to reduce database load and improve performance.

## Installation Guide

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install backend dependencies:**

    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies:**

    ```bash
    cd ../
    npm install
    ```

4.  **Set up environment variables:**

    *   Create `.env` files in both the `backend` and root directories.
    *   Define the necessary environment variables (see [Environment Variables](#environment-variables) section).

5.  **Run the backend:**

    ```bash
    cd backend
    npm run dev
    ```

6.  **Run the frontend:**

    ```bash
    cd ../
    npm run dev
    ```

## Usage

1.  **Access the application in your browser:** `http://localhost:5173`

2.  **Sign up or sign in:** Use the signup and sign-in components to create or access your account.

3.  **Admin Dashboard:**  Administrators can access the admin dashboard (`/dashadmin`) to create and manage quizzes.

4.  **User Dashboard:** Regular users can access the user dashboard (`/dashuser`) to join available quizzes.

5.  **Create a Quiz:**  Use the `CreateQuiz` component to define the quiz title, questions, options, and correct answers.

6.  **Join a Quiz:** Users can join a quiz by entering the quiz ID in the `JoinQuiz` component.

7.  **Start a Quiz:**  Administrators can start the quiz from the `StartQuiz` component.

8.  **Real-time Interaction:** Participants receive questions and submit answers in real-time via WebSockets.

## Environment Variables

*   **Backend (`backend/.env`):**
    *   `DATABASE_URL`: The connection string for the PostgreSQL database. Example: `postgresql://user:password@host:port/database?schema=public`
    *   `JWT_SECRET`: A secret key used to sign JWT tokens.
    *   `AUTH_CACHE_TTL`: Time-to-live (in seconds) for the authentication cache.

## Project Structure

```
/
├── vite.config.js       # Vite configuration file for the frontend
├── package.json          # Frontend package manifest
├── eslint.config.js      # ESLint configuration file for the frontend
├── package-lock.json     # Frontend dependency lockfile
├── index.html            # Main HTML file for the frontend
├── README.md             # This file
├── src/                  # Frontend source code
│   ├── App.jsx           # Main application component with routing
│   ├── App.css           # Global styles for the frontend
│   ├── index.css         # Index styles for the frontend
│   ├── main.jsx          # Entry point for the React application
│   ├── components/       # React components
│   │   ├── joinquiz.jsx   # Component for joining a quiz
│   │   ├── home.jsx       # Home page component
│   │   ├── createquiz.jsx # Component for creating a quiz
│   │   ├── dashadmin.jsx  # Admin dashboard component
│   │   ├── dashuser.jsx   # User dashboard component
│   │   ├── signup.jsx     # Signup component
│   │   ├── signin.jsx     # Signin component
│   │   ├── startquiz.jsx  # Component for starting a quiz
│   ├── assets/          # Static assets
│   │   ├── react.svg      # React logo
├── backend/              # Backend source code
│   ├── index.js          # Main entry point for the backend server
│   ├── package.json      # Backend package manifest
│   ├── package-lock.json # Backend dependency lockfile
│   ├── src/              # Backend source code
│   │   ├── result.js       # Express route for leaderboard results
│   │   ├── auth.js         # Express routes for authentication
│   │   ├── quiz.js         # Express routes for quiz management
│   │   ├── middlewares/    # Middlewares
│   │   │   ├── types.js   # Types for middleware
│   │   │   ├── jwt.js     # Utilities for JWT verification
│   │   ├── connection/    # Connection utilities
│   │   │   ├── ws.js      # WebSocket server logic
│   ├── prisma/           # Prisma files
│   │   ├── migrations/    # Prisma migrations
│   │   │   ├── migration_lock.toml
│   │   │   ├── 20250710090214_fourthh/
│   │   │   ├── 20250710063917_first/
│   │   │   ├── 20250710073104_second/
│   │   │   ├── 20250710075837_third/
```

## Technologies Used

*   **Frontend:**
    *   React
    *   Axios
    *   React Router
*   **Backend:**
    *   Node.js
    *   Express
    *   WebSocket (ws)
    *   JSON Web Token (JWT)
    *   Prisma
*   **Database:**
    *   PostgreSQL (using Prisma)
*   **Authentication:**
    *   JWT

## License

MIT License

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>