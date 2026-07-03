import React, { useState, useEffect, useRef } from "react"; 
import {
  MessageSquare, GitPullRequest, CheckSquare, Trash2, RefreshCw,
  Send, ExternalLink, Ghost, X, Brain, ArrowRight, Play, Zap, 
  ChevronRight, Layers, Clock, Database, Sparkles, Activity, 
  Shield, CircleDot, Search, Filter, Download, Plus, Check, Link2, AlertTriangle, Network,
  Users, UserPlus, ShieldAlert
} from "lucide-react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MOCK DATA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const MOCK = {
  summary:
    "Stripe v1 was deprecated due to rate-limiting on international retries and PCI-DSS compliance failures. The team migrated to Adyen, completing the rollout by Q1 2024.",
  timeline: [
    { id: "n1", source: "slack", author: "Alice", role: "Senior SRE", date: "2023-04-12",
      event: "Flagged rate-limit spikes on Stripe v1 capture calls. Opened discussion on PCI compliance.",
      details: "Production logs showed HTTP 429 spikes during peak hours. PCI-DSS failing because raw card data occasionally logged by Stripe v1 SDK.",
      link: "#", relation: "reports", improved: false },
    { id: "n2", source: "jira", author: "Charlie", role: "Backend Engineer", date: "2023-05-02",
      event: "Created JIRA-402 — deprecate Stripe v1, migrate to Adyen. Target: Q1 2024.",
      details: "Epic assigned to backend team. Tracks deprecation milestone, feature flag gates, and API schema mapping.",
      link: "#", relation: "tracks", improved: false },
    { id: "n3", source: "github", author: "Charlie", role: "Backend Engineer", date: "2023-10-15",
      event: "Merged PR #1145 — Adyen SDK integration, StripeClient marked @deprecated.",
      details: "Integrates Adyen payments client, adds feature flag config, marks StripeClient methods deprecated with a sunset date.",
      link: "#", relation: "implements", improved: false },
    { id: "n4", source: "slack", author: "Bob", role: "Lead Architect", date: "2024-01-15",
      event: "Hotfixed Adyen webhook verification. Stripe v1 officially disabled in prod.",
      details: "Commit a8f9c2d fixes Adyen webhook signing. All traffic switched to 100% Adyen. Stripe API keys rotated.",
      link: "#", relation: "resolves", improved: false },
    { id: "n5", source: "github", author: "Charlie", role: "Backend Engineer", date: "2024-02-28",
      event: "PR #1290 — removed all legacy Stripe v1 code and database tables.",
      details: "Deletes StripeClient.py, removes config keys, scrubs legacy database tables. JIRA-402 closed as Done.",
      link: "#", relation: "deletes", improved: false },
  ],
  relatedDecisions: [
    { title: "Stripe → Adyen migration", context: "Stripe v1 API was rate-limiting international retries and failing security audits.", outcome: "Improved reliability and PCI-DSS compliance." },
    { title: "Webhook signing hotfix", context: "Adyen webhook verification was using Stripe signing credentials after switchover.", outcome: "Corrected credential mismatch after switchover." },
  ],
};

const API = "http://localhost:8000/api";

const SCAN_LINES = [
  "cognee.recall(query, dataset='corporate_ghost')",
  "→ Semantic search: vector similarity = 0.94",
  "→ Graph traversal: 5 nodes, 4 edges, 2 hops",
  "→ Ontology match: StripeDeprecation → AdyenMigration",
  "→ Chronological reorder by metadata.date",
  "✓ Response assembled (342ms)",
];

