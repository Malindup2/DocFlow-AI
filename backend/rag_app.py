import os
from typing import List, Dict, Any

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

EMBED_DIM = 384
index = faiss.IndexFlatL2(EMBED_DIM)
chunks_store: List[Dict[str, Any]] = []

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
    pages = []
    for idx, page in enumerate(reader.pages):
        t = page.extract_text() or ""
        pages.append({"page": idx + 1, "text": t})
    return pages


def chunk_page_text(page_text: str, page_number: int, size: int = 500, overlap: int = 100):
    """
    Create overlapping chunks so we can cite with page metadata.
    """
    step = size - overlap
    chunks = []
    for start in range(0, len(page_text), step):
        chunk = page_text[start:start + size]
        if chunk.strip():
            chunks.append({
                "text": chunk,
                "page": page_number,
                "start": start,
                "end": start + len(chunk)
            })
    return chunks


@app.post("/upload")
async def upload(file: UploadFile):
    global chunks_store, index
    chunks_store = []
    index = faiss.IndexFlatL2(EMBED_DIM)

    pages = extract_pdf_text(file.file)

    if not any(p["text"].strip() for p in pages):
        return {"status": "error", "message": "PDF has no readable text."}

    all_chunks = []
    for page in pages:
        all_chunks.extend(chunk_page_text(page["text"], page["page"]))

    for c in all_chunks:
        vec = embed_text(c["text"])
        index.add(vec.reshape(1, -1))
        chunks_store.append(c)

    return {"status": "ok", "chunks": len(all_chunks)}

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

    context_chunks = [chunks_store[i] for i in valid]
    context = "\n---\n".join([f"[p{c['page']}] {c['text']}" for c in context_chunks])

    prompt = f"""
Use ONLY this context to answer:

{context}

Question: {query}

Requirements:
- Cite sources inline using the bracket tags provided (e.g., [p2]).
- If the answer is not in the context, say "I couldn't find that in the document."

Answer:
"""

    resp = llm_client.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300
    )

    answer_text = resp["choices"][0]["message"]["content"]
    citations = [
        {
            "page": c["page"],
            "snippet": c["text"][:240].strip()
        }
        for c in context_chunks
    ]
    return {"answer": answer_text, "citations": citations}
