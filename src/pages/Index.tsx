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
      className="gap-2 bg-secondary hover:bg-secondary/80 border-0 transition-smooth shadow-sm"
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-border shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary grid place-items-center font-bold text-white shadow-lg shadow-primary/20">
              R
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-accent bg-clip-text text-transparent">
                RCA Assistant
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Site Reliability Engineering Toolkit</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Card className="bg-white/80 backdrop-blur-sm border-border shadow-xl overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-40 pointer-events-none" />
          <CardHeader className="relative pb-8">
            <CardTitle className="text-2xl font-bold text-foreground">Root Cause Analysis</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Generate comprehensive RCA reports or query incident data using natural language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-muted p-1.5 h-auto shadow-sm">
                <TabsTrigger 
                  value="rca" 
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-smooth py-3.5 text-sm font-semibold rounded-lg"
                >
                  Generate RCA by Ticket
                </TabsTrigger>
                <TabsTrigger 
                  value="agentic" 
                  className="data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-md transition-smooth py-3.5 text-sm font-semibold rounded-lg"
                >
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
                    <TabsList className="grid grid-cols-2 bg-muted/80 backdrop-blur-sm p-1">
                      <TabsTrigger 
                        value="TASK" 
                        className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-smooth rounded-md"
                      >
                        TASK (RTSK)
                      </TabsTrigger>
                      <TabsTrigger 
                        value="RITM" 
                        className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-smooth rounded-md"
                      >
                        RITM
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="TASK" className="mt-4 space-y-2">
                      <label className="text-sm font-semibold text-foreground">RTSK Number</label>
                      <Input
                        placeholder="e.g., TASK300045"
                        value={taskNumber}
                        onChange={(e) => setTaskNumber(e.target.value)}
                        className="bg-white border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-smooth"
                      />
                    </TabsContent>

                    <TabsContent value="RITM" className="mt-4 space-y-2">
                      <label className="text-sm font-semibold text-foreground">RITM Number</label>
                      <Input
                        placeholder="e.g., RITM200045"
                        value={ritmNumber}
                        onChange={(e) => setRitmNumber(e.target.value)}
                        className="bg-white border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-smooth"
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-3 mt-6">
                    <Button
                      onClick={submitRca}
                      disabled={!canSubmitRca || rcaLoading}
                      className="bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:shadow-primary/30 transition-smooth gap-2 font-semibold px-6"
                    >
                      {rcaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Generate RCA
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setTaskNumber(""); setRitmNumber(""); setRcaResult(null); setRcaError(""); }}
                      className="hover:bg-muted transition-smooth font-medium"
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
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-purple-600 animate-pulse shadow-sm shadow-primary/50" />
                            RCA Output
                          </h3>
                          <CopyButton text={prettyJson(rcaResult)} />
                        </div>

                        <div className="rounded-xl bg-gradient-to-br from-white to-muted/30 border-2 border-border p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                          <BoldText text={rcaResult.generated_rca || "(No RCA returned)"} />
                        </div>

                        <details className="rounded-xl bg-white border-2 border-border overflow-hidden group shadow-sm">
                          <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-foreground hover:bg-muted/50 transition-smooth flex items-center justify-between">
                            <span>Show ticket_data</span>
                            <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <pre className="px-6 py-4 text-xs text-muted-foreground overflow-auto bg-muted/30 border-t border-border">
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
                  
                  <label className="text-sm font-semibold text-foreground mb-2 block">Your question</label>
                  <Textarea
                    placeholder="e.g., Show failed Oracle automation tasks from the last 7 days" 
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    className="min-h-[140px] bg-white border-2 border-border focus:border-accent focus:ring-4 focus:ring-accent/10 transition-smooth resize-none"
                  />

                  <div className="flex items-center gap-3 mt-6">
                    <Button
                      onClick={submitAgent}
                      disabled={!agentQuery.trim() || agentLoading}
                      className="bg-gradient-to-r from-accent to-cyan-500 text-white hover:shadow-lg hover:shadow-accent/30 transition-smooth gap-2 font-semibold px-6"
                    >
                      {agentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Ask Agent
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setAgentQuery(""); setAgentResult(""); setAgentError(""); }}
                      className="hover:bg-muted transition-smooth font-medium"
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
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-accent to-cyan-500 animate-pulse shadow-sm shadow-accent/50" />
                            Agent Response
                          </h3>
                          <CopyButton text={agentResult} />
                        </div>

                        <div className="rounded-xl bg-gradient-to-br from-white to-muted/30 border-2 border-border p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
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
          <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">v1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
