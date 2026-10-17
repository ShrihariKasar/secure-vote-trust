import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  X,
  Send,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
  HelpCircle,
  Lock,
  Layers,
  Fingerprint,
  Globe2,
  Minimize2,
  ExternalLink,
  ChevronRight,
  User,
  Zap,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/apiClient";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  tone?: string;
  suggestedQuestions?: string[];
  referencedModules?: string[];
  timestamp: string;
}

const ADMIN_QUICK_TOPICS = [
  { label: "⚙️ Election Lifecycle", query: "How do I manage elections and status transitions?" },
  { label: "👥 Voter Approvals", query: "How to batch approve pending voters in the registry?" },
  { label: "🏛️ Observer Consensus", query: "Who are the 4 observer nodes and how is consensus reached?" },
  { label: "🛡️ Audit Chain Verification", query: "How does 'Verify Chain Now' detect database tampering?" },
  { label: "⚖️ Candidate Sign Nomination", query: "How to allocate election signs to nominated candidates?" },
  { label: "📊 Tally & Results", query: "How are election results verified and published?" },
  { label: "📈 Turnout Analytics", query: "How are voter turnout series metrics aggregated?" },
  { label: "🔒 Secret Ballot Protection", query: "Can administrators see individual voter ballot choices?" },
];

const VOTER_QUICK_TOPICS = [
  { label: "👤 My Voter Data & Status", query: "What is my voter registration, e-KYC, and voting status?" },
  { label: "🗳️ How Voting Works", query: "How do I vote step by step?" },
  { label: "🆔 Aadhaar e-KYC", query: "How does Aadhaar e-KYC and OTP auto-approval work?" },
  { label: "👤 Face Biometrics", query: "How does facial liveness and anti-spoofing work?" },
  { label: "📜 VVPAT Receipts", query: "What is the VVPAT receipt and how to verify my ballot?" },
  { label: "🪷 Indian Party Icons & Symbols", query: "How do Indian party icons, candidate signs, and device uploads work?" },
  { label: "🔒 Is My Vote Confidential?", query: "Can an administrator or hacker see or change who I voted for?" },
  { label: "🔗 Blockchain Protection", query: "How does the blockchain protect my vote?" },
  { label: "हिंदी / Hinglish", query: "Vote kaise kare aur kya ye secure hai?" },
];

