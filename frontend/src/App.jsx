import { useState, useEffect, useCallback, useRef } from "react";

// ─── Palette & Fonts ──────────────────────────────────────────────────────────
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a0c10;
  --surface: #111318;
  --surface2: #181c24;
  --border: #252a35;
  --accent: #f97316;
  --accent2: #fb923c;
  --green: #22d3a0;
  --red: #f43f5e;
  --yellow: #fbbf24;
  --blue: #38bdf8;
  --purple: #a78bfa;
  --text: #f1f5f9;
  --muted: #64748b;
  --card-glow: 0 0 0 1px #252a35, 0 4px 24px rgba(249,115,22,0.06);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* Animations */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-ring {
  0%   { transform: scale(0.9); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes ticker {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

.fade-up { animation: fadeUp .45s ease both; }
.fade-up-d1 { animation: fadeUp .45s .1s ease both; }
.fade-up-d2 { animation: fadeUp .45s .2s ease both; }
.fade-up-d3 { animation: fadeUp .45s .3s ease both; }
`;

// ─── Mock Data Store ──────────────────────────────────────────────────────────
const initialCounters = [
  { id: "C1", name: "Counter 1", operator: "Ramesh", queue: 3, avgTime: 4, status: "open"  },
  { id: "C2", name: "Counter 2", operator: "Priya",  queue: 7, avgTime: 3, status: "open"  },
  { id: "C3", name: "Counter 3", operator: "Suresh", queue: 1, avgTime: 5, status: "open"  },
  { id: "C4", name: "Express",   operator: "Kavita", queue: 2, avgTime: 2, status: "open"  },
  { id: "C5", name: "Counter 5", operator: "Mohan",  queue: 0, avgTime: 4, status: "closed"},
];

const initialCartHolds = [
  { id: "H001", customer: "Anjali K.",   phone: "98765xxxxx", counterId: "C2", tokenFee: 20, timestamp: Date.now() - 1800000, status: "holding" },
  { id: "H002", customer: "Rajesh M.",   phone: "91234xxxxx", counterId: "C1", tokenFee: 20, timestamp: Date.now() - 900000,  status: "holding" },
];

// ─── Utility Helpers ─────────────────────────────────────────────────────────
const waitMin = (c) => c.queue * c.avgTime;
const waitLabel = (m) => m === 0 ? "No wait" : m < 60 ? `~${m} min` : `~${Math.round(m/60)}h ${m%60}m`;
const statusColor = (m) => m === 0 ? "var(--green)" : m <= 10 ? "var(--yellow)" : "var(--red)";
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ children, color = "var(--accent)" }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600,
      letterSpacing: ".04em", textTransform: "uppercase"
    }}>{children}</span>
  );
}

function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: glow ? "0 0 0 1px var(--border), 0 4px 40px rgba(249,115,22,.12)" : "var(--card-glow)",
      ...style
    }}>{children}</div>
  );
}

function Stat({ label, value, sub, color = "var(--text)" }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Syne", color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 20, height: 20, border: "2px solid var(--border)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />;
}

function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = {
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: 10, fontFamily: "DM Sans",
    fontWeight: 600, transition: "all .18s", opacity: disabled ? .5 : 1,
    padding: small ? "7px 16px" : "11px 22px",
    fontSize: small ? 13 : 14,
    ...style
  };
  const variants = {
    primary: { background: "var(--accent)", color: "#fff", boxShadow: "0 2px 16px rgba(249,115,22,.35)" },
    ghost:   { background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)" },
    danger:  { background: "var(--red)", color: "#fff" },
    success: { background: "var(--green)", color: "#000" },
    muted:   { background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

// ─── QR Code SVG (mock visual) ────────────────────────────────────────────────
function QRCode({ value, size = 120 }) {
  // Generate a deterministic pattern from value string
  const cells = 17;
  const cell = size / cells;
  const hash = value.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 0);
  const grid = Array.from({ length: cells * cells }, (_, i) => {
    const row = Math.floor(i / cells), col = i % cells;
    // finder pattern corners
    if ((row < 7 && col < 7) || (row < 7 && col >= cells - 7) || (row >= cells - 7 && col < 7)) return 1;
    return ((hash * (i + 7)) ^ (i * 13)) % 3 === 0 ? 1 : 0;
  });
  return (
    <svg width={size} height={size} style={{ borderRadius: 8, display: "block" }}>
      <rect width={size} height={size} fill="#fff" rx="8" />
      {grid.map((v, i) =>
        v ? <rect key={i} x={(i % cells) * cell} y={Math.floor(i / cells) * cell} width={cell} height={cell} fill="#0a0c10" /> : null
      )}
    </svg>
  );
}

// ─── Live Ticker ──────────────────────────────────────────────────────────────
function Ticker({ counters }) {
  const msg = counters.filter(c => c.status === "open")
    .map(c => `${c.name}: ${waitLabel(waitMin(c))} (${c.queue} ahead)`).join("   •   ");
  return (
    <div style={{ background: "var(--accent)", color: "#fff", padding: "6px 0", overflow: "hidden", position: "relative" }}>
      <div style={{ whiteSpace: "nowrap", animation: "ticker 28s linear infinite", display: "inline-block", fontSize: 12, fontWeight: 600 }}>
        🛒 &nbsp; LIVE QUEUE STATUS &nbsp;•&nbsp; {msg} &nbsp;•&nbsp; 🛒 &nbsp; LIVE QUEUE STATUS &nbsp;•&nbsp; {msg}
      </div>
    </div>
  );
}

// ─── CUSTOMER VIEW ────────────────────────────────────────────────────────────
function CustomerApp({ counters, setCounters, cartHolds, setCartHolds }) {
  const [step, setStep] = useState("home");       // home | browse | joined | cart-hold
  const [joined, setJoined] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cartName, setCartName] = useState("");
  const [cartPhone, setCartPhone] = useState("");
  const [cartCounter, setCartCounter] = useState("");
  const [myToken, setMyToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState(null);

  const openCounters = counters.filter(c => c.status === "open");

  const joinQueue = (counter) => {
    if (!name.trim() || !phone.trim()) { setNotify({ msg: "Please enter your name & phone", type: "error" }); return; }
    setLoading(true);
    setTimeout(() => {
      const updated = counters.map(c => c.id === counter.id ? { ...c, queue: c.queue + 1 } : c);
      setCounters(updated);
      const token = uid();
      const pos = counter.queue + 1;
      const wait = pos * counter.avgTime;
      setJoined({ counter, pos, wait, token, name, phone });
      setStep("joined");
      setLoading(false);
    }, 900);
  };

  const submitCartHold = () => {
    if (!cartName.trim() || !cartPhone.trim() || !cartCounter) { setNotify({ msg: "Fill all fields", type: "error" }); return; }
    setLoading(true);
    setTimeout(() => {
      const newHold = { id: `H${uid()}`, customer: cartName, phone: cartPhone, counterId: cartCounter, tokenFee: 20, timestamp: Date.now(), status: "holding" };
      setCartHolds(prev => [...prev, newHold]);
      setMyToken(newHold);
      setStep("cart-confirm");
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    if (notify) { const t = setTimeout(() => setNotify(null), 2800); return () => clearTimeout(t); }
  }, [notify]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 40px" }}>
      {/* Notify Toast */}
      {notify && (
        <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: notify.type === "error" ? "var(--red)" : "var(--green)", color: "#fff", borderRadius: 10, padding: "10px 22px", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px #0008" }}>
          {notify.msg}
        </div>
      )}

      {/* HOME */}
      {step === "home" && (
        <div className="fade-up">
          {/* Hero */}
          <div style={{ textAlign: "center", padding: "36px 0 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#fb923c)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 0 40px rgba(249,115,22,.35)" }}>🛒</div>
            <h1 style={{ fontFamily: "Syne", fontSize: 30, fontWeight: 800, letterSpacing: "-.02em" }}>SmartQueue<span style={{ color: "var(--accent)" }}>+</span></h1>
            <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>Skip the line. Shop in peace.</p>
          </div>

          {/* QR Scan Illustration */}
          <Card style={{ textAlign: "center", marginBottom: 16 }} glow>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, fontWeight: 500 }}>Your Store QR Code</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <QRCode value="smartqueue-dmart-store-001" size={130} />
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Scan at store entrance to join virtual queue</p>
          </Card>

          {/* Input */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--muted)" }}>YOUR DETAILS</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={inputStyle} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" style={{ ...inputStyle, marginBottom: 0 }} />
          </Card>

          <Btn onClick={() => setStep("browse")} style={{ width: "100%" }}>View Live Queues →</Btn>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => setStep("cart-hold")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
              🛍 Place Cart on Hold (₹20 token)
            </button>
          </div>
        </div>
      )}

      {/* BROWSE COUNTERS */}
      {step === "browse" && (
        <div className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0 16px" }}>
            <button onClick={() => setStep("home")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20 }}>←</button>
            <h2 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 700 }}>Live Counters</h2>
          </div>
          {openCounters.map((c, i) => {
            const wait = waitMin(c);
            return (
              <Card key={c.id} style={{ marginBottom: 12, animationDelay: `${i * .08}s` }} className="fade-up">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>Operator: {c.operator}</div>
                  </div>
                  <Badge color={statusColor(wait)}>{wait === 0 ? "Empty" : wait <= 10 ? "Short" : "Busy"}</Badge>
                </div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <Stat label="People ahead" value={c.queue} color="var(--text)" />
                  <Stat label="Est. wait" value={waitLabel(wait)} color={statusColor(wait)} />
                  <Stat label="Avg/person" value={`${c.avgTime}m`} color="var(--blue)" />
                </div>
                {/* Mini bar */}
                <div style={{ background: "var(--surface2)", borderRadius: 6, height: 6, marginBottom: 14, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(c.queue / 12 * 100, 100)}%`, background: statusColor(wait), borderRadius: 6, transition: "width .4s" }} />
                </div>
                {loading ? <Spinner /> : <Btn onClick={() => joinQueue(c)} style={{ width: "100%" }} small>Join This Queue</Btn>}
                {wait > 60 && <div style={{ color: "var(--yellow)", fontSize: 11, marginTop: 8, textAlign: "center" }}>⚠ Long wait! Consider placing cart on hold.</div>}
              </Card>
            );
          })}
        </div>
      )}

      {/* JOINED CONFIRMATION */}
      {step === "joined" && joined && (
        <div className="fade-up" style={{ textAlign: "center", padding: "36px 0" }}>
          {/* Pulse ring */}
          <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--green)", opacity: .15, animation: "pulse-ring 1.6s ease-out infinite" }} />
            <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✓</div>
          </div>
          <h2 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, color: "var(--green)" }}>You're in Queue!</h2>
          <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>{joined.name} — {joined.counter.name}</p>

          <Card style={{ margin: "24px 0", textAlign: "left" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <Stat label="Your Position" value={`#${joined.pos}`} color="var(--accent)" />
              <Stat label="Est. Wait" value={waitLabel(joined.wait)} color={statusColor(joined.wait)} />
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Token</span>
              <span style={{ fontFamily: "Syne", fontWeight: 700, color: "var(--blue)" }}>{joined.token}</span>
            </div>
          </Card>

          <Card style={{ marginBottom: 16, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>📱</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>SMS Alert Coming!</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>We'll notify {joined.phone} when 2 people are ahead of you.</div>
              </div>
            </div>
          </Card>

          {joined.wait > 60 && (
            <Card style={{ border: "1px solid var(--yellow)33", marginBottom: 16 }}>
              <div style={{ color: "var(--yellow)", fontWeight: 600, marginBottom: 6 }}>⚠ Long Wait Detected</div>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Your estimated wait exceeds 1 hour. Place your cart at the hold counter for just ₹20 refundable token.</p>
              <Btn onClick={() => { setStep("cart-hold"); setCartName(joined.name); setCartPhone(joined.phone); }} variant="ghost" small style={{ marginTop: 10 }}>Place Cart on Hold</Btn>
            </Card>
          )}

          <Btn onClick={() => { setStep("home"); setJoined(null); setName(""); setPhone(""); }} variant="muted">← Back to Home</Btn>
        </div>
      )}

      {/* CART HOLD FORM */}
      {step === "cart-hold" && (
        <div className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0 16px" }}>
            <button onClick={() => setStep("home")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20 }}>←</button>
            <h2 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 700 }}>Cart Hold Service</h2>
          </div>

          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 28 }}>🛍</span>
              <div>
                <div style={{ fontWeight: 600 }}>Secure Cart Holding</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Deposit ₹20 refundable token. Collect cart anytime before counter call. Token refunded on retrieval.</div>
              </div>
            </div>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--muted)" }}>CUSTOMER DETAILS</div>
            <input value={cartName} onChange={e => setCartName(e.target.value)} placeholder="Full Name" style={inputStyle} />
            <input value={cartPhone} onChange={e => setCartPhone(e.target.value)} placeholder="Phone Number" style={inputStyle} />
            <select value={cartCounter} onChange={e => setCartCounter(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              <option value="">— Select Your Counter —</option>
              {counters.filter(c => c.status === "open").map(c => (
                <option key={c.id} value={c.id}>{c.name} ({waitLabel(waitMin(c))})</option>
              ))}
            </select>
          </Card>

          <Card style={{ marginBottom: 20, background: "rgba(249,115,22,.07)", border: "1px solid var(--accent)33" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "var(--muted)" }}>Token Fee</span>
              <span style={{ fontWeight: 700, color: "var(--accent)" }}>₹20 (Refundable)</span>
            </div>
          </Card>

          {loading ? <Spinner /> : <Btn onClick={submitCartHold} style={{ width: "100%" }}>Pay ₹20 & Place Cart</Btn>}
        </div>
      )}

      {/* CART CONFIRM */}
      {step === "cart-confirm" && myToken && (
        <div className="fade-up" style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🧾</div>
          <h2 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, color: "var(--green)" }}>Cart Secured!</h2>
          <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 24, fontSize: 14 }}>Your cart is safely held at the luggage counter.</p>
          <Card style={{ textAlign: "left", marginBottom: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Hold ID", myToken.id], ["Name", myToken.customer], ["Counter", myToken.counterId], ["Time", fmtTime(myToken.timestamp)], ["Token Fee", "₹20 (Refundable)"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--muted)" }}>{k}</span>
                  <span style={{ fontWeight: 600, color: k === "Token Fee" ? "var(--accent)" : "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>Show this ID at the luggage counter to retrieve your cart.</p>
          <Btn onClick={() => { setStep("home"); setMyToken(null); setCartName(""); setCartPhone(""); setCartCounter(""); }} variant="muted">← Back to Home</Btn>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ counters, setCounters, cartHolds, setCartHolds }) {
  const [tab, setTab] = useState("dashboard");
  const [editId, setEditId] = useState(null);
  const [newCounter, setNewCounter] = useState({ name: "", operator: "", avgTime: 4 });
  const [msg, setMsg] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const totalQ = counters.reduce((a, c) => a + c.queue, 0);
  const openC = counters.filter(c => c.status === "open").length;
  const holdingCarts = cartHolds.filter(h => h.status === "holding").length;

  const toggleStatus = (id) => setCounters(counters.map(c => c.id === id ? { ...c, status: c.status === "open" ? "closed" : "open" } : c));
  const adjustQ = (id, delta) => setCounters(counters.map(c => c.id === id ? { ...c, queue: Math.max(0, c.queue + delta) } : c));
  const releaseHold = (hid) => {
    setCartHolds(prev => prev.map(h => h.id === hid ? { ...h, status: "released" } : h));
    setMsg({ text: `Cart ${hid} released. ₹20 refunded.`, type: "success" });
    setTimeout(() => setMsg(null), 2500);
  };
  const addCounter = () => {
    if (!newCounter.name.trim() || !newCounter.operator.trim()) return;
    const id = `C${counters.length + 1}`;
    setCounters([...counters, { id, ...newCounter, queue: 0, status: "open" }]);
    setNewCounter({ name: "", operator: "", avgTime: 4 });
  };

  const getAiInsight = async () => {
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const payload = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `You are an AI advisor for SmartQueue+, a retail queue management system in India. Here is the current store status:
- Open Counters: ${openC}/${counters.length}
- Total People in Queue: ${totalQ}
- Carts on Hold: ${holdingCarts}
- Counters: ${JSON.stringify(counters.map(c => ({ name: c.name, queue: c.queue, wait: waitMin(c) + "min", status: c.status })))}

Give 2-3 short, practical, actionable suggestions to improve queue flow right now. Be specific. Max 120 words. Use bullet points.`
        }]
      };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setAiSuggestion(data.content?.[0]?.text || "No suggestions available.");
    } catch {
      setAiSuggestion("Could not fetch AI suggestions. Check network.");
    }
    setAiLoading(false);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "counters",  label: "Counters",  icon: "🏷" },
    { id: "holds",     label: "Cart Holds", icon: "🛍" },
    { id: "analytics", label: "Analytics", icon: "📈" },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 40px" }}>
      {msg && (
        <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: msg.type === "error" ? "var(--red)" : "var(--green)", color: msg.type === "success" ? "#000" : "#fff", borderRadius: 10, padding: "10px 22px", fontWeight: 600, fontSize: 14 }}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "28px 0 20px", borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800 }}>Admin Panel</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>D-Mart Store #042 • Hyderabad</p>
          </div>
          <Badge color="var(--green)">● Live</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "var(--surface)", borderRadius: 12, padding: 5, border: "1px solid var(--border)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "DM Sans", fontWeight: 600, fontSize: 12, transition: "all .2s", background: tab === t.id ? "var(--accent)" : "transparent", color: tab === t.id ? "#fff" : "var(--muted)" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="fade-up">
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total in Queue", value: totalQ, color: "var(--accent)", icon: "👥" },
              { label: "Open Counters", value: `${openC}/${counters.length}`, color: "var(--green)", icon: "🏪" },
              { label: "Carts on Hold", value: holdingCarts, color: "var(--blue)", icon: "🛍" },
              { label: "Avg Wait", value: waitLabel(Math.round(totalQ > 0 ? counters.filter(c=>c.status==="open").reduce((a,c)=>a+waitMin(c),0)/openC : 0)), color: "var(--yellow)", icon: "⏱" },
            ].map((s, i) => (
              <Card key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
              </Card>
            ))}
          </div>

          {/* AI Insights */}
          <Card glow style={{ marginBottom: 20, border: "1px solid rgba(167,139,250,.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>AI Queue Advisor</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Powered by Claude</div>
                </div>
              </div>
              <Btn onClick={getAiInsight} small variant="ghost" disabled={aiLoading}>
                {aiLoading ? "Analyzing..." : "Get Suggestions"}
              </Btn>
            </div>
            {aiLoading && <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)", fontSize: 13 }}><Spinner /> Analyzing queue patterns...</div>}
            {aiSuggestion && (
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, background: "var(--surface2)", borderRadius: 10, padding: 14, whiteSpace: "pre-line" }}>
                {aiSuggestion}
              </div>
            )}
            {!aiSuggestion && !aiLoading && (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Click "Get Suggestions" to get AI-powered queue optimization advice based on current store data.</p>
            )}
          </Card>

          {/* Quick counter overview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {counters.map(c => {
              const wait = waitMin(c);
              const closed = c.status === "closed";
              return (
                <Card key={c.id} style={{ opacity: closed ? .55 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontFamily: "Syne" }}>{c.name}</span>
                    <Badge color={closed ? "var(--muted)" : statusColor(wait)}>{closed ? "Closed" : "Open"}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--muted)" }}>
                    <span>👥 {c.queue}</span>
                    <span>⏱ {waitLabel(wait)}</span>
                    <span>👤 {c.operator}</span>
                  </div>
                  <div style={{ background: "var(--surface2)", borderRadius: 4, height: 4, marginTop: 10 }}>
                    <div style={{ height: "100%", width: `${Math.min(c.queue/12*100,100)}%`, background: closed ? "var(--muted)" : statusColor(wait), borderRadius: 4 }} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* COUNTERS TAB */}
      {tab === "counters" && (
        <div className="fade-up">
          {counters.map(c => (
            <Card key={c.id} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: "Syne", fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.operator}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Btn onClick={() => adjustQ(c.id, -1)} small variant="muted" disabled={c.queue === 0}>-</Btn>
                <span style={{ fontFamily: "Syne", fontWeight: 700, minWidth: 28, textAlign: "center" }}>{c.queue}</span>
                <Btn onClick={() => adjustQ(c.id, +1)} small variant="muted">+</Btn>
              </div>
              <div style={{ fontSize: 13, color: statusColor(waitMin(c)), minWidth: 70 }}>{waitLabel(waitMin(c))}</div>
              <Btn onClick={() => toggleStatus(c.id)} small variant={c.status === "open" ? "danger" : "success"}>
                {c.status === "open" ? "Close" : "Open"}
              </Btn>
            </Card>
          ))}

          {/* Add Counter */}
          <Card style={{ marginTop: 20, border: "1px dashed var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--muted)" }}>ADD NEW COUNTER</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <input value={newCounter.name} onChange={e => setNewCounter(p => ({ ...p, name: e.target.value }))} placeholder="Counter Name" style={{ ...inputStyle, marginBottom: 0 }} />
              <input value={newCounter.operator} onChange={e => setNewCounter(p => ({ ...p, operator: e.target.value }))} placeholder="Operator Name" style={{ ...inputStyle, marginBottom: 0 }} />
              <Btn onClick={addCounter} small>Add</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* CART HOLDS TAB */}
      {tab === "holds" && (
        <div className="fade-up">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700 }}>Cart Hold Logs</h3>
            <Badge color="var(--blue)">{holdingCarts} Active</Badge>
          </div>
          {cartHolds.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>No cart holds yet.</p>}
          {cartHolds.map(h => (
            <Card key={h.id} style={{ marginBottom: 10, border: h.status === "holding" ? "1px solid rgba(56,189,248,.25)" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "Syne", fontWeight: 700 }}>{h.id}</span>
                    <Badge color={h.status === "holding" ? "var(--blue)" : "var(--green)"}>{h.status}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{h.customer} • {h.phone}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Counter: {h.counterId} • {fmtTime(h.timestamp)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--accent)", fontWeight: 700 }}>₹20 Token</div>
                  {h.status === "holding" && <Btn onClick={() => releaseHold(h.id)} small variant="success" style={{ marginTop: 6 }}>Release Cart</Btn>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="fade-up">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Peak hours bar chart */}
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 16, fontFamily: "Syne" }}>Peak Hours Today</div>
              {[["10AM", 40], ["11AM", 75], ["12PM", 92], ["1PM", 85], ["2PM", 55], ["3PM", 68], ["4PM", 88], ["5PM", 95], ["6PM", 72], ["7PM", 60]].map(([h, v]) => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 36, fontSize: 11, color: "var(--muted)" }}>{h}</span>
                  <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 4, height: 14, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${v}%`, background: v > 80 ? "var(--red)" : v > 60 ? "var(--yellow)" : "var(--green)", borderRadius: 4, transition: "width .5s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)", width: 28 }}>{v}%</span>
                </div>
              ))}
            </Card>

            {/* Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card>
                <div style={{ fontWeight: 700, marginBottom: 12, fontFamily: "Syne" }}>Today's Summary</div>
                {[
                  ["Customers Served", "247", "var(--green)"],
                  ["Avg Wait Time",    "12 min", "var(--yellow)"],
                  ["Cart Holds Today", "18", "var(--blue)"],
                  ["Token Revenue",    "₹360", "var(--accent)"],
                  ["Abandoned Carts",  "3", "var(--red)"],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span>
                    <span style={{ fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
              </Card>

              <Card style={{ border: "1px solid rgba(34,211,160,.2)" }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontFamily: "Syne", color: "var(--green)" }}>Efficiency Score</div>
                <div style={{ fontSize: 48, fontFamily: "Syne", fontWeight: 800, color: "var(--green)", textAlign: "center" }}>87%</div>
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>vs. 64% industry avg</div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "11px 14px", color: "var(--text)", fontSize: 14,
  fontFamily: "DM Sans", outline: "none", marginBottom: 10,
  appearance: "none", WebkitAppearance: "none"
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function SmartQueuePlus() {
  const [view, setView] = useState("customer"); // customer | admin
  const [counters, setCounters] = useState(initialCounters);
  const [cartHolds, setCartHolds] = useState(initialCartHolds);
  const [now, setNow] = useState(Date.now());

  // Simulate live queue fluctuation
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setCounters(prev => prev.map(c => {
        if (c.status === "closed") return c;
        const delta = Math.random() < .3 ? (Math.random() < .5 ? 1 : -1) : 0;
        return { ...c, queue: Math.max(0, c.queue + delta) };
      }));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{STYLE}</style>

      {/* Nav */}
      <nav style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", height: 54, gap: 16 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "var(--accent)", flex: 1 }}>
            SmartQueue<span style={{ color: "var(--text)" }}>+</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["customer","🛒 Customer"], ["admin","⚙ Admin"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "DM Sans", fontWeight: 600, fontSize: 12, transition: "all .18s",
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "#fff" : "var(--muted)"
              }}>{l}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* Live Ticker */}
      <Ticker counters={counters} />

      {/* Views */}
      {view === "customer"
        ? <CustomerApp counters={counters} setCounters={setCounters} cartHolds={cartHolds} setCartHolds={setCartHolds} />
        : <AdminPanel  counters={counters} setCounters={setCounters} cartHolds={cartHolds} setCartHolds={setCartHolds} />}

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "20px 16px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
        SmartQueue+ • Built for Indian Retail • Real-time Queue Management
      </div>
    </>
  );
}
