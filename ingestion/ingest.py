import os
import json
import asyncio
from datetime import datetime
import sys

# Add root folder to sys.path to resolve any shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Enable filesystem cache
os.environ["CACHING"] = "true"
os.environ["CACHE_BACKEND"] = "fs"

import cognee
from cognee.tasks.ingestion.data_item import DataItem
from cognee.infrastructure.databases.relational.create_db_and_tables import create_db_and_tables

DATASET_NAME = "corporate_ghost"
HEALTH_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api", "memory_health.json")

def load_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def update_health_stats(items_count, action="ingest"):
    os.makedirs(os.path.dirname(HEALTH_FILE), exist_ok=True)
    
    # Try to read existing state
    state = {
        "total_items_remembered": 0,
        "last_improved_at": None,
        "last_forgot_at": None
    }
    
    if os.path.exists(HEALTH_FILE):
        try:
            with open(HEALTH_FILE, "r", encoding="utf-8") as f:
                state.update(json.load(f))
        except Exception:
            pass
            
    now_str = datetime.utcnow().isoformat()
    if action == "ingest":
        state["total_items_remembered"] = items_count
        state["last_improved_at"] = now_str
    elif action == "forget":
        state["total_items_remembered"] = 0
        state["last_forgot_at"] = now_str
        
    with open(HEALTH_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

async def ingest_all():
    print("Initializing Cognee database tables...")
    await create_db_and_tables()

    # Clear previous memories to start fresh
    print("Resetting previous memories...")
    await cognee.forget(everything=True)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    seed_dir = os.path.join(base_dir, "seed_data")
    
    slack_file = os.path.join(seed_dir, "slack_threads.json")
    jira_file = os.path.join(seed_dir, "jira_tickets.json")
    github_file = os.path.join(seed_dir, "github_data.json")
    
    slack_data = load_json(slack_file)
    jira_data = load_json(jira_file)
    github_data = load_json(github_file)
    
    data_items = []
    
    # Process Slack Threads
    for thread in slack_data:
        text = f"Slack Thread {thread['id']} in {thread['channel']} by {thread['author']} on {thread['date']}:\n{thread['content']}\nLink: {thread['link']}"
        item = DataItem(
            data=text,
            label=thread["id"],
            external_metadata={
                "source": "slack",
                "author": thread["author"],
                "date": thread["date"],
                "event": thread["content"][:100] + "...",
                "link": thread["link"]
            }
        )
        data_items.append(item)
        
    # Process Jira Tickets
    for ticket in jira_data:
        text = f"Jira Ticket {ticket['id']}: {ticket['title']}\nStatus: {ticket['status']}\nAssignee: {ticket['assignee']}\nDate: {ticket['date']}\n{ticket['content']}\nLink: {ticket['link']}"
        item = DataItem(
            data=text,
            label=ticket["id"],
            external_metadata={
                "source": "jira",
                "author": ticket["assignee"],
                "date": ticket["date"],
                "event": f"Ticket {ticket['id']} created: {ticket['title']}",
                "link": ticket["link"]
            }
        )
        data_items.append(item)
        
    # Process GitHub Commits & PRs
    for code in github_data:
        text = f"GitHub {code['type']} {code['id']}: {code['title']}\nAuthor: {code['author']}\nDate: {code['date']}\n{code['content']}\nLink: {code['link']}"
        item = DataItem(
            data=text,
            label=code["id"],
            external_metadata={
                "source": "github",
                "author": code["author"],
                "date": code["date"],
                "event": f"{code['type']} {code['id']}: {code['title']}",
                "link": code["link"]
            }
        )
        data_items.append(item)
        
    print(f"Ingesting {len(data_items)} items into Cognee memory layer...")
    
    # Check if we have API Keys to run live memory ingestion
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
    
    has_openai = openai_key and openai_key != "your_actual_api_key_here"
    has_gemini = gemini_key and gemini_key != "your_gemini_api_key"
    
    if not (has_openai or has_gemini):
        print("[WARNING] No valid LLM API key (OPENAI_API_KEY or GEMINI_API_KEY) found. Running in MOCK ingestion mode. Health state updated.")
        update_health_stats(len(data_items), action="ingest")
        print("Mock Ingestion Complete.")
        return
        
    # Configure Gemini environment variables if running with Gemini
    if has_gemini and not has_openai:
        print("[INFO] Valid Gemini API key detected. Configuring Cognee to use Google Gemini LLM provider...")
        os.environ["LLM_PROVIDER"] = "gemini"
        os.environ["LLM_MODEL"] = "gemini/gemini-1.5-flash"
        os.environ["LLM_API_KEY"] = gemini_key
        os.environ["GEMINI_API_KEY"] = gemini_key
        # Use local Fastembed to avoid needing another billing account/key for embeddings
        os.environ["EMBEDDING_PROVIDER"] = "fastembed"
        
    try:
        # Call cognee remember
        for item in data_items:
            await cognee.remember(item, dataset_name=DATASET_NAME, self_improvement=False)
            
        print("Enriching memory graph via cognee.improve()...")
        await cognee.improve(dataset=DATASET_NAME)
        
        print("Ingestion and enrichment completed successfully.")
        update_health_stats(len(data_items), action="ingest")
    except Exception as e:
        print(f"[ERROR] Live ingestion failed: {e}. Falling back to updating health stats.")
        update_health_stats(len(data_items), action="ingest")

if __name__ == "__main__":
    asyncio.run(ingest_all())
