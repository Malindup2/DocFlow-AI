#  DocFlow - AI Document Assistant (RAG System)

DocFlow is a full-stack, AI-powered document assistant that lets users **upload PDFs** and **chat with their content** using RAG (Retrieval-Augmented Generation).  
It uses **Hugging Face Inference API**, **FAISS vector search**, **FastAPI**, and **Next.js** to deliver powerful document understanding and question answering.

---

##  Features

-  Upload any PDF document  
-  Extract & chunk text automatically  
-  Semantic search using FAISS  
-  LLM-powered answers using HuggingFace models  
-  RAG pipeline: retrieve relevant chunks & generate contextual answers  
-  Chat interface built with Next.js  
-  Fast, modern UI using Tailwind CSS  
-  Local processing + secure API communication  

---

##  Tech Stack

### **Backend**
- Python 3.10+
- FastAPI
- FAISS (Vector Database)
- HuggingFace Inference API
- PyPDF2
- Uvicorn

### **Frontend**
- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript

---

##  Project Structure

```
DocFlow-AI/
├── backend/
│   ├── rag_app.py          # Main FastAPI application
│   ├── .env               # Environment variables (HF_TOKEN)
│   ├── venv/              # Python virtual environment
│   └── __pycache__/       # Python cache files
├── frontend/
│   ├── app/
│   │   ├── globals.css    # Global styles with Tailwind
│   │   ├── layout.tsx     # Root layout component
│   │   ├── page.tsx       # Main page component
│   │   └── favicon.ico    # App favicon
│   ├── public/            # Static assets
│   ├── node_modules/      # Node.js dependencies
│   ├── package.json       # Node.js dependencies and scripts
│   ├── tailwind.config.js # Tailwind CSS configuration
│   ├── postcss.config.mjs # PostCSS configuration
│   ├── next.config.ts     # Next.js configuration
│   ├── tsconfig.json      # TypeScript configuration
│   ├── eslint.config.mjs  # ESLint configuration
│   └── .gitignore         # Git ignore rules
├── .git/                  # Git repository
└── README.md             # Project documentation
```

---

##  Environment Variables

Create a `.env` file inside the **backend** folder:

```bash
HF_TOKEN=your_huggingface_api_key_here
```

##  Installation & Setup

### Clone the repository
```bash
git clone https://github.com/Malindup2/DocFlow-AI.git
cd DocFlow-AI
```

### Backend Setup (FastAPI + FAISS)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# OR
source venv/bin/activate  # Mac/Linux
pip install fastapi uvicorn[standard] faiss-cpu huggingface_hub pypdf2 python-multipart python-dotenv
uvicorn rag_app:app --reload
```

Backend will run at: `http://127.0.0.1:8000`

Test using Swagger Docs: `http://127.0.0.1:8000/docs`

### Frontend Setup (Next.js + Tailwind)
```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

<img width="1918" height="903" alt="image" src="https://github.com/user-attachments/assets/d1029570-7340-4a57-8419-e52e54567d03" />

