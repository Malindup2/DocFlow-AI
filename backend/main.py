import os
import faiss
import numpy as np
from io import BytesIO
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
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

# Chat Model (Zephyr - Free & High Quality)
llm_client = InferenceClient(
    "google/gemma-2-2b-it",
    token=HF_TOKEN
)

# 3. Initialize FAISS Vector DB (In-Memory)
EMBED_DIM = 384
index = faiss.IndexFlatL2(EMBED_DIM)
chunks_store = []  # To store the actual text chunks

app = FastAPI()

# 4. CORS Middleware (Allows Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---

def embed_text(text: str):
    """Converts text to a vector using the embedding model."""
    emb = embed_client.feature_extraction(text)
    return np.array(emb).astype("float32")

def extract_pdf_text(pdf_bytes):
    """Extracts raw text from a PDF file."""
    reader = PdfReader(BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += page_text
    return text

def chunk_text(text, size=500):
    """Splits long text into smaller chunks."""
    return [text[i:i + size] for i in range(0, len(text), size)]

# --- Endpoints ---

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """Handles PDF upload, extraction, and indexing."""
    # Read file bytes
    pdf_bytes = await file.read()

    # Extract text
    pdf_text = extract_pdf_text(pdf_bytes)

    # Chunk text
    chunks = chunk_text(pdf_text)

    # Generate embeddings and save to FAISS
    # (Note: In a real app, you'd batch this to be faster)
    for c in chunks:
        vec = embed_text(c)
        index.add(vec.reshape(1, -1))
        chunks_store.append(c)

    return {"status": "ok", "chunks": len(chunks)}

@app.post("/ask")
async def ask(query: str):
    """Handles the RAG (Retrieval Augmented Generation) logic."""
    if index.ntotal == 0:
        return {"answer": "Please upload a document first."}

    # 1. Embed user query
    query_vec = embed_text(query).reshape(1, -1)

    # 2. Search FAISS for the 3 most relevant chunks
    D, I = index.search(query_vec, 3)
    retrieved = [chunks_store[i] for i in I[0]]
    
    # 3. Combine retrieved chunks into a single context block
    context = "\n---\n".join(retrieved)

    # 4. Prepare the Chat Prompt
    messages = [
        {
            "role": "system", 
            "content": "You are a helpful AI assistant. Answer the user's question accurately using ONLY the context provided below. If the answer is not in the context, say you don't know."
        },
        {
            "role": "user", 
            "content": f"Context:\n{context}\n\nQuestion: {query}"
        }
    ]

    # 5. Call the LLM (Using chat_completion, NOT text_generation)
    response = llm_client.chat_completion(
        messages, 
        max_tokens=200,
        temperature=0.2
    )

    # 6. Extract the answer
    answer = response.choices[0].message.content

    return {"answer": answer}