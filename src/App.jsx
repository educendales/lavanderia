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

const GARMENT_TYPES = ["Camisa","Pantalón","Vestido","Sábana","Toalla","Chaqueta","Ropa interior","Calcetines","Cortina","Cubrelecho","Falda","Blusa","Shorts","Chompa","Otro"];
const GARMENT_ICONS = {"Camisa":"👔","Pantalón":"👖","Vestido":"👗","Sábana":"🛏","Toalla":"🏊","Chaqueta":"🧥","Ropa interior":"🩲","Calcetines":"🧦","Cortina":"🪟","Cubrelecho":"🛌","Falda":"👘","Blusa":"👚","Shorts":"🩳","Chompa":"🧶","Otro":"📦"};

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
const emptyOrder = { client_name: "", phone: "", service: "lavado_normal", status: "recibido", notes: "" };
const emptyItem = { garment_type: "Camisa", quantity: 1, price: "" };

export default function LavanderiaApp() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filterDate, setFilterDate] = useState(today);
  const [newOrder, setNewOrder] = useState(emptyOrder);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [newExpense, setNewExpense] = useState({ concept: "", amount: "", date: today, category: "insumos" });
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.get("employees").then(data => {
      if (Array.isArray(data) && data.length) { setEmployees(data); setSelectedEmp(data[0]); }
      setLoading(false);
    });
  }, []);

  const loadData = async () => {
    const [o, e, c, oi] = await Promise.all([
      db.get("orders"), db.get("expenses"), db.get("clients"), db.get("order_items")
    ]);
    if (Array.isArray(o)) setOrders(o);
    if (Array.isArray(e)) setExpenses(e);
    if (Array.isArray(c)) setClients(c);
    if (Array.isArray(oi)) {
      const grouped = {};
      oi.forEach(item => {
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(item);
      });
      setOrderItems(grouped);
    }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleLogin = () => {
    if (selectedEmp && pin === selectedEmp.pin) { setUser(selectedEmp); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  const totalGarments = (its) => its.reduce((s, i) => s + Number(i.quantity), 0);
  const totalPrice = (its) => its.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);

  const addOrder = async () => {
    if (!newOrder.client_name || items.length === 0) return;
    setSaving(true);
    const garments = totalGarments(items);
    const price = totalPrice(items);
    const o = { ...newOrder, employee: user.name, date: today, garments, price };
    const res = await db.post("orders", o);
    if (Array.isArray(res) && res[0]) {
      const orderId = res[0].id;
      for (const item of items) {
        await db.post("order_items", { order_id: orderId, garment_type: item.garment_type, quantity: Number(item.quantity), price: Number(item.price) });
      }
      const existing = clients.find(c => c.phone === newOrder.phone);
      if (existing) {
        await db.patch("clients", existing.id, { total_orders: (existing.total_orders || 0) + 1 });
        setClients(prev => prev.map(c => c.id === existing.id ? { ...c, total_orders: (c.total_orders || 0) + 1 } : c));
      } else if (newOrder.client_name) {
        const nc = await db.post("clients", { name: newOrder.client_name, phone: newOrder.phone, email: "", total_orders: 1 });
        if (Array.isArray(nc)) setClients(prev => [nc[0], ...prev]);
      }
    }
    setNewOrder(emptyOrder);
    setItems([{ ...emptyItem }]);
    setModal(null);
    setSaving(false);
    loadData();
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

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
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#4FC3F7", fontSize: 18 }}>🫧 Cargando...</div>
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
        <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4FC3F7, #0288D1)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Entrar</button>
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

        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>

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
                    <div key={o.id} style={{ padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            {o.order_number && <span style={{ fontSize: 11, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "2px 7px", borderRadius: 6 }}>{o.order_number}</span>}
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{o.client_name}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#8B949E" }}>{SERVICES.find(sv => sv.id === o.service)?.label} · {o.garments} prendas</div>
                          {orderItems[o.id] && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                              {orderItems[o.id].map((it, i) => (
                                <span key={i} style={{ fontSize: 11, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", padding: "2px 7px", borderRadius: 10 }}>
                                  {GARMENT_ICONS[it.garment_type]} {it.garment_type} x{it.quantity} · ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                          <div style={{ fontWeight: 700, color: "#66BB6A" }}>${Number(o.price).toFixed(2)}</div>
                          <span style={{ fontSize: 11, background: STATUS_LABELS[o.status]?.color + "22", color: STATUS_LABELS[o.status]?.color, padding: "2px 8px", borderRadius: 20 }}>{STATUS_LABELS[o.status]?.label}</span>
                        </div>
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
                      {["# Orden", "Cliente", "Prendas y Precios", "Servicio", "Total", "Estado", "Fecha", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "4px 10px", borderRadius: 8, fontSize: 13 }}>{o.order_number || "—"}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{o.client_name}</div>
                          <div style={{ fontSize: 11, color: "#8B949E" }}>{o.phone}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {orderItems[o.id] ? orderItems[o.id].map((it, i) => (
                              <div key={i} style={{ fontSize: 11, background: "#21262D", borderRadius: 8, padding: "4px 8px" }}>
                                <span>{GARMENT_ICONS[it.garment_type]} {it.garment_type}</span>
                                <span style={{ color: "#8B949E" }}> x{it.quantity}</span>
                                <span style={{ color: "#66BB6A", fontWeight: 700 }}> ${(Number(it.price) * Number(it.quantity)).toFixed(2)}</span>
                              </div>
                            )) : <span style={{ color: "#484F58", fontSize: 12 }}>{o.garments} prendas</span>}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: SERVICES.find(sv => sv.id === o.service)?.color + "22", color: SERVICES.find(sv => sv.id === o.service)?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>
                            {SERVICES.find(sv => sv.id === o.service)?.icon} {SERVICES.find(sv => sv.id === o.service)?.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 800, color: "#66BB6A", fontSize: 16 }}>${Number(o.price).toFixed(2)}</td>
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
                  {[["Total prendas", todayGarments], ["Total órdenes", todayOrders.length], ["Ticket promedio", todayOrders.length ? `$${(todayRevenue / todayOrders.length).toFixed(2)}` : "$0"]].map(([l, v]) => (
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

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", borderRadius: 16, padding: 28, width: 460, border: "1px solid #30363D", maxHeight: "90vh", overflowY: "auto" }}>

            {modal === "newOrder" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>➕ Nueva Orden</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* TELÉFONO CON AUTOCOMPLETADO */}
                  <div style={{ position: "relative" }}>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                    <input
                      style={{ ...inp, borderColor: clients.find(c => c.phone === newOrder.phone) ? "#66BB6A" : "#30363D" }}
                      placeholder="Escribe el teléfono..."
                      value={newOrder.phone}
                      onChange={e => {
                        const val = e.target.value;
                        setNewOrder(p => ({ ...p, phone: val, client_name: "" }));
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const found = clients.find(c => c.phone === newOrder.phone);
                          if (found) setNewOrder(p => ({ ...p, client_name: found.name }));
                        }
                      }}
                    />
                    {newOrder.phone.length >= 3 && (() => {
                      const matches = clients.filter(c => c.phone.includes(newOrder.phone) && c.phone !== newOrder.phone);
                      return matches.length > 0 ? (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1C2128", border: "1px solid #30363D", borderRadius: 8, zIndex: 50, overflow: "hidden", marginTop: 2 }}>
                          {matches.slice(0, 4).map(c => (
                            <div key={c.id} onClick={() => setNewOrder(p => ({ ...p, phone: c.phone, client_name: c.name }))}
                              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #21262D" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#21262D"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <span style={{ fontWeight: 600 }}>{c.name}</span>
                              <span style={{ color: "#8B949E", fontSize: 12 }}>{c.phone}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {clients.find(c => c.phone === newOrder.phone) && !newOrder.client_name && (
                      <div style={{ marginTop: 6, background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13 }}>👤 {clients.find(c => c.phone === newOrder.phone)?.name}</span>
                        <button onClick={() => setNewOrder(p => ({ ...p, client_name: clients.find(c => c.phone === p.phone)?.name || "" }))}
                          style={{ ...btn, background: "#66BB6A", color: "#fff", padding: "4px 10px", fontSize: 12 }}>↵ Seleccionar</button>
                      </div>
                    )}
                  </div>
                  {/* NOMBRE */}
                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE DEL CLIENTE</label>
                    <input
                      style={{ ...inp, background: newOrder.client_name && clients.find(c => c.phone === newOrder.phone) ? "rgba(102,187,106,0.08)" : "#0D1117", borderColor: newOrder.client_name && clients.find(c => c.phone === newOrder.phone) ? "#66BB6A" : "#30363D" }}
                      placeholder={newOrder.phone && !clients.find(c => c.phone === newOrder.phone) ? "Cliente nuevo — escribe el nombre" : "Nombre del cliente"}
                      value={newOrder.client_name}
                      onChange={e => setNewOrder(p => ({ ...p, client_name: e.target.value }))}
                    />
                    {newOrder.phone && !clients.find(c => c.phone === newOrder.phone) && newOrder.client_name && (
                      <div style={{ fontSize: 11, color: "#FFD54F", marginTop: 4 }}>⚡ Cliente nuevo — se creará automáticamente</div>
                    )}
                    {newOrder.client_name && clients.find(c => c.phone === newOrder.phone) && (
                      <div style={{ fontSize: 11, color: "#66BB6A", marginTop: 4 }}>✅ Cliente existente</div>
                    )}
                  </div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>SERVICIO</label>
                    <select style={inp} value={newOrder.service} onChange={e => setNewOrder(p => ({ ...p, service: e.target.value }))}>
                      {SERVICES.map(sv => <option key={sv.id} value={sv.id} style={{ background: "#1a1a2e" }}>{sv.icon} {sv.label}</option>)}
                    </select></div>

                  {/* PRENDAS CON PRECIO */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: "#8B949E", fontWeight: 600 }}>PRENDAS</label>
                      <button onClick={addItem} style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "4px 10px", fontSize: 12 }}>+ Agregar</button>
                    </div>
                    {/* Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 80px 30px", gap: 6, marginBottom: 4 }}>
                      {["Tipo de prenda", "Cant.", "Precio c/u", ""].map((h, i) => (
                        <div key={i} style={{ fontSize: 10, color: "#484F58", fontWeight: 600 }}>{h}</div>
                      ))}
                    </div>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 60px 80px 30px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <select value={item.garment_type} onChange={e => updateItem(i, "garment_type", e.target.value)} style={{ ...inp, padding: "8px 10px" }}>
                          {GARMENT_TYPES.map(g => <option key={g} value={g} style={{ background: "#1a1a2e" }}>{GARMENT_ICONS[g]} {g}</option>)}
                        </select>
                        <input type="number" min={1} value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)}
                          style={{ ...inp, padding: "8px 6px", textAlign: "center" }} />
                        <input type="number" min={0} placeholder="0.00" value={item.price} onChange={e => updateItem(i, "price", e.target.value)}
                          style={{ ...inp, padding: "8px 6px" }} />
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} style={{ background: "rgba(239,83,80,0.2)", color: "#EF5350", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
                        )}
                      </div>
                    ))}
                    {/* Total */}
                    <div style={{ background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: "#8B949E" }}>Total · {totalGarments(items)} prendas</span>
                      <span style={{ fontWeight: 800, color: "#66BB6A", fontSize: 16 }}>${totalPrice(items).toFixed(2)}</span>
                    </div>
                  </div>

                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOTAS</label>
                    <textarea style={{ ...inp, height: 60, resize: "none" }} placeholder="Observaciones..." value={newOrder.notes} onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))} /></div>
                  <button onClick={addOrder} disabled={saving || !newOrder.client_name} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: 14, fontSize: 15, opacity: saving || !newOrder.client_name ? 0.6 : 1 }}>
                    {saving ? "Guardando..." : `Guardar Orden · $${totalPrice(items).toFixed(2)}`}
                  </button>
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
