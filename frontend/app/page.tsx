'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Send, Upload, X, Menu, Sparkles,
  Bot, User, ChevronRight, Loader2, FileUp
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Summarize this document",
  "What are the key takeaways?",
  "List the main topics covered",
  "Explain the conclusion"
];

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

  // Auto-scroll to bottom of chat
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
    setUploadMessage('Analyzing document structure...');

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

      // Add initial greeting
      setMessages([
        {
          role: 'assistant',
          content: `I've processed "${selectedFile.name}". What would you like to know?`,
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

  const handleAskQuestion = async (e: FormEvent, overrideQuestion?: string) => {
    if (e) e.preventDefault();
    const q = overrideQuestion || question;

    if (!q.trim() || uploadStatus !== 'success') return;

    const userMessage: Message = {
      role: 'user',
      content: q,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/ask?query=${encodeURIComponent(q)}`, {
        method: 'POST',
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-100 font-sans overflow-hidden selection:bg-white/20">

      {/* ==== Sidebar (Glassmorphism + Enhanced PDF View) ==== */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // smooth easeOut
            className="w-[400px] flex-shrink-0 border-r border-white/10 bg-[#0a0a0a] flex flex-col relative z-20 shadow-2xl"
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-400 to-gray-600 bg-clip-text text-transparent tracking-tight">
                  DocFlow AI
                </h1>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus === 'uploading'}
                className="group w-full flex items-center gap-3 justify-center px-4 py-3.5 
                         bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl 
                         transition-all duration-300 hover:border-white/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadStatus === 'uploading' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <FileUp className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                )}
                <span className="font-medium text-gray-300 group-hover:text-white">
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload PDF'}
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Sidebar Content / PDF Preview */}
            <div className="flex-1 overflow-hidden p-4 flex flex-col">
              {file ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col h-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <div className="p-3 bg-white/5 border-b border-white/5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-300 truncate">{file.name}</span>
                  </div>

                  {/* PDF Embed - Fits available space */}
                  <div className="flex-1 bg-gray-900 relative group">
                    <embed
                      src={URL.createObjectURL(file)}
                      type="application/pdf"
                      className="w-full h-full"
                    />
                    {/* Overlay for very small screens or if embed fails visual check */}
                    {uploadStatus === 'uploading' && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                          <p className="text-sm text-gray-400 font-light tracking-wide animate-pulse">Processing Vector Embeddings...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-gray-300 font-medium mb-1">No Document</h3>
                  <p className="text-sm text-gray-500">Upload a PDF to view it here</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-600">
                Secure • Private • AI Powered
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==== Main Chat Area ==== */}
      <div className="flex-1 flex flex-col relative bg-black">

        {/* Top Navigation */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {!sidebarOpen && (
              <span className="text-lg font-bold bg-gradient-to-r from-white via-gray-400 to-gray-600 bg-clip-text text-transparent">
                DocFlow AI
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${uploadStatus === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {uploadStatus === 'success' ? 'System Active' : 'System Idle'}
            </span>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.length === 0 ? (
            /* Welcome / Empty State */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-gray-800 to-black border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-white/5">
                <Sparkles className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Welcome to <span className="bg-gradient-to-r from-white via-gray-300 to-gray-600 bg-clip-text text-transparent">DocFlow AI</span>
              </h1>

              <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg">
                Upload your PDF documents and instantly start a conversation.
                Extract insights, summaries, and answers in seconds.
              </p>

              {/* Suggestions Capsules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (uploadStatus === 'success') {
                        setQuestion(suggestion);
                        handleAskQuestion(null as any, suggestion);
                      }
                    }}
                    disabled={uploadStatus !== 'success'}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 
                             text-left text-sm text-gray-300 transition-all hover:border-white/20 
                             disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-between"
                  >
                    {suggestion}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Message List */
            <div className="space-y-8 max-w-3xl mx-auto pb-10">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg
                    ${msg.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-gradient-to-br from-gray-700 to-black border border-white/10 text-white'}
                  `}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  <div className={`
                    relative px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-md max-w-[85%]
                    ${msg.role === 'user'
                      ? 'bg-white text-gray-900 rounded-tr-sm'
                      : 'bg-[#1a1a1a] border border-white/10 text-gray-200 rounded-tl-sm'}
                  `}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isAsking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black border border-white/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-[#1a1a1a] border border-white/10 rounded-tl-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-black via-black to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={(e) => handleAskQuestion(e)} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
              <div className="relative flex items-center bg-[#0a0a0a] rounded-2xl border border-white/10 focus-within:border-white/20 transition-all shadow-xl">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={uploadStatus === 'success' ? "Ask anything about your document..." : "Upload a PDF to start chatting..."}
                  disabled={uploadStatus !== 'success' || isAsking}
                  className="flex-1 bg-transparent border-none text-white placeholder-gray-500 px-6 py-4 focus:ring-0 outline-none disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isAsking || uploadStatus !== 'success'}
                  className="mr-3 p-3 rounded-xl bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 transition-all transform active:scale-95 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
            <p className="text-center text-xs text-gray-600 mt-3 font-light">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}