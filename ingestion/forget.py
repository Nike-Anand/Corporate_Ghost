import os
import asyncio
import sys

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Enable filesystem cache
os.environ["CACHING"] = "true"
os.environ["CACHE_BACKEND"] = "fs"

import cognee
from ingestion.ingest import update_health_stats

async def scrub_memory():
    print("=== Scrubbing Corporate Ghost Memory Graph ===")
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
