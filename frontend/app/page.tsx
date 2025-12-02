'use client';

import { useState, useRef, FormEvent } from 'react';
import { FileText, Send, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile.type.includes('pdf')) {
      setUploadStatus('error');
      setUploadMessage('Please upload a PDF file');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('uploading');
    setUploadMessage('Processing your document...');

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
      setUploadMessage(`Document processed successfully! ${data.chunks} chunks indexed.`);
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Failed to upload document. Please try again.');
      console.error('Upload error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();

    if (!question.trim() || uploadStatus !== 'success') return;

    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/ask?query=${encodeURIComponent(question)}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to get answer');

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Ask error:', error);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl shadow-lg shadow-yellow-500/30">
              <FileText className="w-8 h-8 text-slate-950" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              DocFlow AI
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Upload your PDF documents and chat with them using advanced AI.
            Get instant answers powered by RAG technology.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-slate-900/50 backdrop-blur-sm border-2 border-dashed border-slate-700 hover:border-yellow-400 rounded-2xl p-12 transition-all duration-300">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
                  {uploadStatus === 'uploading' ? (
                    <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                  ) : uploadStatus === 'success' ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : uploadStatus === 'error' ? (
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  ) : (
                    <Upload className="w-8 h-8 text-yellow-400" />
                  )}
                </div>

                <h3 className="text-xl font-semibold mb-2">
                  {file ? file.name : 'Drop your PDF here or click to browse'}
                </h3>

                {uploadMessage && (
                  <p className={`text-sm ${uploadStatus === 'success' ? 'text-green-400' :
                    uploadStatus === 'error' ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                    {uploadMessage}
                  </p>
                )}

                {!uploadMessage && (
                  <p className="text-slate-500 text-sm">
                    Supports PDF files up to 50MB
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        {uploadStatus === 'success' && (
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur opacity-10" />
              <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-500 text-center">
                        Ask a question about your document to get started
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 font-medium'
                            : 'bg-slate-800 text-slate-100'
                            }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 rounded-2xl px-4 py-3">
                        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleAskQuestion} className="border-t border-slate-800 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question about your document..."
                      disabled={isAsking}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isAsking || !question.trim()}
                      className="bg-gradient-to-br from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                    >
                      <Send className="w-5 h-5" />
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-slate-600 text-sm">
          <p>Powered by HuggingFace AI, FAISS Vector Search, and Next.js</p>
        </div>
      </div>
    </div>
  );
}
