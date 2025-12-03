import os
import faiss
import numpy as np
from io import BytesIO
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# 1. Load Environment Variables
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

# 2. Initialize Hugging Face Clients
embed_client = InferenceClient(
    "sentence-transformers/all-MiniLM-L6-v2",
    token=HF_TOKEN
)


# Alternatives: "microsoft/Phi-3.5-mini-instruct" or "mistralai/Mistral-7B-Instruct-v0.3"
llm_client = InferenceClient(
    "google/gemma-2-2b-it", 
    token=HF_TOKEN
)

# 3. FAISS Setup
EMBED_DIM = 384
index = faiss.IndexFlatL2(EMBED_DIM)
chunks_store = [] 

app = FastAPI()

# 4. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Define Request Model (Fixes 422 Error)
class QueryRequest(BaseModel):
    query: str

# --- Helpers ---
def embed_text(text: str):
    emb = embed_client.feature_extraction(text)
    return np.array(emb).astype("float32")

def extract_pdf_text(pdf_bytes):
    reader = PdfReader(BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += page_text
    return text

def chunk_text(text, size=500):
    return [text[i:i + size] for i in range(0, len(text), size)]

# --- Endpoints ---
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    pdf_text = extract_pdf_text(pdf_bytes)
    chunks = chunk_text(pdf_text)

    # Clear previous index to avoid mixing documents
    index.reset()
    chunks_store.clear()

    for c in chunks:
        vec = embed_text(c)
        index.add(vec.reshape(1, -1))
        chunks_store.append(c)

    return {"status": "ok", "chunks": len(chunks)}

@app.post("/ask")
async def ask(request: QueryRequest):
    # Check if doc exists
    if index.ntotal == 0:
        return {"answer": "Please upload a document first."}

    query = request.query
    
    # 1. Embed query
    query_vec = embed_text(query).reshape(1, -1)

    # 2. Search FAISS
    D, I = index.search(query_vec, 3)
    retrieved = [chunks_store[i] for i in I[0]]
    context = "\n---\n".join(retrieved)

    # 3. Chat Prompt
    messages = [
        {
            "role": "system", 
            "content": "You are a helpful AI assistant. Answer based ONLY on the context provided."
        },
        {
            "role": "user", 
            "content": f"Context:\n{context}\n\nQuestion: {query}"
        }
    ]

    # 4. Generate Answer
    response = llm_client.chat_completion(
        messages, 
        max_tokens=200,
        temperature=0.2
    )

    return {"answer": response.choices[0].message.content}