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

const DEFAULT_GARMENT_TYPES = ["Camisa","Pantalón","Vestido","Sábana","Toalla","Chaqueta","Ropa interior","Calcetines","Cortina","Cubrelecho","Falda","Blusa","Shorts","Chompa","Otro"];
const DEFAULT_COLORS = ["Blanco","Negro","Gris","Rojo","Azul","Azul marino","Azul cielo","Verde","Verde oliva","Amarillo","Naranja","Morado","Rosa","Rosado","Café","Beige","Crema","Vino","Turquesa","Celeste","Plateado","Dorado","Multicolor","Estampado"];
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

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const getDeliveryDefault = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const today = getToday();
const emptyOrder = { client_name: "", phone: "", status: "recibido", notes: "", delivery_date: getDeliveryDefault() };
const emptyItem = { garment_type: "Camisa", quantity: 1, price: "", colors: [], service: "lavado_normal", decolorado: false, percudido: false, roto: false, manchado: false };

const getServiceLabel = (serviceStr) => {
  if (!serviceStr) return "";
  return serviceStr.split(",").map(sid => {
    const sv = SERVICES.find(s => s.id === sid.trim());
    return sv ? `${sv.icon} ${sv.label}` : sid;
  }).join(" + ");
};

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
  const [orderFilterDate, setOrderFilterDate] = useState(today);
  const [newOrder, setNewOrder] = useState(emptyOrder);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [newExpense, setNewExpense] = useState({ concept: "", amount: "", date: today, category: "insumos", payment_method: "efectivo" });
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [colorFocusIdx, setColorFocusIdx] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [entregaSearch, setEntregaSearch] = useState("");
  const [selectedEntregas, setSelectedEntregas] = useState([]);
  const [entregaMultiPayment, setEntregaMultiPayment] = useState("efectivo");
  const [entregaMultiSinRecibo, setEntregaMultiSinRecibo] = useState(false);
  const [confirmingMulti, setConfirmingMulti] = useState(false);
  const [entregaResults, setEntregaResults] = useState(null);
  const [entregaResult, setEntregaResult] = useState(null);
  const [entregaPayment, setEntregaPayment] = useState("efectivo");
  const [entregaSinRecibo, setEntregaSinRecibo] = useState(false);
  const [entregaConfirmed, setEntregaConfirmed] = useState(false);
  const [garmentTypes, setGarmentTypes] = useState(() => {
    try { const s = localStorage.getItem("garmentTypes"); return s ? JSON.parse(s) : DEFAULT_GARMENT_TYPES; } catch { return DEFAULT_GARMENT_TYPES; }
  });
  const [colors, setColors] = useState(() => {
    try { const s = localStorage.getItem("colors"); return s ? JSON.parse(s) : DEFAULT_COLORS; } catch { return DEFAULT_COLORS; }
  });
  const [newGarment, setNewGarment] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [precioDefaults, setPrecioDefaults] = useState(() => {
    try { const s = localStorage.getItem("precioDefaults"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [precioPrend, setPrecioPrend] = useState(() => {
    try { return Number(localStorage.getItem("precioPrend")) || 6500; } catch { return 6500; }
  });
  const [showTotalPrendas, setShowTotalPrendas] = useState(false);
  const [editingPrecio, setEditingPrecio] = useState(false);
  const [tempPrecio, setTempPrecio] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [inventoryDaysFilter, setInventoryDaysFilter] = useState("");
  const [expenseFilterDate, setExpenseFilterDate] = useState(today);
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrev, setCalcPrev] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcNew, setCalcNew] = useState(true);
  const [newEmployee, setNewEmployee] = useState({ name: "", pin: "", role: "employee", turno: "mañana" });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [reversarSearch, setReversarSearch] = useState("");
  const [reversarResults, setReversarResults] = useState(null);
  const [reversarDone, setReversarDone] = useState(false);
  const [reversadasSearch, setReversadasSearch] = useState("");
  const [newColor, setNewColor] = useState("");

  // ── CALCULATOR FUNCTIONS (defined before useEffect so keyboard can use them) ──
  const calcInput = (val) => {
    if (calcNew) { setCalcDisplay(String(val)); setCalcNew(false); }
    else { setCalcDisplay(prev => prev === "0" ? String(val) : prev + val); }
  };
  const calcDot = () => {
    if (calcNew) { setCalcDisplay("0."); setCalcNew(false); return; }
    if (!calcDisplay.includes(".")) setCalcDisplay(prev => prev + ".");
  };
  const calcOperation = (op) => { setCalcPrev(parseFloat(calcDisplay)); setCalcOp(op); setCalcNew(true); };
  const calcEquals = () => {
    if (calcOp === null || calcPrev === null) return;
    const cur = parseFloat(calcDisplay);
    let result = 0;
    if (calcOp === "+") result = calcPrev + cur;
    if (calcOp === "-") result = calcPrev - cur;
    if (calcOp === "×") result = calcPrev * cur;
    if (calcOp === "÷") result = cur !== 0 ? calcPrev / cur : 0;
    setCalcDisplay(parseFloat(result.toFixed(6)).toString());
    setCalcPrev(null); setCalcOp(null); setCalcNew(true);
  };
  const calcClear = () => { setCalcDisplay("0"); setCalcPrev(null); setCalcOp(null); setCalcNew(true); };
  const calcBackspace = () => {
    if (calcNew) return;
    const next = calcDisplay.slice(0, -1);
    setCalcDisplay(next.length === 0 || next === "-" ? "0" : next);
  };
  const calcToggleSign = () => setCalcDisplay(prev => prev.startsWith("-") ? prev.slice(1) : "-" + prev);
  const calcPercent = () => setCalcDisplay(prev => String(parseFloat(prev) / 100));

  // ── KEYBOARD SUPPORT FOR CALCULATOR ──
  useEffect(() => {
    if (!showCalc) return;
    const handleKey = (e) => {
      if (e.key >= "0" && e.key <= "9") calcInput(e.key);
      else if (e.key === ".") calcDot();
      else if (e.key === "+") calcOperation("+");
      else if (e.key === "-") calcOperation("-");
      else if (e.key === "*") calcOperation("×");
      else if (e.key === "/") { e.preventDefault(); calcOperation("÷"); }
      else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calcEquals(); }
      else if (e.key === "Backspace") calcBackspace();
      else if (e.key === "Escape") setShowCalc(false);
      else if (e.key === "c" || e.key === "C") calcClear();
      else if (e.key === "%") calcPercent();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showCalc, calcDisplay, calcPrev, calcOp, calcNew]);

  const saveGarmentTypes = (list) => { setGarmentTypes(list); try { localStorage.setItem("garmentTypes", JSON.stringify(list)); } catch {} };
  const saveColors = (list) => { setColors(list); try { localStorage.setItem("colors", JSON.stringify(list)); } catch {} };

  const confirmarMultiEntrega = async () => {
    for (const order of selectedEntregas) {
      await db.patch("orders", order.id, { status: "entregado", payment_method: entregaMultiPayment, sin_recibo: entregaMultiSinRecibo, delivered_at: today, delivered_by: user.name });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "entregado", payment_method: entregaMultiPayment, delivered_at: today, delivered_by: user.name } : o));
    }
    setEntregaResults(prev => prev.map(o => selectedEntregas.find(s => s.id === o.id) ? { ...o, status: "entregado", payment_method: entregaMultiPayment, delivered_at: today, delivered_by: user.name } : o));
    setSelectedEntregas([]);
    setConfirmingMulti(false);
  };

  const searchReversar = () => {
    const q = reversarSearch.trim().toLowerCase();
    if (!q) return;
    const byOrder = orders.find(o => o.order_number?.toLowerCase() === q);
    if (byOrder) { setReversarResults([byOrder]); }
    else { setReversarResults(orders.filter(o => o.phone?.toLowerCase().includes(q))); }
    setReversarDone(false);
  };

  const confirmarReversar = async (order) => {
    const pwd = prompt("Ingresa la clave para reversar:");
    if (pwd !== "9621") { if (pwd !== null) alert("❌ Clave incorrecta"); return; }
    if (order.status === "entregado") {
      if (!window.confirm(`¿Reversar la orden ${order.order_number} a estado "Listo"?`)) return;
      await db.patch("orders", order.id, { status: "listo", payment_method: null, sin_recibo: false, delivered_at: null });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "listo", payment_method: null, delivered_at: null, delivered_by: o.delivered_by } : o));
    } else {
      if (!window.confirm(`¿Cambiar la orden ${order.order_number} a estado "Listo"?`)) return;
      await db.patch("orders", order.id, { status: "listo" });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "listo" } : o));
    }
    setReversarResults(prev => prev.map(o => o.id === order.id ? { ...o, status: "listo", payment_method: null, delivered_at: null } : o));
    setReversarDone(true);
  };

  const addEmployee = async () => {
    if (!newEmployee.name || !newEmployee.pin) return;
    const res = await db.post("employees", newEmployee);
    if (Array.isArray(res) && res[0]) {
      setEmployees(prev => [...prev, res[0]]);
      setNewEmployee({ name: "", pin: "", role: "employee", turno: "mañana" });
    }
  };

  const updateEmployee = async () => {
    if (!editingEmployee) return;
    await db.patch("employees", editingEmployee.id, { name: editingEmployee.name, pin: editingEmployee.pin, role: editingEmployee.role, turno: editingEmployee.turno });
    setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...editingEmployee } : e));
    setEditingEmployee(null);
  };

  const deleteEmployee = async (id) => {
    const pwd = prompt("Contraseña para eliminar:");
    if (pwd !== "9621") { if (pwd !== null) alert("❌ Contraseña incorrecta"); return; }
    if (!window.confirm("¿Eliminar este usuario?")) return;
    await db.delete("employees", id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  useEffect(() => {
    db.get("employees").then(data => {
      if (Array.isArray(data) && data.length) { setEmployees(data); setSelectedEmp(data[0]); }
      setLoading(false);
    });
  }, []);

  const loadData = async () => {
    const [o, e, c, oi] = await Promise.all([db.get("orders"), db.get("expenses"), db.get("clients"), db.get("order_items")]);
    if (Array.isArray(o)) setOrders(o);
    if (Array.isArray(e)) setExpenses(e);
    if (Array.isArray(c)) setClients(c);
    if (Array.isArray(oi)) {
      const grouped = {};
      oi.forEach(item => { if (!grouped[item.order_id]) grouped[item.order_id] = []; grouped[item.order_id].push(item); });
      setOrderItems(grouped);
    }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleLogin = () => {
    if (selectedEmp && pin === selectedEmp.pin) { setUser(selectedEmp); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  const totalGarments = (its) => its.reduce((s, i) => s + Number(i.quantity), 0);
  const totalPrice = (its) => its.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);

  const buildNotes = (its) => {
    const lines = its.map(it => {
      const conds = [];
      if (it.decolorado) conds.push("decolorado");
      if (it.percudido) conds.push("percudido");
      if (it.roto) conds.push("roto");
      if (it.manchado) conds.push("manchado");
      if (!conds.length) return null;
      return `${it.garment_type}${it.colors?.length ? " "+it.colors[0] : ""}: ${conds.join(", ")}`;
    }).filter(Boolean);
    return lines.join(" | ");
  };

  const addOrder = async () => {
    if (!newOrder.client_name || items.length === 0) return;
    setSaving(true);
    const garments = totalGarments(items);
    const price = totalPrice(items);
    const uniqueServices = [...new Set(items.map(it => it.service))];
    const o = {
      client_name: newOrder.client_name, phone: newOrder.phone, status: newOrder.status,
      notes: newOrder.notes, delivery_date: newOrder.delivery_date,
      service: uniqueServices.join(","), employee: user.name, date: today, garments, price
    };
    const res = await db.post("orders", o);
    if (Array.isArray(res) && res[0]) {
      const orderId = res[0].id;
      for (const item of items) {
        await db.post("order_items", { order_id: orderId, garment_type: item.garment_type, quantity: Number(item.quantity), price: Number(item.price), color: (item.colors||[]).join(", "), service: item.service });
      }
      const existing = clients.find(c => c.phone === newOrder.phone);
      if (existing) {
        await db.patch("clients", existing.id, { total_orders: (existing.total_orders||0)+1 });
        setClients(prev => prev.map(c => c.id === existing.id ? { ...c, total_orders: (c.total_orders||0)+1 } : c));
      } else if (newOrder.client_name) {
        const nc = await db.post("clients", { name: newOrder.client_name, phone: newOrder.phone, email: "", total_orders: 1 });
        if (Array.isArray(nc)) setClients(prev => [nc[0], ...prev]);
      }
    }
    setNewOrder({ ...emptyOrder, delivery_date: getDeliveryDefault() });
    setItems([{ ...emptyItem, price: precioDefaults[emptyItem.garment_type] || "" }]);
    setModal(null);
    setSaving(false);
    loadData();
  };

  const addItem = () => {
    const defaultType = emptyItem.garment_type;
    const defaultPrice = precioDefaults[defaultType] || "";
    setItems(prev => [...prev, { ...emptyItem, price: defaultPrice }]);
  };
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    setItems(prev => {
      let updated = prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
      if (field === "garment_type" && precioDefaults[val]) {
        updated = updated.map((item, idx) => idx === i ? { ...item, price: precioDefaults[val] } : item);
      }
      if (["decolorado","percudido","roto","manchado"].includes(field)) {
        setNewOrder(p => ({ ...p, notes: buildNotes(updated) }));
      }
      return updated;
    });
  };

  const addExpense = async () => {
    setSaving(true);
    const res = await db.post("expenses", { ...newExpense, amount: Number(newExpense.amount) });
    if (Array.isArray(res)) setExpenses(prev => [res[0], ...prev]);
    setNewExpense({ concept: "", amount: "", date: today, category: "insumos", payment_method: "efectivo" });
    setModal(null);
    setSaving(false);
  };

  const deleteExpense = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await db.delete("expenses", id);
  };

  const addClient = async () => {
    setSaving(true);
    const res = await db.post("clients", { ...newClient, total_orders: 0 });
    if (Array.isArray(res)) setClients(prev => [res[0], ...prev]);
    setNewClient({ name: "", phone: "", email: "" });
    setModal(null);
    setSaving(false);
  };

  const deleteClient = async (id) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await db.delete("clients", id);
  };

  const updateClient = async () => {
    if (!editingClient) return;
    await db.patch("clients", editingClient.id, { name: editingClient.name, phone: editingClient.phone, email: editingClient.email });
    setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...editingClient } : c));
    setEditingClient(null);
  };

  const deleteOrder = async (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    await db.delete("orders", id);
  };

  const searchEntrega = () => {
    const q = entregaSearch.trim().toLowerCase();
    if (!q) return;
    const byOrder = orders.find(o => o.order_number?.toLowerCase() === q);
    if (byOrder) { setEntregaResults([byOrder]); }
    else { setEntregaResults(orders.filter(o => o.phone?.toLowerCase().includes(q))); }
    setEntregaResult(null);
    setEntregaConfirmed(false);
    setEntregaSinRecibo(false);
    setEntregaPayment("efectivo");
  };

  const confirmarEntrega = async () => {
    if (!entregaResult) return;
    await db.patch("orders", entregaResult.id, { status: "entregado", payment_method: entregaPayment, sin_recibo: entregaSinRecibo, delivered_at: today, delivered_by: user.name });
    setOrders(prev => prev.map(o => o.id === entregaResult.id ? { ...o, status: "entregado", payment_method: entregaPayment, delivered_at: today, delivered_by: user.name } : o));
    setEntregaResult(prev => ({ ...prev, status: "entregado", payment_method: entregaPayment, sin_recibo: entregaSinRecibo, delivered_at: today, delivered_by: user.name }));
    setEntregaConfirmed(true);
  };

  const todayOrders = orders.filter(o => o.date === filterDate);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.price), 0);
  const todayExp = expenses.filter(e => e.date === filterDate).reduce((s, e) => s + Number(e.amount), 0);
  const todayGarments = todayOrders.reduce((s, o) => s + Number(o.garments), 0);
  const filteredOrders = orderFilterDate ? orders.filter(o => o.date === orderFilterDate) : orders;

  const s = { fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", background: "#0D1117", color: "#E6EDF3" };
  const card = { background: "#161B22", borderRadius: 14, padding: 20, border: "1px solid #30363D" };
  const btn = { padding: "10px 18px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 };
  const inp = { padding: "10px 12px", borderRadius: 8, border: "1px solid #30363D", background: "#0D1117", color: "#E6EDF3", fontSize: 14, width: "100%", boxSizing: "border-box" };

  if (loading) return <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#4FC3F7", fontSize: 18 }}>🫧 Cargando...</div>;

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F2027,#203A43,#2C5364)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderRadius: 24, padding: "48px 40px", width: 340, border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🫧</div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>Lavanderías Shaddai</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>Sistema de Gestión</p>
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
        <button onClick={handleLogin} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Entrar</button>
      </div>
    </div>
  );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Órdenes", icon: "👕" },
    { id: "entregas", label: "Entregas", icon: "📦" },
    { id: "clients", label: "Clientes", icon: "👤" },
    { id: "expenses", label: "Gastos", icon: "💰" },
    { id: "report", label: "Informes", icon: "📋" },
    { id: "config", label: "Configuración", icon: "⚙️" },
    { id: "reversar", label: "Reversar", icon: "↩️" },
  ];

  return (
    <div style={s}>
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* SIDEBAR */}
        <div style={{ width: 200, background: "#161B22", borderRight: "1px solid #30363D", display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 28 }}>🫧</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#4FC3F7", lineHeight: 1.2 }}>Lavanderías Shaddai</div>
          </div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...btn, background: tab === t.id ? "rgba(79,195,247,0.15)" : "transparent", color: tab === t.id ? "#4FC3F7" : "#8B949E", textAlign: "left", padding: "10px 14px", marginBottom: 4, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              {t.icon} {t.label}
            </button>
          ))}
          <div style={{ marginTop: "auto" }}>
            <button onClick={() => { setShowTotalPrendas(true); setEditingPrecio(false); }}
              style={{ ...btn, width: "100%", background: "linear-gradient(135deg,rgba(255,213,79,0.2),rgba(245,127,23,0.2))", color: "#FFD54F", border: "1px solid rgba(255,213,79,0.3)", padding: "10px 14px", marginBottom: 12, fontSize: 13, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              👕 Total Prendas
            </button>
            <div style={{ borderTop: "1px solid #30363D", paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: "#8B949E" }}>👤 {user.name}</div>
              <div style={{ fontSize: 11, color: "#484F58", marginBottom: 8 }}>{user.role === "admin" ? "Administrador" : "Empleado"}</div>
              <button onClick={() => setUser(null)} style={{ ...btn, background: "transparent", color: "#EF5350", padding: "6px 10px", fontSize: 12 }}>Cerrar sesión</button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dashboard</h2>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, width: 160 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Ingresos del día", value: `$${Math.round(todayRevenue)}`, icon: "💵", color: "#66BB6A" },
                  { label: "Gastos del día", value: `$${Math.round(todayExp)}`, icon: "📤", color: "#EF5350" },
                  { label: "Utilidad", value: `$${Math.round(todayRevenue - todayExp)}`, icon: "📈", color: "#4FC3F7" },
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
                          <div style={{ fontSize: 12, color: "#8B949E" }}>{getServiceLabel(o.service)} · {o.garments} prendas</div>
                          {orderItems[o.id] && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                              {orderItems[o.id].map((it, i) => (
                                <span key={i} style={{ fontSize: 11, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", padding: "2px 7px", borderRadius: 10 }}>
                                  {it.service && (() => { const sv = SERVICES.find(s => s.id === it.service); return sv ? sv.icon+" " : ""; })()}
                                  {GARMENT_ICONS[it.garment_type] || "👕"} {it.garment_type} x{it.quantity}{it.color ? ` · ${it.color}` : ""} · ${Math.round(Number(it.price)*Number(it.quantity))}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                          <div style={{ fontWeight: 700, color: "#66BB6A" }}>${Math.round(Number(o.price))}</div>
                          <span style={{ fontSize: 11, background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "2px 8px", borderRadius: 20 }}>{STATUS_LABELS[o.status]?.label}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {todayOrders.length === 0 && <p style={{ color: "#484F58", fontSize: 13 }}>Sin órdenes en esta fecha</p>}
                </div>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#8B949E" }}>Servicios del día</h3>
                  {SERVICES.map(sv => {
                    const cnt = todayOrders.filter(o => (o.service||"").split(",").map(s=>s.trim()).includes(sv.id)).length;
                    return (
                      <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 18 }}>{sv.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span>{sv.label}</span><span style={{ fontWeight: 700 }}>{cnt}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "#21262D" }}>
                            <div style={{ height: 6, borderRadius: 3, background: sv.color, width: `${todayOrders.length ? (cnt/todayOrders.length)*100 : 0}%`, transition: "width 0.5s" }} />
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
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Órdenes</h2>
                  <input type="date" value={orderFilterDate} onChange={e => setOrderFilterDate(e.target.value)} style={{ ...inp, width: 160, fontSize: 13 }} />
                  {orderFilterDate && <button onClick={() => setOrderFilterDate("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todas</button>}
                </div>
                <button onClick={() => setModal("newOrder")} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff" }}>+ Nueva Orden</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#21262D" }}>
                      {["# Orden","Cliente","Prendas","Servicio","Total","Fecha","Entrega",""].map((h,i) => (
                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "4px 10px", borderRadius: 8, fontSize: 13 }}>{o.order_number || "—"}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{o.client_name}</div>
                          <div style={{ fontSize: 11, color: "#8B949E" }}>{o.phone}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{o.garments} prendas</div>
                          {orderItems[o.id] && (
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 3 }}>
                              {orderItems[o.id].map((it, i) => (
                                <span key={i} style={{ fontSize: 10, background: "#21262D", borderRadius: 8, padding: "3px 7px" }}>
                                  {it.service && (() => { const sv=SERVICES.find(s=>s.id===it.service); return sv ? sv.icon+" " : ""; })()}
                                  {GARMENT_ICONS[it.garment_type]||"👕"} {it.garment_type}
                                  {it.color && <span style={{ color: "#C792EA" }}> · {it.color}</span>}
                                  <span style={{ color: "#66BB6A", fontWeight: 700 }}> ${Math.round(Number(it.price)*Number(it.quantity))}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {(o.service||"").split(",").map(sid => {
                              const sv = SERVICES.find(s => s.id === sid.trim());
                              return sv ? <span key={sid} style={{ background: sv.color+"22", color: sv.color, padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{sv.icon} {sv.label}</span> : null;
                            })}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 800, color: "#66BB6A", fontSize: 16 }}>${Math.round(Number(o.price))}</td>
                        <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.date}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: 12, background: "rgba(255,213,79,0.1)", color: "#FFD54F", padding: "3px 8px", borderRadius: 8 }}>📅 {o.delivery_date || "—"}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <button onClick={() => {
                            const pwd = prompt("Contraseña para eliminar:");
                            if (pwd === "9621") { if (window.confirm("¿Eliminar esta orden?")) deleteOrder(o.id); }
                            else if (pwd !== null) alert("❌ Contraseña incorrecta");
                          }} style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && <p style={{ color: "#484F58", textAlign: "center", padding: 40 }}>No hay órdenes en esta fecha</p>}
              </div>
            </div>
          )}

          {/* ENTREGAS */}
          {tab === "entregas" && (
            <div>
              <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800 }}>📦 Entregas</h2>
              <div style={{ ...card, marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8, fontWeight: 600 }}>BUSCAR POR TELÉFONO O NÚMERO DE ORDEN</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input style={{ ...inp, flex: 1, fontSize: 16 }} placeholder="Ej: 3105604421 o S0001" value={entregaSearch}
                    onChange={e => { setEntregaSearch(e.target.value); setEntregaResults(null); setEntregaResult(null); }}
                    onKeyDown={e => e.key === "Enter" && searchEntrega()} />
                  <button onClick={searchEntrega} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: "10px 24px" }}>🔍 Buscar</button>
                </div>
              </div>

              {entregaResults !== null && entregaResults.length === 0 && (
                <div style={{ ...card, textAlign: "center", color: "#EF5350", padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>😕</div>
                  <div style={{ fontWeight: 600 }}>No se encontró ninguna orden</div>
                </div>
              )}

              {entregaResults !== null && entregaResults.length > 0 && !entregaResult && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: "#8B949E" }}>
                      Se encontraron <strong style={{ color: "#4FC3F7" }}>{entregaResults.length} órdenes</strong> para este cliente
                    </div>
                    {entregaResults.some(o => o.status !== "entregado") && (
                      <button onClick={() => {
                        const pending = entregaResults.filter(o => o.status !== "entregado");
                        if (selectedEntregas.length === pending.length) setSelectedEntregas([]);
                        else setSelectedEntregas(pending);
                      }} style={{ ...btn, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", padding: "6px 14px", fontSize: 12 }}>
                        {selectedEntregas.length === entregaResults.filter(o=>o.status!=="entregado").length ? "Deseleccionar todo" : "Seleccionar pendientes"}
                      </button>
                    )}
                  </div>

                  {entregaResults.map(o => {
                    const isSelected = selectedEntregas.some(s => s.id === o.id);
                    const isPending = o.status !== "entregado";
                    return (
                      <div key={o.id} style={{ ...card, marginBottom: 10, borderLeft: `4px solid ${isSelected ? "#66BB6A" : STATUS_LABELS[o.status]?.color||"#30363D"}`, background: isSelected ? "rgba(102,187,106,0.06)" : "#161B22" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                            {isPending && (
                              <input type="checkbox" checked={isSelected}
                                onChange={() => setSelectedEntregas(prev => isSelected ? prev.filter(s=>s.id!==o.id) : [...prev, o])}
                                style={{ width: 20, height: 20, accentColor: "#66BB6A", cursor: "pointer", flexShrink: 0 }} />
                            )}
                            {!isPending && <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "3px 10px", borderRadius: 6, fontSize: 13 }}>{o.order_number || "—"}</span>
                                <span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[o.status]?.label}</span>
                              </div>
                              <div style={{ fontSize: 13, color: "#8B949E" }}>{getServiceLabel(o.service)} · {o.garments} prendas</div>
                              <div style={{ fontSize: 12, color: "#484F58", marginTop: 2 }}>
                                Ingreso: {o.date} · Entrega: {o.delivery_date || "—"}
                                {o.delivered_by && <span style={{ color: "#C792EA" }}> · 👤 {o.delivered_by}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", marginLeft: 12 }}>
                            <div style={{ fontWeight: 800, fontSize: 18, color: "#66BB6A", marginBottom: 4 }}>${Math.round(Number(o.price))}</div>
                            {isPending && (
                              <button onClick={() => { setEntregaResult(o); setEntregaConfirmed(false); setEntregaPayment(o.payment_method||"efectivo"); }}
                                style={{ ...btn, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", padding: "4px 10px", fontSize: 11 }}>Ver detalle →</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {selectedEntregas.length > 0 && (
                    <div style={{ ...card, border: "1px solid #66BB6A", background: "rgba(102,187,106,0.06)", marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#66BB6A", fontSize: 16 }}>
                            {selectedEntregas.length} orden{selectedEntregas.length>1?"es":""} seleccionada{selectedEntregas.length>1?"s":""}
                          </div>
                          <div style={{ fontSize: 13, color: "#8B949E" }}>
                            Total: <strong style={{ color: "#66BB6A" }}>${Math.round(selectedEntregas.reduce((s,o)=>s+Number(o.price),0))}</strong>
                            {" · "}{selectedEntregas.reduce((s,o)=>s+Number(o.garments),0)} prendas
                          </div>
                        </div>
                        <button onClick={() => setSelectedEntregas([])} style={{ ...btn, background: "transparent", color: "#8B949E", padding: "4px 10px", fontSize: 12 }}>✕ Cancelar</button>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8, fontWeight: 600 }}>MÉTODO DE PAGO</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"}].map(opt => (
                            <label key={opt.value} onClick={() => setEntregaMultiPayment(opt.value)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:12, fontWeight:600, background: entregaMultiPayment===opt.value ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.04)", border:`2px solid ${entregaMultiPayment===opt.value?"#66BB6A":"#30363D"}`, borderRadius:8, padding:"8px 4px", color: entregaMultiPayment===opt.value?"#66BB6A":"#8B949E" }}>
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label onClick={() => setEntregaMultiSinRecibo(!entregaMultiSinRecibo)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", background: entregaMultiSinRecibo?"rgba(255,213,79,0.1)":"rgba(255,255,255,0.04)", border:`1px solid ${entregaMultiSinRecibo?"#FFD54F":"#30363D"}`, borderRadius:8, padding:"10px 14px" }}>
                          <input type="checkbox" checked={entregaMultiSinRecibo} onChange={e=>setEntregaMultiSinRecibo(e.target.checked)} style={{ width:16,height:16,accentColor:"#FFD54F" }} />
                          <span style={{ fontSize:13, color: entregaMultiSinRecibo?"#FFD54F":"#8B949E" }}>📋 Entregado sin recibo</span>
                        </label>
                      </div>
                      <button onClick={confirmarMultiEntrega}
                        style={{ ...btn, width:"100%", background:"linear-gradient(135deg,#66BB6A,#388E3C)", color:"#fff", padding:14, fontSize:15, fontWeight:800, borderRadius:10 }}>
                        ✅ Confirmar {selectedEntregas.length} entrega{selectedEntregas.length>1?"s":""} · ${Math.round(selectedEntregas.reduce((s,o)=>s+Number(o.price),0))}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {entregaResult && (
                <div>
                  {entregaResults && entregaResults.length > 1 && (
                    <button onClick={() => { setEntregaResult(null); setEntregaConfirmed(false); }}
                      style={{ ...btn, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", marginBottom: 16, fontSize: 13, padding: "8px 16px" }}>
                      ← Volver a la lista
                    </button>
                  )}
                  <div style={{ ...card, border: entregaConfirmed ? "1px solid #66BB6A" : "1px solid #4FC3F7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "4px 12px", borderRadius: 8, fontSize: 16 }}>{entregaResult.order_number || "—"}</span>
                          <span style={{ background: STATUS_LABELS[entregaResult.status]?.color+"22", color: STATUS_LABELS[entregaResult.status]?.color, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{STATUS_LABELS[entregaResult.status]?.label}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 2 }}>{entregaResult.client_name}</div>
                        <div style={{ color: "#8B949E", fontSize: 14 }}>📞 {entregaResult.phone}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 28, color: "#66BB6A" }}>${Math.round(Number(entregaResult.price))}</div>
                        <div style={{ fontSize: 12, color: "#8B949E" }}>Total a cobrar</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                      {[
                        { label: "SERVICIO", value: getServiceLabel(entregaResult.service) },
                        { label: "PRENDAS", value: `${entregaResult.garments} prendas` },
                        { label: "FECHA ENTREGA", value: `📅 ${entregaResult.delivery_date || "—"}`, color: "#FFD54F" },
                      ].map((item, i) => (
                        <div key={i} style={{ background: "#0D1117", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontWeight: 600, color: item.color || "#E6EDF3" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {orderItems[entregaResult.id] && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, color: "#8B949E", marginBottom: 8, fontWeight: 600 }}>DETALLE DE PRENDAS</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {orderItems[entregaResult.id].map((it, i) => (
                            <div key={i} style={{ background: "#21262D", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                              {it.service && (() => { const sv=SERVICES.find(s=>s.id===it.service); return sv ? <span style={{ color: sv.color }}>{sv.icon} </span> : null; })()}
                              <span>{GARMENT_ICONS[it.garment_type]||"👕"} {it.garment_type}</span>
                              {it.color && <span style={{ color: "#C792EA" }}> · {it.color}</span>}
                              <span style={{ color: "#66BB6A", fontWeight: 700 }}> · ${Math.round(Number(it.price)*Number(it.quantity))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {entregaResult.notes && (
                      <div style={{ background: "rgba(255,213,79,0.08)", border: "1px solid rgba(255,213,79,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#FFD54F" }}>
                        📝 {entregaResult.notes}
                      </div>
                    )}
                    {entregaResult.status !== "entregado" && !entregaConfirmed && (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8, fontWeight: 600 }}>MÉTODO DE PAGO</label>
                          <div style={{ display: "flex", gap: 10 }}>
                            {[{ value: "efectivo", label: "💵 Efectivo" },{ value: "nequi", label: "📱 Nequi" },{ value: "daviplata", label: "💜 Daviplata" }].map(opt => (
                              <label key={opt.value} onClick={() => setEntregaPayment(opt.value)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: 600, background: entregaPayment === opt.value ? "rgba(79,195,247,0.15)" : "rgba(255,255,255,0.04)", border: `2px solid ${entregaPayment === opt.value ? "#4FC3F7" : "#30363D"}`, borderRadius: 10, padding: "10px 6px", color: entregaPayment === opt.value ? "#4FC3F7" : "#8B949E" }}>
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                          <label onClick={() => setEntregaSinRecibo(!entregaSinRecibo)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: entregaSinRecibo ? "rgba(255,213,79,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${entregaSinRecibo ? "#FFD54F" : "#30363D"}`, borderRadius: 10, padding: "12px 16px" }}>
                            <input type="checkbox" checked={entregaSinRecibo} onChange={e => setEntregaSinRecibo(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#FFD54F" }} />
                            <div>
                              <div style={{ fontWeight: 600, color: entregaSinRecibo ? "#FFD54F" : "#8B949E" }}>📋 Entregado sin recibo</div>
                              <div style={{ fontSize: 12, color: "#484F58" }}>El cliente no presentó recibo físico</div>
                            </div>
                          </label>
                        </div>
                        <button onClick={confirmarEntrega} style={{ ...btn, width: "100%", background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff", padding: 16, fontSize: 16, fontWeight: 800, borderRadius: 10 }}>
                          ✅ Confirmar Entrega · ${Math.round(Number(entregaResult.price))}
                        </button>
                      </>
                    )}
                    {(entregaResult.status === "entregado" || entregaConfirmed) && (
                      <div style={{ padding: "16px 0" }}>
                        <div style={{ textAlign: "center", marginBottom: 20 }}>
                          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                          <div style={{ fontWeight: 800, fontSize: 20, color: "#66BB6A" }}>¡Entrega confirmada!</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                          {[
                            { label: "📅 FECHA DE ENTREGA", value: entregaResult.delivered_at || today, color: "#66BB6A" },
                            { label: "💳 MÉTODO DE PAGO", value: entregaResult.payment_method === "nequi" ? "📱 Nequi" : entregaResult.payment_method === "daviplata" ? "💜 Daviplata" : "💵 Efectivo", color: "#4FC3F7" },
                            { label: "💰 TOTAL COBRADO", value: `$${Math.round(Number(entregaResult.price))}`, color: "#66BB6A" },
                            { label: "📋 RECIBO", value: entregaResult.sin_recibo ? "⚠️ Sin recibo" : "✅ Con recibo", color: entregaResult.sin_recibo ? "#FFD54F" : "#66BB6A" },
                            { label: "👤 ENTREGADO POR", value: entregaResult.delivered_by || "—", color: "#C792EA" },
                          ].map((item, i) => (
                            <div key={i} style={{ background: "#0D1117", borderRadius: 10, padding: "14px 16px" }}>
                              <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                              <div style={{ fontWeight: 800, fontSize: 16, color: item.color }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => { setEntregaResult(null); setEntregaResults(null); setEntregaSearch(""); setEntregaConfirmed(false); }}
                          style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", width: "100%", padding: 12 }}>
                          🔍 Nueva búsqueda
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CLIENTS */}
          {tab === "clients" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Clientes</h2>
                <button onClick={() => setModal("newClient")} style={{ ...btn, background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff" }}>+ Nuevo Cliente</button>
              </div>
              <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <input style={{ ...inp, maxWidth: 320 }} placeholder="🔍 Buscar por nombre o teléfono..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                {clientSearch && <button onClick={() => setClientSearch("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "8px 14px", fontSize: 12 }}>✕ Limpiar</button>}
                <span style={{ fontSize: 13, color: "#8B949E" }}>
                  {clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)).length} cliente{clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)).length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
                {clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)).map(c => (
                  <div key={c.id} style={{ ...card, borderTop: "3px solid #4FC3F7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 28 }}>👤</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditingClient({ ...c })} style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "4px 10px", fontSize: 12 }}>✏️</button>
                        <button onClick={() => {
                          const pwd = prompt("Contraseña para eliminar:");
                          if (pwd === "9621") { if (window.confirm("¿Eliminar este cliente?")) deleteClient(c.id); }
                          else if (pwd !== null) alert("❌ Contraseña incorrecta");
                        }} style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "4px 10px", fontSize: 12 }}>🗑</button>
                      </div>
                    </div>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Gastos</h2>
                  <input type="date" value={expenseFilterDate} onChange={e => setExpenseFilterDate(e.target.value)} style={{ ...inp, width: 160, fontSize: 13 }} />
                  {expenseFilterDate && <button onClick={() => setExpenseFilterDate("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todos</button>}
                </div>
                <button onClick={() => setModal("newExpense")} style={{ ...btn, background: "linear-gradient(135deg,#EF5350,#B71C1C)", color: "#fff" }}>+ Nuevo Gasto</button>
              </div>
              <div style={{ ...card, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 40 }}>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: "#EF5350" }}>${Math.round((expenseFilterDate ? expenses.filter(e=>e.date===expenseFilterDate) : expenses).reduce((s,e) => s+Number(e.amount), 0))}</div><div style={{ fontSize: 12, color: "#8B949E" }}>{expenseFilterDate ? "Gastos del día" : "Total gastos"}</div></div>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: "#FFD54F" }}>{(expenseFilterDate ? expenses.filter(e=>e.date===expenseFilterDate) : expenses).length}</div><div style={{ fontSize: 12, color: "#8B949E" }}>Registros</div></div>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#21262D" }}>
                    {["Concepto","Categoría","Pago","Monto","Fecha",""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(expenseFilterDate ? expenses.filter(e=>e.date===expenseFilterDate) : expenses).map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid #21262D" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{e.concept}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ background: "rgba(255,213,79,0.1)", color: "#FFD54F", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>{e.category}</span></td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 12, background: e.payment_method === "nequi" ? "rgba(199,146,234,0.15)" : e.payment_method === "daviplata" ? "rgba(102,126,234,0.15)" : "rgba(102,187,106,0.15)", color: e.payment_method === "nequi" ? "#C792EA" : e.payment_method === "daviplata" ? "#667EEA" : "#66BB6A", padding: "3px 10px", borderRadius: 20 }}>
                          {e.payment_method === "nequi" ? "📱 Nequi" : e.payment_method === "daviplata" ? "💜 Daviplata" : "💵 Efectivo"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#EF5350" }}>${e.amount}</td>
                      <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{e.date}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => {
                          const pwd = prompt("Contraseña para eliminar:");
                          if (pwd === "9621") { if (window.confirm("¿Eliminar este gasto?")) deleteExpense(e.id); }
                          else if (pwd !== null) alert("❌ Contraseña incorrecta");
                        }} style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>
                      </td>
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
                  {[["Ingresos totales",`$${Math.round(todayRevenue)}`,"#66BB6A"],["Gastos totales",`$${Math.round(todayExp)}`,"#EF5350"],["Utilidad neta",`$${Math.round(todayRevenue-todayExp)}`,"#4FC3F7"]].map(([l,v,c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                      <span style={{ color: "#8B949E" }}>{l}</span>
                      <span style={{ fontWeight: 800, color: c, fontSize: 16 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", color: "#4FC3F7" }}>👕 Resumen de Prendas</h3>
                  {[["Total prendas",todayGarments],["Total órdenes",todayOrders.length],["Ticket promedio",todayOrders.length?`$${Math.round(todayRevenue/todayOrders.length)}`:"$0"]].map(([l,v]) => (
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
                  const ords = todayOrders.filter(o => (o.service||"").split(",").map(s=>s.trim()).includes(sv.id));
                  const rev = ords.reduce((s,o) => s+Number(o.price), 0);
                  const garm = ords.reduce((s,o) => s+Number(o.garments), 0);
                  return (
                    <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid #21262D" }}>
                      <div style={{ fontSize: 24 }}>{sv.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{sv.label}</div>
                        <div style={{ fontSize: 12, color: "#8B949E" }}>{ords.length} órdenes · {garm} prendas</div>
                      </div>
                      <div style={{ fontWeight: 800, color: sv.color, fontSize: 16 }}>${Math.round(rev)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ ...card, marginTop: 16 }}>
                <h3 style={{ margin: "0 0 16px", color: "#8B949E" }}>📋 Estado de órdenes</h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_LABELS).map(([k,v]) => {
                    const cnt = todayOrders.filter(o => o.status === k).length;
                    return (
                      <div key={k} style={{ background: v.color+"15", border: `1px solid ${v.color}40`, borderRadius: 10, padding: "12px 20px", textAlign: "center", minWidth: 100 }}>
                        <div style={{ fontWeight: 800, fontSize: 24, color: v.color }}>{cnt}</div>
                        <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>{v.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* REVERSADAS */}
              <div style={{ ...card, marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#FFD54F" }}>↩️ Órdenes Reversadas</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#8B949E" }}>Órdenes que estuvieron entregadas y fueron reversadas a "Listo"</p>
                  </div>
                </div>
                <div style={{ marginBottom: 16, display: "flex", gap: 10 }}>
                  <input style={{ ...inp, maxWidth: 300 }} placeholder="🔍 Buscar por nombre, teléfono o # orden..."
                    value={reversadasSearch} onChange={e => setReversadasSearch(e.target.value)} />
                  {reversadasSearch && <button onClick={() => setReversadasSearch("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "8px 12px", fontSize: 12 }}>✕</button>}
                </div>
                {(() => {
                  const q = reversadasSearch.toLowerCase();
                  const reversadas = orders.filter(o => {
                    if (o.status !== "listo") return false;
                    // Una orden reversada es la que tiene delivered_by registrado (fue entregada antes)
                    // O que tiene un historial de entrega (delivered_at aunque esté null ahora)
                    // La mejor forma: status=listo Y tiene employee registrado como delivered_by
                    if (!o.delivered_by && !o.delivered_at) return false;
                    if (!q) return true;
                    return o.client_name?.toLowerCase().includes(q) || o.phone?.includes(q) || o.order_number?.toLowerCase().includes(q);
                  });
                  return reversadas.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 32, color: "#484F58" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>↩️</div>
                      <div>{reversadasSearch ? "No se encontraron órdenes reversadas con ese criterio" : "No hay órdenes reversadas aún"}</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: "#8B949E", marginBottom: 12 }}>
                        <strong style={{ color: "#FFD54F" }}>{reversadas.length}</strong> orden{reversadas.length !== 1 ? "es" : ""} reversada{reversadas.length !== 1 ? "s" : ""}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#21262D" }}>
                              {["# Orden","Cliente","Teléfono","Servicio","Total","Entregado por","Estado"].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 11 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reversadas.map(o => (
                              <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                                <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(255,213,79,0.15)", color: "#FFD54F", fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>{o.order_number || "—"}</span></td>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{o.client_name}</td>
                                <td style={{ padding: "10px 12px", color: "#8B949E" }}>{o.phone}</td>
                                <td style={{ padding: "10px 12px" }}>{(o.service||"").split(",").map(sid => { const sv=SERVICES.find(s=>s.id===sid.trim()); return sv?<span key={sid} style={{ background:sv.color+"22",color:sv.color,padding:"1px 6px",borderRadius:10,fontSize:11,marginRight:3 }}>{sv.icon} {sv.label}</span>:null; })}</td>
                                <td style={{ padding: "10px 12px", fontWeight: 700, color: "#66BB6A" }}>${Math.round(Number(o.price))}</td>
                                <td style={{ padding: "10px 12px" }}>
                                  {o.delivered_by
                                    ? <span style={{ color: "#C792EA", fontSize: 12 }}>👤 {o.delivered_by}</span>
                                    : <span style={{ color: "#484F58", fontSize: 12 }}>—</span>}
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ background: "#66BB6A22", color: "#66BB6A", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>↩️ Reversada</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* INVENTARIO */}
              <div style={{ ...card, marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#FF8A65" }}>📦 Inventario — Prendas sin retirar</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#8B949E" }}>Órdenes que aún no han sido entregadas al cliente</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <input type="date" value={inventoryFilter} onChange={e => setInventoryFilter(e.target.value)} style={{ ...inp, width: 160, fontSize: 13, colorScheme: "dark" }} />
                    {inventoryFilter && <button onClick={() => setInventoryFilter("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todas</button>}
                    <select value={inventoryDaysFilter} onChange={e => setInventoryDaysFilter(e.target.value)} style={{ ...inp, width: 160, fontSize: 13 }}>
                      <option value="">Todos los días</option>
                      <option value="7">Más de 7 días</option>
                      <option value="30">Más de 30 días</option>
                      <option value="60">Más de 60 días</option>
                      <option value="90">Más de 90 días</option>
                    </select>
                    <button onClick={() => {
                      const rows = orders.filter(o => o.status !== "entregado" && (!inventoryFilter || o.date === inventoryFilter));
                      const days = r => Math.floor((new Date() - new Date(r.date)) / (1000*60*60*24));
                      const csv = [["# Orden","Cliente","Teléfono","Servicio","Prendas","Valor","Estado","F. Ingreso","F. Entrega","Días en local"],...rows.map(o => [o.order_number||"",o.client_name,o.phone,getServiceLabel(o.service),o.garments,Math.round(Number(o.price)),STATUS_LABELS[o.status]?.label,o.date,o.delivery_date||"",days(o)])].map(r => r.join(",")).join("\n");
                      const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = `inventario_${today}.csv`; a.click();
                      URL.revokeObjectURL(url);
                    }} style={{ ...btn, background: "rgba(102,187,106,0.15)", color: "#66BB6A", padding: "6px 14px", fontSize: 12 }}>
                      📥 Exportar Excel
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Órdenes pendientes", value: orders.filter(o => o.status !== "entregado" && (!inventoryFilter || o.date === inventoryFilter)).length, color: "#4FC3F7" },
                    { label: "Prendas en local", value: orders.filter(o => o.status !== "entregado" && (!inventoryFilter || o.date === inventoryFilter)).reduce((s,o) => s+Number(o.garments), 0), color: "#FFD54F" },
                    { label: "Valor en inventario", value: `$${Math.round(orders.filter(o=>o.status!=="entregado"&&(!inventoryFilter||o.date===inventoryFilter)).reduce((s,o)=>s+Number(o.price),0))}`, color: "#66BB6A" },
                    { label: "Listas para retiro", value: orders.filter(o => o.status === "listo" && (!inventoryFilter || o.date === inventoryFilter)).length, color: "#FF8A65" },
                  ].map((kpi,i) => (
                    <div key={i} style={{ background: "#0D1117", borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${kpi.color}` }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: kpi.color }}>{kpi.value}</div>
                      <div style={{ fontSize: 11, color: "#8B949E", marginTop: 2 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const pendingOrders = orders.filter(o => {
                    if (o.status === "entregado") return false;
                    if (inventoryFilter && o.date !== inventoryFilter) return false;
                    if (inventoryDaysFilter) {
                      const days = Math.floor((new Date() - new Date(o.date)) / (1000*60*60*24));
                      if (Number(inventoryDaysFilter) > 0 && days < Number(inventoryDaysFilter)) return false;
                    }
                    return true;
                  }).sort((a,b) => new Date(a.delivery_date||"9999") - new Date(b.delivery_date||"9999"));
                  return pendingOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 32, color: "#484F58" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                      <div>No hay prendas pendientes de retiro</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#21262D" }}>
                            {["# Orden","Cliente","Teléfono","Servicio","Prendas","Valor","Estado","F. Ingreso","F. Entrega","Días"].map(h => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOrders.map(o => {
                            const daysIn = Math.floor((new Date() - new Date(o.date)) / (1000*60*60*24));
                            const isLate = o.delivery_date && new Date(o.delivery_date) < new Date() && o.status !== "entregado";
                            return (
                              <tr key={o.id} style={{ borderBottom: "1px solid #21262D", background: isLate ? "rgba(239,83,80,0.05)" : "transparent" }}>
                                <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>{o.order_number || "—"}</span></td>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{o.client_name}</td>
                                <td style={{ padding: "10px 12px", color: "#8B949E", fontSize: 12 }}>{o.phone}</td>
                                <td style={{ padding: "10px 12px" }}>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                    {(o.service||"").split(",").map(sid => { const sv=SERVICES.find(s=>s.id===sid.trim()); return sv?<span key={sid} style={{ background:sv.color+"22",color:sv.color,padding:"1px 6px",borderRadius:10,fontSize:11,whiteSpace:"nowrap" }}>{sv.icon} {sv.label}</span>:null; })}
                                  </div>
                                </td>
                                <td style={{ padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>{o.garments}</td>
                                <td style={{ padding: "10px 12px", fontWeight: 700, color: "#66BB6A" }}>${Math.round(Number(o.price))}</td>
                                <td style={{ padding: "10px 12px" }}><span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{STATUS_LABELS[o.status]?.label}</span></td>
                                <td style={{ padding: "10px 12px", color: "#8B949E", fontSize: 12 }}>{o.date}</td>
                                <td style={{ padding: "10px 12px", fontSize: 12 }}><span style={{ color: isLate ? "#EF5350" : "#FFD54F", fontWeight: isLate ? 700 : 400 }}>{isLate ? "⚠️ " : "📅 "}{o.delivery_date || "—"}</span></td>
                                <td style={{ padding: "10px 12px", textAlign: "center" }}><span style={{ fontWeight: 700, color: daysIn > 7 ? "#EF5350" : daysIn > 3 ? "#FFD54F" : "#8B949E", fontSize: 13 }}>{daysIn}d</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* REVERSAR */}
          {tab === "reversar" && (
            <div>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>↩️ Reversar Entrega</h2>
              <p style={{ color: "#8B949E", fontSize: 13, marginBottom: 24 }}>Busca una orden y devuélvela a estado "Listo" si hubo un error.</p>
              <div style={{ ...card, marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8, fontWeight: 600 }}>BUSCAR POR TELÉFONO O NÚMERO DE ORDEN</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input style={{ ...inp, flex: 1, fontSize: 16 }} placeholder="Ej: 3105604421 o S0001" value={reversarSearch}
                    onChange={e => { setReversarSearch(e.target.value); setReversarResults(null); setReversarDone(false); }}
                    onKeyDown={e => e.key === "Enter" && searchReversar()} />
                  <button onClick={searchReversar} style={{ ...btn, background: "linear-gradient(135deg,#FFD54F,#F57F17)", color: "#000", padding: "10px 24px", fontWeight: 800 }}>🔍 Buscar</button>
                </div>
              </div>
              {reversarResults !== null && reversarResults.length === 0 && (
                <div style={{ ...card, textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>😕</div>
                  <div style={{ fontWeight: 600, color: "#8B949E" }}>No se encontraron órdenes</div>
                </div>
              )}
              {reversarDone && <div style={{ ...card, textAlign: "center", padding: 24, border: "1px solid #66BB6A", marginBottom: 16 }}><div style={{ fontSize: 36, marginBottom: 6 }}>✅</div><div style={{ fontWeight: 800, fontSize: 16, color: "#66BB6A" }}>¡Orden reversada correctamente!</div></div>}
              {reversarResults !== null && reversarResults.length > 0 && (
                <div>
                  {reversarResults.map(o => (
                    <div key={o.id} style={{ ...card, marginBottom: 12, borderLeft: `4px solid ${STATUS_LABELS[o.status]?.color||"#30363D"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "3px 10px", borderRadius: 6, fontSize: 13 }}>{o.order_number || "—"}</span>
                            <span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[o.status]?.label}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{o.client_name}</div>
                          <div style={{ fontSize: 13, color: "#8B949E" }}>📞 {o.phone} · {getServiceLabel(o.service)} · {o.garments} prendas</div>
                          <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "#484F58" }}>
                            <span>📅 Ingreso: {o.date}</span>
                            {o.delivered_at && <span>✅ Entregado: {o.delivered_at}</span>}
                            {o.payment_method && <span>{o.payment_method === "nequi" ? "📱 Nequi" : o.payment_method === "daviplata" ? "💜 Daviplata" : "💵 Efectivo"}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                          <div style={{ fontWeight: 800, fontSize: 22, color: "#66BB6A", marginBottom: 8 }}>${Math.round(Number(o.price))}</div>
                          <button onClick={() => confirmarReversar(o)} style={{ ...btn, background: o.status === "entregado" ? "linear-gradient(135deg,#FFD54F,#F57F17)" : "rgba(255,255,255,0.08)", color: o.status === "entregado" ? "#000" : "#8B949E", padding: "10px 18px", fontWeight: 800, fontSize: 13 }}>
                            ↩️ {o.status === "entregado" ? "Reversar" : "Cambiar a Listo"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONFIG */}
          {tab === "config" && (
            <div>
              <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800 }}>⚙️ Configuración</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#4FC3F7" }}>👕 Tipos de Prenda</h3>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input style={{ ...inp, flex: 1 }} placeholder="Nueva prenda..." value={newGarment} onChange={e => setNewGarment(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newGarment.trim()) { saveGarmentTypes([...garmentTypes, newGarment.trim()]); setNewGarment(""); } }} />
                    <button onClick={() => { if (newGarment.trim()) { saveGarmentTypes([...garmentTypes, newGarment.trim()]); setNewGarment(""); } }}
                      style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: "10px 16px" }}>+ Agregar</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 350, overflowY: "auto" }}>
                    {garmentTypes.map((g, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D1117", borderRadius: 8, padding: "8px 12px" }}>
                        <span>{GARMENT_ICONS[g] || "👕"} {g}</span>
                        <button onClick={() => { if (window.confirm(`¿Eliminar "${g}"?`)) saveGarmentTypes(garmentTypes.filter((_,idx) => idx !== i)); }}
                          style={{ background: "rgba(239,83,80,0.15)", color: "#EF5350", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { if (window.confirm("¿Restaurar lista por defecto?")) saveGarmentTypes(DEFAULT_GARMENT_TYPES); }}
                    style={{ marginTop: 12, width: "100%", padding: 8, borderRadius: 8, border: "1px solid #30363D", background: "transparent", color: "#8B949E", cursor: "pointer", fontSize: 12 }}>
                    🔄 Restaurar por defecto
                  </button>
                </div>

                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#C792EA" }}>🎨 Colores</h3>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input style={{ ...inp, flex: 1 }} placeholder="Nuevo color..." value={newColor} onChange={e => setNewColor(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newColor.trim()) { saveColors([...colors, newColor.trim()]); setNewColor(""); } }} />
                    <button onClick={() => { if (newColor.trim()) { saveColors([...colors, newColor.trim()]); setNewColor(""); } }}
                      style={{ ...btn, background: "linear-gradient(135deg,#C792EA,#9B59B6)", color: "#fff", padding: "10px 16px" }}>+ Agregar</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 350, overflowY: "auto" }}>
                    {colors.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(199,146,234,0.1)", border: "1px solid rgba(199,146,234,0.3)", borderRadius: 20, padding: "4px 10px" }}>
                        <span style={{ fontSize: 13, color: "#C792EA" }}>🎨 {c}</span>
                        <button onClick={() => { if (window.confirm(`¿Eliminar "${c}"?`)) saveColors(colors.filter((_,idx) => idx !== i)); }}
                          style={{ background: "none", color: "#EF5350", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 2px" }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { if (window.confirm("¿Restaurar colores por defecto?")) saveColors(DEFAULT_COLORS); }}
                    style={{ marginTop: 12, width: "100%", padding: 8, borderRadius: 8, border: "1px solid #30363D", background: "transparent", color: "#8B949E", cursor: "pointer", fontSize: 12 }}>
                    🔄 Restaurar por defecto
                  </button>
                </div>
              </div>

              {/* PRECIOS POR DEFECTO */}
              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#66BB6A" }}>💰 Precios por defecto de prendas</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8B949E" }}>Al seleccionar una prenda en nueva orden se llenará el precio automáticamente</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                  {garmentTypes.map(g => (
                    <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0D1117", borderRadius: 8, padding: "8px 12px" }}>
                      <span style={{ fontSize: 13, flex: 1 }}>{GARMENT_ICONS[g]||"👕"} {g}</span>
                      <input type="number" placeholder="Precio" value={precioDefaults[g]||""} onChange={e => {
                        const val = e.target.value;
                        const updated = { ...precioDefaults, [g]: val ? Number(val) : undefined };
                        if (!val) delete updated[g];
                        setPrecioDefaults(updated);
                        try { localStorage.setItem("precioDefaults", JSON.stringify(updated)); } catch {}
                      }} style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid #30363D", background: "#161B22", color: "#66BB6A", fontSize: 13, fontWeight: 700, textAlign: "right" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* USUARIOS */}
              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, color: "#FFD54F" }}>👥 Usuarios y Turnos</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#8B949E", fontWeight: 600 }}>USUARIOS REGISTRADOS</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {employees.map(e => (
                        <div key={e.id} style={{ background: "#0D1117", borderRadius: 10, padding: "12px 14px", border: `1px solid ${e.id === user.id ? "#4FC3F7" : "#21262D"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</span>
                                {e.id === user.id && <span style={{ fontSize: 10, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "1px 7px", borderRadius: 10 }}>Tú</span>}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ fontSize: 11, background: e.role === "admin" ? "rgba(255,213,79,0.15)" : "rgba(255,255,255,0.05)", color: e.role === "admin" ? "#FFD54F" : "#8B949E", padding: "2px 8px", borderRadius: 10 }}>
                                  {e.role === "admin" ? "👑 Admin" : "👤 Empleado"}
                                </span>
                                <span style={{ fontSize: 11, background: "rgba(102,187,106,0.1)", color: "#66BB6A", padding: "2px 8px", borderRadius: 10 }}>🕐 {e.turno || "mañana"}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setEditingEmployee({ ...e })} style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "5px 10px", fontSize: 12 }}>✏️</button>
                              {e.id !== user.id && <button onClick={() => deleteEmployee(e.id)} style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#8B949E", fontWeight: 600 }}>NUEVO USUARIO</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div><label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE</label>
                        <input style={inp} placeholder="Nombre del empleado" value={newEmployee.name} onChange={e => setNewEmployee(p=>({...p,name:e.target.value}))} /></div>
                      <div><label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>PIN (4-6 dígitos)</label>
                        <input style={inp} type="password" placeholder="••••" maxLength={6} value={newEmployee.pin} onChange={e => setNewEmployee(p=>({...p,pin:e.target.value}))} /></div>
                      <div><label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>ROL</label>
                        <select style={inp} value={newEmployee.role} onChange={e => setNewEmployee(p=>({...p,role:e.target.value}))}>
                          <option value="employee" style={{ background: "#1a1a2e" }}>👤 Empleado</option>
                          <option value="admin" style={{ background: "#1a1a2e" }}>👑 Administrador</option>
                        </select></div>
                      <div><label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>TURNO</label>
                        <select style={inp} value={newEmployee.turno} onChange={e => setNewEmployee(p=>({...p,turno:e.target.value}))}>
                          <option value="mañana" style={{ background: "#1a1a2e" }}>🌅 Mañana</option>
                          <option value="tarde" style={{ background: "#1a1a2e" }}>🌆 Tarde</option>
                          <option value="noche" style={{ background: "#1a1a2e" }}>🌙 Noche</option>
                          <option value="completo" style={{ background: "#1a1a2e" }}>⏰ Día completo</option>
                        </select></div>
                      <button onClick={addEmployee} disabled={!newEmployee.name || !newEmployee.pin}
                        style={{ ...btn, background: "linear-gradient(135deg,#FFD54F,#F57F17)", color: "#000", padding: 12, fontWeight: 800, opacity: !newEmployee.name||!newEmployee.pin ? 0.5 : 1 }}>
                        + Crear Usuario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODALS */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", borderRadius: 16, padding: 28, width: 460, border: "1px solid #30363D", maxHeight: "90vh", overflowY: "auto" }}>

            {modal === "newOrder" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>➕ Nueva Orden</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                    <input style={{ ...inp, borderColor: clients.find(c => c.phone === newOrder.phone) ? "#66BB6A" : "#30363D" }}
                      placeholder="Escribe el teléfono..." value={newOrder.phone}
                      onChange={e => setNewOrder(p => ({ ...p, phone: e.target.value, client_name: "" }))}
                      onKeyDown={e => { if (e.key === "Enter") { const f = clients.find(c => c.phone === newOrder.phone); if (f) setNewOrder(p => ({ ...p, client_name: f.name })); } }}
                    />
                    {newOrder.phone.length >= 3 && (() => {
                      const matches = clients.filter(c => c.phone.includes(newOrder.phone) && c.phone !== newOrder.phone);
                      return matches.length > 0 ? (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1C2128", border: "1px solid #30363D", borderRadius: 8, zIndex: 50, overflow: "hidden", marginTop: 2 }}>
                          {matches.slice(0,4).map(c => (
                            <div key={c.id} onClick={() => setNewOrder(p => ({ ...p, phone: c.phone, client_name: c.name }))}
                              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #21262D" }}
                              onMouseEnter={e => e.currentTarget.style.background="#21262D"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
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

                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE DEL CLIENTE</label>
                    <input style={{ ...inp, background: newOrder.client_name && clients.find(c=>c.phone===newOrder.phone) ? "rgba(102,187,106,0.08)" : "#0D1117", borderColor: newOrder.client_name && clients.find(c=>c.phone===newOrder.phone) ? "#66BB6A" : "#30363D" }}
                      placeholder={newOrder.phone && !clients.find(c=>c.phone===newOrder.phone) ? "Cliente nuevo — escribe el nombre" : "Nombre del cliente"}
                      value={newOrder.client_name} onChange={e => setNewOrder(p => ({ ...p, client_name: e.target.value }))} />
                    {newOrder.phone && !clients.find(c=>c.phone===newOrder.phone) && newOrder.client_name && <div style={{ fontSize: 11, color: "#FFD54F", marginTop: 4 }}>⚡ Cliente nuevo — se creará automáticamente</div>}
                    {newOrder.client_name && clients.find(c=>c.phone===newOrder.phone) && <div style={{ fontSize: 11, color: "#66BB6A", marginTop: 4 }}>✅ Cliente existente</div>}
                  </div>

                  {(() => {
                    const pendientes = orders.filter(o => o.phone === newOrder.phone && (o.status === "listo" || o.status === "en_proceso" || o.status === "recibido"));
                    return pendientes.length > 0 ? (
                      <div style={{ background: "rgba(255,213,79,0.08)", border: "1px solid rgba(255,213,79,0.4)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 16 }}>⚠️</span>
                          <span style={{ fontWeight: 700, color: "#FFD54F", fontSize: 13 }}>Tiene {pendientes.length} orden{pendientes.length>1?"es":""} pendiente{pendientes.length>1?"s":""} por recoger</span>
                        </div>
                        {pendientes.map(p => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,213,79,0.15)" }}>
                            <div>
                              <span style={{ fontWeight: 700, color: "#4FC3F7", fontSize: 13 }}>{p.order_number || "—"}</span>
                              <span style={{ color: "#8B949E", fontSize: 12 }}> · {getServiceLabel(p.service)} · {p.garments} prendas</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, color: "#66BB6A", fontSize: 13 }}>${Math.round(Number(p.price))}</span>
                              <span style={{ fontSize: 11, background: STATUS_LABELS[p.status]?.color+"22", color: STATUS_LABELS[p.status]?.color, padding: "2px 8px", borderRadius: 20 }}>{STATUS_LABELS[p.status]?.label}</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                          <span style={{ fontSize: 12, color: "#8B949E" }}>Total pendiente</span>
                          <span style={{ fontWeight: 800, color: "#FFD54F", fontSize: 15 }}>${Math.round(pendientes.reduce((s,p) => s+Number(p.price), 0))}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: "#8B949E", fontWeight: 600 }}>PRENDAS</label>
                      <button onClick={addItem} style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "4px 10px", fontSize: 12 }}>+ Agregar</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 55px 75px 1fr 30px", gap: 6, marginBottom: 4 }}>
                      {["Tipo de prenda","Cant.","Precio c/u","Colores",""].map((h,i) => (
                        <div key={i} style={{ fontSize: 10, color: "#484F58", fontWeight: 600 }}>{h}</div>
                      ))}
                    </div>
                    {items.map((item, i) => (
                      <div key={i} style={{ marginBottom: 10, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10, border: "1px solid #21262D" }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                          {SERVICES.map(sv => {
                            const sel = item.service === sv.id;
                            return (
                              <label key={sv.id} onClick={() => updateItem(i, "service", sv.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", fontSize: 10, fontWeight: 600, background: sel ? sv.color+"22" : "rgba(255,255,255,0.03)", border: `1.5px solid ${sel ? sv.color : "#30363D"}`, borderRadius: 6, padding: "4px 2px", color: sel ? sv.color : "#484F58", userSelect: "none" }}>
                                {sv.icon} {sv.label}
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 55px 75px 1fr 30px", gap: 6, alignItems: "center", marginBottom: 8 }}>
                          <select value={item.garment_type} onChange={e => updateItem(i,"garment_type",e.target.value)} style={{ ...inp, padding: "8px 10px" }}>
                            {garmentTypes.map(g => <option key={g} value={g} style={{ background: "#1a1a2e" }}>{GARMENT_ICONS[g]||"👕"} {g}</option>)}
                          </select>
                          <input type="number" min={1} value={item.quantity} onChange={e => updateItem(i,"quantity",e.target.value)} style={{ ...inp, padding: "8px 6px", textAlign: "center" }} />
                          <input type="number" min={0} placeholder="0" value={item.price} onChange={e => updateItem(i,"price",e.target.value)} style={{ ...inp, padding: "8px 6px" }} />
                          <div style={{ position: "relative" }}>
                            {(item.colors||[]).length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 3 }}>
                                {(item.colors||[]).map((c,ci) => (
                                  <span key={ci} style={{ fontSize: 10, background: "rgba(199,146,234,0.2)", color: "#C792EA", border: "1px solid rgba(199,146,234,0.4)", borderRadius: 10, padding: "1px 6px", display: "flex", alignItems: "center", gap: 2 }}>
                                    {c}<span onMouseDown={() => updateItem(i,"colors",(item.colors||[]).filter((_,idx)=>idx!==ci))} style={{ cursor: "pointer", color: "#EF5350", fontWeight: 700 }}>×</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {(item.colors||[]).length > 0 && (item.colors||[]).length < Number(item.quantity) && (
                              <div style={{ fontSize: 10, color: "#FFD54F", marginBottom: 2 }}>⚠️ Faltan {Number(item.quantity)-(item.colors||[]).length} color{Number(item.quantity)-(item.colors||[]).length>1?"es":""}</div>
                            )}
                            {(item.colors||[]).length >= Number(item.quantity) && Number(item.quantity) > 0
                              ? <div style={{ fontSize: 10, color: "#66BB6A" }}>✅ {item.quantity} color{Number(item.quantity)>1?"es":""} asignado{Number(item.quantity)>1?"s":""}</div>
                              : <input type="text" placeholder="Color..." value={item.colorInput||""} onChange={e => updateItem(i,"colorInput",e.target.value)}
                                  onFocus={() => setColorFocusIdx(i)} onBlur={() => setTimeout(()=>setColorFocusIdx(null),150)}
                                  style={{ ...inp, padding: "6px 8px", fontSize: 12 }} autoComplete="off" />
                            }
                            {colorFocusIdx === i && (item.colors||[]).length < Number(item.quantity) && (() => {
                              const val = item.colorInput||"";
                              const matches = val.length >= 1 ? colors.filter(c=>c.toLowerCase().includes(val.toLowerCase())) : colors;
                              return matches.length > 0 ? (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1C2128", border: "1px solid #30363D", borderRadius: 8, zIndex: 99, overflow: "hidden", marginTop: 2, maxHeight: 160, overflowY: "auto" }}>
                                  {matches.map(c => (
                                    <div key={c} onMouseDown={() => { updateItem(i,"colors",[...(item.colors||[]),c]); updateItem(i,"colorInput",""); }}
                                      style={{ padding: "7px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #21262D" }}
                                      onMouseEnter={e=>e.currentTarget.style.background="#21262D"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                      🎨 {c}
                                    </div>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                          {items.length > 1
                            ? <button onClick={() => removeItem(i)} style={{ background: "rgba(239,83,80,0.2)", color: "#EF5350", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
                            : <div />
                          }
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[{key:"decolorado",label:"Decolorado",color:"#FFD54F"},{key:"percudido",label:"Percudido",color:"#EF5350"},{key:"roto",label:"Roto",color:"#EF5350"},{key:"manchado",label:"Manchado",color:"#FF8A65"}].map(cond => (
                            <label key={cond.key} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, background: item[cond.key] ? cond.color+"22" : "rgba(255,255,255,0.04)", border: `1px solid ${item[cond.key] ? cond.color : "#30363D"}`, borderRadius: 20, padding: "3px 10px", userSelect: "none" }}>
                              <input type="checkbox" checked={!!item[cond.key]} onChange={e => updateItem(i,cond.key,e.target.checked)} style={{ accentColor: cond.color, cursor: "pointer" }} />
                              <span style={{ color: item[cond.key] ? cond.color : "#8B949E" }}>{cond.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div style={{ background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: "#8B949E" }}>Total · {totalGarments(items)} prendas</span>
                      <span style={{ fontWeight: 800, color: "#66BB6A", fontSize: 16 }}>${Math.round(totalPrice(items))}</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOTAS <span style={{ color: "#484F58", fontWeight: 400 }}>(se llena automáticamente)</span></label>
                    <textarea style={{ ...inp, height: 60, resize: "none", borderColor: newOrder.notes ? "rgba(255,213,79,0.4)" : "#30363D" }}
                      placeholder="Marca condiciones arriba para llenar automáticamente..." value={newOrder.notes} onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))} />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>📅 FECHA DE ENTREGA</label>
                    <input type="date" style={{ ...inp, colorScheme: 'dark', borderColor: "#FFD54F44" }} value={newOrder.delivery_date} onChange={e => setNewOrder(p => ({ ...p, delivery_date: e.target.value }))} />
                    <div style={{ fontSize: 11, color: "#8B949E", marginTop: 4 }}>Por defecto: 2 días después de hoy. Puedes cambiarla.</div>
                  </div>

                  <button onClick={addOrder} disabled={saving || !newOrder.client_name} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: 14, fontSize: 15, opacity: saving||!newOrder.client_name ? 0.6 : 1 }}>
                    {saving ? "Guardando..." : `Guardar Orden · $${Math.round(totalPrice(items))}`}
                  </button>
                </div>
              </>
            )}

            {modal === "newExpense" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>💰 Nuevo Gasto</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>CONCEPTO</label>
                    <input style={inp} placeholder="Ej: Detergente" value={newExpense.concept} onChange={e => setNewExpense(p=>({...p,concept:e.target.value}))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>CATEGORÍA</label>
                    <select style={inp} value={newExpense.category} onChange={e => setNewExpense(p=>({...p,category:e.target.value}))}>
                      {["insumos","servicios","mantenimiento","otros"].map(c => <option key={c} value={c} style={{ background: "#1a1a2e" }}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select></div>
                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8 }}>MÉTODO DE PAGO</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"}].map(opt => (
                        <label key={opt.value} onClick={() => setNewExpense(p=>({...p,payment_method:opt.value}))} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13, fontWeight:600, background: newExpense.payment_method===opt.value ? "rgba(79,195,247,0.15)" : "rgba(255,255,255,0.04)", border:`2px solid ${newExpense.payment_method===opt.value?"#4FC3F7":"#30363D"}`, borderRadius:10, padding:"10px 6px", color: newExpense.payment_method===opt.value?"#4FC3F7":"#8B949E" }}>
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>MONTO ($)</label>
                    <input style={inp} type="number" placeholder="0" value={newExpense.amount} onChange={e => setNewExpense(p=>({...p,amount:e.target.value}))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>FECHA</label>
                    <input style={inp} type="date" value={newExpense.date} onChange={e => setNewExpense(p=>({...p,date:e.target.value}))} /></div>
                  <button onClick={addExpense} disabled={saving} style={{ ...btn, background: "linear-gradient(135deg,#EF5350,#B71C1C)", color: "#fff", padding: 12, opacity: saving?0.7:1 }}>{saving?"Guardando...":"Guardar Gasto"}</button>
                </div>
              </>
            )}

            {modal === "newClient" && (
              <>
                <h3 style={{ margin: "0 0 20px", fontSize: 18 }}>👤 Nuevo Cliente</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE</label>
                    <input style={inp} placeholder="Nombre completo" value={newClient.name} onChange={e => setNewClient(p=>({...p,name:e.target.value}))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                    <input style={inp} placeholder="555-0000" value={newClient.phone} onChange={e => setNewClient(p=>({...p,phone:e.target.value}))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>EMAIL</label>
                    <input style={inp} type="email" placeholder="correo@email.com" value={newClient.email} onChange={e => setNewClient(p=>({...p,email:e.target.value}))} /></div>
                  <button onClick={addClient} disabled={saving} style={{ ...btn, background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff", padding: 12, opacity: saving?0.7:1 }}>{saving?"Guardando...":"Guardar Cliente"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div onClick={() => setEditingEmployee(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", borderRadius: 16, padding: 28, width: 400, border: "1px solid #FFD54F", fontFamily: "'Segoe UI', sans-serif" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "#E6EDF3" }}>✏️ Editar Usuario</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE</label>
                <input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  value={editingEmployee.name} onChange={e => setEditingEmployee(p=>({...p,name:e.target.value}))} /></div>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>PIN</label>
                <input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  type="password" maxLength={6} value={editingEmployee.pin} onChange={e => setEditingEmployee(p=>({...p,pin:e.target.value}))} /></div>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>ROL</label>
                <select style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  value={editingEmployee.role} onChange={e => setEditingEmployee(p=>({...p,role:e.target.value}))}>
                  <option value="employee" style={{ background: "#1a1a2e" }}>👤 Empleado</option>
                  <option value="admin" style={{ background: "#1a1a2e" }}>👑 Administrador</option>
                </select></div>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TURNO</label>
                <select style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  value={editingEmployee.turno||"mañana"} onChange={e => setEditingEmployee(p=>({...p,turno:e.target.value}))}>
                  <option value="mañana" style={{ background: "#1a1a2e" }}>🌅 Mañana</option>
                  <option value="tarde" style={{ background: "#1a1a2e" }}>🌆 Tarde</option>
                  <option value="noche" style={{ background: "#1a1a2e" }}>🌙 Noche</option>
                  <option value="completo" style={{ background: "#1a1a2e" }}>⏰ Día completo</option>
                </select></div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setEditingEmployee(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={updateEmployee} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#FFD54F,#F57F17)",color:"#000",fontWeight:800,cursor:"pointer",fontSize:13 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOTAL PRENDAS MODAL */}
      {showTotalPrendas && (
        <div onClick={() => setShowTotalPrendas(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 250 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", borderRadius: 20, padding: 32, width: 360, border: "1px solid rgba(255,213,79,0.4)", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>👕</div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#E6EDF3" }}>Total de Prendas del Día</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#8B949E" }}>{filterDate}</p>
            </div>
            <div style={{ background: "#0D1117", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #21262D" }}>
                <span style={{ color: "#8B949E", fontSize: 13 }}>Ingresos del día</span>
                <span style={{ fontWeight: 700, color: "#66BB6A", fontSize: 16 }}>${Math.round(todayRevenue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #21262D" }}>
                <span style={{ color: "#8B949E", fontSize: 13 }}>Precio por prenda</span>
                <span style={{ fontWeight: 700, color: "#FFD54F", fontSize: 16 }}>${precioPrend.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#8B949E", fontSize: 13 }}>Total prendas estimado</span>
                <span style={{ fontWeight: 800, color: "#4FC3F7", fontSize: 28 }}>{precioPrend > 0 ? Math.round(todayRevenue / precioPrend) : 0}</span>
              </div>
            </div>
            <div style={{ background: "rgba(79,195,247,0.06)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, textAlign: "center", fontSize: 13, color: "#8B949E" }}>
              ${Math.round(todayRevenue)} ÷ ${precioPrend.toLocaleString()} = <strong style={{ color: "#4FC3F7" }}>{precioPrend > 0 ? Math.round(todayRevenue / precioPrend) : 0} prendas</strong>
            </div>
            {!editingPrecio ? (
              <button onClick={() => { setEditingPrecio(true); setTempPrecio(String(precioPrend)); }}
                style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #30363D", background: "transparent", color: "#8B949E", cursor: "pointer", fontSize: 13, marginBottom: 12 }}>
                ✏️ Cambiar precio por prenda (actual: ${precioPrend.toLocaleString()})
              </button>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 6 }}>NUEVO PRECIO POR PRENDA</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={tempPrecio} onChange={e => setTempPrecio(e.target.value)}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #FFD54F", background: "#0D1117", color: "#E6EDF3", fontSize: 16, fontWeight: 700 }} autoFocus />
                  <button onClick={() => { const val = Number(tempPrecio); if (val > 0) { setPrecioPrend(val); try { localStorage.setItem("precioPrend", String(val)); } catch {} } setEditingPrecio(false); }}
                    style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#FFD54F", color: "#000", fontWeight: 800, cursor: "pointer" }}>Guardar</button>
                  <button onClick={() => setEditingPrecio(false)} style={{ padding: "10px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.05)", color: "#8B949E", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            )}
            <button onClick={() => setShowTotalPrendas(false)}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#FFD54F,#F57F17)", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* FLOATING CALCULATOR */}
      <button onClick={() => setShowCalc(!showCalc)} style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 300,
        width: 56, height: 56, borderRadius: "50%", border: "none",
        background: "linear-gradient(135deg,#4FC3F7,#0288D1)",
        color: "#fff", fontSize: 22, cursor: "pointer",
        boxShadow: "0 4px 20px rgba(79,195,247,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>🧮</button>

      {showCalc && (
        <div style={{ position: "fixed", bottom: 96, right: 28, zIndex: 300, background: "#1C2128", borderRadius: 20, padding: 16, border: "1px solid #30363D", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", width: 260, fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#8B949E", fontSize: 13, fontWeight: 600 }}>Calculadora <span style={{ fontSize: 10, color: "#484F58" }}>(teclado activado)</span></span>
            <button onClick={() => setShowCalc(false)} style={{ background: "none", border: "none", color: "#8B949E", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ background: "#0D1117", borderRadius: 12, padding: "12px 16px", marginBottom: 12, textAlign: "right" }}>
            {calcOp && <div style={{ fontSize: 12, color: "#8B949E", marginBottom: 2 }}>{calcPrev} {calcOp}</div>}
            <div style={{ fontSize: 32, fontWeight: 700, color: "#E6EDF3", overflowX: "auto", whiteSpace: "nowrap" }}>{calcDisplay}</div>
          </div>
          {[
            [{ l: "AC", fn: calcClear, style: { background: "#EF5350", color: "#fff" } }, { l: "+/-", fn: calcToggleSign, style: { background: "#30363D", color: "#E6EDF3" } }, { l: "%", fn: calcPercent, style: { background: "#30363D", color: "#E6EDF3" } }, { l: "÷", fn: () => calcOperation("÷"), style: { background: "#4FC3F7", color: "#000" } }],
            [{ l: "7", fn: () => calcInput("7") }, { l: "8", fn: () => calcInput("8") }, { l: "9", fn: () => calcInput("9") }, { l: "×", fn: () => calcOperation("×"), style: { background: "#4FC3F7", color: "#000" } }],
            [{ l: "4", fn: () => calcInput("4") }, { l: "5", fn: () => calcInput("5") }, { l: "6", fn: () => calcInput("6") }, { l: "-", fn: () => calcOperation("-"), style: { background: "#4FC3F7", color: "#000" } }],
            [{ l: "1", fn: () => calcInput("1") }, { l: "2", fn: () => calcInput("2") }, { l: "3", fn: () => calcInput("3") }, { l: "+", fn: () => calcOperation("+"), style: { background: "#4FC3F7", color: "#000" } }],
            [{ l: "⌫", fn: calcBackspace, style: { background: "#30363D", color: "#FFD54F" } }, { l: "0", fn: () => calcInput("0") }, { l: ".", fn: calcDot }, { l: "=", fn: calcEquals, style: { background: "#66BB6A", color: "#fff" } }],
          ].map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 8 }}>
              {row.map((b, bi) => (
                <button key={bi} onClick={b.fn} style={{ padding: "14px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 16, background: b.style?.background || "#21262D", color: b.style?.color || "#E6EDF3" }}
                  onMouseEnter={e => e.currentTarget.style.opacity="0.8"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                  {b.l}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {editingClient && (
        <div onClick={() => setEditingClient(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", borderRadius: 16, padding: 28, width: 400, border: "1px solid #4FC3F7", fontFamily: "'Segoe UI', sans-serif" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "#E6EDF3" }}>✏️ Editar Cliente</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE</label>
                <input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  value={editingClient.name} onChange={e => setEditingClient(p=>({...p,name:e.target.value}))} /></div>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                <input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  value={editingClient.phone} onChange={e => setEditingClient(p=>({...p,phone:e.target.value}))} /></div>
              <div><label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 4 }}>EMAIL</label>
                <input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }}
                  type="email" value={editingClient.email||""} onChange={e => setEditingClient(p=>({...p,email:e.target.value}))} /></div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setEditingClient(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={updateClient} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
