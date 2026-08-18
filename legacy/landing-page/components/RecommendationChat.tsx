"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, MessageCircle, Send, Sparkles, X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MLOPS_API = process.env.NEXT_PUBLIC_MLOPS_API || "http://localhost:5001";

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! 🎬 Diga o que você está com vontade de assistir (gênero, humor, filme favorito…) e vou recomendar filmes incríveis pra você!",
};

async function fetchRecommendations(query: string): Promise<string> {
  try {
    const res = await fetch(`${MLOPS_API}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const recs = data.recommendations;
    if (!recs || recs.length === 0) {
      return "Não encontrei filmes com essas características, mas que tal conferir nosso catálogo para ver os lançamentos? 😊";
    }
    const lines = recs.map(
      (m: { title: string; reason: string }, i: number) =>
        `${i + 1}. **${m.title}** — ${m.reason}.`,
    );
    return `Recomendo esses filmes:\n\n${lines.join("\n")}\n\nGostou de alguma sugestão? Posso te dar mais detalhes! 🍿`;
  } catch {
    return "Desculpe, não consegui me conectar ao serviço de recomendações. Tente novamente mais tarde! 😅";
  }
}

export default function RecommendationChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    const reply = await fetchRecommendations(trimmed);
    const botMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: reply };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  }, [input, isLoading]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--accent-red)", color: "white", boxShadow: "0 8px 24px rgba(239,68,68,0.35)" }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Abrir chat de recomendações"
          >
            <MessageCircle size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="fixed bottom-6 right-6 z-50 flex w-[calc(100vw-2rem)] max-w-[400px] flex-col rounded-lg border"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--background) 96%, transparent)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
              maxHeight: "min(600px, calc(100vh - 4rem))",
            }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "color-mix(in srgb, var(--border) 60%, transparent)" }}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: "var(--accent-red)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Recomendação de Filmes</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded hover:bg-zinc-800" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "var(--accent-red)", color: "white" }
                        : { border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "rgba(39,39,42,0.5)", color: "var(--foreground)" }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--border) 60%, transparent)", background: "rgba(39,39,42,0.5)" }}>
                    <Film size={14} style={{ color: "var(--accent-red)" }} />
                    <span className="text-sm text-zinc-400">Pensando nas melhores recomendações...</span>
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--accent-red)", animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--accent-red)", animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--accent-red)", animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t px-5 py-4" style={{ borderColor: "color-mix(in srgb, var(--border) 60%, transparent)" }}>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ex: ação, suspense, drama..."
                  disabled={isLoading}
                  className="h-11 flex-1 rounded-lg border bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60 focus:outline-none focus:ring-1"
                  style={{ borderColor: "var(--border)", "--tw-ring-color": "color-mix(in srgb, var(--accent-red) 45%, transparent)" } as React.CSSProperties}
                  aria-label="Digite sua mensagem"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
                  style={{ background: "var(--accent-red)", color: "white" }}
                  aria-label="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
