"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useParams } from "next/navigation";

const socket = io("http://localhost:5000");

export default function RoomPage() {
  const params = useParams();

  const roomId = params.roomId as string;

  const [code, setCode] = useState(
    "// Start coding here..."
  );

  const [language, setLanguage] = useState(
    "javascript"
  );

  const [output, setOutput] = useState("");

  const [stdin, setStdin] = useState("");

  const [users, setUsers] = useState<string[]>([]);

  const isRemoteChange = useRef(false);

  // =====================================================
  // SOCKET SETUP
  // =====================================================

  useEffect(() => {
    const userName =
      localStorage.getItem("userName") ||
      "Anonymous";

    // ---------------------------------------------------
    // CONNECTION
    // ---------------------------------------------------

    const handleConnect = () => {
      console.log(
        "Connected to server:",
        socket.id
      );

      // JOIN ROOM
      socket.emit("join-room", {
        roomId,
        userName,
      });
    };

    // ---------------------------------------------------
    // CODE UPDATE
    // ---------------------------------------------------

    const handleCodeUpdate = (newCode: string) => {
      isRemoteChange.current = true;

      setCode(newCode);
    };

    // ---------------------------------------------------
    // LANGUAGE UPDATE
    // ---------------------------------------------------

    const handleLanguageUpdate = (
      newLanguage: string
    ) => {
      setLanguage(newLanguage);
    };

    // ---------------------------------------------------
    // USERS
    // ---------------------------------------------------

    const handleRoomUsers = (
      userList: string[]
    ) => {
      console.log(
        "Users received:",
        userList
      );

      if (Array.isArray(userList)) {
        setUsers(userList);
      } else {
        setUsers([]);
      }
    };

    // ---------------------------------------------------
    // OUTPUT
    // ---------------------------------------------------

    const handleRunOutput = (
      newOutput: string
    ) => {
      console.log(
        "Output received:",
        newOutput
      );

      setOutput(newOutput);
    };

    socket.on("connect", handleConnect);

    socket.on(
      "code-update",
      handleCodeUpdate
    );

    socket.on(
      "language-update",
      handleLanguageUpdate
    );

    socket.on(
      "room-users",
      handleRoomUsers
    );

    socket.on(
      "run-output",
      handleRunOutput
    );

    // If already connected
    if (socket.connected) {
      handleConnect();
    }

    // ---------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "code-update",
        handleCodeUpdate
      );

      socket.off(
        "language-update",
        handleLanguageUpdate
      );

      socket.off(
        "room-users",
        handleRoomUsers
      );

      socket.off(
        "run-output",
        handleRunOutput
      );
    };
  }, [roomId]);

  // =====================================================
  // CODE CHANGE
  // =====================================================

  const handleEditorChange = (
    value: string | undefined
  ) => {
    const newCode = value || "";

    setCode(newCode);

    if (!isRemoteChange.current) {
      socket.emit("code-update", {
        roomId,
        code: newCode,
      });
    }

    isRemoteChange.current = false;
  };

  // =====================================================
  // LANGUAGE CHANGE
  // =====================================================

  const handleLanguageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLanguage = e.target.value;

    setLanguage(newLanguage);

    socket.emit("language-update", {
      roomId,
      language: newLanguage,
    });
  };

  // =====================================================
  // RUN CODE
  // =====================================================

  const handleRunCode = async () => {
    setOutput("Running code...");

    try {
      const response = await fetch(
        "http://localhost:5000/execute",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            code,
            language,
            stdin,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setOutput(
          result.error ||
            "Execution failed"
        );

        return;
      }

      const newOutput =
        result.output ||
        "No output";

      // Show locally
      setOutput(newOutput);

      // Send output to everyone in room
      socket.emit("run-output", {
        roomId,
        output: newOutput,
      });
    } catch (error) {
      console.error(
        "Execution error:",
        error
      );

      const errorMessage =
        "Could not connect to execution server.";

      setOutput(errorMessage);

      socket.emit("run-output", {
        roomId,
        output: errorMessage,
      });
    }
  };

  // =====================================================
  // COPY ROOM ID
  // =====================================================

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(
        roomId
      );

      alert("Room ID copied!");
    } catch (error) {
      console.error(error);
    }
  };

  // =====================================================
  // COPY INVITE LINK
  // =====================================================

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      alert("Invite link copied!");
    } catch (error) {
      console.error(error);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="h-screen bg-zinc-900 text-white">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
        {/* LEFT */}

        <div>
          <h1 className="text-xl font-semibold">
            Collaborative Code Editor
          </h1>

          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-zinc-400">
              Room: {roomId}
            </p>

            <button
              onClick={copyRoomId}
              className="rounded-md border border-zinc-600 px-3 py-1 text-xs hover:bg-zinc-700"
            >
              Copy ID
            </button>

            <button
              onClick={copyInviteLink}
              className="rounded-md border border-zinc-600 px-3 py-1 text-xs hover:bg-zinc-700"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-6">
          {/* LANGUAGE */}

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">
              Language:
            </label>

            <select
              value={language}
              onChange={
                handleLanguageChange
              }
              className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="javascript">
                JavaScript
              </option>

              <option value="typescript">
                TypeScript
              </option>

              <option value="python">
                Python
              </option>

              <option value="cpp">
                C++
              </option>

              <option value="java">
                Java
              </option>

              <option value="c">
                C
              </option>
            </select>
          </div>

          {/* CONNECTION */}

          <div className="flex items-center gap-4">
            <span className="text-sm text-green-400">
              ● Connected
            </span>

            <span className="text-sm text-zinc-400">
              👥 {users.length}{" "}
              {users.length === 1
                ? "user"
                : "users"}
            </span>
          </div>
        </div>
      </header>

      {/* =================================================
          USERS
      ================================================= */}

      <div className="border-b border-zinc-700 bg-zinc-800 px-6 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-400">
            IN ROOM:
          </span>

          <div className="flex flex-wrap gap-2">
            {users.length === 0 ? (
              <span className="text-xs text-zinc-500">
                No users
              </span>
            ) : (
              users.map(
                (user, index) => (
                  <span
                    key={`${user}-${index}`}
                    className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-200"
                  >
                    👤 {user}
                  </span>
                )
              )
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          MAIN
      ================================================= */}

      <div className="flex h-[calc(100vh-117px)] flex-col">
        {/* EDITOR */}

        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={
              handleEditorChange
            }
            theme="vs-dark"
            options={{
              fontSize: 16,

              minimap: {
                enabled: false,
              },
            }}
          />
        </div>

        {/* INPUT */}

        <div className="border-t border-zinc-700 bg-zinc-900 p-3">
          <label className="mb-2 block text-sm font-semibold text-zinc-400">
            INPUT
          </label>

          <textarea
            value={stdin}
            onChange={(e) =>
              setStdin(e.target.value)
            }
            placeholder="Enter input here..."
            className="w-full resize-y rounded-md border border-zinc-700 bg-black p-3 text-sm text-white outline-none"
            rows={3}
          />
        </div>

        {/* RUN BUTTON */}

        <div className="border-t border-zinc-700 bg-zinc-900 p-3">
          <button
            onClick={handleRunCode}
            className="rounded-md bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-500"
          >
            ▶ Run Code
          </button>
        </div>

        {/* OUTPUT */}

        <div className="h-32 border-t border-zinc-700 bg-black p-4">
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">
            OUTPUT
          </h2>

          <pre className="whitespace-pre-wrap text-sm text-green-400">
            {output ||
              "Output will appear here..."}
          </pre>
        </div>
      </div>
    </main>
  );
}