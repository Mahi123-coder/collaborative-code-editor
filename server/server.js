require("dotenv").config({ path: "../.env" });

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Room = require("./models/Room");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

// =====================================================
// CODE EXECUTION
// =====================================================

app.post("/execute", async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    const languageMap = {
      javascript: 63,
      typescript: 74,
      python: 71,
      cpp: 54,
      java: 62,
      c: 50,
    };

    const languageId = languageMap[language];

    if (!languageId) {
      return res.status(400).json({
        error: "Unsupported language",
      });
    }

    const submissionResponse = await fetch(
      "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: stdin || "",
        }),
      }
    );

    const result = await submissionResponse.json();

    const output =
      result.stdout ||
      result.stderr ||
      result.compile_output ||
      result.message ||
      result.status?.description ||
      "No output";

    res.json({
      output,
    });
  } catch (error) {
    console.error("Execution error:", error);

    res.status(500).json({
      error: "Code execution failed",
    });
  }
});

// =====================================================
// HELPER: GET USERS IN ROOM
// =====================================================

function getRoomUsers(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);

  if (!room) {
    return [];
  }

  return Array.from(room)
    .map((socketId) => {
      const socket = io.sockets.sockets.get(socketId);

      return socket?.data?.userName || "Anonymous";
    })
    .filter(Boolean);
}

// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ===================================================
  // JOIN ROOM
  // ===================================================

  socket.on("join-room", async ({ roomId, userName }) => {
    try {
      if (!roomId) {
        return;
      }

      socket.data.userName = userName || "Anonymous";

      socket.join(roomId);

      console.log(
        `${socket.data.userName} joined room ${roomId}`
      );

      // Find room in MongoDB
      let room = await Room.findOne({ roomId });

      // Create room if it doesn't exist
      if (!room) {
        room = await Room.create({
          roomId,
          code: "// Start coding here...",
          language: "javascript",
        });

        console.log(`New room created: ${roomId}`);
      }

      // Send saved code to the joining user
      socket.emit("code-update", room.code);

      // Send saved language to the joining user
      socket.emit("language-update", room.language);

      // Tell other users that someone joined
      socket.to(roomId).emit("user-joined", {
        userName: socket.data.userName,
      });

      // Send updated username list to EVERYONE
      const users = getRoomUsers(roomId);

      io.to(roomId).emit("room-users", users);

      console.log("Users in room:", users);
    } catch (error) {
      console.error("Join room error:", error);
    }
  });

  // ===================================================
  // CODE UPDATE
  // ===================================================

  socket.on("code-update", async ({ roomId, code }) => {
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { code },
        {
          upsert: true,
          new: true,
        }
      );

      // Send code to everyone ELSE
      socket.to(roomId).emit("code-update", code);
    } catch (error) {
      console.error("Code save error:", error);
    }
  });

  // ===================================================
  // LANGUAGE UPDATE
  // ===================================================

  socket.on("language-update", async ({ roomId, language }) => {
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { language },
        {
          upsert: true,
          new: true,
        }
      );

      // Send language to everyone else
      socket.to(roomId).emit("language-update", language);
    } catch (error) {
      console.error("Language save error:", error);
    }
  });

  // ===================================================
  // RUN CODE
  // ===================================================

  socket.on("run-output", ({ roomId, output }) => {
    console.log(`Broadcasting output to room ${roomId}`);

    // Send output to EVERYONE in the room
    io.to(roomId).emit("run-output", output);
  });

  // ===================================================
  // DISCONNECT
  // ===================================================

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        setTimeout(() => {
          const users = getRoomUsers(roomId);

          io.to(roomId).emit("room-users", users);

          console.log(
            `Updated users in room ${roomId}:`,
            users
          );
        }, 0);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// =====================================================
// MONGODB + SERVER START
// =====================================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error
    );
  });