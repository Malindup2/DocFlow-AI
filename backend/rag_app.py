import os
import faiss
import numpy as np
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

# HuggingFace inference API clients 
embed_client = InferenceClient(
    "sentence-transformers/all-MiniLM-L6-v2",
    token=HF_TOKEN
)

llm_client = InferenceClient(
    "mistralai/Mistral-7B-Instruct-v0.2",
    token=HF_TOKEN
)

# FAISS vector index
EMBED_DIM = 384
index = faiss.IndexFlatL2(EMBED_DIM)
chunks_store = []

class QueryRequest(BaseModel):
    query: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def embed_text(text: str):
    emb = embed_client.feature_extraction(text)
    return np.array(emb).astype("float32")


def extract_pdf_text(pdf_file):
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        t = page.extract_text()
        if t:
            text += t
    return text


def chunk_text(text, size=500):
    return [text[i:i+size] for i in range(0, len(text), size)]


@app.post("/upload")
async def upload(file: UploadFile):
    global chunks_store, index
    chunks_store = []
    index = faiss.IndexFlatL2(EMBED_DIM)

    pdf_text = extract_pdf_text(file.file)

    if not pdf_text.strip():
        return {"status": "error", "message": "PDF has no readable text."}

    chunks = chunk_text(pdf_text)

    for c in chunks:
        vec = embed_text(c)
        index.add(vec.reshape(1, -1))
        chunks_store.append(c)

    return {"status": "ok", "chunks": len(chunks)}

#  Ask Question
@app.post("/ask")
async def ask(request: QueryRequest):
    if len(chunks_store) == 0:
        return {"answer": "Please upload a PDF first."}

    query = request.query
    query_vec = embed_text(query).reshape(1, -1)

    D, I = index.search(query_vec, 3)
    valid = [i for i in I[0] if i < len(chunks_store)]

    if not valid:
        return {"answer": "No relevant content found in document."}

    context = "\n---\n".join([chunks_store[i] for i in valid])

    prompt = f"""
Use ONLY this context to answer:

{context}

Question: {query}

If answer not found in context, say:
"I couldn't find that in the document."

Answer:
"""

    resp = llm_client.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300
    )

    answer_text = resp["choices"][0]["message"]["content"]
    return {"answer": answer_text}
