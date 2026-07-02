import os
import sys

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from api.main import app

def test_corporate_ghost_mvp():
    client = TestClient(app)
    
    print("Testing /api/health endpoint...")
    health_res = client.get("/api/health")
    assert health_res.status_code == 200, f"Health endpoint failed: {health_res.text}"
    health_data = health_res.json()
    assert "total_items_remembered" in health_data, "Missing total_items_remembered key"
    print(f"Health check passed: {health_data}")

    print("\nTesting /api/ask endpoint with payment deprecation query...")
    payload = {"query": "Why did we deprecate Stripe v1?"}
    ask_res = client.post("/api/ask", json=payload)
    assert ask_res.status_code == 200, f"Ask endpoint failed: {ask_res.text}"
    
    data = ask_res.json()
    
    # Assert contract structure
    assert "summary" in data, "Missing 'summary' in response"
    assert "timeline" in data, "Missing 'timeline' in response"
    assert "relatedDecisions" in data, "Missing 'relatedDecisions' in response"
    
    print(f"Summary generated: {data['summary'][:80]}...")
    
    # Assert timeline events
    timeline = data["timeline"]
    assert len(timeline) > 0, "Timeline should not be empty"
    for event in timeline:
        assert "source" in event, "Timeline event missing 'source'"
        assert "author" in event, "Timeline event missing 'author'"
        assert "date" in event, "Timeline event missing 'date'"
        assert "event" in event, "Timeline event missing 'event'"
        assert "link" in event, "Timeline event missing 'link'"
    print(f"Timeline verification passed: found {len(timeline)} chronological events.")

    # Assert related decisions
    decisions = data["relatedDecisions"]
    assert len(decisions) > 0, "Related decisions should not be empty"
    for dec in decisions:
        assert "title" in dec, "Decision missing 'title'"
        assert "context" in dec, "Decision missing 'context'"
        assert "outcome" in dec, "Decision missing 'outcome'"
    print(f"Related decisions verification passed: found {len(decisions)} items.")
    
    print("\nAll MVP contract verifications passed successfully!")

if __name__ == "__main__":
    try:
        test_corporate_ghost_mvp()
    except AssertionError as e:
        print(f"[FAIL] Verification failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error during verification: {e}")
        sys.exit(1)
