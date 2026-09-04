"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const createRoom = () => {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    localStorage.setItem("userName", userName.trim());

    const newRoomId = Math.random().toString(36).substring(2, 8);

    router.push(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }

    localStorage.setItem("userName", userName.trim());

    router.push(`/room/${roomId.trim()}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-800 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Collaborative Code Editor
        </h1>

        <p className="mb-8 text-center text-zinc-400">
          Code together in real time.
        </p>

        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your name"
          className="mb-4 w-full rounded-md border border-zinc-600 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-blue-500"
        />

        <button
          onClick={createRoom}
          className="mb-6 w-full rounded-md bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
        >
          Create New Room
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-600"></div>

          <span className="text-sm text-zinc-500">
            OR
          </span>

          <div className="h-px flex-1 bg-zinc-600"></div>
        </div>

        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room ID"
          className="mb-3 w-full rounded-md border border-zinc-600 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-blue-500"
        />

        <button
          onClick={joinRoom}
          className="w-full rounded-md border border-zinc-600 px-5 py-3 font-semibold hover:bg-zinc-700"
        >
          Join Room
        </button>
      </div>
    </main>
  );
}