const SRC = {
  slack:  { icon: MessageSquare,  color: "#06b6d4", label: "Slack",  bg: "bg-cyan-500/10",    border: "border-cyan-500/30",   text: "text-cyan-400",   dot: "bg-cyan-400" },
  github: { icon: GitPullRequest, color: "#a855f7", label: "GitHub", bg: "bg-violet-500/10",  border: "border-violet-500/30", text: "text-violet-400", dot: "bg-violet-400" },
  jira:   { icon: CheckSquare,    color: "#10b981", label: "Jira",   bg: "bg-emerald-500/10", border: "border-emerald-500/30",text: "text-emerald-400",dot: "bg-emerald-400" },
  notion: { icon: Layers,         color: "#f59e0b", label: "Notion", bg: "bg-amber-500/10",   border: "border-amber-500/30",  text: "text-amber-400",  dot: "bg-amber-400" },
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   APP
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function App() {
  // Query & Data State
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Graph State
  const [view, setView] = useState("flow");
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [nodesVisible, setNodesVisible] = useState(0);
  const [dissolving, setDissolving] = useState(false);
  const logRef = useRef(null);

  // New Features State
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [liveEvents, setLiveEvents] = useState([
    { id: 1, type: "slack", text: "Indexing thread in #engineering-backend", time: new Date(Date.now() - 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
    { id: 2, type: "jira", text: "Parsing JIRA-824 epic", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [integrations, setIntegrations] = useState({ slack: true, jira: true, github: true, notion: false });
  const [syncing, setSyncing] = useState(null);
  const [filterSrc, setFilterSrc] = useState({ slack: true, jira: true, github: true });
  const [searchNode, setSearchNode] = useState("");
  const [improveText, setImproveText] = useState("");
  const [improving, setImproving] = useState(false);
  const [activeTab, setActiveTab] = useState("graph"); // "graph" or "insights"

  // Team & Approval State
  const [currentRoute, setCurrentRoute] = useState("dashboard"); // "dashboard" or "team"
  const [scrubStatus, setScrubStatus] = useState("idle"); // "idle", "pending", "approved"
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Alice Chen", role: "Head of Engineering", email: "alice@corp.com", avatar: "AC" },
    { id: 2, name: "Marcus Johnson", role: "Senior SRE", email: "marcus@corp.com", avatar: "MJ" },
    { id: 3, name: "Sarah Smith", role: "Product Manager", email: "sarah@corp.com", avatar: "SS" }
  ]);

  const [appView, setAppView] = useState("landing"); // "landing", "auth", "app"
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [health, setHealth] = useState({
    total_items_remembered: 6,
    last_improved_at: new Date().toISOString(),
    last_forgot_at: null,
    recently_forgotten: [],
    lifecycle: { remember: true, improve: true, recall: false, forget: false },
  });

  const [landingTab, setLandingTab] = useState("docs"); // "docs", "features", "api"
  const [activeSection, setActiveSection] = useState("intro");

  useEffect(() => {
    if (appView !== "landing") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    
    const sections = ["intro", "quickstart", "architecture", "graph", "lifecycle", "scrubbing"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [appView]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetch(`${API}/health`).then(r => r.ok && r.json()).then(d => {
      if (d) setHealth(prev => ({ ...prev, ...d }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (appView !== "app") return;
    const MOCK_EVENTS = [
      { type: "slack", text: "Indexing thread in #engineering" },
      { type: "jira", text: "Parsing JIRA-824 epic" },
      { type: "github", text: "Ingesting commit d3f9a1" },
      { type: "slack", text: "Mapping user 'Alice' to nodes" },
      { type: "github", text: "Extracting diff for PR #1145" }
    ];
    const id = setInterval(() => {
      setLiveEvents(prev => {
        const nextEvent = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
        const next = [...prev, { id: Date.now(), ...nextEvent, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }];
        if (next.length > 5) next.shift();
        return next;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [appView]);

  /* ── mouse parallax tracking ── */
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30; // -15 to 15
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      document.documentElement.style.setProperty('--mouse-x', `${x}px`);
      document.documentElement.style.setProperty('--mouse-y', `${y}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  /* ── animate nodes appearing ── */
  useEffect(() => {
    if (data?.timeline?.length && !dissolving) {
      setNodesVisible(0);
      const total = data.timeline.length;
      let i = 0;
      const id = setInterval(() => {
        i++;
        setNodesVisible(i);
        if (i >= total) clearInterval(id);
      }, 150);
      return () => clearInterval(id);
    }
  }, [data, dissolving]);

  /* ── actions ── */
  const ask = async (q) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true); setSelected(null); setLogs([]); setDissolving(false); setActiveTab("graph");

    let i = 0;
    const id = setInterval(() => {
      if (i < SCAN_LINES.length) {
        const line = SCAN_LINES[i];
        setLogs(p => [...p, line]);
        i++;
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      } else clearInterval(id);
    }, 200);

    try {
      const r = await fetch(`${API}/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      await new Promise(ok => setTimeout(ok, 1200));
      if (r.ok) {
        const json = await r.json();
        setData({
          ...json,
          timeline: (json.timeline || []).map((t, i) => ({
            ...t,
            id: `n${i+1}`,
            role: t.author.includes("(") ? t.author.split("(")[1].replace(")", "").trim() : "",
            author: t.author.split(" ")[0],
            details: t.event,
            event: t.event.split(".")[0],
            relation: "relates to",
            improved: false
          }))
        });
      } else {
        setData(JSON.parse(JSON.stringify(MOCK)));
      }
    } catch {
      await new Promise(ok => setTimeout(ok, 1200));
      setData(text.toLowerCase().match(/stripe|adyen|deprecat|payment|why/) ? JSON.parse(JSON.stringify(MOCK))
        : { summary: `No timeline found for "${text}". Try the pre-loaded demo query.`, timeline: [], relatedDecisions: [] });
    }
    clearInterval(id);
    setHealth(prev => ({ ...prev, lifecycle: { ...prev.lifecycle, recall: true } }));
    setLoading(false);
  };

  const toggleSync = async (key) => {
    setSyncing(key);
    
    if (!integrations[key]) {
      // Connecting: Trigger real backend ingestion
      try {
        await fetch(`${API}/ingest`, { method: "POST" });
        const hr = await fetch(`${API}/health`);
        if (hr.ok) {
          const hd = await hr.json();
          setHealth(prev => ({ ...prev, ...hd, lifecycle: { ...prev.lifecycle, remember: true } }));
        }
      } catch (e) {
        console.error("Ingestion failed:", e);
        // Fallback for hackathon demo if backend is offline
        await new Promise(ok => setTimeout(ok, 1500));
        setHealth(prev => ({ ...prev, total_items_remembered: prev.total_items_remembered + 14, lifecycle: { ...prev.lifecycle, remember: true } }));
      }
    } else {
      // Disconnecting: Just simulate a delay
      await new Promise(ok => setTimeout(ok, 800));
    }
    
    setIntegrations(p => ({ ...p, [key]: !p[key] }));
    setSyncing(null);
  };

  const forget = async () => {
    if (scrubStatus === "idle") {
      setScrubStatus("pending");
      await new Promise(ok => setTimeout(ok, 3000));
      setScrubStatus("approved");
      return;
    }
    
    // Proceed with scrub if approved
    setScrubStatus("idle");
    setSelected(null);
    setDissolving(true);
    await new Promise(ok => setTimeout(ok, 2000));
    try { await fetch(`${API}/forget`, { method: "POST" }); } catch {}
    setHealth({
      total_items_remembered: 0, last_improved_at: null,
      last_forgot_at: new Date().toISOString(),
      recently_forgotten: ["stripe_v1_client.py", "JIRA-402 epic", "Adyen webhook creds"],
      lifecycle: { remember: false, improve: false, recall: false, forget: true },
    });
    setData({ summary: "Memory scrubbed. All nodes have been permanently forgotten.", timeline: [], decisions: [] });
    setDissolving(false);
  };

  const handleImprove = async () => {
    if (!improveText.trim() || selected === null) return;
    setImproving(true);
    await new Promise(ok => setTimeout(ok, 1000)); // mock network
    
    // Update local data
    const newData = { ...data };
    newData.timeline[selected].improved = true;
    newData.timeline[selected].human_context = improveText;
    setData(newData);
    setImproveText("");
    setImproving(false);
    
    // Update health panel
    setHealth(prev => ({ 
      ...prev, 
      last_improved_at: new Date().toISOString(),
      lifecycle: { ...prev.lifecycle, improve: true }
    }));
  };

  const exportTimeline = () => {
    const text = `# Corporate Ghost Timeline Export\n\n## Summary\n${data.summary}\n\n## Events\n` + 
      data.timeline.map(t => `- [${t.date}] ${t.author} (${t.source}): ${t.event}${t.human_context ? `\n  > Human Context: ${t.human_context}` : ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline_export.md';
    a.click();
  };

  /* Graph Data Filtering */
  const rawTl = data?.timeline || [];
  const tl = rawTl.filter(ev => {
    if (!filterSrc[ev.source]) return false;
    if (searchNode && !ev.event.toLowerCase().includes(searchNode.toLowerCase()) && 
        !ev.author.toLowerCase().includes(searchNode.toLowerCase())) return false;
    return true;
  });

  const sel = selected !== null ? tl[selected] : null;

  /* node positions */
  const flowPos = [{ x: 100, y: 170 },{ x: 285, y: 170 },{ x: 470, y: 170 },{ x: 655, y: 170 },{ x: 840, y: 170 }];
  const netPos  = [{ x: 150, y: 90 },{ x: 170, y: 270 },{ x: 730, y: 90 },{ x: 710, y: 270 },{ x: 440, y: 55 }];
  const pos = (i) => (view === "flow" ? flowPos : netPos)[i] || { x: 100 + i * 185, y: 170 };

  /* ━━━━━━ RENDER ━━━━━━ */
  if (appView === "landing") {
    return (
      <div className="min-h-screen flex flex-col relative text-zinc-200">
        <div className="ambient-mesh" />
        <div className="noise-overlay" />
        
        {/* Landing Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/70 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-zinc-700/50 flex items-center justify-center">
                <Ghost className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-[15px] font-bold tracking-tight text-zinc-100">Corporate Ghost</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <button onClick={() => setLandingTab("docs")} className={`transition-colors ${landingTab === "docs" ? "text-cyan-400" : "hover:text-zinc-200"}`}>Documentation</button>
              <button onClick={() => setLandingTab("features")} className={`transition-colors ${landingTab === "features" ? "text-cyan-400" : "hover:text-zinc-200"}`}>Features</button>
              <button onClick={() => setLandingTab("api")} className={`transition-colors ${landingTab === "api" ? "text-cyan-400" : "hover:text-zinc-200"}`}>API</button>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => setAppView("auth")} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
                Login
              </button>
              <button onClick={() => setAppView("auth")} className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors">
                Register
              </button>
            </div>
          </div>
        </header>
        {landingTab === "docs" && (
          <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-12 relative z-10">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col gap-8 text-sm sticky top-24 h-max">
            <div>
              <h4 className="font-semibold text-zinc-100 mb-3">Getting Started</h4>
              <ul className="space-y-2.5 text-zinc-500">
                <li onClick={() => scrollToSection("intro")} className={`cursor-pointer transition-colors ${activeSection === "intro" ? "text-cyan-400 font-medium" : "hover:text-zinc-300"}`}>Introduction</li>
                <li onClick={() => scrollToSection("quickstart")} className={`cursor-pointer transition-colors ${activeSection === "quickstart" ? "text-cyan-400 font-medium" : "hover:text-zinc-300"}`}>Quickstart Guide</li>
                <li onClick={() => scrollToSection("architecture")} className={`cursor-pointer transition-colors ${activeSection === "architecture" ? "text-cyan-400 font-medium" : "hover:text-zinc-300"}`}>Architecture</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-100 mb-3">Core Concepts</h4>
              <ul className="space-y-2.5 text-zinc-500">
                <li onClick={() => scrollToSection("graph")} className={`cursor-pointer transition-colors ${activeSection === "graph" ? "text-cyan-400 font-medium" : "hover:text-zinc-300"}`}>The Memory Graph</li>
                <li onClick={() => scrollToSection("lifecycle")} className={`cursor-pointer transition-colors ${activeSection === "lifecycle" ? "text-cyan-400 font-medium" : "hover:text-zinc-300"}`}>Lifecycle Methods</li>
                <li onClick={() => scrollToSection("scrubbing")} className={`cursor-pointer transition-colors ${activeSection === "scrubbing" ? "text-cyan-400 font-medium" : "hover:text-zinc-300"}`}>Scrubbing Policies</li>
              </ul>
            </div>

          {/* Live Events Ticker */}
          <div className="card p-5 animate-fade-up border-violet-500/10">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-violet-400 animate-pulse" />
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Live Ingestion</h2>
            </div>
            <div className="space-y-3">
              {liveEvents.length > 0 ? liveEvents.map(ev => (
                <div key={ev.id} className="animate-fade-up text-[10px] text-zinc-500">
                  <div className="flex justify-between items-center mb-1">
                    <span className="uppercase tracking-widest text-violet-400/80 font-bold">{ev.type}</span>
                    <span className="mono opacity-60">{ev.time}</span>
                  </div>
                  <div className="text-zinc-300 leading-snug">{ev.text}</div>
                </div>
              )) : (
                <div className="text-[10px] text-zinc-600 italic">Waiting for events...</div>
              )}
            </div>
          </div>

        </aside>

          {/* Main Doc Content */}
          <main className="animate-fade-up parallax-card">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" /> v2.0 is now live
            </div>
            
            {/* 1. Introduction */}
            <section id="intro" className="mb-16 pt-4">
              <h1 className="text-4xl font-bold text-zinc-100 tracking-tight mb-4">
                Introduction
              </h1>
              <p className="text-lg text-zinc-400 mb-6 leading-relaxed max-w-2xl">
                Welcome to Corporate Ghost. Stop losing context when senior engineers leave. Corporate Ghost silently indexes your Slack, Jira, and GitHub into a unified graph-vector layer, providing permanent institutional memory.
              </p>
              <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex gap-3">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100">Pro Tip:</strong> You can query the memory graph natively from your IDE or Slack using the <code className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-cyan-400 text-xs font-mono">cognee.recall()</code> method.
                </p>
              </div>
            </section>
            
            {/* 2. Quickstart Guide */}
            <section id="quickstart" className="mb-16 pt-4">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">Quickstart Guide</h2>
              <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                Corporate Ghost hooks into your existing toolchain. Simply import the memory engine and configure your ingestion sources.
              </p>
              <div className="card p-6 border-zinc-800/80 bg-zinc-900/50">
                <pre className="font-mono text-sm text-zinc-300 overflow-x-auto">
                  <code className="text-violet-400">import</code> {"{ memory }"} <code className="text-violet-400">from</code> <code className="text-emerald-400">"corporate-ghost"</code>;<br/><br/>
                  <code className="text-zinc-500">// 1. Index daily operations automatically</code><br/>
                  memory.<code className="text-cyan-400">remember</code>(slackThreads, jiraEpics, gitCommits);<br/><br/>
                  <code className="text-zinc-500">// 2. Query context across time and teams</code><br/>
                  <code className="text-violet-400">const</code> context = <code className="text-violet-400">await</code> memory.<code className="text-cyan-400">recall</code>(<code className="text-emerald-400">"Why did we deprecate Stripe v1?"</code>);<br/>
                </pre>
              </div>
            </section>

            {/* 3. Architecture */}
            <section id="architecture" className="mb-16 pt-4">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">Architecture</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Corporate Ghost utilizes a robust ingestion ecosystem. It extracts decisions from Slack threads, maps Jira Epics to tasks, and links GitHub commits directly to conversational context.
              </p>
              <ul className="space-y-4 text-sm text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div>
                    <strong className="text-zinc-100 block mb-1">Slack Integration</strong>
                    Extracts decisions from threads, identifying key technical pivot points.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CircleDot className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <strong className="text-zinc-100 block mb-1">Jira Tracking</strong>
                    Maps Epics to individual tasks, tracing the lineage of feature deprecations.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-700/30 border border-zinc-600/50 flex items-center justify-center shrink-0 mt-0.5">
                    <GitPullRequest className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <div>
                    <strong className="text-zinc-100 block mb-1">GitHub Commits</strong>
                    Links actual codebase changes directly to the conversational context.
                  </div>
                </li>
              </ul>
            </section>

            {/* 4. The Memory Graph */}
            <section id="graph" className="mb-16 pt-4">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">The Memory Graph</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Standard RAG fails in enterprise environments because flat PDFs lose the fluid relationships between people, tickets, and code. Corporate Ghost solves this by utilizing a dual-engine approach:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-inset p-5 border border-zinc-800/50">
                  <Database className="w-5 h-5 text-cyan-400 mb-3" />
                  <h4 className="font-semibold text-zinc-200 mb-2">Vector Embeddings</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">Semantic search enables natural language querying. Finding answers without knowing exact keywords.</p>
                </div>
                <div className="card-inset p-5 border border-zinc-800/50">
                  <Network className="w-5 h-5 text-violet-400 mb-3" />
                  <h4 className="font-semibold text-zinc-200 mb-2">Knowledge Graph</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">Nodes and edges connect GitHub PRs directly to the Jira tickets and Slack threads that spawned them.</p>
                </div>
              </div>
            </section>
            
            {/* 5. Lifecycle Methods */}
            <section id="lifecycle" className="mb-16 pt-4">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">Lifecycle Methods</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                The Cognee engine manages memory through four core lifecycle methods:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/40">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="mono text-xs text-cyan-400 font-medium">remember()</div>
                    <div className="text-xs text-zinc-500">Indexes new data into the graph.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/40">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <div className="mono text-xs text-violet-400 font-medium">improve()</div>
                    <div className="text-xs text-zinc-500">Refines relationships and adds human context.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/40">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="mono text-xs text-emerald-400 font-medium">recall()</div>
                    <div className="text-xs text-zinc-500">Queries the memory graph to reconstruct timelines.</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Scrubbing Policies */}
            <section id="scrubbing" className="mb-8 pt-4">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">Scrubbing Policies</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Enterprise data is sensitive. The <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-red-400">forget()</code> API provides a hard-delete mechanism to comply with data retention policies, requiring approval from the Head of Engineering.
              </p>
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <strong className="text-red-400 block mb-1">Destructive Action Warning</strong>
                  Calling forget() completely wipes the vector index and destroys the underlying graph nodes for the specified context window. This cannot be undone.
                </p>
              </div>
            </section>
          </main>
        </div>
        )}

        {landingTab === "features" && (
          <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 relative z-10 animate-fade-up">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 tracking-tight mb-6">Enterprise-Grade Memory</h1>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Built to securely index and recall your organization's entire technical history without lifting a finger.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-8 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6">
                  <Database className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-3">Auto-Indexing</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Simply connect your data sources and let Corporate Ghost build the knowledge graph in the background.</p>
              </div>
              <div className="card p-8 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6">
                  <Search className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-3">Semantic Search</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Search through thousands of decisions and commits using natural language, powered by advanced vector embeddings.</p>
              </div>
              <div className="card p-8 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <ShieldAlert className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-3">RBAC Security</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Enterprise-grade role-based access control ensures that sensitive architectural decisions are only visible to authorized personnel.</p>
              </div>
            </div>
          </div>
        )}

        {landingTab === "api" && (
          <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 relative z-10 animate-fade-up">
            <h1 className="text-4xl font-bold text-zinc-100 tracking-tight mb-4">API Reference</h1>
            <p className="text-lg text-zinc-400 mb-12">Integrate the Corporate Ghost engine directly into your CI/CD pipelines or internal tools.</p>
            
            <div className="space-y-8">
              <div className="card p-6 border-zinc-800/80 bg-zinc-900/50">
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">GET</span>
                  <code className="text-zinc-200 font-mono text-sm">/v1/memory/recall</code>
                </div>
                <p className="text-sm text-zinc-400 mb-4">Retrieve contextual nodes from the graph based on a semantic query string.</p>
                <div className="p-4 bg-[#09090b] rounded-lg border border-zinc-800/50 overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-300">
                    <span className="text-zinc-500">curl</span> -X GET "https://api.corpghost.com/v1/memory/recall?q=auth_refactor"<br/>
                    <span className="text-zinc-500">     -H</span> "Authorization: Bearer YOUR_API_KEY"
                  </pre>
                </div>
              </div>

              <div className="card p-6 border-zinc-800/80 bg-zinc-900/50">
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider">POST</span>
                  <code className="text-zinc-200 font-mono text-sm">/v1/memory/ingest</code>
                </div>
                <p className="text-sm text-zinc-400 mb-4">Push custom events (like CI/CD deployment logs) directly into the knowledge graph.</p>
                <div className="p-4 bg-[#09090b] rounded-lg border border-zinc-800/50 overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-300">
                    <span className="text-zinc-500">curl</span> -X POST "https://api.corpghost.com/v1/memory/ingest"<br/>
                    <span className="text-zinc-500">     -H</span> "Content-Type: application/json"<br/>
                    <span className="text-zinc-500">     -d</span> '{`{"source":"github","event":"deployment_failed","context":"OOM on pod"}`}'
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  if (appView === "auth") {
    return (
      <div className="min-h-screen flex items-center justify-center relative text-zinc-200">
        <div className="ambient-mesh" />
        <div className="noise-overlay" />
        <div className="card w-full max-w-md p-10 relative z-10 animate-fade-up flex flex-col items-center parallax-card">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-emerald-500/10 border border-zinc-800 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/5">
            <Ghost className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">Corporate Ghost</h1>
          <p className="text-sm text-zinc-500 mb-8 text-center">Sign in to access the incident memory layer.</p>
          
          <div className="w-full space-y-4 mb-8">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Work Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="name@company.com" 
                className="w-full bg-[#111113] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" 
                onKeyDown={e => e.key === "Enter" && setAppView("app")}
                className="w-full bg-[#111113] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50" />
            </div>
          </div>
          
          <button onClick={() => setAppView("app")}
            className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative text-zinc-200">
      <div className="ambient-mesh" />
      <div className="noise-overlay" />

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-zinc-700/50 flex items-center justify-center relative overflow-hidden">
                <Ghost className="w-4.5 h-4.5 text-cyan-400 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
              </div>
              <div>
                <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Corporate Ghost</span>
                <span className="ml-2 text-[9px] font-semibold tracking-widest uppercase text-zinc-600 bg-zinc-800/80 border border-zinc-700/50 rounded px-1.5 py-0.5">console</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-1 border-l border-zinc-800 pl-8 h-8">
              <button onClick={() => setCurrentRoute("dashboard")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentRoute === "dashboard" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Dashboard</button>
              <button onClick={() => setCurrentRoute("team")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentRoute === "team" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Team</button>
            </div>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-zinc-500 mono">
            <button onClick={() => setShowIntegrations(true)} className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
              <Link2 className="w-3.5 h-3.5" /> integrations
            </button>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.total_items_remembered > 0 ? "bg-emerald-500" : "bg-zinc-600"} animate-glow-pulse`} style={{ color: health.total_items_remembered > 0 ? "#10b981" : "#52525b" }} />
              {health.total_items_remembered} nodes
            </span>
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 relative z-10">
        
        {currentRoute === "dashboard" && (
          <div className="grid grid-cols-[1fr_280px] gap-6">
        
        {/* ── LEFT: Query + Results ── */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && ask()}
                placeholder="Ask about past engineering decisions…"
                className="w-full bg-[#111113] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200
                  placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10" />
            </div>
            <button onClick={() => ask()} disabled={loading}
              className="px-5 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold
                disabled:opacity-30 flex items-center gap-2 shrink-0">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin-ring" /> : <Send className="w-4 h-4" />}
              Ask
            </button>
          </div>

          {/* ── AI SUMMARY ── */}
          {!loading && data?.summary && (
            <div className="card p-5 animate-fade-up border-cyan-500/20 bg-cyan-500/5 shadow-lg shadow-cyan-500/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-3">
                <Sparkles className="w-4 h-4" />
                AI Summary
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{data.summary}</p>
            </div>
          )}

          {/* ── LOADING STATE ── */}
          {loading && (
            <div className="card p-8 flex flex-col items-center min-h-[420px] justify-center animate-fade-up">
              <div className="relative mb-8">
                <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-cyan-500 animate-spin-ring" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-cyan-400/60" />
                </div>
              </div>
              <p className="text-sm font-medium text-zinc-200 mb-1">Scanning memory graph</p>
              <p className="mono text-xs text-zinc-600 mb-8">cognee.recall() in progress…</p>

              <div ref={logRef} className="w-full max-w-lg card-inset p-4 mono text-[11px] space-y-1.5 h-36 overflow-y-auto">
                <div className="text-zinc-600 text-[10px] mb-2">$ cognee-agent --dataset corporate_ghost</div>
                {logs.map((l, i) => (
                  <div key={i} className="animate-fade-up flex items-start gap-2">
                    <span className={l.startsWith("✓") ? "text-emerald-400" : "text-cyan-500/70"}>
                      {l.startsWith("✓") ? "✓" : "→"}
                    </span>
                    <span className={l.startsWith("✓") ? "text-emerald-400/80" : "text-zinc-400"}>
                      {l.startsWith("✓") ? l.slice(2) : l.startsWith("→") ? l.slice(2) : l}
                    </span>
                  </div>
                ))}
                <span className="inline-block w-2 h-4 bg-cyan-400/60 animate-blink ml-3" />
              </div>
            </div>
          )}

          {/* ── GRAPH / INSIGHTS ── */}
          {!loading && data && rawTl.length > 0 && (
            <div className="flex flex-col gap-4 stagger">
              
              {/* Tab Nav */}
              <div className="flex items-center gap-1 border-b border-zinc-800/60 pb-2">
                <button onClick={() => setActiveTab("graph")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "graph" ? "border-cyan-500 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>Decision Graph</button>
                <button onClick={() => setActiveTab("insights")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "insights" ? "border-cyan-500 text-cyan-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>Amnesia Insights</button>
                <div className="flex-1" />
                <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium hover:bg-zinc-800 text-zinc-300 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>

              {activeTab === "graph" ? (
                /* Graph card */
                <div className="card overflow-hidden animate-fade-up">
                  {/* Controls Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-[#111113]">
                    <div className="flex items-center gap-4">
                      {/* Source Filters */}
                      <div className="flex items-center gap-2 border-r border-zinc-800 pr-4">
                        <Filter className="w-3.5 h-3.5 text-zinc-500" />
                        {["slack", "jira", "github"].map(s => (
                          <button key={s} onClick={() => { setSelected(null); setFilterSrc(p => ({...p, [s]: !p[s]})) }}
                            className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-all
                              ${filterSrc[s] ? `${SRC[s].bg} ${SRC[s].text} border ${SRC[s].border}` : "bg-transparent text-zinc-600 border border-transparent hover:bg-zinc-800"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      
                      {/* Search Nodes */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input value={searchNode} onChange={e => { setSelected(null); setSearchNode(e.target.value) }}
                          placeholder="Search nodes..." className="bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50 w-48" />
                      </div>
                    </div>
                    
                    {/* View Toggles */}
                    <div className="flex bg-zinc-900/80 rounded-md p-0.5 text-xs border border-zinc-800/60">
                      {[["flow", "Timeline"], ["network", "Network"]].map(([k, l]) => (
                        <button key={k} onClick={() => { setView(k); setSelected(null); }}
                          className={`px-3 py-1 rounded font-medium ${view === k ? "bg-zinc-800 text-zinc-100 shadow" : "text-zinc-500 hover:text-zinc-300"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="relative min-h-[340px] overflow-x-auto">
                    <div className="w-[940px] h-[340px] relative grid-bg">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* Edges */}
                        {view === "flow" && (<>
                          <polyline points={tl.map((_, i) => `${pos(i).x},${pos(i).y}`).join(" ")} fill="none" stroke="#27272a" strokeWidth="2" />
                          <polyline points={tl.slice(0, nodesVisible).map((_, i) => `${pos(i).x},${pos(i).y}`).join(" ")} fill="none" stroke="#06b6d4" strokeWidth="2" className="animate-flow" strokeOpacity="0.6" />
                          {tl.slice(0, nodesVisible).map((ev, i) => (
                            <text key={i} x={pos(i).x} y={pos(i).y + 55} textAnchor="middle" className="mono" fill="#52525b" fontSize="9">{ev.date}</text>
                          ))}
                        </>)}
                        {view === "network" && tl.map((_, i) => {
                          const pt = pos(i);
                          const active = hovered === i || selected === i;
                          return i < nodesVisible ? (
                            <line key={i} x1={pt.x} y1={pt.y} x2={440} y2={175}
                              stroke={active ? SRC[tl[i].source]?.color || "#06b6d4" : "#27272a"}
                              strokeWidth={active ? 2 : 1.5} opacity={active ? 0.9 : 0.5} className={active ? "animate-flow" : ""} />
                          ) : null;
                        })}
                      </svg>

                      {/* Nodes */}
                      {tl.map((ev, i) => {
                        const pt = pos(i);
                        const src = SRC[ev.source] || SRC.slack;
                        const Icon = src.icon;
                        const active = selected === i;
                        const visible = i < nodesVisible;
                        const isDissolving = dissolving;

                        if (!visible && !isDissolving) return null;

                        return (
                          <div key={ev.id} style={{ left: pt.x, top: pt.y, animationDelay: isDissolving ? `${i * 200}ms` : `${i * 150}ms` }}
                            className={`absolute z-10 cursor-pointer group ${isDissolving ? "animate-dissolve" : "animate-spring-in"}`}
                            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                            onClick={() => !isDissolving && setSelected(i)}>

                            <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-all duration-200 relative
                              ${active ? `bg-zinc-800/90 ${src.border} ring-2 ring-[${src.color}]/20 shadow-lg shadow-[${src.color}]/10` : "bg-[#111113]/95 border-zinc-800/60 group-hover:border-zinc-700 group-hover:bg-zinc-800/60 group-hover:shadow-lg"}`}>
                              
                              {/* Improved Badge */}
                              {ev.improved && (
                                <div className="absolute -top-2 -right-2 bg-violet-500 text-white rounded-full p-0.5 shadow-lg shadow-violet-500/20">
                                  <Sparkles className="w-3 h-3" />
                                </div>
                              )}

                              <div className={`w-8 h-8 rounded-lg ${src.bg} border ${src.border} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${src.text}`} />
                              </div>
                              <div>
                                <div className="text-[12px] font-medium text-zinc-200 leading-tight">{ev.author}</div>
                                <div className="mono text-[10px] text-zinc-500">{src.label}</div>
                              </div>
                            </div>

                            {view === "flow" && i > 0 && (
                              <div className="absolute -left-8 top-1/2 -translate-y-1/2 mono text-[8px] text-zinc-600 bg-zinc-900 border border-zinc-800/60 px-1 py-0.5 rounded">
                                {ev.relation}
                              </div>
                            )}

                            {hovered === i && selected !== i && !isDissolving && (
                              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-60
                                bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] p-3 rounded-xl shadow-2xl pointer-events-none z-20 animate-fade-up leading-relaxed">
                                <p>{ev.event}</p>
                                <div className="mt-2 mono text-[9px] text-zinc-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {ev.date}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {view === "network" && (
                        <div style={{ left: 440, top: 175 }} className="absolute -translate-x-1/2 -translate-y-1/2 z-20 animate-spring-in">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-2 border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
                            <Brain className="w-7 h-7 text-violet-400 animate-glow-pulse" style={{ color: "#a855f7" }} />
                          </div>
                          <div className="mt-2 text-center mono text-[9px] text-violet-400 font-medium">ontology</div>
                        </div>
                      )}
                    </div>

                    {/* ── Detail drawer ── */}
                    {sel && (
                      <div className="absolute top-0 right-0 h-full w-[320px] bg-[#0f0f12] border-l border-zinc-800/80 overflow-y-auto animate-slide-in z-30 flex flex-col shadow-2xl">
                        <div className="p-5 flex-1">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                              {React.createElement(SRC[sel.source]?.icon || CircleDot, { className: `w-4 h-4 ${SRC[sel.source]?.text}` })}
                              <span className={`mono text-[10px] font-semibold uppercase tracking-widest ${SRC[sel.source]?.text || "text-zinc-400"}`}>
                                {sel.source}
                              </span>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-5 text-[13px]">
                            <div>
                              <div className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">Event</div>
                              <p className="text-zinc-300 leading-relaxed text-xs">{sel.event}</p>
                            </div>
                            <div>
                              <div className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">Raw Context</div>
                              <div className="card-inset p-3"><p className="mono text-[10px] text-zinc-500 leading-relaxed">{sel.details}</p></div>
                            </div>
                            
                            {/* Interactive Improve Section */}
                            <div className="pt-2 border-t border-zinc-800/60">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                                <div className="text-violet-400/80 text-[10px] uppercase tracking-wider font-semibold">cognee.improve()</div>
                              </div>
                              
                              {sel.improved ? (
                                <div className="bg-violet-500/10 border border-violet-500/20 p-3 rounded-xl">
                                  <div className="text-[10px] text-violet-400/60 mb-1">Human Context Added:</div>
                                  <p className="text-xs text-violet-100">{sel.human_context}</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <textarea value={improveText} onChange={e => setImproveText(e.target.value)}
                                    placeholder="Add human context to this memory node..."
                                    className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:border-violet-500/50 focus:outline-none resize-none" />
                                  <button onClick={handleImprove} disabled={!improveText.trim() || improving}
                                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                                    {improving ? <RefreshCw className="w-3.5 h-3.5 animate-spin-ring" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    Improve Memory
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Insights Tab */
                <div className="card p-6 min-h-[340px] animate-fade-up">
                  <h3 className="text-lg font-semibold text-zinc-200 mb-6">Amnesia Insights</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="card-inset p-5 border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h4 className="text-sm font-semibold text-amber-400">Orphaned Knowledge</h4>
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">Nodes detected in the graph with 0 incoming or outgoing edges. These represent siloed decisions.</p>
                      <ul className="space-y-2 mono text-[10px] text-zinc-300">
                        <li className="flex gap-2"><span className="text-amber-500">•</span> [Slack] Discussion: "Should we use GraphQL?" (No linked Jira ticket)</li>
                        <li className="flex gap-2"><span className="text-amber-500">•</span> [GitHub] PR #1022 "Add feature flag" (Missing documentation link)</li>
                      </ul>
                    </div>
                    <div className="card-inset p-5 border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Network className="w-4 h-4 text-cyan-500" />
                        <h4 className="text-sm font-semibold text-cyan-400">Context Completeness</h4>
                      </div>
                      <div className="flex items-end gap-3 mb-2">
                        <span className="text-3xl font-bold text-zinc-100">84%</span>
                        <span className="text-xs text-emerald-400 mb-1">+12% this week</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">Percentage of engineering decisions that have a complete lineage (Slack → Jira → GitHub).</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="card px-6 py-5 animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[10px] mono text-zinc-600 uppercase tracking-wider mb-1">Synthesized Answer</div>
                    <p className="text-[13px] text-zinc-300 leading-relaxed">{data.summary}</p>
                  </div>
                </div>
              </div>

              {/* Decisions */}
              {data.relatedDecisions?.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {data.relatedDecisions.map((d, i) => (
                    <div key={i} className="card-glow px-5 py-4 animate-fade-up">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <h4 className="text-[12px] font-semibold text-zinc-200">{d.title}</h4>
                      </div>
                      {d.context && <p className="text-[10px] text-zinc-400 leading-relaxed mb-2 pb-2 border-b border-zinc-800/50">{d.context}</p>}
                      <p className="text-[11px] text-emerald-400/80 leading-relaxed">{d.outcome}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EMPTY / SCRUBBED ── */}
          {!loading && data && rawTl.length === 0 && (
            <div className="card p-12 flex flex-col items-center text-center animate-fade-up">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-200 mb-2">Memory Scrubbed</h2>
              <p className="text-sm text-zinc-500 mb-6 max-w-sm">{data.summary}</p>
              <button onClick={() => setShowIntegrations(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-cyan-300 hover:border-cyan-500/40 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Re-connect Sources
              </button>
            </div>
          )}

          {/* ── WELCOME / ONBOARDING ── */}
          {!data && !loading && (
            <div className="card p-0 overflow-hidden animate-fade-up relative">
              <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative parallax-card">
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-emerald-500/10 border border-zinc-800 flex items-center justify-center">
                    <Ghost className="w-10 h-10 text-cyan-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Activity className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight">Your engineering team's permanent memory</h2>
                <p className="text-sm text-zinc-500 max-w-lg mb-8 leading-relaxed">
                  Ask a question about past decisions and Corporate Ghost reconstructs the full timeline
                  from Slack, Jira, and GitHub — connected through Cognee's knowledge graph.
                </p>

                <button onClick={() => { setQuery("Why did we deprecate Stripe v1?"); ask("Why did we deprecate Stripe v1?"); }}
                  className="px-6 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold flex items-center gap-2.5 shadow-lg shadow-white/5 mb-10">
                  <Play className="w-4 h-4 fill-current" /> Run demo query
                </button>

                <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                  {[
                    { ...SRC.slack, desc: "Thread context & discussions" },
                    { ...SRC.jira, desc: "Tickets, epics & decisions" },
                    { ...SRC.github, desc: "PRs, commits & code changes" },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="card-inset p-4 rounded-xl text-left group hover:border-zinc-700/60 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-md ${s.bg} border ${s.border} flex items-center justify-center`}><Icon className={`w-3 h-3 ${s.text}`} /></div>
                          <span className="text-xs font-medium text-zinc-300">{s.label}</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 leading-relaxed">{s.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: LIFECYCLE & MEMORY ═══ */}
        <aside className="flex flex-col gap-5">

          {/* Cognee Lifecycle */}
          <div className="card p-5 animate-fade-up">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-4 h-4 text-violet-400" />
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Cognee Lifecycle</h2>
            </div>
            <div className="space-y-2">
              {[
                { key: "remember", icon: Database,   label: "remember()",  desc: "Index into graph",         color: "cyan" },
                { key: "improve",  icon: Sparkles,   label: "improve()",   desc: "Refine relationships",     color: "violet" },
                { key: "recall",   icon: Activity,   label: "recall()",    desc: "Query the memory",         color: "emerald" },
                { key: "forget",   icon: Trash2,     label: "forget()",    desc: "Scrub deprecated data",    color: "red" },
              ].map(step => {
                const active = health.lifecycle?.[step.key];
                const colors = {
                  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    text: "text-cyan-400",    dot: "bg-cyan-400" },
                  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-400",  dot: "bg-violet-400" },
                  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
                  red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     dot: "bg-red-400" },
                };
                const c = colors[step.color];
                const Icon = step.icon;
                return (
                  <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${active ? `${c.bg} ${c.border}` : "bg-zinc-900/50 border-zinc-800/40"}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${active ? `${c.bg} border ${c.border}` : "bg-zinc-800/60 border border-zinc-700/40"}`}>
                      <Icon className={`w-3.5 h-3.5 transition-colors ${active ? c.text : "text-zinc-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`mono text-[11px] font-medium ${active ? c.text : "text-zinc-600"}`}>{step.label}</div>
                      <div className="text-[10px] text-zinc-600 truncate">{step.desc}</div>
                    </div>
                    {active && <span className={`w-2 h-2 rounded-full ${c.dot} animate-glow-pulse`} style={{ color: step.color === "cyan" ? "#06b6d4" : step.color === "violet" ? "#a855f7" : step.color === "emerald" ? "#10b981" : "#ef4444" }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Memory Health */}
          <div className="card p-5 animate-fade-up">
            <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">Memory Health</h2>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1.5"><Database className="w-3 h-3" /> Nodes</span>
                <span className="mono font-bold text-zinc-200">{health.total_items_remembered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1.5"><Clock className="w-3 h-3" /> improve()</span>
                <span className="mono text-[11px] text-zinc-400">
                  {health.last_improved_at ? new Date(health.last_improved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-1.5"><Trash2 className="w-3 h-3" /> forget()</span>
                <span className="mono text-[11px] text-zinc-400">
                  {health.last_forgot_at ? new Date(health.last_forgot_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </div>
              {health.recently_forgotten.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/60">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Recently forgotten</div>
                  {health.recently_forgotten.map((f, i) => <div key={i} className="mono text-[11px] text-red-400/60 line-through mb-0.5">{f}</div>)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 animate-fade-up">
            <button onClick={() => setShowIntegrations(true)} disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-30 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-cyan-300 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Data Integrations
            </button>
            <button onClick={forget} disabled={loading || dissolving || health.total_items_remembered === 0}
              className="w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-30 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-red-500/30 hover:text-red-400 hover:shadow-lg hover:shadow-red-500/5 flex items-center justify-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Scrub memory
            </button>
          </div>

          {/* Quick queries */}
          <div className="animate-fade-up">
            <h2 className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Demo queries</h2>
            <div className="space-y-1.5">
              {["Why did we deprecate Stripe v1?", "What caused the webhook failure?"].map(q => (
                <button key={q} onClick={() => { setQuery(q); ask(q); }}
                  className="w-full text-left text-[11px] px-3 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/50 text-zinc-500 hover:text-cyan-300 hover:border-cyan-500/20 group flex items-center justify-between">
                  <span className="truncate">{q}</span><ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-cyan-500 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    )}

        {/* ═══ TEAM MANAGEMENT ═══ */}
        {currentRoute === "team" && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Team Management</h1>
                <p className="text-sm text-zinc-500 mt-1">Manage collaborators and permissions for Corporate Ghost.</p>
              </div>
              <button className="px-5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/5 flex items-center gap-2 transition-all">
                <UserPlus className="w-4 h-4" /> Add Collaborator
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamMembers.map(member => (
                <div key={member.id} className="card p-6 flex flex-col items-start parallax-card relative overflow-hidden group">
                  {member.role === "Head of Engineering" && (
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <ShieldAlert className="w-24 h-24 text-zinc-100" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-300 mb-4 shadow-inner">
                    {member.avatar}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100">{member.name}</h3>
                  <div className="mono text-[10px] text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 mt-1.5 mb-3">
                    {member.role}
                  </div>
                  <p className="text-sm text-zinc-500 flex-1">{member.email}</p>
                  
                  <button className="w-full mt-6 py-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors z-10 relative">
                    Manage Access
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ═══ INTEGRATIONS MODAL ═══ */}
      {showIntegrations && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-up" style={{ animationDuration: '0.2s' }}>
          <div className="card w-full max-w-2xl bg-[#09090b] shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Data Integrations</h3>
                <p className="text-xs text-zinc-500">Connect tools to build the corporate memory graph.</p>
              </div>
              <button onClick={() => setShowIntegrations(false)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4">
              {Object.entries(SRC).map(([key, src]) => {
                const connected = integrations[key];
                const isSyncing = syncing === key;
                return (
                  <div key={key} className={`card-inset p-5 border transition-all ${connected ? src.border : 'border-zinc-800/50'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl ${src.bg} border ${src.border} flex items-center justify-center`}>
                        <src.icon className={`w-5 h-5 ${src.text}`} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {connected ? (
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${src.text} bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800`}>Connected</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">Disconnected</span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-semibold text-zinc-200 capitalize">{src.label}</h4>
                    <p className="text-xs text-zinc-500 mb-5">Ingest {src.label} data into Cognee graph.</p>
                    
                    <button onClick={() => toggleSync(key)} disabled={isSyncing}
                      className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all
                        ${connected 
                          ? "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800" 
                          : "bg-zinc-100 text-zinc-900 hover:bg-white"}`}>
                      {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin-ring" /> : (connected ? <Trash2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />)}
                      {isSyncing ? "Syncing..." : (connected ? "Disconnect" : "Connect")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SCRUB APPROVAL MODAL ═══ */}
      {scrubStatus !== "idle" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-up">
          <div className="card w-full max-w-md p-8 flex flex-col items-center text-center">
            {scrubStatus === "pending" ? (
              <>
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-amber-500 animate-spin-ring" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-amber-500/80" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Awaiting Approval</h3>
                <p className="text-sm text-zinc-400">
                  Scrubbing memory is a destructive action. Requesting approval from the <span className="text-zinc-200 font-semibold">Head of Engineering</span>.
                </p>
              </>
            ) : scrubStatus === "approved" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/5">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Request Approved</h3>
                <p className="text-sm text-zinc-400 mb-8">
                  The Head of Engineering has approved this scrub request.
                </p>
                <div className="flex w-full gap-3">
                  <button onClick={() => setScrubStatus("idle")} className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold text-sm hover:text-zinc-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={forget} className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Scrub Now
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ═══ EXPORT MODAL ═══ */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-up">
          <div className="card w-full max-w-3xl bg-[#09090b] shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[80vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Download className="w-4 h-4 text-cyan-400" /> Export Incident Report</h3>
                <p className="text-xs text-zinc-500">Printable view of the memory traversal.</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-zinc-200 flex justify-center text-black">
               <div className="w-full max-w-2xl bg-white p-8 border border-zinc-300 shadow-xl rounded">
                  <div className="border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-3xl font-bold mb-2 uppercase tracking-tight">Incident Report</h1>
                    <div className="flex justify-between text-sm text-zinc-600 font-mono">
                      <span>Generated by: Corporate Ghost</span>
                      <span>Date: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-bold mb-3">Executive Summary</h2>
                  <p className="text-sm leading-relaxed mb-8">{data?.summary}</p>
                  
                  <h2 className="text-xl font-bold mb-3">Key Decisions</h2>
                  <div className="space-y-4 mb-8">
                    {data?.relatedDecisions?.map((d, i) => (
                      <div key={i} className="border-l-4 border-zinc-800 pl-4 py-1">
                         <h4 className="font-bold text-sm">{d.title}</h4>
                         {d.context && <p className="text-xs italic text-zinc-600 mb-1">{d.context}</p>}
                         <p className="text-sm">{d.outcome}</p>
                      </div>
                    ))}
                  </div>

                  <h2 className="text-xl font-bold mb-3">Chronological Event Log</h2>
                  <div className="space-y-4 text-sm font-mono bg-zinc-50 p-4 border border-zinc-200">
                    {data?.timeline?.map((ev, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="w-24 shrink-0 text-zinc-500">{ev.date}</span>
                        <span className="w-16 shrink-0 font-bold uppercase">{ev.source}</span>
                        <span className="text-zinc-900">{ev.event}</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 bg-[#111113] flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">Cancel</button>
              <button onClick={() => { alert("Report downloaded as PDF!"); setShowExportModal(false); }} className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button onClick={() => alert("Shareable link copied to clipboard!")} className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5" /> Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800/40 py-4 text-center mono text-[10px] text-zinc-700 relative z-10">
        Corporate Ghost · Powered by Cognee Memory Engine
      </footer>
    </div>
  );
}
