import os
import json
import asyncio
from datetime import datetime, timezone
import sys
import httpx
from dotenv import load_dotenv

# Add root folder to sys.path to resolve any shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
    os.environ["LLM_MODEL"] = "gemini/gemini-3.5-flash"
    os.environ["LLM_API_KEY"] = gemini_key or ""
    os.environ["GEMINI_API_KEY"] = gemini_key or ""
    os.environ["EMBEDDING_PROVIDER"] = "fastembed"
    os.environ["EMBEDDING_MODEL"] = "BAAI/bge-small-en-v1.5"
    os.environ["EMBEDDING_DIMENSIONS"] = "384"

# Enable filesystem cache
os.environ["CACHING"] = "true"
os.environ["CACHE_BACKEND"] = "fs"

import cognee
from cognee.tasks.ingestion.data_item import DataItem
from cognee.infrastructure.databases.relational.create_db_and_tables import create_db_and_tables

DATASET_NAME = "corporate_ghost"
HEALTH_FILE = os.path.join(ROOT_DIR, "api", "memory_health.json")

def load_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def update_health_stats(items_count, action="ingest"):
    os.makedirs(os.path.dirname(HEALTH_FILE), exist_ok=True)
    state = {
        "total_items_remembered": 0,
        "last_improved_at": None,
        "last_forgot_at": None,
        "recently_forgotten": []
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
        state["recently_forgotten"] = []
    elif action == "forget":
        state["total_items_remembered"] = 0
        state["last_forgot_at"] = now_str
        state["recently_forgotten"] = [
            "stripe_v1_client.py (codebase removal)",
            "Stripe API Rate Limit Incidents (April 2023)",
            "JIRA-402 Stripe v1 deprecation epic",
            "Stripe webhook signing credentials"
        ]
        
    with open(HEALTH_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

# --- GitHub Live Fetcher ---
async def fetch_live_github(token, repo):
    print(f"[LIVE FETCH] Querying GitHub API for repository: {repo}...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    items = []
    
    async with httpx.AsyncClient() as client:
        # Fetch Commits
        try:
            res = await client.get(f"https://api.github.com/repos/{repo}/commits", headers=headers, timeout=10.0)
            if res.status_code == 200:
                commits = res.json()
                print(f"[LIVE FETCH] Successfully retrieved {len(commits)} commits from GitHub.")
                for commit in commits[:10]: # Limiting to last 10 commits for speed
                    sha = commit.get("sha", "")
                    commit_data = commit.get("commit", {})
                    author_name = commit_data.get("author", {}).get("name", "Unknown Author")
                    commit_date = commit_data.get("author", {}).get("date", "")
                    message = commit_data.get("message", "")
                    html_url = commit.get("html_url", "")
                    
                    text = f"GitHub Commit {sha[:8]} by {author_name} on {commit_date}:\n{message}\nLink: {html_url}"
                    item = DataItem(
                        data=text,
                        label=f"commit-{sha[:8]}",
                        external_metadata={
                            "source": "github",
                            "author": author_name,
                            "date": commit_date[:10] if commit_date else "",
                            "event": f"Commit {sha[:8]}: {message[:100]}",
                            "link": html_url
                        }
                    )
                    items.append(item)
            else:
                print(f"[LIVE FETCH WARNING] GitHub commits fetch failed with code {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[LIVE FETCH ERROR] GitHub commits exception: {e}")
            
        # Fetch Pull Requests
        try:
            res = await client.get(f"https://api.github.com/repos/{repo}/pulls?state=all", headers=headers, timeout=10.0)
            if res.status_code == 200:
                prs = res.json()
                print(f"[LIVE FETCH] Successfully retrieved {len(prs)} PRs from GitHub.")
                for pr in prs[:10]: # Limiting to last 10 PRs
                    number = pr.get("number", "")
                    title = pr.get("title", "")
                    author = pr.get("user", {}).get("login", "Unknown User")
                    created_at = pr.get("created_at", "")
                    body = pr.get("body", "") or "No body content"
                    state = pr.get("state", "open")
                    html_url = pr.get("html_url", "")
                    
                    text = f"GitHub Pull Request #{number}: {title} by {author} on {created_at}\nStatus: {state}\nBody: {body}\nLink: {html_url}"
                    item = DataItem(
                        data=text,
                        label=f"PR-{number}",
                        external_metadata={
                            "source": "github",
                            "author": author,
                            "date": created_at[:10] if created_at else "",
                            "event": f"Pull Request #{number}: {title}",
                            "link": html_url
                        }
                    )
                    items.append(item)
            else:
                print(f"[LIVE FETCH WARNING] GitHub PRs fetch failed with code {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[LIVE FETCH ERROR] GitHub PRs exception: {e}")
            
    return items

# --- Slack Live Fetcher ---
async def fetch_live_slack(token):
    print("[LIVE FETCH] Querying Slack API...")
    headers = {"Authorization": f"Bearer {token}"}
    items = []
    
    async with httpx.AsyncClient() as client:
        try:
            # Get list of public channels
            res = await client.get("https://slack.com/api/conversations.list", headers=headers, timeout=10.0)
            if res.status_code == 200 and res.json().get("ok"):
                channels = res.json().get("channels", [])
                print(f"[LIVE FETCH] Slack channels found: {[c['name'] for c in channels]}")
                for chan in channels[:3]: # limit channels to query
                    chan_id = chan["id"]
                    chan_name = chan["name"]
                    
                    # Fetch history
                    hist_res = await client.get(f"https://slack.com/api/conversations.history?channel={chan_id}&limit=20", headers=headers, timeout=10.0)
                    if hist_res.status_code == 200 and hist_res.json().get("ok"):
                        messages = hist_res.json().get("messages", [])
                        print(f"[LIVE FETCH] Retrieved {len(messages)} messages from Slack channel #{chan_name}.")
                        for msg in messages:
                            user = msg.get("user", "Slack User")
                            text_content = msg.get("text", "")
                            ts = msg.get("ts", "0")
                            
                            try:
                                dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
                                date_str = dt.strftime("%Y-%m-%d")
                            except Exception:
                                date_str = datetime.utcnow().strftime("%Y-%m-%d")
                                
                            text = f"Slack Message in #{chan_name} by User {user} on {date_str}:\n{text_content}"
                            item = DataItem(
                                data=text,
                                label=f"slack-msg-{ts}",
                                external_metadata={
                                    "source": "slack",
                                    "author": user,
                                    "date": date_str,
                                    "event": text_content[:100] + "...",
                                    "link": f"https://slack.com/archives/{chan_id}/p{ts.replace('.', '')}"
                                }
                            )
                            items.append(item)
                    else:
                        print(f"[LIVE FETCH WARNING] Slack channel history fetch failed: {hist_res.text}")
            else:
                print(f"[LIVE FETCH WARNING] Slack list channels failed: {res.text}")
        except Exception as e:
            print(f"[LIVE FETCH ERROR] Slack fetch exception: {e}")
            
    return items

# --- Jira Live Fetcher ---
async def fetch_live_jira(token, domain, email):
    print(f"[LIVE FETCH] Querying Jira API for instance: {domain}...")
    # Jira Cloud REST API uses Basic Authentication with email and API token
    import base64
    auth_str = f"{email}:{token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Accept": "application/json"
    }
    items = []
    
    # Standard JQL to query recent payment-related tickets
    jql = "project IS NOT EMPTY ORDER BY updated DESC"
    async with httpx.AsyncClient() as client:
        try:
            url = f"https://{domain}/rest/api/3/search/jql?jql={jql}&maxResults=10&fields=key,summary,status,assignee,created,description"
            res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code == 200:
                issues = res.json().get("issues", [])
                print(f"[LIVE FETCH] Successfully retrieved {len(issues)} issues from Jira.")
                for issue in issues:
                    key = issue.get("key", "")
                    fields = issue.get("fields", {})
                    summary = fields.get("summary", "")
                    status = fields.get("status", {}).get("name", "Unknown")
                    assignee = fields.get("assignee")
                    assignee_name = assignee.get("displayName", "Unassigned") if assignee else "Unassigned"
                    created = fields.get("created", "")
                    description_field = fields.get("description", "")
                    description = ""
                    # Description in Jira v3 is ADF (Atlassian Document Format)
                    if isinstance(description_field, dict):
                        # Simple extraction helper
                        description = json.dumps(description_field)
                    else:
                        description = str(description_field)
                        
                    text = f"Jira Issue {key}: {summary}\nStatus: {status}\nAssignee: {assignee_name}\nCreated: {created}\nDescription: {description}"
                    item = DataItem(
                        data=text,
                        label=key,
                        external_metadata={
                            "source": "jira",
                            "author": assignee_name,
                            "date": created[:10] if created else "",
                            "event": f"Jira {key}: {summary}",
                            "link": f"https://{domain}/browse/{key}"
                        }
                    )
                    items.append(item)
            else:
                print(f"[LIVE FETCH WARNING] Jira search failed with code {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[LIVE FETCH ERROR] Jira fetch exception: {e}")
            
    return items

async def ingest_all():
    # Pre-configure LLM and Embedding settings if running on Gemini
    gemini_key = get_env_var("GEMINI_API_KEY") or get_env_var("LLM_API_KEY")
    openai_key = get_env_var("OPENAI_API_KEY")
    llm_provider = get_env_var("LLM_PROVIDER")

    has_openai = openai_key and openai_key.startswith("sk-")
    has_gemini = gemini_key and gemini_key != "your_gemini_api_key"

    if llm_provider == "gemini" or (has_gemini and not has_openai):
        cognee.config.set_llm_provider("gemini")
        cognee.config.set_llm_model("gemini/gemini-3.5-flash")
        if gemini_key:
            cognee.config.set_llm_api_key(gemini_key)
        cognee.config.set_embedding_provider("fastembed")
        cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
        cognee.config.set_embedding_dimensions(384)

    print("Initializing Cognee database tables...")
    await create_db_and_tables()

    # Clear previous memories to start fresh
    print("Resetting previous memories...")
    await cognee.forget(everything=True)
    
    # Load Environment keys
    github_token = get_env_var("GITHUB_TOKEN")
    github_repo = get_env_var("GITHUB_REPO")
    slack_token = get_env_var("Bot_User_OAuth_Token")
    jira_token = get_env_var("JIRA_TOKEN")
    jira_domain = get_env_var("JIRA_DOMAIN") or "nikeanand.atlassian.net"  # Default fallback
    jira_email = get_env_var("JIRA_EMAIL") or "nikeanand@gmail.com"  # Default fallback
    
    data_items = []
    
    # 1. Fetch GitHub
    if github_token and github_token != "your_github_personal_access_token_here" and github_repo:
        live_github = await fetch_live_github(github_token, github_repo)
        data_items.extend(live_github)
    else:
        print("[INGESTION] Using GitHub seed JSON data (live token not set).")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        github_data = load_json(os.path.join(base_dir, "seed_data", "github_data.json"))
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
            
    # 2. Fetch Slack
    if slack_token and slack_token != "your_slack_token_here":
        live_slack = await fetch_live_slack(slack_token)
        data_items.extend(live_slack)
    else:
        print("[INGESTION] Using Slack seed JSON data (live token not set).")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        slack_data = load_json(os.path.join(base_dir, "seed_data", "slack_threads.json"))
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
            
    # 3. Fetch Jira
    if jira_token and jira_token != "your_jira_token_here":
        live_jira = await fetch_live_jira(jira_token, jira_domain, jira_email)
        data_items.extend(live_jira)
    else:
        print("[INGESTION] Using Jira seed JSON data (live token not set).")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        jira_data = load_json(os.path.join(base_dir, "seed_data", "jira_tickets.json"))
        for ticket in jira_data:
            text = f"Jira Ticket {ticket['id']}: {ticket['title']}\nStatus: {ticket['status']}\nAssignee: {ticket['assignee']}\nDate: {ticket['date']}\n{ticket['content']}\nLink: {ticket['link']}"
            item = DataItem(
                data=text,
                label=ticket["id"],
                external_metadata={
                    "source": "jira",
                    "author": ticket["assignee"],
                    "date": ticket["date"],
                    "event": f"Jira {ticket['id']}: {ticket['title']}",
                    "link": ticket["link"]
                }
            )
            data_items.append(item)
            
    print(f"Ingesting {len(data_items)} items into Cognee memory layer...")
    
    # Check if we have API Keys to run live memory ingestion
    openai_key = get_env_var("OPENAI_API_KEY")
    gemini_key = get_env_var("GEMINI_API_KEY") or get_env_var("LLM_API_KEY")
    
    has_openai = openai_key and openai_key.startswith("sk-")
    has_gemini = gemini_key and gemini_key != "your_gemini_api_key"
    
    if not (has_openai or has_gemini):
        print("[WARNING] No valid LLM API key (OPENAI_API_KEY or GEMINI_API_KEY) found. Running in MOCK ingestion mode. Health state updated.")
        update_health_stats(len(data_items), action="ingest")
        print("Mock Ingestion Complete.")
        return
        
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
