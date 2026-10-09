import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, CheckCircle2, ShoppingCart, Loader2 } from "lucide-react";
import aiService from "../../services/aiService";
import { aiChatCannedResponses, mockPurchases } from "../../data/mockData";

const WELCOME = {
  role: "assistant",
  text: "Hello! I am your StockPilot AI Copilot. Ask me to check live stock, list low inventory, draft purchase orders, or view warehouse metrics.",
};

const SUGGESTIONS = [
  "What is our current warehouse stock status?",
  "List active product categories",
  "What products are low on stock?",
  "Total inventory valuation",
];

function fallbackReply() {
  return "Unable to reach the StockPilot AI Copilot service. Please verify that the backend server is running.";
}

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setTyping(true);

    try {
      const res = await aiService.chat(text);
      if (res && res.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.message,
            action: res.action || null,
            actionExecuted: false,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: fallbackReply(text) },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: fallbackReply(text) },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const executeAction = async (msgIndex, actionPayload) => {
    setExecutingActionId(msgIndex);
    try {
      const res = await aiService.chat("", actionPayload);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIndex]) {
          updated[msgIndex] = { ...updated[msgIndex], actionExecuted: true };
        }
        return [
          ...updated,
          {
            role: "assistant",
            text: res?.message || (actionPayload.type === "ACCEPT_ORDER" ? "Customer order accepted!" : "Purchase order created successfully!"),
          },
        ];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Failed to execute purchase order. Please verify backend connectivity.",
        },
      ]);
    } finally {
      setExecutingActionId(null);
    }
  };

  const renderFormattedText = (text) => {
    // Quick simple markdown renderer for bold and line breaks
    return text.split("\n").map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      return (
        <span key={lineIdx} className="block leading-relaxed">
          {parts.map((p, pIdx) => {
            if (p.startsWith("**") && p.endsWith("**")) {
              return <strong key={pIdx} className="font-semibold">{p.slice(2, -2)}</strong>;
            }
            if (p.startsWith("`") && p.endsWith("`")) {
              return (
                <code key={pIdx} className="rounded bg-graphite-900/10 px-1 py-0.5 font-mono text-xs dark:bg-paper-100/15">
                  {p.slice(1, -1)}
                </code>
              );
            }
            return p;
          })}
        </span>
      );
    });
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-graphite-900 px-4 py-2.5 text-paper-100 shadow-panel transition-all hover:scale-105 active:scale-95 dark:bg-signal dark:text-graphite-950"
        >
          <Sparkles size={18} />
          <span className="text-sm font-semibold tracking-wide">AI Copilot</span>
        </button>
      )}

      {open && (
        <div className="panel fixed bottom-5 right-5 z-50 flex h-[32rem] w-84 sm:w-[26rem] flex-col overflow-hidden rounded-xl shadow-2xl border border-graphite-800/20 bg-paper-50 dark:bg-graphite-900 dark:border-paper-100/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-graphite-800/10 bg-graphite-950 px-4 py-3 dark:border-paper-100/10 dark:bg-graphite-950">
            <div className="flex items-center gap-2.5 text-paper-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal/20 text-signal">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">StockPilot Copilot</div>
                <div className="text-[10px] text-paper-300/70 font-mono">Live Tool-Calling Agent v2.0</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg p-1.5 text-paper-300 hover:bg-paper-100/10 hover:text-paper-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-xs sm:text-sm">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 ${
                    m.role === "assistant"
                      ? "bg-paper-200/70 text-graphite-900 dark:bg-graphite-800 dark:text-paper-100 border border-graphite-800/5 dark:border-paper-100/5"
                      : "ml-auto bg-signal font-medium text-graphite-950"
                  }`}
                >
                  {renderFormattedText(m.text)}
                </div>

                {/* Interactive Tool Action Confirmation Card */}
                {m.action && m.action.type === "APPROVE_PO" && (
                  <div className="ml-2 max-w-[88%] rounded-lg border border-signal/40 bg-signal/10 p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-graphite-900 dark:text-paper-100">
                      <ShoppingCart size={14} className="text-signal" />
                      Draft Purchase Order Ready
                    </div>
                    <div className="font-mono text-[11px] text-graphite-700 dark:text-paper-300 space-y-0.5">
                      <div>SKU: <span className="text-graphite-900 dark:text-paper-100 font-semibold">{m.action.sku}</span></div>
                      <div>Vendor: {m.action.supplierName}</div>
                      <div>Quantity: {m.action.quantity} units</div>
                      <div>Total: ${m.action.estimatedCost?.toLocaleString()}</div>
                    </div>
                    {m.actionExecuted ? (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-stock-in dark:text-stock-in">
                        <CheckCircle2 size={13} /> Order Approved & Issued
                      </div>
                    ) : (
                      <button
                        onClick={() => executeAction(i, m.action)}
                        disabled={executingActionId === i}
                        className="flex w-full items-center justify-center gap-1.5 rounded bg-graphite-950 py-1.5 px-3 font-semibold text-paper-100 shadow hover:bg-graphite-900 disabled:opacity-60 dark:bg-signal dark:text-graphite-950 dark:hover:bg-signal/90"
                      >
                        {executingActionId === i ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Submitting to Database...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            Approve & Submit Purchase Order
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Interactive Order Acceptance Card */}
                {m.action && m.action.type === "ACCEPT_ORDER" && (
                  <div className="ml-2 max-w-[88%] rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-graphite-900 dark:text-paper-100">
                      <ShoppingCart size={14} className="text-amber-500" />
                      Pending Customer Order Review
                    </div>
                    <div className="font-mono text-[11px] text-graphite-700 dark:text-paper-300 space-y-0.5">
                      <div>Invoice: <span className="text-graphite-900 dark:text-paper-100 font-semibold">{m.action.invoice}</span></div>
                      <div>Customer: {m.action.customer}</div>
                      <div>Total: ${m.action.total?.toLocaleString()}</div>
                    </div>
                    {m.actionExecuted ? (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-stock-in dark:text-stock-in">
                        <CheckCircle2 size={13} /> Order Accepted & Inventory Allocated
                      </div>
                    ) : (
                      <button
                        onClick={() => executeAction(i, m.action)}
                        disabled={executingActionId === i}
                        className="flex w-full items-center justify-center gap-1.5 rounded bg-amber-600 py-1.5 px-3 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-60"
                      >
                        {executingActionId === i ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Accepting & Deducting Stock...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            Accept Order & Deduct Warehouse Stock
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="flex items-center gap-2 rounded-xl bg-paper-200/70 dark:bg-graphite-800 px-3.5 py-2.5 text-xs text-graphite-500 dark:text-paper-300/70 w-fit">
                <Loader2 size={13} className="animate-spin text-signal" />
                Querying warehouse catalog & calculating tools…
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-1.5 border-t border-graphite-800/10 dark:border-paper-100/10 flex gap-1.5 overflow-x-auto scrollbar-none bg-paper-100 dark:bg-graphite-950/60">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="whitespace-nowrap rounded-full border border-graphite-800/15 dark:border-paper-100/15 px-2.5 py-0.5 text-[11px] font-medium text-graphite-700 dark:text-paper-300 hover:border-signal hover:text-signal transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-graphite-800/10 p-3 bg-paper-50 dark:bg-graphite-900 dark:border-paper-100/10"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or command an order…"
              className="flex-1 rounded-lg border border-graphite-800/15 bg-paper-100 px-3 py-2 text-xs sm:text-sm focus:border-signal focus:outline-none dark:border-paper-100/15 dark:bg-graphite-800 dark:text-paper-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className="rounded-lg bg-graphite-950 p-2 text-paper-100 hover:bg-graphite-900 disabled:opacity-40 dark:bg-signal dark:text-graphite-950 dark:hover:bg-signal/90 transition-opacity"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
