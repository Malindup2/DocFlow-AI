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

# 2. Test the Embedding Model
print("\nTesting Embedding Model (sentence-transformers)...")
try:
    embed_client = InferenceClient("sentence-transformers/all-MiniLM-L6-v2", token=token)
    response = embed_client.feature_extraction("Hello world")
    print(" Embedding Model Works! Connection is good.")
except Exception as e:
    print(f" Embedding Failed: {e}")

# 3. Test the Chat Model (Gemma)
print("\nTesting Chat Model (Google Gemma)...")
try:
    llm_client = InferenceClient("google/gemma-2-2b-it", token=token)
    
    # FIX: Use chat_completion instead of text_generation
    messages = [
        {"role": "user", "content": "Say hi"}
    ]
    response = llm_client.chat_completion(messages, max_tokens=10)
    
    # Extract the answer correctly from the chat response object
    answer = response.choices[0].message.content
    print(f" Gemma Works! Response: {answer}")

except Exception as e:
    print(f" Gemma Failed: {e}")