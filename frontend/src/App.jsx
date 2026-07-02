import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  GitBranch,
  GitPullRequest,
  CheckSquare,
  Activity,
  Trash2,
  RefreshCw,
  Send,
  Calendar,
  User,
  ExternalLink,
  ShieldAlert,
  Ghost,
  Sparkles,
  HelpCircle
} from "lucide-react";

// Mock Fallback Data matching api contract to handle backend-offline states gracefully
const MOCK_ASK_REPLY = {
  summary: "We deprecated the Stripe v1 payment gateway client because it suffered from rate-limiting errors on international retries and failed to satisfy PCI-DSS compliance requirements from our security audit. We migrated to Adyen to resolve these issues, routing all traffic successfully by Q1 2024 and subsequently removing the deprecated Stripe v1 code from our codebase.",
  timeline: [
    {
      source: "slack",
      author: "Alice (Senior SRE)",
      date: "2023-04-12",
      event: "Flagged rate-limit spikes on Stripe v1 capture calls and suggested Jira ticket for deprecation due to PCI compliance issues.",
      link: "https://company.slack.com/archives/C12345/p1681283600"
    },
    {
      source: "jira",
      author: "Charlie (Backend Engineer)",
      date: "2023-05-02",
      event: "Created JIRA-402 to track deprecating Stripe v1 and migrating to Adyen. Targeted completion in Q1 2024.",
      link: "https://company.atlassian.net/browse/JIRA-402"
    },
    {
      source: "github",
      author: "Charlie (Backend Engineer)",
      date: "2023-10-15",
      event: "Merged PR-1145 integrating Adyen SDK, marking StripeClient as @deprecated, and gating traffic via feature flags.",
      link: "https://github.com/company/repo/pull/1145"
    },
    {
      source: "slack",
      author: "Bob (Lead Architect)",
      date: "2024-01-15",
      event: "Resolved Adyen webhook verification bug (commit a8f9c2d) and officially disabled Stripe v1 in production.",
      link: "https://company.slack.com/archives/C67890/p1705312000"
    },
    {
      source: "github",
      author: "Charlie (Backend Engineer)",
      date: "2024-02-28",
      event: "Merged PR-1290 removing all legacy Stripe v1 codebase files and clean up database tables.",
      link: "https://github.com/company/repo/pull/1290"
    }
  ],
  relatedDecisions: [
    {
      title: "Migration from Stripe v1 to Adyen Gateway",
      context: "Stripe v1 API was rate-limiting international retries and failing security audits.",
      outcome: "Migrated to Adyen gateway. Improved transaction reliability and satisfied PCI-DSS standards."
    },
    {
      title: "Webhook Verification Hotfix",
      context: "Adyen webhook verification was using Stripe signing credentials after switchover.",
      outcome: "Updated webhook configuration to utilize Adyen credentials in commit a8f9c2d."
    }
  ]
};

const API_BASE_URL = "http://localhost:8000/api";

