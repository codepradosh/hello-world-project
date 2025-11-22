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
      className="gap-2"
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-950/70 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-800 grid place-items-center font-semibold">R</div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">RCA Assistant</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">RCA Assistant</CardTitle>
            <CardDescription className="text-slate-400">
              Generate RCA by ticket number or ask questions using natural language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-slate-800 w-full">
                <TabsTrigger value="rca">Generate RCA by Ticket Number</TabsTrigger>
                <TabsTrigger value="agentic">Ask Anything (Agentic Query)</TabsTrigger>
              </TabsList>

              {/* RCA Tab Content */}
              <TabsContent value="rca" className="space-y-4 mt-6">
                <div>
                  <p className="text-sm text-slate-400 mb-4">
                    Use when you already know the exact RITM or TASK number.
                  </p>
                  
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                    <TabsList className="grid grid-cols-2 bg-slate-800">
                      <TabsTrigger value="TASK">TASK (RTSK)</TabsTrigger>
                      <TabsTrigger value="RITM">RITM</TabsTrigger>
                    </TabsList>

                    <TabsContent value="TASK" className="mt-3">
                      <label className="text-sm text-slate-300">RTSK Number</label>
                      <Input
                        placeholder="e.g., TASK300045"
                        value={taskNumber}
                        onChange={(e) => setTaskNumber(e.target.value)}
                        className="mt-1 bg-slate-950 border-slate-700"
                      />
                    </TabsContent>

                    <TabsContent value="RITM" className="mt-3">
                      <label className="text-sm text-slate-300">RITM Number</label>
                      <Input
                        placeholder="e.g., RITM200045"
                        value={ritmNumber}
                        onChange={(e) => setRitmNumber(e.target.value)}
                        className="mt-1 bg-slate-950 border-slate-700"
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      onClick={submitRca}
                      disabled={!canSubmitRca || rcaLoading}
                      className="rounded-xl gap-2"
                    >
                      {rcaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Generate RCA
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setTaskNumber(""); setRitmNumber(""); setRcaResult(null); setRcaError(""); }}
                      className="rounded-xl"
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
                        className="flex items-start gap-2 p-3 rounded-xl bg-red-950/40 border border-red-900 text-red-200 text-sm mt-4"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div className="whitespace-pre-wrap">{rcaError}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {rcaResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="space-y-3 mt-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-200">RCA Output</h3>
                          <CopyButton text={prettyJson(rcaResult)} />
                        </div>

                        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                          <BoldText text={rcaResult.generated_rca || "(No RCA returned)"} />
                        </div>

                        <details className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                          <summary className="cursor-pointer text-sm font-medium text-slate-300">Show ticket_data</summary>
                          <pre className="mt-3 text-xs text-slate-200 overflow-auto">
                            {prettyJson(rcaResult.ticket_data)}
                          </pre>
                        </details>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TabsContent>

              {/* Agentic Query Tab Content */}
              <TabsContent value="agentic" className="space-y-4 mt-6">
                <div>
                  <p className="text-sm text-slate-400 mb-4">
                    Use natural language. The agent will fetch relevant DB rows automatically.
                  </p>
                  
                  <label className="text-sm text-slate-300">Your question</label>
                  <Textarea
                    placeholder="e.g., Show failed Oracle automation tasks" 
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    className="mt-1 min-h-[120px] bg-slate-950 border-slate-700"
                  />

                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      onClick={submitAgent}
                      disabled={!agentQuery.trim() || agentLoading}
                      className="rounded-xl gap-2"
                    >
                      {agentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Ask Agent
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setAgentQuery(""); setAgentResult(""); setAgentError(""); }}
                      className="rounded-xl"
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
                        className="flex items-start gap-2 p-3 rounded-xl bg-red-950/40 border border-red-900 text-red-200 text-sm mt-4"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div className="whitespace-pre-wrap">{agentError}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {agentResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="space-y-3 mt-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-200">Agent Response</h3>
                          <CopyButton text={agentResult} />
                        </div>

                        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-sm leading-relaxed whitespace-pre-wrap">
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

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-500">
        Built for internal RCA workflows. Ensure API_BASE matches your FastAPI host/port.
      </footer>
    </div>
  );
};

export default Index;
