"use client";
import { useState } from "react";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");

  async function uploadPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      alert("PDF uploaded and processed!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading PDF: " + (error as Error).message);
    }
  }

  async function sendQuery() {
    if (!query.trim()) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { sender: "user", text: query },
        { sender: "ai", text: data.answer || "Error: No response from server" },
      ]);

      setQuery("");
    } catch (error) {
      console.error("Query error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: query },
        { sender: "ai", text: "Error: Failed to get response from server" },
      ]);
      setQuery("");
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6"> DocFlow - AI Document Assistant</h1>

      <input
        type="file"
        onChange={uploadPDF}
        className="mb-4"
      />

      <div className="border p-4 h-96 overflow-y-auto mb-4 bg-white shadow">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`my-2 p-2 rounded ${
              msg.sender === "user"
                ? "bg-blue-200 text-blue-900"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            <strong>{msg.sender === "user" ? "You" : "AI"}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <div className="flex">
        <input
          className="flex-1 border p-2 rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendQuery()}
          placeholder="Ask something about your document..."
        />

        <button
          onClick={sendQuery}
          className="bg-blue-600 text-white px-4 py-2 ml-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          disabled={!query.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