export default function App() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState({
    total_items_remembered: 6,
    last_improved_at: new Date().toISOString(),
    last_forgot_at: null
  });
  const [isLiveMode, setIsLiveMode] = useState(false); // Detects if backend is reachable

  // Auto detect server health on startup
  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setIsLiveMode(true);
      } else {
        setIsLiveMode(false);
      }
    } catch (e) {
      console.log("FastAPI Backend offline, running in Client Mock Mode.");
      setIsLiveMode(false);
    }
  };

  const handleAsk = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setLoading(true);

    if (isLiveMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q })
        });
        if (res.ok) {
          const data = await res.json();
          setResponse(data);
        } else {
          // Fallback if HTTP error
          setResponse(MOCK_ASK_REPLY);
        }
      } catch (err) {
        console.error(err);
        setResponse(MOCK_ASK_REPLY);
      }
    } else {
      // Simulate client side response delay
      setTimeout(() => {
        const lowerQ = q.toLowerCase();
        if (lowerQ.includes("stripe") || lowerQ.includes("adyen") || lowerQ.includes("deprecate") || lowerQ.includes("payment") || lowerQ.includes("why")) {
          setResponse(MOCK_ASK_REPLY);
        } else {
          setResponse({
            summary: `Query '${q}' completed. No direct timeline found. Try asking: 'Why did we deprecate Stripe v1?'`,
            timeline: [],
            relatedDecisions: []
          });
        }
        setLoading(false);
      }, 600);
      return;
    }
    setLoading(false);
  };

  const handleIngest = async () => {
    setLoading(true);
    if (isLiveMode) {
      try {
        await fetch(`${API_BASE_URL}/ingest`, { method: "POST" });
        await fetchHealth();
      } catch (e) {
        console.error(e);
      }
    } else {
      // Mock Ingestion update
      setHealth(prev => ({
        ...prev,
        total_items_remembered: 6,
        last_improved_at: new Date().toISOString()
      }));
    }
    // Simulate query to display timeline
    handleAsk("Why did we deprecate Stripe v1?");
    setLoading(false);
  };

  const handleForget = async () => {
    setLoading(true);
    if (isLiveMode) {
      try {
        await fetch(`${API_BASE_URL}/forget`, { method: "POST" });
        await fetchHealth();
      } catch (e) {
        console.error(e);
      }
    } else {
      setHealth(prev => ({
        total_items_remembered: 0,
        last_improved_at: null,
        last_forgot_at: new Date().toISOString()
      }));
    }
    setResponse({
      summary: "Memory graph successfully scrubbed! The Corporate Ghost remembers nothing now.",
      timeline: [],
      relatedDecisions: []
    });
    setLoading(false);
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case "slack":
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case "github":
        return <GitPullRequest className="w-4 h-4 text-purple-400" />;
      case "jira":
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSourceStyles = (source) => {
    switch (source) {
      case "slack":
        return {
          border: "border-sky-500/30",
          bg: "bg-sky-950/20",
          badge: "bg-sky-500/10 text-sky-400 border-sky-500/20"
        };
      case "github":
        return {
          border: "border-purple-500/30",
          bg: "bg-purple-950/20",
          badge: "bg-purple-500/10 text-purple-400 border-purple-500/20"
        };
      case "jira":
        return {
          border: "border-emerald-500/30",
          bg: "bg-emerald-950/20",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        };
      default:
        return {
          border: "border-slate-500/30",
          bg: "bg-slate-950/20",
          badge: "bg-slate-500/10 text-slate-400 border-slate-500/20"
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-200 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background decoration elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#0a0d1e]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 neon-glow-primary">
              <Ghost className="w-6 h-6 text-cyan-400 cyan-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Corporate Ghost
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-950/40">
                  MVP
                </span>
              </h1>
              <p className="text-xs text-slate-400">Incident-Memory Graph Layer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${
              isLiveMode 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLiveMode ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              {isLiveMode ? "Backend Connected" : "Client Mock Mode"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        
        {/* Left column: Controls and Memory Health */}
        <div className="md:col-span-1 flex flex-col gap-6">
          
          {/* Memory Health Panel */}
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              Memory Health
            </h2>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Status</span>
                <span className="font-mono text-cyan-400 font-semibold uppercase">Healthy</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Remembered Items</span>
                <span className="font-mono text-white text-sm font-semibold">{health.total_items_remembered}</span>
              </div>
              <div className="border-b border-slate-800 pb-2">
                <span className="text-slate-400 block mb-1">Last Enrichment Run</span>
                <span className="font-mono text-slate-300 block truncate">
                  {health.last_improved_at ? new Date(health.last_improved_at).toLocaleTimeString() : "Never"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Last Scrub Action</span>
                <span className="font-mono text-slate-300 block truncate">
                  {health.last_forgot_at ? new Date(health.last_forgot_at).toLocaleTimeString() : "None"}
                </span>
              </div>
            </div>

            {/* Ingestion & Scrub Controls */}
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleIngest}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ingest Seed Data
              </button>
              <button
                onClick={handleForget}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/30 hover:text-red-200 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Scrub Memory Graph
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-white uppercase mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Demo Queries
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setQuery("Why did we deprecate Stripe v1?");
                  handleAsk("Why did we deprecate Stripe v1?");
                }}
                className="text-left text-xs p-2 rounded-lg bg-slate-900/50 hover:bg-cyan-950/20 hover:text-cyan-300 border border-slate-800/80 hover:border-cyan-500/20 transition-all text-slate-400"
              >
                "Why did we deprecate Stripe v1?"
              </button>
              <button
                onClick={() => {
                  setQuery("Why was webhook verification failing?");
                  handleAsk("Why was webhook verification failing?");
                }}
                className="text-left text-xs p-2 rounded-lg bg-slate-900/50 hover:bg-cyan-950/20 hover:text-cyan-300 border border-slate-800/80 hover:border-cyan-500/20 transition-all text-slate-400"
              >
                "Why was webhook verification failing?"
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Conversational view & Graph visualization */}
        <div className="md:col-span-3 flex flex-col gap-6">
          
          {/* Query Bar */}
          <div className="glass-panel rounded-2xl p-4 flex gap-3 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ask about past technical choices (e.g. 'why did we deprecate Stripe?')"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <button
              onClick={() => handleAsk()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 text-slate-950 font-bold hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/10 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask
                </>
              )}
            </button>
          </div>

          {/* Results display */}
          {response && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Decision Summary */}
              <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-cyan-400 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
                  <Ghost className="w-4 h-4 text-cyan-400" />
                  Ghost Reasoning Summary
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {response.summary}
                </p>
              </div>

              {/* Connected Decisions & Outcomes */}
              {response.relatedDecisions && response.relatedDecisions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {response.relatedDecisions.map((dec, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-5 relative">
                      <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        {dec.title}
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-0.5">Context</span>
                          <p className="text-slate-300">{dec.context}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">Outcome</span>
                          <p className="text-cyan-300/85">{dec.outcome}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Decision Timeline Visualizer */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-white font-semibold text-base mb-6 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  Connected Incident Timeline
                </h3>
                
                {response.timeline && response.timeline.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-slate-800/80 space-y-6">
                    {response.timeline.map((event, idx) => {
                      const style = getSourceStyles(event.source);
                      return (
                        <div key={idx} className="relative group">
                          
                          {/* Marker Node on Timeline */}
                          <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full glass-card border ${style.border} flex items-center justify-center bg-[#070913]`}>
                            {getSourceIcon(event.source)}
                          </div>

                          {/* Event Card */}
                          <div className={`glass-card border ${style.border} ${style.bg} p-4 rounded-xl hover:border-cyan-500/20 transition-all duration-300`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}>
                                  {event.source}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" />
                                  {event.author}
                                </span>
                              </div>
                              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {event.date}
                              </span>
                            </div>
                            
                            <p className="text-sm text-slate-200 mt-2 mb-3">
                              {event.event}
                            </p>

                            <a
                              href={event.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                            >
                              View Source Ref
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    No timeline items recorded in this memory range.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Intro Dashboard if no response */}
          {!response && !loading && (
            <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center py-16 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center mb-6">
                <Ghost className="w-8 h-8 text-cyan-400 cyan-pulse" />
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                Say hello to your Corporate Ghost
              </h2>
              <p className="text-sm text-slate-400 max-w-md mb-8">
                Ask about past technical decisions, software deprecations, or bug outcomes, and recover the engineering context before it slips away.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full text-left">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    Slack Context
                  </h4>
                  <p className="text-xs text-slate-400">Recover audit triggers, team concerns, and architectural ideas from conversation logs.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Jira Planning
                  </h4>
                  <p className="text-xs text-slate-400">Review task specifications, ticket assignments, milestones, and status milestones.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                    Code Changes
                  </h4>
                  <p className="text-xs text-slate-400">Trace PR motivations, code commits, deprecated modules, and structural cleanups.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Ghost className="w-3.5 h-3.5 text-cyan-400" />
                    Cognee Graph Memory
                  </h4>
                  <p className="text-xs text-slate-400">Stitch these pieces together into a hybrid graph-vector representation for multi-hop retrieval.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 py-4 bg-[#060812]/50 text-center text-xs text-slate-500">
        <p>© 2026 Corporate Ghost — Built with FastAPI & Cognee Memory Graph</p>
      </footer>
    </div>
  );
}
