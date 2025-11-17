import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Bot, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatRole = "user" | "assistant";

interface AgentChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface AgentChatContext {
  contract?: {
    id?: string | null;
    title?: string | null;
    contractType?: string | null;
    classificationFallback?: boolean;
  };
  severitySnapshot?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    total?: number;
  };
  topDepartments?: Array<{ key: string; label: string; count: number }>;
  missingInformation?: string[];
  clauseEvidence?: Array<{
    clause?: string;
    clause_title?: string;
    clause_number?: string;
    clause_text?: string;
    evidence_excerpt?: string;
    page_reference?: string;
    recommendation?: string;
    importance?: string;
  }>;
  recommendations?: Array<{
    id: string;
    description: string;
    severity: string;
    department: string;
    owner?: string;
    dueTimeline?: string;
  }>;
  actionItems?: Array<{
    id: string;
    description: string;
    severity: string;
    department: string;
    owner?: string;
    dueTimeline?: string;
  }>;
}

export interface AgentProposedEdit {
  id: string;
  clauseReference?: string | null;
  changeType?: string;
  originalText?: string | null;
  suggestedText: string;
  rationale: string;
  severity?: string;
  references?: string[];
}

export interface AgentInteractionMeta {
  provider?: string;
  model?: string;
  latencyMs?: number;
}

interface AgentChatProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  context: AgentChatContext;
  onEdits?: (
    edits: AgentProposedEdit[],
    meta: AgentInteractionMeta,
  ) => void;
}

export interface AgentChatHandle {
  sendPrompt: (content: string) => Promise<void>;
}

const AgentChat = forwardRef<AgentChatHandle, AgentChatProps>(
  ({ open, onOpen, onClose, context, onEdits }, ref) => {
    const [messages, setMessages] = useState<AgentChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasBootstrapped, setHasBootstrapped] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop =
            containerRef.current.scrollHeight;
        }
      });
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
      if (!open) {
        setError(null);
      }
    }, [open]);

    const mappedHistory = useMemo(
      () => messages.map(({ role, content }) => ({ role, content })),
      [messages],
    );

    const callAgent = useCallback(
      async (userContent?: string) => {
        setIsStreaming(true);
        setError(null);

        const payloadMessages = [...mappedHistory];
        if (userContent) {
          const timestamp = new Date().toISOString();
          payloadMessages.push({ role: "user", content: userContent });
          setMessages((prev) => [
            ...prev,
            {
              id: `user-${Date.now()}`,
              role: "user",
              content: userContent,
              timestamp,
            },
          ]);
        }

        const startTime =
          typeof performance !== "undefined" ? performance.now() : null;

        try {
          const response = await fetch("/api/agent/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contractId: context.contract?.id ?? null,
              messages: payloadMessages,
              context,
            }),
          });

          if (!response.ok) {
            throw new Error(`Agent request failed: ${response.status}`);
          }

          const data = (await response.json()) as {
            message?: { role: "assistant"; content: string };
            proposedEdits?: AgentProposedEdit[];
            provider?: string;
            model?: string;
          };

          const sanitizedEdits = Array.isArray(data.proposedEdits)
            ? data.proposedEdits.filter(
                (edit) =>
                  edit &&
                  typeof edit.suggestedText === "string" &&
                  typeof edit.rationale === "string",
              )
            : [];

          if (data.message?.content) {
            let assistantContent = data.message.content;

            if (sanitizedEdits.length) {
              const editsSummary = sanitizedEdits
                .map((edit) => {
                  const reference =
                    edit.clauseReference || edit.id || "Clause update";
                  const changeType = edit.changeType || "modify";
                  return `• ${reference} — ${changeType}\n  Suggestion: ${edit.suggestedText}\n  Rationale: ${edit.rationale}`;
                })
                .join("\n");

              assistantContent = `${assistantContent}\n\nProposed Edits:\n${editsSummary}`;
            }

            if (data.provider && data.model) {
              assistantContent = `${assistantContent}\n\n(Source: ${data.provider} – ${data.model})`;
            }

            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: assistantContent,
                timestamp: new Date().toISOString(),
              },
            ]);
          }

          const latencyMs =
            startTime !== null && typeof performance !== "undefined"
              ? Math.round(performance.now() - startTime)
              : undefined;

          onEdits?.(sanitizedEdits, {
            provider: data.provider,
            model: data.model,
            latencyMs,
          });
        } catch (agentError) {
          const message =
            agentError instanceof Error ? agentError.message : String(agentError);
          setError(message);
        } finally {
          setIsStreaming(false);
        }
      },
      [context, mappedHistory, onEdits],
    );

    useEffect(() => {
      if (!open || hasBootstrapped) return;
      setHasBootstrapped(true);
      void callAgent("Provide a quick overview of the priority edits to begin with.");
    }, [open, hasBootstrapped, callAgent]);

    const handleSubmit = useCallback(
      async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!input.trim() || isStreaming) return;
        const content = input.trim();
        setInput("");
        await callAgent(content);
      },
      [callAgent, input, isStreaming],
    );

    const renderMessage = useCallback((message: AgentChatMessage) => {
      const isUser = message.role === "user";
      return (
        <div
          key={message.id}
          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              isUser
                ? "bg-[#9A7C7C] text-white rounded-br-sm"
                : "bg-white text-[#271D1D] border border-[#E8DDDD] rounded-bl-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wide">
              {isUser ? (
                <span className="opacity-70">You</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#9A7C7C]">
                  <Bot className="w-3 h-3" /> Agent
                </span>
              )}
              <span className="opacity-50">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      );
    }, []);

    useImperativeHandle(ref, () => ({
      sendPrompt: async (content: string) => {
        setHasBootstrapped(true);
        await callAgent(content);
      },
    }));

    return (
      <div className="print:hidden">
        {open && (
          <div className="fixed bottom-28 right-6 z-50 w-[min(90vw,360px)] shadow-2xl rounded-2xl border border-[#E8DDDD] bg-white/95 backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-[#E8DDDD] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#271D1D]">
                    Contract Editing Copilot
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-[#9A7C7C]">
                    Context-aware assistance
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-[#725A5A] hover:bg-[#F9F8F8]"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 pt-3 pb-2">
              <div className="bg-[#FDFBFB] border border-[#E8DDDD] rounded-xl h-80 overflow-hidden flex flex-col">
                <div
                  ref={containerRef}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                >
                  {messages.map(renderMessage)}

                  {isStreaming && (
                    <div className="flex items-center gap-2 text-xs text-[#725A5A]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Agent is preparing a suggestion…
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}. Try again in a moment.
                    </div>
                  )}
                </div>

                <form
                  className="border-t border-[#E8DDDD] bg-white px-3 py-3"
                  onSubmit={handleSubmit}
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Describe the clause or change you need..."
                      className="flex-1 text-sm"
                      disabled={isStreaming}
                    />
                    <Button
                      type="submit"
                      disabled={isStreaming || !input.trim()}
                      className="bg-[#9A7C7C] hover:bg-[#725A5A] text-white"
                      size="icon"
                    >
                      {isStreaming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (open) return;
            setError(null);
            setTimeout(scrollToBottom, 0);
            onOpen();
          }}
          className={`fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg border border-[#E8DDDD] bg-white text-[#9A7C7C] hover:bg-[#F9F8F8] transition-all print:hidden ${
            open ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-label="Open contract assistant"
        >
          <Bot className="w-6 h-6 mx-auto" />
        </button>
      </div>
    );
  },
);

AgentChat.displayName = "AgentChat";

export default AgentChat;
