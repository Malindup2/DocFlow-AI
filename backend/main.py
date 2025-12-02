import os
import faiss
import numpy as np
from io import BytesIO
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

# HF Clients
embed_client = InferenceClient(
    "sentence-transformers/all-MiniLM-L6-v2",
    token=HF_TOKEN
)

llm_client = InferenceClient(
    "HuggingFaceH4/zephyr-7b-beta",
    token=HF_TOKEN
)

# FAISS Index
EMBED_DIM = 384
index = faiss.IndexFlatL2(EMBED_DIM)
chunks_store = []

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

def extract_pdf_text(pdf_bytes):
    reader = PdfReader(BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += page_text
    return text

def chunk_text(text, size=500):
    return [text[i:i + size] for i in range(0, len(text), size)]


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Read file bytes
    pdf_bytes = await file.read()

    # Extract text
    pdf_text = extract_pdf_text(pdf_bytes)

    # Chunk text
    chunks = chunk_text(pdf_text)

    # Generate embeddings and save to FAISS
    for c in chunks:
        vec = embed_text(c)
        index.add(vec.reshape(1, -1))
        chunks_store.append(c)

    return {"status": "ok", "chunks": len(chunks)}


@app.post("/ask")
async def ask(query: str):
    # Embed query
    query_vec = embed_text(query).reshape(1, -1)

    # Retrieve top 3 chunks
    D, I = index.search(query_vec, 3)
    retrieved = [chunks_store[i] for i in I[0]]

    context = "\n---\n".join(retrieved)

    # Build prompt
    prompt = f"""
Use ONLY the context below to answer:

Context:
{context}

Question: {query}

Answer:
"""

    # Call LLM
    response = llm_client.text_generation(
        prompt,
        max_new_tokens=200,
        temperature=0.2
    )

    # HuggingFace output format handling
    if isinstance(response, list):
        answer = response[0].get("generated_text", "")
    elif isinstance(response, dict):
        answer = response.get("generated_text", "")
    else:
        answer = str(response)

    return {"answer": answer}
