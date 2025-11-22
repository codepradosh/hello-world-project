import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Clipboard, CheckCircle2, AlertTriangle } from "lucide-react";

// ---- Config ----
const API_BASE = "http://localhost:8000"; // change if needed
const REQUEST_TIMEOUT = 1200000; // 2 minutes timeout (in milliseconds)

// ---- Small helpers ----
const prettyJson = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

// Component to render text with **bold** formatting
const BoldText = ({ text }: { text: string | null | undefined }) => {
  if (!text) return null;
  
  // Split text by **text** pattern
  const parts: Array<{ type: 'text' | 'bold'; content: string }> = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // Add bold text
    parts.push({ type: 'bold', content: match[1] });
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  // If no matches found, return original text
  if (parts.length === 0) {
    return <>{text}</>;
  }
  
  return (
    <>
      {parts.map((part, index) => 
        part.type === 'bold' ? (
          <strong key={index} className="font-semibold">{part.content}</strong>
        ) : (
          <span key={index}>{part.content}</span>
        )
      )}
    </>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="gap-2 bg-secondary/50 hover:bg-secondary border border-border transition-smooth"
    >
      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};

interface RcaResult {
  ticket_data: Record<string, unknown>;
  generated_rca: string;
}

const Index = () => {
  // Main tab: RCA or Agentic Query
  const [mainTab, setMainTab] = useState<string>("rca"); // "rca" | "agentic"
  
  // Section 1: RCA by number
  const [mode, setMode] = useState<string>("TASK"); // TASK | RITM
  const [taskNumber, setTaskNumber] = useState("");
  const [ritmNumber, setRitmNumber] = useState("");
  const [rcaLoading, setRcaLoading] = useState(false);
  const [rcaError, setRcaError] = useState("");
  const [rcaResult, setRcaResult] = useState<RcaResult | null>(null);

  // Section 2: Agentic query
  const [agentQuery, setAgentQuery] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState("");
  const [agentResult, setAgentResult] = useState("");

  const canSubmitRca = useMemo(() => {
    const v = (mode === "TASK" ? taskNumber : ritmNumber).trim();
    return v.length > 0;
  }, [mode, taskNumber, ritmNumber]);

  const submitRca = async () => {
    setRcaError("");
    setRcaResult(null);
    setRcaLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const body = mode === "TASK"
        ? { rtsk_number: taskNumber.trim() }
        : { ritm_number: ritmNumber.trim() };

      const res = await fetch(`${API_BASE}/get-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = await res.json() as RcaResult;
      setRcaResult(data);
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        setRcaError(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds. Please try again.`);
      } else {
        setRcaError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setRcaLoading(false);
    }
  };

  const submitAgent = async () => {
    setAgentError("");
    setAgentResult("");
    setAgentLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${API_BASE}/agent-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: agentQuery.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = await res.json() as { response?: string };
      setAgentResult(data.response || "");
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        setAgentError(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds. Please try again.`);
      } else {
        setAgentError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-card/80 border-b border-border shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center font-bold text-primary-foreground shadow-glow">
              R
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                RCA Assistant
              </h1>
              <p className="text-xs text-muted-foreground">Site Reliability Engineering Toolkit</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Card className="gradient-card border-border shadow-elevation overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-50 pointer-events-none" />
          <CardHeader className="relative pb-8">
            <CardTitle className="text-2xl font-bold">Root Cause Analysis</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Generate comprehensive RCA reports or query incident data using natural language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-muted/50 backdrop-blur-sm w-full p-1 h-auto">
                <TabsTrigger value="rca" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-smooth py-3 text-sm font-medium">
                  Generate RCA by Ticket
                </TabsTrigger>
                <TabsTrigger value="agentic" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-glow transition-smooth py-3 text-sm font-medium">
                  Agentic Query
                </TabsTrigger>
              </TabsList>

              {/* RCA Tab Content */}
              <TabsContent value="rca" className="space-y-5 mt-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Generate detailed RCA reports by entering the exact RITM or TASK ticket number.
                  </p>
                  
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                    <TabsList className="grid grid-cols-2 bg-muted/30 backdrop-blur-sm">
                      <TabsTrigger value="TASK" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-smooth">
                        TASK (RTSK)
                      </TabsTrigger>
                      <TabsTrigger value="RITM" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-smooth">
                        RITM
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="TASK" className="mt-4 space-y-2">
                      <label className="text-sm font-medium text-foreground">RTSK Number</label>
                      <Input
                        placeholder="e.g., TASK300045"
                        value={taskNumber}
                        onChange={(e) => setTaskNumber(e.target.value)}
                        className="bg-input border-border focus:border-primary focus:ring-primary/20 transition-smooth"
                      />
                    </TabsContent>

                    <TabsContent value="RITM" className="mt-4 space-y-2">
                      <label className="text-sm font-medium text-foreground">RITM Number</label>
                      <Input
                        placeholder="e.g., RITM200045"
                        value={ritmNumber}
                        onChange={(e) => setRitmNumber(e.target.value)}
                        className="bg-input border-border focus:border-primary focus:ring-primary/20 transition-smooth"
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-3 mt-6">
                    <Button
                      onClick={submitRca}
                      disabled={!canSubmitRca || rcaLoading}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow transition-smooth gap-2 font-medium"
                    >
                      {rcaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Generate RCA
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setTaskNumber(""); setRitmNumber(""); setRcaResult(null); setRcaError(""); }}
                      className="hover:bg-muted transition-smooth"
                    >
                      Clear
                    </Button>
                  </div>

                  <AnimatePresence>
                    {rcaError && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mt-6 backdrop-blur-sm"
                      >
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="whitespace-pre-wrap flex-1">{rcaError}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {rcaResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="space-y-4 mt-6"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            RCA Output
                          </h3>
                          <CopyButton text={prettyJson(rcaResult)} />
                        </div>

                        <div className="rounded-xl bg-card border border-border p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-elevation">
                          <BoldText text={rcaResult.generated_rca || "(No RCA returned)"} />
                        </div>

                        <details className="rounded-xl bg-card border border-border overflow-hidden group">
                          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-foreground hover:bg-muted/50 transition-smooth flex items-center justify-between">
                            <span>Show ticket_data</span>
                            <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <pre className="px-6 py-4 text-xs text-muted-foreground overflow-auto bg-muted/20 border-t border-border">
                            {prettyJson(rcaResult.ticket_data)}
                          </pre>
                        </details>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TabsContent>

              {/* Agentic Query Tab Content */}
              <TabsContent value="agentic" className="space-y-5 mt-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Ask questions in natural language. Our AI agent will automatically query and analyze relevant incident data.
                  </p>
                  
                  <label className="text-sm font-medium text-foreground mb-2 block">Your question</label>
                  <Textarea
                    placeholder="e.g., Show failed Oracle automation tasks from the last 7 days" 
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    className="min-h-[140px] bg-input border-border focus:border-accent focus:ring-accent/20 transition-smooth resize-none"
                  />

                  <div className="flex items-center gap-3 mt-6">
                    <Button
                      onClick={submitAgent}
                      disabled={!agentQuery.trim() || agentLoading}
                      className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow transition-smooth gap-2 font-medium"
                    >
                      {agentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Ask Agent
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setAgentQuery(""); setAgentResult(""); setAgentError(""); }}
                      className="hover:bg-muted transition-smooth"
                    >
                      Clear
                    </Button>
                  </div>

                  <AnimatePresence>
                    {agentError && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mt-6 backdrop-blur-sm"
                      >
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="whitespace-pre-wrap flex-1">{agentError}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {agentResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="space-y-4 mt-6"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                            Agent Response
                          </h3>
                          <CopyButton text={agentResult} />
                        </div>

                        <div className="rounded-xl bg-card border border-border p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-elevation">
                          <BoldText text={agentResult} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground border-t border-border mt-16">
        <div className="flex items-center justify-between">
          <span>Built for internal RCA workflows. Ensure API_BASE matches your FastAPI host/port.</span>
          <span className="text-primary">v1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
