import os
import faiss
import numpy as np
from fastapi import FastAPI, UploadFile
from PyPDF2 import PdfReader
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

# HuggingFace Clients
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


app = FastAPI()


def embed_text(text: str):
    emb = embed_client.feature_extraction(text)
    return np.array(emb).astype("float32")


def extract_pdf_text(pdf_file):
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text


def chunk_text(text, size=500):
    return [text[i:i+size] for i in range(0, len(text), size)]


@app.post("/upload")
async def upload(file: UploadFile):
    pdf_text = extract_pdf_text(file.file)
    chunks = chunk_text(pdf_text)

    for c in chunks:
        vec = embed_text(c)
        index.add(vec.reshape(1, -1))
        chunks_store.append(c)

    return {"status": "ok", "chunks": len(chunks)}


@app.post("/ask")
async def ask(query: str):
    query_vec = embed_text(query).reshape(1, -1)

    D, I = index.search(query_vec, 3)
    retrieved = [chunks_store[i] for i in I[0]]

    context = "\n---\n".join(retrieved)

    prompt = f"""
Use ONLY the context below to answer:

Context:
{context}

Question: {query}

Answer:
"""

    response = llm_client.text_generation(
        prompt,
        max_new_tokens=200,
        temperature=0.2
    )

    return {"answer": response}
