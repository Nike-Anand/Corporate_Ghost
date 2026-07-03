import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys

# Add root folder to sys.path to resolve any shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Enable filesystem cache
os.environ["CACHING"] = "true"
os.environ["CACHE_BACKEND"] = "fs"

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

import cognee

def setup_cognee_config():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key and gemini_key != "your_gemini_api_key_here":
        cognee.config.set_llm_provider("gemini")
        cognee.config.set_llm_model("gemini/gemini-2.5-flash")
        cognee.config.set_llm_api_key(gemini_key)
        cognee.config.set_embedding_provider("fastembed")
        cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
        cognee.config.set_embedding_dimensions(384)

setup_cognee_config()

import cognee
from ingestion.ingest import ingest_all, HEALTH_FILE, update_health_stats

app = FastAPI(title="Corporate Ghost API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Contract Models
class AskRequest(BaseModel):
    query: str

class TimelineEvent(BaseModel):
    source: str  # 'slack', 'github', 'jira'
    author: str
    date: str  # YYYY-MM-DD
    event: str
    link: str

class DecisionRelation(BaseModel):
    title: str
    context: str
    outcome: str

class AskResponse(BaseModel):
    summary: str
    timeline: List[TimelineEvent]
    relatedDecisions: List[DecisionRelation]

class HealthResponse(BaseModel):
    total_items_remembered: int
    last_improved_at: Optional[str] = None
    last_forgot_at: Optional[str] = None
    recently_forgotten: List[str] = []



@app.post("/api/ask", response_model=AskResponse)
async def ask(payload: AskRequest):
    """
    Query Corporate Ghost incident memory graph.
    Returns a unified decision timeline, summary, and related decisions.
    """
    query = payload.query.lower()
    
    # Query Cognee graph
    try:
        from cognee import SearchType
        # Run recall
        results = await cognee.recall(
            query_text=payload.query,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=["corporate_ghost"]
        )
        
        if not results:
            return AskResponse(
                summary="No memory matching your query was found in the graph. Did you run the Ingestion step first?",
                timeline=[],
                relatedDecisions=[]
            )
            
        # Compile text results
        recalled_text = "\n".join([r.text for r in results if hasattr(r, "text")])
            
        return AskResponse(
            summary=recalled_text[:1000],
            timeline=[],
            relatedDecisions=[]
        )
    except Exception as e:
        print(f"[API ERROR] Query recall failed: {e}")
        return AskResponse(
            summary=f"Error querying memory graph: {e}",
            timeline=[],
            relatedDecisions=[]
        )

@app.post("/api/forget")
async def forget():
    """
    Scrub memory database for deprecated systems.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key and openai_key != "your_actual_api_key_here":
        try:
            await cognee.forget(everything=True)
        except Exception as e:
            print(f"[API ERROR] Cognee forget failed: {e}")
            
    # Update stats
    update_health_stats(0, action="forget")
    return {"message": "Memory successfully scrubbed."}

@app.get("/api/health", response_model=HealthResponse)
async def health():
    """
    Retrieve current memory health statistics.
    """
    if os.path.exists(HEALTH_FILE):
        try:
            with open(HEALTH_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return HealthResponse(
                    total_items_remembered=data.get("total_items_remembered", 0),
                    last_improved_at=data.get("last_improved_at"),
                    last_forgot_at=data.get("last_forgot_at"),
                    recently_forgotten=data.get("recently_forgotten", [])
                )
        except Exception:
            pass
            
    # Default initial state
    return HealthResponse(total_items_remembered=0)

@app.post("/api/ingest")
async def ingest_route():
    """
    Trigger memory ingestion and improvement.
    """
    try:
        # Run the ingestion coroutine
        await ingest_all()
        return {"status": "success", "message": "Ingestion and improvement completed."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
