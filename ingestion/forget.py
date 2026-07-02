import os
import asyncio
import sys

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Load root .env file explicitly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

def get_env_var(name):
    val = os.environ.get(name)
    if val is not None:
        return val.strip()
    val = os.environ.get(name.upper()) or os.environ.get(name.lower())
    if val is not None:
        return val.strip()
    target_key = name.strip().upper()
    for k, v in os.environ.items():
        if k.strip().upper() == target_key:
            return v.strip()
    return None

# Pre-configure LLM_PROVIDER and related settings in os.environ prior to importing cognee
gemini_key = get_env_var("GEMINI_API_KEY") or get_env_var("LLM_API_KEY")
openai_key = get_env_var("OPENAI_API_KEY")
llm_provider = get_env_var("LLM_PROVIDER")

has_openai = openai_key and openai_key.startswith("sk-")
has_gemini = gemini_key and gemini_key != "your_gemini_api_key"

if llm_provider == "gemini" or (has_gemini and not has_openai):
    os.environ["LLM_PROVIDER"] = "gemini"
    os.environ["LLM_MODEL"] = "gemini/gemini-1.5-flash"
    os.environ["LLM_API_KEY"] = gemini_key or ""
    os.environ["GEMINI_API_KEY"] = gemini_key or ""
    os.environ["EMBEDDING_PROVIDER"] = "fastembed"
    os.environ["EMBEDDING_MODEL"] = "BAAI/bge-small-en-v1.5"
    os.environ["EMBEDDING_DIMENSIONS"] = "384"

# Enable filesystem cache
os.environ["CACHING"] = "true"
os.environ["CACHE_BACKEND"] = "fs"

import cognee
from ingestion.ingest import update_health_stats

async def scrub_memory():
    print("=== Scrubbing Corporate Ghost Memory Graph ===")
    
    gemini_key = get_env_var("GEMINI_API_KEY") or get_env_var("LLM_API_KEY")
    openai_key = get_env_var("OPENAI_API_KEY")
    llm_provider = get_env_var("LLM_PROVIDER")

    has_openai = openai_key and openai_key.startswith("sk-")
    has_gemini = gemini_key and gemini_key != "your_gemini_api_key"

    if llm_provider == "gemini" or (has_gemini and not has_openai):
        cognee.config.set_llm_provider("gemini")
        cognee.config.set_llm_model("gemini/gemini-1.5-flash")
        if gemini_key:
            cognee.config.set_llm_api_key(gemini_key)
        cognee.config.set_embedding_provider("fastembed")
        cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
        cognee.config.set_embedding_dimensions(384)

    try:
        # Calls cognee.forget to clear the memory layer
        await cognee.forget(everything=True)
        print("[x] Cognee forget(everything=True) completed.")
        
        # Reset local health stats in memory_health.json
        update_health_stats(0, action="forget")
        print("[x] Memory health file reset successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to scrub memory graph: {e}")
        # Even on error, update stats to reflect forget action
        update_health_stats(0, action="forget")

if __name__ == "__main__":
    asyncio.run(scrub_memory())
