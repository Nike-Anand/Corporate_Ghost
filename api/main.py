import os
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Stub responses matching the payment gateway deprecation story
MOCK_RESPONSE = AskResponse(
    summary="We deprecated the Stripe v1 payment gateway client because it suffered from rate-limiting errors on international retries and failed to satisfy PCI-DSS compliance requirements from our security audit. We migrated to Adyen to resolve these issues, routing all traffic successfully by Q1 2024 and subsequently removing the deprecated Stripe v1 code from our codebase.",
    timeline=[
      TimelineEvent(
        source="slack",
        author="Alice (Senior SRE)",
        date="2023-04-12",
        event="Flagged rate-limit spikes on Stripe v1 capture calls and suggested Jira ticket for deprecation due to PCI compliance issues.",
        link="https://company.slack.com/archives/C12345/p1681283600"
      ),
      TimelineEvent(
        source="jira",
        author="Charlie (Backend Engineer)",
        date="2023-05-02",
        event="Created JIRA-402 to track deprecating Stripe v1 and migrating to Adyen. Targeted completion in Q1 2024.",
        link="https://company.atlassian.net/browse/JIRA-402"
      ),
      TimelineEvent(
        source="github",
        author="Charlie (Backend Engineer)",
        date="2023-10-15",
        event="Merged PR-1145 integrating Adyen SDK, marking StripeClient as @deprecated, and gating traffic via feature flags.",
        link="https://github.com/company/repo/pull/1145"
      ),
      TimelineEvent(
        source="slack",
        author="Bob (Lead Architect)",
        date="2024-01-15",
        event="Resolved Adyen webhook verification bug (commit a8f9c2d) and officially disabled Stripe v1 in production.",
        link="https://company.slack.com/archives/C67890/p1705312000"
      ),
      TimelineEvent(
        source="github",
        author="Charlie (Backend Engineer)",
        date="2024-02-28",
        event="Merged PR-1290 removing all legacy Stripe v1 codebase files and clean up database tables.",
        link="https://github.com/company/repo/pull/1290"
      )
    ],
    relatedDecisions=[
      DecisionRelation(
        title="Migration from Stripe v1 to Adyen Gateway",
        context="Stripe v1 API was rate-limiting international retries and failing security audits.",
        outcome="Migrated to Adyen gateway. Improved transaction reliability and satisfied PCI-DSS standards."
      ),
      DecisionRelation(
        title="Webhook Verification Hotfix",
        context="Adyen webhook verification was using Stripe signing credentials after switchover.",
        outcome="Updated webhook configuration to utilize Adyen credentials in commit a8f9c2d."
      )
    ]
)

@app.post("/api/ask", response_model=AskResponse)
async def ask(payload: AskRequest):
    """
    Query Corporate Ghost incident memory graph.
    Returns a unified decision timeline, summary, and related decisions.
    """
    # Stub implementation: returns mock timeline if query matches payment gateway context
    q = payload.query.lower()
    if "stripe" in q or "adyen" in q or "deprecate" in q or "payment" in q:
        return MOCK_RESPONSE
    
    return AskResponse(
        summary="No specific memory context found. Try asking about Stripe or Adyen payment deprecation.",
        timeline=[],
        relatedDecisions=[]
    )

@app.post("/api/forget")
async def forget():
    """
    Scrub memory database for deprecated systems.
    """
    # Stub: Update forget timestamp in memory health state
    return {"message": "Memory successfully scrubbed."}

@app.get("/api/health", response_model=HealthResponse)
async def health():
    """
    Retrieve current memory health statistics.
    """
    # Stub: Return demo health values
    return HealthResponse(
        total_items_remembered=6,
        last_improved_at=datetime.utcnow().isoformat(),
        last_forgot_at=None
    )

@app.post("/api/ingest")
async def ingest():
    """
    Trigger memory ingestion and improvement.
    """
    # Stub: Trigger memory ingestion pipeline
    return {"message": "Ingestion triggered successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
