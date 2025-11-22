import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Clipboard, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Search, 
  Sparkles,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";

// ---- Config ----
const API_BASE = "http://localhost:8000";
const REQUEST_TIMEOUT = 1200000;

// ---- Helpers ----
const prettyJson = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

const BoldText = ({ text }: { text: string | null | undefined }) => {
  if (!text) return null;
  
  const parts: Array<{ type: 'text' | 'bold'; content: string }> = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'bold', content: match[1] });
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  if (parts.length === 0) {
    return <>{text}</>;
  }
  
  return (
    <>
      {parts.map((part, index) => 
        part.type === 'bold' ? (
          <strong key={index} className="font-semibold text-foreground">{part.content}</strong>
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
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="gap-2 border-border hover:bg-muted transition-all duration-200"
    >
      {copied ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-green-600">Copied</span>
        </>
      ) : (
        <>
          <Clipboard className="h-4 w-4" />
          <span>Copy</span>
        </>
      )}
    </Button>
  );
};

interface RcaResult {
  ticket_data: Record<string, unknown>;
  generated_rca: string;
}

const Index = () => {
  const [mainTab, setMainTab] = useState<string>("rca");
  const [mode, setMode] = useState<string>("TASK");
  const [taskNumber, setTaskNumber] = useState("");
  const [ritmNumber, setRitmNumber] = useState("");
  const [rcaLoading, setRcaLoading] = useState(false);
  const [rcaError, setRcaError] = useState("");
  const [rcaResult, setRcaResult] = useState<RcaResult | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200/80 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 grid place-items-center font-bold text-white shadow-lg shadow-indigo-500/30">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  RCA Assistant
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Enterprise Incident Analysis Platform</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 border-slate-200">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">v1.0</span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-3">
              Root Cause Analysis
              <span className="block text-2xl font-normal text-slate-600 mt-2">
                Powered by AI
              </span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Generate comprehensive RCA reports or query incident data using natural language. 
              Built for SRE teams to accelerate incident resolution.
            </p>
          </motion.div>
        </div>

        {/* Main Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-slate-200/80 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Analysis Dashboard</CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Choose your analysis method below
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-slate-100 p-1.5 h-auto mb-8">
                <TabsTrigger 
                  value="rca" 
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all duration-200 py-3 text-sm font-semibold rounded-lg gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Generate RCA
                </TabsTrigger>
                <TabsTrigger 
                  value="agentic" 
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-md transition-all duration-200 py-3 text-sm font-semibold rounded-lg gap-2"
                >
                  <Search className="h-4 w-4" />
                  Agentic Query
                </TabsTrigger>
              </TabsList>

              {/* RCA Tab */}
              <TabsContent value="rca" className="space-y-6 mt-0">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500 grid place-items-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Ticket-Based RCA</h3>
                      <p className="text-sm text-slate-600">
                        Generate detailed RCA reports by entering the exact RITM or TASK ticket number.
                      </p>
                    </div>
                  </div>
                  
                  <Tabs value={mode} onValueChange={setMode} className="w-full">
                    <TabsList className="grid grid-cols-2 bg-white/80 p-1 mb-4">
                      <TabsTrigger 
                        value="TASK" 
                        className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all"
                      >
                        TASK (RTSK)
                      </TabsTrigger>
                      <TabsTrigger 
                        value="RITM" 
                        className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white transition-all"
                      >
                        RITM
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="TASK" className="space-y-3 mt-4">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-indigo-500" />
                        RTSK Number
                      </label>
                      <Input
                        placeholder="e.g., TASK300045"
                        value={taskNumber}
                        onChange={(e) => setTaskNumber(e.target.value)}
                        className="bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all h-12 text-base"
                        onKeyDown={(e) => e.key === 'Enter' && canSubmitRca && !rcaLoading && submitRca()}
                      />
                    </TabsContent>

                    <TabsContent value="RITM" className="space-y-3 mt-4">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-indigo-500" />
                        RITM Number
                      </label>
                      <Input
                        placeholder="e.g., RITM200045"
                        value={ritmNumber}
                        onChange={(e) => setRitmNumber(e.target.value)}
                        className="bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all h-12 text-base"
                        onKeyDown={(e) => e.key === 'Enter' && canSubmitRca && !rcaLoading && submitRca()}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-3 mt-6">
                    <Button
                      onClick={submitRca}
                      disabled={!canSubmitRca || rcaLoading}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 gap-2 font-semibold px-8 h-12 text-base disabled:opacity-50"
                    >
                      {rcaLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          <span>Generate RCA</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { 
                        setTaskNumber(""); 
                        setRitmNumber(""); 
                        setRcaResult(null); 
                        setRcaError(""); 
                      }}
                      className="border-slate-200 hover:bg-slate-50 transition-all h-12 px-6"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {rcaError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700"
                    >
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="whitespace-pre-wrap flex-1 text-sm font-medium">{rcaError}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {rcaResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
                          <h3 className="text-lg font-bold text-slate-900">RCA Report</h3>
                        </div>
                        <CopyButton text={prettyJson(rcaResult)} />
                      </div>

                      <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                        <BoldText text={rcaResult.generated_rca || "(No RCA returned)"} />
                      </div>

                      <details className="rounded-xl bg-white border-2 border-slate-200 overflow-hidden group">
                        <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Ticket Data
                          </span>
                          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <pre className="px-6 py-4 text-xs text-slate-600 overflow-auto bg-slate-50 border-t border-slate-200 max-h-96">
                          {prettyJson(rcaResult.ticket_data)}
                        </pre>
                      </details>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Agentic Query Tab */}
              <TabsContent value="agentic" className="space-y-6 mt-0">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-purple-500 grid place-items-center flex-shrink-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Natural Language Query</h3>
                      <p className="text-sm text-slate-600">
                        Ask questions in natural language. Our AI agent will automatically query and analyze relevant incident data.
                      </p>
                    </div>
                  </div>
                  
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-purple-500" />
                    Your Question
                  </label>
                  <Textarea
                    placeholder="e.g., Show failed Oracle automation tasks from the last 7 days with resolution time analysis" 
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    className="min-h-[160px] bg-white border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none text-base"
                  />

                  <div className="flex items-center gap-3 mt-6">
                    <Button
                      onClick={submitAgent}
                      disabled={!agentQuery.trim() || agentLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 gap-2 font-semibold px-8 h-12 text-base disabled:opacity-50"
                    >
                      {agentLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          <span>Ask Agent</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { 
                        setAgentQuery(""); 
                        setAgentResult(""); 
                        setAgentError(""); 
                      }}
                      className="border-slate-200 hover:bg-slate-50 transition-all h-12 px-6"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {agentError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700"
                    >
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="whitespace-pre-wrap flex-1 text-sm font-medium">{agentError}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {agentResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                          <h3 className="text-lg font-bold text-slate-900">Agent Response</h3>
                        </div>
                        <CopyButton text={agentResult} />
                      </div>

                      <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-6 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                        <BoldText text={agentResult} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Professional Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-8 mt-16 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Built for enterprise SRE workflows</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs">API: {API_BASE}</span>
            <Badge variant="outline" className="border-slate-200">
              Production Ready
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
