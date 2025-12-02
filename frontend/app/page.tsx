'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Send, Upload, X, Menu, Sparkles, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAsking]);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile.type.includes('pdf')) {
      setUploadStatus('error');
      setUploadMessage('Please upload a PDF file');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('uploading');
    setUploadMessage('Processing document...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setUploadStatus('success');
      setUploadMessage(`Ready! ${data.chunks} chunks indexed.`);

      setMessages([
        {
          role: 'assistant',
          content: `I've processed your document "${selectedFile.name}". You can now ask me questions!`,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileUpload(selectedFile);
  };

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || uploadStatus !== 'success') return;

    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/ask?query=${encodeURIComponent(question)}`, {
        method: 'POST',
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error.', timestamp: new Date() }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white relative overflow-hidden">

      {/* ==== Sidebar (Glassmorphism + Animation) ==== */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-72 backdrop-blur-xl bg-white/10 border-r border-white/10 p-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold">DocFlow AI</h1>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === 'uploading'}
              className="w-full flex items-center gap-2 justify-center px-4 py-2.5 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* PDF Viewer (Glass Panel) */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-3"
              >
                <p className="font-medium text-sm mb-2">{file.name}</p>
                <p className="text-xs text-gray-300 mb-3">{uploadMessage}</p>

                {/* PDF Preview */}
                <div className="w-full h-64 overflow-hidden rounded-lg border border-white/10">
                  <embed src={URL.createObjectURL(file)} type="application/pdf" className="w-full h-full" />
                </div>
              </motion.div>
            )}

            <div className="mt-auto pt-4 text-center text-xs text-gray-400">
              Powered by AI & RAG
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==== Main Chat Area ==== */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="h-14 backdrop-blur-lg bg-white/10 border-b border-white/10 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <h2 className="text-sm text-gray-300">
            {uploadStatus === 'success' ? 'Chat with your document' : 'Upload a document to get started'}
          </h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[75%] px-4 py-3 rounded-2xl backdrop-blur-xl 
                ${msg.role === 'user'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-gray-200'
                }`}>
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>
          ))}
          {isAsking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/10 px-4 py-3 rounded-xl">
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 backdrop-blur-xl bg-white/5">
          <form onSubmit={handleAskQuestion} className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask something about the document..."
                className="flex-1 bg-transparent outline-none placeholder-gray-400 text-white"
              />
              <button
                type="submit"
                disabled={!question.trim() || isAsking || uploadStatus !== 'success'}
                className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 hover:opacity-90 transition"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
