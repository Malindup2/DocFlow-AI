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
- FAISS (Vector DB)
- HuggingFace Inference API
- PyPDF2
- Uvicorn

### **Frontend**
- Next.js 14
- React
- Tailwind CSS

---

##  Project Structure

DocFlow/
├── backend/
│ ├── rag_app.py
│ ├── .env
│ ├── venv/
│ └── requirements.txt (optional)
│
├── frontend/
│ ├── app/
│ ├── components/
│ ├── public/
│ └── package.json
│
└── README.md

yaml
Copy code

---

##  Environment Variables

Create a `.env` file inside the **backend** folder:

HF_TOKEN=your_huggingface_api_key_here

vbnet
Copy code

To load dotenv, the backend imports:

```python
from dotenv import load_dotenv
load_dotenv()
 Installation & Setup
 Clone the repository
bash
Copy code
git clone https://github.com/your-username/DocFlow.git
cd DocFlow
 Backend Setup (FastAPI + FAISS)
bash
Copy code
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# OR
source venv/bin/activate  # Mac/Linux
Install dependencies:

css
Copy code
pip install fastapi uvicorn[standard] faiss-cpu huggingface_hub pypdf2 python-multipart python-dotenv
Run the backend:

lua
Copy code
uvicorn rag_app:app --reload
Backend will run at:

cpp
Copy code
http://127.0.0.1:8000
Test using Swagger Docs:

arduino
Copy code
http://127.0.0.1:8000/docs
 Frontend Setup (Next.js + Tailwind)
bash
Copy code
cd ../frontend
npm install
npm run dev
Frontend runs at:

arduino
Copy code
http://localhost:3000
