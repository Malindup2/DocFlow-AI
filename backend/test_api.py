import os
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# 1. Load the token
load_dotenv()
token = os.getenv("HF_TOKEN")
print(f"Token loaded: {token[:4]}...{token[-4:] if token else 'None'}")

if not token:
    print(" ERROR: Token not found in .env")
    exit()

# 2. Test the Embedding Model (This is what breaks your Upload)
print("\nTesting Embedding Model (sentence-transformers)...")
try:
    embed_client = InferenceClient("sentence-transformers/all-MiniLM-L6-v2", token=token)
    # Send a simple "Hello" to see if it works
    response = embed_client.feature_extraction("Hello world")
    print(" Embedding Model Works! Connection is good.")
except Exception as e:
    print(f" Embedding Failed: {e}")

# 3. Test the Chat Model (Mistral)
print("\nTesting Chat Model (Mistral)...")
try:
    llm_client = InferenceClient("mistralai/Mistral-7B-Instruct-v0.2", token=token)
    response = llm_client.text_generation("Say hi", max_new_tokens=10)
    print(f" Mistral Works! Response: {response}")
except Exception as e:
    print(f" Mistral Failed: {e}")