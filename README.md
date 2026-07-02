# Corporate Ghost 👻

An incident-memory agent that fixes organizational amnesia for engineering teams by ingesting Slack threads, GitHub commits/PRs, and Jira tickets into Cognee's hybrid graph-vector memory layer.

When engineers leave or time passes, the reasoning behind past technical decisions disappears. This application helps new engineers ask questions like *"why did we deprecate X"* and receive a graph-backed answer showing the timeline of people, decisions, and outcomes involved.

---

## 🛠 Project Structure

The project is structured into 3 parallel modules:

1. **[/ingestion](file:///c:/D/Projects/HangOver/ingestion/)**: Python script and seed dataset. Loads mock conversations and files, structures them into `DataItem` entities with metadata tracking, and runs `cognee.remember()` and `cognee.improve()`.
2. **[/api](file:///c:/D/Projects/HangOver/api/)**: FastAPI application exposing `/api/ask` (decision graph query), `/api/forget` (scrub memories), `/api/health` (memory metrics), and `/api/ingest` (trigger pipeline).
3. **[/frontend](file:///c:/D/Projects/HangOver/frontend/)**: React (Vite) client leveraging TailwindCSS to render an interactive decision timeline, summary panel, and memory metrics panel.

---

## 🚀 Getting Started

### Prerequisites

Create a `.env` file in the root workspace directory with your OpenAI credentials if you want to run live graph generation:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```
> [!NOTE]
> If no `OPENAI_API_KEY` is configured, Corporate Ghost automatically defaults to a **Client Mock Mode**, returning the coherent payment gateway deprecation story. This ensures a flawless live demo immediately without API configurations.

### Running Locally (Recommended)

Bootstrap scripts handle virtual environments, python packages, node packages, database initializations, seed ingestion, and server launches in one command:

* **Windows (PowerShell)**:
  ```powershell
  .\run.ps1
  ```
* **macOS / Linux (Bash)**:
  ```bash
  chmod +x run.sh
  ./run.sh
  ```

### Running with Docker Compose

Alternatively, start isolated containers:
```bash
docker-compose up --build
```

Access:
* **Frontend UI**: `http://localhost:5173`
* **FastAPI Backend**: `http://localhost:8000`

---

## 📚 Seed Data Story (Stripe v1 Deprecation)

The seed data files in `ingestion/seed_data/` simulate an engineering timeline across 2023-2024:

1. **Slack (2023-04-12)**: Alice (SRE) flags rate limit warnings and PCI issues on Stripe v1 capture calls.
2. **Jira (2023-05-02)**: JIRA-402 is created to track deprecating Stripe v1 and migrating to Adyen.
3. **GitHub (2023-10-15)**: PR-1145 is merged integrating Adyen SDK and marking StripeClient as deprecated.
4. **Slack (2024-01-15)**: Bob resolves an Adyen webhook bug (commit `a8f9c2d`) and disables Stripe v1 in production.
5. **GitHub (2024-02-28)**: PR-1290 deletes the Stripe v1 codebase completely.

By asking *"why did we deprecate Stripe v1?"* in the UI chat box, Corporate Ghost traverses these incidents to reconstruct the decision graph.