export function SystemAssistantWidget() {
  const session = useSession();
  const isAdmin = session.user?.role === "admin";
  const isVoter = session.user?.role === "voter";
  const userRole = session.user?.role || "guest";
  const userName = session.user?.name || (isAdmin ? "Administrator" : isVoter ? "Voter" : "Guest");

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const getInitialMessage = (): Message => {
    if (isAdmin) {
      return {
        id: "msg-welcome-admin",
        sender: "assistant",
        content:
          `### ⚙️ Welcome, ${userName} (Administrator)\n\n` +
          "I am **Aegis AI**, operating in **Administrator Governance Mode**.\n\n" +
          "Ask me anything regarding:\n" +
          "- **Election Lifecycle:** Scheduling, candidate nominations, and sign allocations.\n" +
          "- **Voter Registry:** Reviewing e-KYC status and executing batch approvals.\n" +
          "- **Multi-Party Observer Quorum:** Real-time 4/4 observer node health and consensus.\n" +
          "- **Audit Trail Verification:** Mathematical SHA-256 forward hash-chain tamper detection.\n\n" +
          "*Note: In accordance with Constitutional Zero-Knowledge invariants, individual voter ballot choices cannot be inspected or decrypted.*",
        suggestedQuestions: [
          "How do I manage elections and status transitions?",
          "How to batch approve pending voters?",
          "How does 'Verify Chain Now' detect tampering?",
          "How does Observer Notary Consensus work?"
        ],
        referencedModules: ["Admin Overview", "Election Manager", "Blockchain Explorer", "Audit Console"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    } else {
      return {
        id: "msg-welcome-voter",
        sender: "assistant",
        content:
          `### 🛡️ Welcome, ${userName}!\n\n` +
          "I am **Aegis AI**, your personal voting assistant for SecureVote Trust.\n\n" +
          "I can guide you through every step of your voting experience:\n" +
          "- **Instant e-KYC:** Verifying identity via Aadhaar OTP.\n" +
          "- **Facial Biometrics:** Live liveness check for a 15-minute voting pass.\n" +
          "- **Secret Ballot:** Client-side AES-256-GCM zero-knowledge encryption.\n" +
          "- **VVPAT Receipts:** Verifying your ballot on the public ledger.",
        suggestedQuestions: [
          "How do I vote step by step?",
          "How does Aadhaar e-KYC work?",
          "Can an administrator see who I voted for?",
          "What is a VVPAT receipt?"
        ],
        referencedModules: ["Voter Dashboard", "Aadhaar e-KYC", "Ballot Casting", "VVPAT Receipts"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    }
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);

  // Update initial message when user logs in or out
  useEffect(() => {
    setMessages([getInitialMessage()]);
  }, [session.user?.id, session.user?.role]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  // Keyboard shortcut Ctrl+/ to toggle widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setIsMinimized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsTyping(true);

    try {
      const res = await apiClient.post<any>("/assistant/chat", {
        query: q,
        userRole: userRole,
        currentPage: window.location.pathname,
      });

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        content: res.answer,
        tone: res.tone,
        suggestedQuestions: res.suggestedQuestions,
        referencedModules: res.referencedModules,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn("Backend assistant failed, falling back to client knowledge engine", err);
      
      // Client-side role-based fallback engine
      let fallbackContent = "";
      const lower = q.toLowerCase();

      if (!isAdmin && (lower.includes("admin login") || lower.includes("admin password") || lower.includes("become admin") || lower.includes("admin dashboard") || lower.includes("create election"))) {
        fallbackContent =
          "### 🚫 Access Restricted: Administrative Boundary\n\n" +
          "Administrative controls, election configuration, and voter approvals are strictly restricted to authorized Election Commission personnel.\n\n" +
          "As an authorized voter, you have full access to ballot casting, Aadhaar e-KYC verification, facial biometrics, and personal VVPAT audit receipts.";
      } else if (isAdmin && (lower.includes("who voted") || lower.includes("voter choice") || lower.includes("reveal vote") || lower.includes("decrypt vote"))) {
        fallbackContent =
          "### 🔒 Confidential Ballot Secrecy Enforced\n\n" +
          "In strict accordance with Constitutional Secret Ballot mandates, all ballot choices are encrypted client-side with AES-256-GCM. Administrators cannot decrypt individual voter selections.";
      } else if (isAdmin) {
        fallbackContent =
          "### ⚙️ SecureVote Trust — Administrator Governance Mode\n\n" +
          "- **Election Management:** Schedule elections and nominate candidates with official election signs.\n" +
          "- **Voter Registry:** Review e-KYC status and execute batch approvals.\n" +
          "- **Observer Consensus:** Monitor 4/4 observer node quorum.\n" +
          "- **Audit Trail:** Validate continuous SHA-256 hash chains.";
      } else {
        fallbackContent =
          "### 🛡️ SecureVote Trust — Voter Assistant\n\n" +
          "- **Aadhaar e-KYC:** Instant auto-approval with 6-digit OTP.\n" +
          "- **Face Liveness:** 468 landmark tracking for secure 15-minute pass.\n" +
          "- **Secret Ballot:** AES-256-GCM client-side encryption.\n" +
          "- **VVPAT Receipt:** Verifiable ballot tracking on the public ledger.";
      }

      const fallbackMsg: Message = {
        id: `bot-fallback-${Date.now()}`,
        sender: "assistant",
        content: fallbackContent,
        suggestedQuestions: isAdmin
          ? ["How to manage elections?", "How to batch approve voters?", "How does Observer Consensus work?"]
          : ["How do I vote step by step?", "How does Aadhaar e-KYC work?", "Can admin see who I voted for?"],
        referencedModules: isAdmin ? ["Admin Governance", "Blockchain Explorer"] : ["Voter Dashboard", "Aadhaar e-KYC"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([getInitialMessage()]);
  };

  const currentTopics = isAdmin ? ADMIN_QUICK_TOPICS : VOTER_QUICK_TOPICS;

  // Format assistant markdown-like bold/lists for clean visual presentation
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="space-y-1.5 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Heading
          if (line.startsWith("### ")) {
            const isRestricted = line.includes("Restricted") || line.includes("Enforced");
            return (
              <h4 key={idx} className="font-bold text-sm text-foreground pt-1 tracking-tight flex items-center gap-1.5">
                {isRestricted ? (
                  <ShieldAlert className="size-3.5 text-rose-400 shrink-0" />
                ) : (
                  <Sparkles className="size-3.5 text-primary shrink-0" />
                )}
                <span>{line.replace("### ", "")}</span>
              </h4>
            );
          }

          // Bullet point
          if (line.startsWith("- ") || line.startsWith("* ")) {
            const clean = line.replace(/^[-*]\s+/, "");
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1 text-foreground/90">
                <span className="text-primary font-bold">•</span>
                <span>{parseBold(clean)}</span>
              </div>
            );
          }

          // Numbered list
          if (/^\d+\.\s+/.test(line)) {
            const num = line.match(/^(\d+)\.\s+/)?.[1];
            const clean = line.replace(/^\d+\.\s+/, "");
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1 text-foreground/90">
                <span className="font-mono text-primary font-bold text-[11px]">{num}.</span>
                <span>{parseBold(clean)}</span>
              </div>
            );
          }

          return <p key={idx} className="text-foreground/90">{parseBold(line)}</p>;
        })}
      </div>
    );
  };

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex size-12 items-center justify-center rounded-full text-primary-foreground shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 border group",
            isAdmin
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400/40 shadow-purple-900/30"
              : "bg-gradient-to-r from-primary to-blue-600 border-primary/40 shadow-primary/30"
          )}
          aria-label={isAdmin ? "Aegis Admin AI (Ctrl+/)" : "Ask Aegis AI (Ctrl+/)"}
          title={isAdmin ? "Aegis Admin AI (Ctrl+/)" : "Ask Aegis AI (Ctrl+/)"}
        >
          <div className="relative flex items-center justify-center">
            <Bot className="size-6 transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 border border-background/40" />
          </div>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[430px] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
            isMinimized ? "h-14" : "h-[590px] max-h-[85vh]",
            isAdmin && "border-purple-500/30 shadow-purple-950/20"
          )}
        >
          {/* Chat Window Header */}
          <div className="p-3.5 px-4 bg-muted/60 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-xl text-primary-foreground shadow-sm",
                  isAdmin
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600"
                    : "bg-gradient-to-br from-primary to-blue-600"
                )}
              >
                <Bot className="size-4" />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-card" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-foreground leading-none">Aegis</h3>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                      isAdmin
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-primary/20 text-primary"
                    )}
                  >
                    {isAdmin ? "ADMIN GOVERNANCE" : "VOTER ASSISTANT"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {isAdmin ? "Electoral Administration AI" : "Zero-Trust Electoral Intelligence"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetChat}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Restart conversation"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Close Assistant"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Role-Specific Quick Topics Chips */}
              <div className="px-3 py-2 bg-muted/20 border-b border-border/60 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
                {currentTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(topic.query)}
                    className={cn(
                      "whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] bg-background/80 border border-border/80 text-muted-foreground transition-all shrink-0 font-medium active:scale-95",
                      isAdmin
                        ? "hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/40"
                        : "hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                    )}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1.5",
                      msg.sender === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3.5 rounded-2xl max-w-[88%] shadow-xs transition-all",
                        msg.sender === "user"
                          ? isAdmin
                            ? "bg-purple-600 text-white rounded-tr-xs"
                            : "bg-primary text-primary-foreground rounded-tr-xs"
                          : msg.tone === "restricted"
                          ? "bg-rose-950/20 border border-rose-500/30 text-rose-100 rounded-tl-xs"
                          : "bg-muted/50 border border-border/80 text-foreground rounded-tl-xs"
                      )}
                    >
                      {msg.sender === "assistant" ? (
                        renderMessageContent(msg.content)
                      ) : (
                        <p className="text-xs font-medium">{msg.content}</p>
                      )}
                    </div>

                    {/* Referenced Module Badges */}
                    {msg.referencedModules && msg.referencedModules.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 px-1">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">Scope:</span>
                        {msg.referencedModules.map((mod, mi) => (
                          <span
                            key={mi}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/60"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggested Follow-up Questions */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="space-y-1 pt-1 max-w-[92%]">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold uppercase">
                          <LightbulbIcon className="size-3 text-amber-400" />
                          Suggested questions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((sq, sqi) => (
                            <button
                              key={sqi}
                              onClick={() => handleSendMessage(sq)}
                              className={cn(
                                "text-left text-[11px] px-2.5 py-1 rounded-lg bg-card border border-border text-foreground/80 transition-all flex items-center gap-1 group active:scale-95",
                                isAdmin
                                  ? "hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/40"
                                  : "hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                              )}
                            >
                              <span>{sq}</span>
                              <ChevronRight className="size-3 text-muted-foreground group-hover:text-primary shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-[9px] font-mono text-muted-foreground/60 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/50 border border-border/80 w-fit rounded-tl-xs">
                    <Bot className="size-3.5 text-primary animate-pulse" />
                    <div className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">Analyzing question...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-muted/40 border-t border-border flex items-center gap-2 shrink-0">
                <Input
                  ref={inputRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    isAdmin
                      ? "Ask about elections, approvals, consensus, audit..."
                      : "Ask about voting, Aadhaar e-KYC, VVPAT receipts..."
                  }
                  className="text-xs h-9 bg-background/90 border-border/80 focus-visible:ring-primary"
                  disabled={isTyping}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isTyping || !inputQuery.trim()}
                  size="sm"
                  className={cn(
                    "h-9 px-3 gap-1.5 shadow-raised shrink-0",
                    isAdmin && "bg-purple-600 hover:bg-purple-500 text-white"
                  )}
                >
                  <Send className="size-3.5" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function LightbulbIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
