import { useState, useEffect } from "react";

const SUPABASE_URL = "https://juioyorqalhtdgdjraqq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1aW95b3JxYWxodGRnZGpyYXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzU1OTMsImV4cCI6MjA5NTQxMTU5M30.9eJd-DoTdDYxhEViJq74TS9SgTOmbbjKxm5_wa734y8";

const db = {
  async get(table, params = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return res.json();
  },
  async post(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  async patch(table, id, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  async delete(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  }
};

const SERVICES = [
  { id: "lavado_normal", label: "Lavado Normal", color: "#4FC3F7", icon: "💧" },
  { id: "planchado", label: "Planchado", color: "#FFD54F", icon: "🔥" },
  { id: "lavado_express", label: "Lavado Express", color: "#EF5350", icon: "⚡" },
  { id: "secado", label: "Secado", color: "#66BB6A", icon: "💨" },
];

const STATUS_LABELS = {
  recibido: { label: "Recibido", color: "#64B5F6" },
  en_proceso: { label: "En Proceso", color: "#FFD54F" },
  listo: { label: "Listo", color: "#66BB6A" },
  entregado: { label: "Entregado", color: "#9E9E9E" },
};

const today = new Date().toISOString().split("T")[0];

export default function LavanderiaApp() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filterDate, setFilterDate] = useState(today);
  const [newOrder, setNewOrder] = useState({ client_name: "", phone: "", garments: 1, service: "lavado_normal", price: "", status: "recibido", notes: "" });
  const [newExpense, setNewExpense] = useState({ concept: "", amount: "", date: today, category: "insumos" });
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.get("employees").then(data => {
      if (Array.isArray(data) && data.length) {
        setEmployees(data);
        setSelectedEmp(data[0]);
      }
      setLoading(false);
    });
  }, []);

  const loadData = async () => {
    const [o, e, c] = await Promise.all([db.get("orders"), db.get("expenses"), db.get("clients")]);
    if (Array.isArray(o)) setOrders(o);
    if (Array.isArray(e)) setExpenses(e);
    if (Array.isArray(c)) setClients(c);
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleLogin = () => {
    if (selectedEmp && pin === selectedEmp.pin) {
      setUser(selectedEmp);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const addOrder = async () => {
    setSaving(true);
    const o = { ...newOrder, employee: user.name, date: today, garments: Number(newOrder.garments), price: Number(newOrder.price) };
    const res = await db.post("orders", o);
    if (Array.isArray(res)) setOrders(prev => [res[0], ...prev]);
    // upsert client
    const existing = clients.find(c => c.phone === newOrder.phone);
    if (existing) {
      await db.patch("clients", existing.id, { total_orders: (existing.total_orders || 0) + 1 });
      setClients(prev => prev.map(c => c.id === existing.id ? { ...c, total_orders: (c.total_orders || 0) + 1 } : c));
    } else if (newOrder.client_name) {
      const nc = await db.post("clients", { name: newOrder.client_name, phone: newOrder.phone, email: "", total_orders: 1 });
      if (Array.isArray(nc)) setClients(prev => [nc[0], ...prev]);
    }
    setNewOrder({ client_name: "", phone: "", garments: 1, service: "lavado_normal", price: "", status: "recibido", notes: "" });
    setModal(null);
    setSaving(false);
  };

  const addExpense = async () => {
    setSaving(true);
    const res = await db.post("expenses", { ...newExpense, amount: Number(newExpense.amount) });
    if (Array.isArray(res)) setExpenses(prev => [res[0], ...prev]);
    setNewExpense({ concept: "", amount: "", date: today, category: "insumos" });
    setModal(null);
    setSaving(false);
  };

  const addClient = async () => {
    setSaving(true);
    const res = await db.post("clients", { ...newClient, total_orders: 0 });
    if (Array.isArray(res)) setClients(prev => [res[0], ...prev]);
    setNewClient({ name: "", phone: "", email: "" });
    setModal(null);
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    await db.patch("orders", id, { status });
  };

  const deleteOrder = async (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    await db.delete("orders", id);
  };

  const todayOrders = orders.filter(o => o.date === filterDate);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.price), 0);
  const todayExp = expenses.filter(e => e.date === filterDate).reduce((s, e) => s + Number(e.amount), 0);
  const todayGarments = todayOrders.reduce((s, o) => s + Number(o.garments), 0);

  const s = { fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", background: "#0D1117", color: "#E6EDF3" };
  const card = { background: "#161B22", borderRadius: 14, padding: 20, border: "1px solid #30363D" };
  const btn = { padding: "10px 18px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 };
  const inp = { padding: "10px 12px", borderRadius: 8, border: "1px solid #30363D", background: "#0D1117", color: "#E6EDF3", fontSize: 14, width: "100%", boxSizing: "border-box" };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#4FC3F7", fontSize: 18 }}>
      🫧 Cargando...
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderRadius: 24, padding: "48px 40px", width: 340, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 64px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🫧</div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>LavaGest</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>Sistema de Lavandería</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>USUARIO</label>
          <select value={selectedEmp?.id || ""} onChange={e => setSelectedEmp(employees.find(u => u.id === e.target.value))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14 }}>
            {employees.map(u => <option key={u.id} value={u.id} style={{ background: "#1a1a2e" }}>{u.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PIN</label>
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} maxLength={6} placeholder="••••"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${pinError ? "#EF5350" : "rgba(255,255,255,0.15)"}`, background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 20, letterSpacing: 6, textAlign: "center", boxSizing: "border-box" }} />
          {pinError && <p style={{ color: "#EF5350", fontSize: 12, marginTop: 4, textAlign: "center" }}>PIN incorrecto</p>}
        </div>
        <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4FC3F7, #0288D1)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          Entrar
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Órdenes", icon: "👕" },
    { id: "clients", label: "Clientes", icon: "👤" },
    { id: "expenses", label: "Gastos", icon: "💰" },
    { id: "report", label: "Informes", icon: "📋" },
  ];

  return (
    <div style={s}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* SIDEBAR */}
        <div style={{ width: 200, background: "#161B22", borderRight: "1px solid #30363D", display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 32 }}>🫧</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#4FC3F7" }}>LavaGest</div>
          </div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...btn, background: tab === t.id ? "rgba(79,195,247,0.15)" : "transparent", color: tab === t.id ? "#4FC3F7" : "#8B949E", textAlign: "left", padding: "10px 14px", marginBottom: 4, fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
              {t.icon} {t.label}
            </button>
          ))}
          <div style={{ marginTop: "auto", borderTop: "1px solid #30363D", paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: "#8B949E" }}>👤 {user.name}</div>
            <div style={{ fontSize: 11, color: "#484F58", marginBottom: 8 }}>{user.role === "admin" ? "Administrador" : "Empleado"}</div>
            <button onClick={() => setUser(null)} style={{ ...btn, background: "transparent", color: "#EF5350", padding: "6px 10px", fontSize: 12 }}>Cerrar sesión</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dashboard</h2>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, width: 160 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Ingresos del día", value: `$${todayRevenue.toFixed(2)}`, icon: "💵", color: "#66BB6A" },
                  { label: "Gastos del día", value: `$${todayExp.toFixed(2)}`, icon: "📤", color: "#EF5350" },
                  { label: "Utilidad", value: `$${(todayRevenue - todayExp).toFixed(2)}`, icon: "📈", color: "#4FC3F7" },
                  { label: "Prendas del día", value: todayGarments, icon: "👕", color: "#FFD54F" },
                ].map((kpi, i) => (
                  <div key={i} style={{ ...card, borderLeft: `4px solid ${kpi.color}` }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{kpi.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#8B949E" }}>Órdenes recientes</h3>
                  {todayOrders.slice(0, 5).map(o => (
                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{o.client_name}</div>
                        <div style={{ fontSize: 12, color: "#8B949E" }}>{SERVICES.find(sv => sv.id === o.service)?.label} · {o.garments} prendas</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#66BB6A" }}>${o.price}</div>
                        <span style={{ fontSize: 11, background: STATUS_LABELS[o.status]?.color + "22", color: STATUS_LABELS[o.status]?.color, padding: "2px 8px", borderRadius: 20 }}>{STATUS_LABELS[o.status]?.label}</span>
                      </div>
                    </div>
                  ))}
                  {todayOrders.length === 0 && <p style={{ color: "#484F58", fontSize: 13 }}>Sin órdenes en esta fecha</p>}
                </div>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#8B949E" }}>Servicios del día</h3>
                  {SERVICES.map(sv => {
                    const cnt = todayOrders.filter(o => o.service === sv.id).length;
                    return (
                      <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 18 }}>{sv.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span>{sv.label}</span><span style={{ fontWeight: 700 }}>{cnt}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "#21262D" }}>
                            <div style={{ height: 6, borderRadius: 3, background: sv.color, width: `${todayOrders.length ? (cnt / todayOrders.length) * 100 : 0}%`, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === "orders" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Órdenes</h2>
                <button onClick={() => setModal("newOrder")} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff" }}>+ Nueva Orden</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#21262D" }}>
                      {["Cliente", "Teléfono", "Servicio", "Prendas", "Precio", "Estado", "Fecha", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>{o.client_name}</td>
                        <td style={{ padding: "12px 14px", color: "#8B949E" }}>{o.phone}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: SERVICES.find(sv => sv.id === o.service)?.color + "22", color: SERVICES.find(sv => sv.id === o.service)?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>
                            {SERVICES.find(sv => sv.id === o.service)?.icon} {SERVICES.find(sv => sv.id === o.service)?.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>{o.garments}</td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "#66BB6A" }}>${o.price}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                            style={{ background: STATUS_LABELS[o.status]?.color + "22", color: STATUS_LABELS[o.status]?.color, border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: "#1a1a2e" }}>{v.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.date}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <button onClick={() => deleteOrder(o.id)} style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <p style={{ color: "#484F58", textAlign: "center", padding: 40 }}>No hay órdenes aún</p>}
              </div>
            </div>
          )}

          {/* CLIENTS */}
          {tab === "clients" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Clientes</h2>
                <button onClick={() => setModal("newClient")} style={{ ...btn, background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff" }}>+ Nuevo Cliente</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
                {clients.map(c => (
                  <div key={c.id} style={{ ...card, borderTop: "3px solid #4FC3F7" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                    <div style={{ color: "#8B949E", fontSize: 13, marginTop: 4 }}>📞 {c.phone}</div>
                    {c.email && <div style={{ color: "#8B949E", fontSize: 13 }}>✉️ {c.email}</div>}
                    <div style={{ marginTop: 12, background: "rgba(79,195,247,0.1)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#8B949E" }}>Total órdenes</span>
                      <span style={{ fontWeight: 800, color: "#4FC3F7" }}>{c.total_orders || 0}</span>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && <p style={{ color: "#484F58" }}>No hay clientes aún</p>}
              </div>
            </div>
          )}

          {/* EXPENSES */}
          {tab === "expenses" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Gastos</h2>
                <button onClick={() => setModal("newExpense")} style={{ ...btn, background: "linear-gradient(135deg,#EF5350,#B71C1C)", color: "#fff" }}>+ Nuevo Gasto</button>
              </div>
              <div style={{ ...card, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 40 }}>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: "#EF5350" }}>${expenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}</div><div style={{ fontSize: 12, color: "#8B949E" }}>Total gastos</div></div>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: "#FFD54F" }}>{expenses.length}</div><div style={{ fontSize: 12, color: "#8B949E" }}>Registros</div></div>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#21262D" }}>
                    {["Concepto", "Categoría", "Monto", "Fecha"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid #21262D" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{e.concept}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ background: "rgba(255,213,79,0.1)", color: "#FFD54F", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>{e.category}</span></td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#EF5350" }}>${e.amount}</td>
                      <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{e.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT */}
          {tab === "report" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Informe del Día</h2>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, width: 160 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ ...card, borderColor: "#66BB6A" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#66BB6A" }}>💵 Resumen Financiero</h3>
                  {[["Ingresos totales", `$${todayRevenue.toFixed(2)}`, "#66BB6A"], ["Gastos totales", `$${todayExp.toFixed(2)}`, "#EF5350"], ["Utilidad neta", `$${(todayRevenue - todayExp).toFixed(2)}`, "#4FC3F7"]].map(([l, v, c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                      <span style={{ color: "#8B949E" }}>{l}</span>
                      <span style={{ fontWeight: 800, color: c, fontSize: 16 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", color: "#4FC3F7" }}>👕 Resumen de Prendas</h3>
                  {[["Total prendas", todayGarments], ["Total órdenes", todayOrders.length], ["Promedio por orden", todayOrders.length ? (todayGarments / todayOrders.length).toFixed(1) : 0]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                      <span style={{ color: "#8B949E" }}>{l}</span>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={card}>
                <h3 style={{ margin: "0 0 16px", color: "#8B949E" }}>📊 Desglose por Servicio</h3>
                {SERVICES.map(sv => {
                  const ords = todayOrders.filter(o => o.service === sv.id);
                  const rev = ords.reduce((s, o) => s + Number(o.price), 0);
                  const garm = ords.reduce((s, o) => s + Number(o.garments), 0);
                  return (
                    <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid #21262D" }}>
                      <div style={{ fontSize: 24 }}>{sv.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{sv.label}</div>
                        <div style={{ fontSize: 12, color: "#8B949E" }}>{ords.length} órdenes · {garm} prendas</div>
                      </div>
                      <div style={{ fontWeight: 800, color: sv.color, fontSize: 16 }}>${rev.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ ...card, marginTop: 16 }}>
                <h3 style={{ margin: "0 0 16px", color: "#8B949E" }}>📋 Estado de órdenes</h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => {
                    const cnt = todayOrders.filter(o => o.status === k).length;
                    return (
                      <div key={k} style={{ background: v.color + "15", border: `1px solid ${v.color}40`, borderRadius: 10, padding: "12px 20px", textAlign: "center", minWidth: 100 }}>
                        <div style={{ fontWeight: 800, fontSize: 24, color: v.color }}>{cnt}</div>
                        <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>{v.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", borderRadius: 16, padding: 28, width: 400, border: "1px solid #30363D", maxHeight: "90vh", overflowY: "auto" }}>
            {modal === "newOrder" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>➕ Nueva Orden</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>CLIENTE</label>
                    <input style={inp} placeholder="Nombre del cliente" value={newOrder.client_name} onChange={e => setNewOrder(p => ({ ...p, client_name: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                    <input style={inp} placeholder="555-0000" value={newOrder.phone} onChange={e => setNewOrder(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>SERVICIO</label>
                    <select style={inp} value={newOrder.service} onChange={e => setNewOrder(p => ({ ...p, service: e.target.value }))}>
                      {SERVICES.map(sv => <option key={sv.id} value={sv.id} style={{ background: "#1a1a2e" }}>{sv.icon} {sv.label}</option>)}
                    </select></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>N° PRENDAS</label>
                    <input style={inp} type="number" min={1} value={newOrder.garments} onChange={e => setNewOrder(p => ({ ...p, garments: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>PRECIO ($)</label>
                    <input style={inp} type="number" placeholder="0.00" value={newOrder.price} onChange={e => setNewOrder(p => ({ ...p, price: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOTAS</label>
                    <textarea style={{ ...inp, height: 70, resize: "none" }} placeholder="Observaciones..." value={newOrder.notes} onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))} /></div>
                  <button onClick={addOrder} disabled={saving} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: 12, opacity: saving ? 0.7 : 1 }}>{saving ? "Guardando..." : "Guardar Orden"}</button>
                </div>
              </>
            )}
            {modal === "newExpense" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>💰 Nuevo Gasto</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>CONCEPTO</label>
                    <input style={inp} placeholder="Ej: Detergente" value={newExpense.concept} onChange={e => setNewExpense(p => ({ ...p, concept: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>CATEGORÍA</label>
                    <select style={inp} value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))}>
                      <option value="insumos" style={{ background: "#1a1a2e" }}>Insumos</option>
                      <option value="servicios" style={{ background: "#1a1a2e" }}>Servicios</option>
                      <option value="mantenimiento" style={{ background: "#1a1a2e" }}>Mantenimiento</option>
                      <option value="otros" style={{ background: "#1a1a2e" }}>Otros</option>
                    </select></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>MONTO ($)</label>
                    <input style={inp} type="number" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>FECHA</label>
                    <input style={inp} type="date" value={newExpense.date} onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))} /></div>
                  <button onClick={addExpense} disabled={saving} style={{ ...btn, background: "linear-gradient(135deg,#EF5350,#B71C1C)", color: "#fff", padding: 12, opacity: saving ? 0.7 : 1 }}>{saving ? "Guardando..." : "Guardar Gasto"}</button>
                </div>
              </>
            )}
            {modal === "newClient" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>👤 Nuevo Cliente</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE</label>
                    <input style={inp} placeholder="Nombre completo" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                    <input style={inp} placeholder="555-0000" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>EMAIL</label>
                    <input style={inp} type="email" placeholder="correo@email.com" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} /></div>
                  <button onClick={addClient} disabled={saving} style={{ ...btn, background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff", padding: 12, opacity: saving ? 0.7 : 1 }}>{saving ? "Guardando..." : "Guardar Cliente"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
