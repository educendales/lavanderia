import { useState, useEffect } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

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

const DEFAULT_SERVICES = [
  { id: "lavado_normal", label: "Lavado Normal", color: "#4FC3F7", icon: "💧" },
  { id: "planchado", label: "Planchado", color: "#FFD54F", icon: "🔥" },
  { id: "tintura", label: "Tintura", color: "#C792EA", icon: "🎨" },
  { id: "secado", label: "Secado", color: "#66BB6A", icon: "💨" },
];

const STATUS_LABELS = {
  recibido: { label: "Recibido", color: "#64B5F6" },
  en_proceso: { label: "En Proceso", color: "#FFD54F" },
  listo: { label: "Listo", color: "#66BB6A" },
  entregado: { label: "Entregado", color: "#9E9E9E" },
};

const getToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const getDeliveryDefault = () => { const d = new Date(); d.setDate(d.getDate()+2); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const today = getToday();
const emptyOrder = { client_name: "", phone: "", status: "recibido", notes: "", delivery_date: getDeliveryDefault(), agencia_id: null, agencia_name: "", domiciliario_id: null, a_domicilio: false, address: "" };
const emptyItem = { garment_type: "Camisa", quantity: 1, price: "", colors: [], service: "lavado_normal", decolorado: false, percudido: false, roto: false, manchado: false };
const getServiceLabel = (serviceStr, svcs) => { if (!serviceStr) return ""; return serviceStr.split(",").map(sid => { const sv = (svcs||DEFAULT_SERVICES).find(s => s.id === sid.trim()); return sv ? `${sv.icon} ${sv.label}` : sid; }).join(" + "); };

export default function LavanderiaApp() {
  const [user, setUser] = useState(null);
  const [licenciaOk, setLicenciaOk] = useState(null);
  const [qzReady, setQzReady] = useState(false);
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
  const [agencies, setAgencies] = useState([]);
  const [newAgency, setNewAgency] = useState({ name: "", phone: "", contact_name: "", address: "" });
  const [editingAgency, setEditingAgency] = useState(null);
  const [agencySearch, setAgencySearch] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [agencyOrderFilterDate, setAgencyOrderFilterDate] = useState("");
  const [agencyReportFrom, setAgencyReportFrom] = useState(() => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; });
  const [agencyReportTo, setAgencyReportTo] = useState(today);
  const [agencyReportId, setAgencyReportId] = useState("todas");
  const [domiciliarios, setDomiciliarios] = useState([]);
  const [newDomiciliario, setNewDomiciliario] = useState({ name: "", phone: "", contact_name: "", address: "" });
  const [editingDomiciliario, setEditingDomiciliario] = useState(null);
  const [domiciliarioSearch, setDomiciliarioSearch] = useState("");
  const [selectedDomiciliarioId, setSelectedDomiciliarioId] = useState("");
  const [domiciliarioOrderFilterDate, setDomiciliarioOrderFilterDate] = useState("");
  const [domiciliarioReportFrom, setDomiciliarioReportFrom] = useState(() => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; });
  const [domiciliarioReportTo, setDomiciliarioReportTo] = useState(today);
  const [domiciliarioReportId, setDomiciliarioReportId] = useState("todas");
  const [domicilioReportFrom, setDomicilioReportFrom] = useState(() => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; });
  const [domicilioReportTo, setDomicilioReportTo] = useState(today);
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
  const [garmentTypes, setGarmentTypes] = useState(() => { try { const s = localStorage.getItem("garmentTypes"); return s ? JSON.parse(s) : DEFAULT_GARMENT_TYPES; } catch { return DEFAULT_GARMENT_TYPES; } });
  const [services, setServices] = useState(() => { try { const s = localStorage.getItem("services"); return s ? JSON.parse(s) : DEFAULT_SERVICES; } catch { return DEFAULT_SERVICES; } });
  const [colors, setColors] = useState(() => { try { const s = localStorage.getItem("colors"); return s ? JSON.parse(s) : DEFAULT_COLORS; } catch { return DEFAULT_COLORS; } });
  const [newGarment, setNewGarment] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [precioDefaults, setPrecioDefaults] = useState(() => { try { const s = localStorage.getItem("precioDefaults"); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [precioByService, setPrecioByService] = useState(() => { try { const s = localStorage.getItem("precioByService"); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [configServiceTab, setConfigServiceTab] = useState("lavado_normal");
  const [precioPrend, setPrecioPrend] = useState(() => { try { return Number(localStorage.getItem("precioPrend")) || 6500; } catch { return 6500; } });
  const [showTotalPrendas, setShowTotalPrendas] = useState(false);
  const [editingPrecio, setEditingPrecio] = useState(false);
  const [tempPrecio, setTempPrecio] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [reportFrom, setReportFrom] = useState(() => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; });
  const [reportTo, setReportTo] = useState(today);
  const [reportView, setReportView] = useState("dia");
  const [inventoryDaysFilter, setInventoryDaysFilter] = useState("");
  const [selectedInventory, setSelectedInventory] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [abonoModal, setAbonoModal] = useState(null);
  const [newAbono, setNewAbono] = useState({ amount: "", payment_method: "efectivo" });
  const [advances, setAdvances] = useState([]);
  const [newAdvance, setNewAdvance] = useState({ employee_id: "", amount: "", date: today, note: "", payment_method: "efectivo" });
  const [advanceFrom, setAdvanceFrom] = useState(() => { const d = new Date(); return d.getDate() <= 15 ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01` : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-16`; });
  const [advanceTo, setAdvanceTo] = useState(() => { const d = new Date(); if (d.getDate() <= 15) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-15`; const lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`; });
  const [expenseFilterDate, setExpenseFilterDate] = useState(today);
  const [showEliminados, setShowEliminados] = useState(false);
  const [reversadasSearch, setReversadasSearch] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAyuda, setShowAyuda] = useState(false);
  const [showInformeDiario, setShowInformeDiario] = useState(false);
  const [ayudaSeccion, setAyudaSeccion] = useState("dashboard");
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrev, setCalcPrev] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcNew, setCalcNew] = useState(true);
  const [newEmployee, setNewEmployee] = useState({ name: "", pin: "", role: "employee", turno: "mañana" });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [reversarSearch, setReversarSearch] = useState("");
  const [reversarResults, setReversarResults] = useState(null);
  const [reversarDone, setReversarDone] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);
  const [reciboModal, setReciboModal] = useState(false);
  const [newColor, setNewColor] = useState("");
  const [conditions, setConditions] = useState(() => {
    try { const s = localStorage.getItem("conditions"); return s ? JSON.parse(s) : ["Decolorado","Percudido","Roto","Manchado"]; } catch { return ["Decolorado","Percudido","Roto","Manchado"]; }
  });
  const [newCondition, setNewCondition] = useState("");
  const [showCambiarClave, setShowCambiarClave] = useState(false);
  const [nuevoConsecutivo, setNuevoConsecutivo] = useState("");
  const [waMensaje, setWaMensaje] = useState(() => { try { return localStorage.getItem("waMensaje") || "Hola {nombre}, le informamos que su(s) prenda(s) en Lavanderías Shaddai ya están listas para retirar. Recuerde que puede recogerlas después de las 5pm. Orden: {orden}. ¡Gracias por preferirnos!"; } catch { return ""; } });
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConfirm, setClaveConfirm] = useState("");
  const [nombreImpresora, setNombreImpresora] = useState(() => { try { return localStorage.getItem("nombreImpresora") || "BIXOLON SRP-330II"; } catch { return "BIXOLON SRP-330II"; } });
  const [negocioPais, setNegocioPais] = useState(() => { try { return localStorage.getItem("negocioPais") || "57"; } catch { return "57"; } });
  const [negocioLogo, setNegocioLogo] = useState(() => { try { return localStorage.getItem("negocioLogo") || ""; } catch { return ""; } });
  const [logoEnRecibo, setLogoEnRecibo] = useState(() => { try { return localStorage.getItem("logoEnRecibo") !== "false"; } catch { return true; } });
  const [negocioNombre, setNegocioNombre] = useState(() => { try { return localStorage.getItem("negocioNombre") || "Lavanderías Shaddai"; } catch { return "Lavanderías Shaddai"; } });
  const [negocioDireccion, setNegocioDireccion] = useState(() => { try { return localStorage.getItem("negocioDireccion") || "CARRERA 113 # 75-56"; } catch { return "CARRERA 113 # 75-56"; } });
  const [negocioTelefono, setNegocioTelefono] = useState(() => { try { return localStorage.getItem("negocioTelefono") || ""; } catch { return ""; } });
  const [reciboSubtitulo, setReciboSubtitulo] = useState(() => { try { return localStorage.getItem("reciboSubtitulo") || "PRENDAS EL DIA INDICADO DESPUES DE LAS 5"; } catch { return "PRENDAS EL DIA INDICADO DESPUES DE LAS 5"; } });
  const [reciboLegal, setReciboLegal] = useState(() => { try { return localStorage.getItem("reciboLegal") || "CONTRATO DE SERVICIO ENTRE LA EMPRESA Y EL CLIENTE. Para entregar el trabajo exigimos este recibo. Toda perdida ocasionada por caso fortuito como robo, incendios, etc estan a riesgo del cliente. Pasados 30 dias de la fecha de este recibo cesa la responsabilidad de la empresa. NO respondemos por perdidas de dinero, joyas y demas objetos dejados en los vestidos, ni por las telas, paños y colores debido a la inconsistencia encogimiento ni de coloramiento de las mismas en los procesos de lavado anterior a este servicio. Toda prenda que se perdio o cambio se respondera por diez (10) veces el valor de su lavado anterior a este servicio."; } catch { return ""; } });

  const getClave = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/config?key=eq.admin_clave&select=value`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      return data[0]?.value || "9621";
    } catch { return "9621"; }
  };

  const checkClave = async (accion) => {
    const clave = await getClave();
    const pwd = prompt(`Clave para ${accion}:`);
    if (pwd === null) return false;
    if (pwd !== clave) { alert("❌ Clave incorrecta"); return false; }
    return true;
  };

  const calcInput = (val) => { if (calcNew) { setCalcDisplay(String(val)); setCalcNew(false); } else { setCalcDisplay(prev => prev === "0" ? String(val) : prev + val); } };
  const calcDot = () => { if (calcNew) { setCalcDisplay("0."); setCalcNew(false); return; } if (!calcDisplay.includes(".")) setCalcDisplay(prev => prev + "."); };
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
  const calcBackspace = () => { if (calcNew) return; const next = calcDisplay.slice(0,-1); setCalcDisplay(next.length === 0 || next === "-" ? "0" : next); };
  const calcToggleSign = () => setCalcDisplay(prev => prev.startsWith("-") ? prev.slice(1) : "-" + prev);
  const calcPercent = () => setCalcDisplay(prev => String(parseFloat(prev) / 100));

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

  const resetOrderCounter = async () => {
    const clave = await getClave();
    const pwd = prompt("Clave para reiniciar contador:");
    if (pwd !== clave) { if (pwd !== null) alert("❌ Clave incorrecta"); return; }
    if (!window.confirm("¿Reiniciar el contador de recibos a S0001? Esto no afecta las órdenes existentes.")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/reset_order_seq`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    alert("✅ Contador reiniciado. La próxima orden será S0001.");
  };

  const deleteAllClients = async () => {
    const clave = await getClave();
    const pwd = prompt("Clave para eliminar clientes:");
    if (pwd !== clave) { if (pwd !== null) alert("❌ Clave incorrecta"); return; }
    if (!window.confirm("⚠️ ¿Eliminar TODOS los clientes? Esta acción no se puede deshacer.")) return;
    if (!window.confirm("¿Estás seguro? Se borrarán todos los clientes registrados.")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/clients?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    setClients([]);
    alert("✅ Todos los clientes han sido eliminados.");
  };

  const saveServices = (list) => { setServices(list); try { localStorage.setItem("services", JSON.stringify(list)); } catch {} };
  const saveConditions = (list) => { setConditions(list); try { localStorage.setItem("conditions", JSON.stringify(list)); } catch {} };
  const saveGarmentTypes = (list) => { setGarmentTypes(list); try { localStorage.setItem("garmentTypes", JSON.stringify(list)); } catch {} };
  const saveColors = (list) => { setColors(list); try { localStorage.setItem("colors", JSON.stringify(list)); } catch {} };

  const confirmarMultiEntrega = async () => {
    for (const order of selectedEntregas) {
      await db.patch("orders", order.id, { status: "entregado", payment_method: entregaMultiPayment, sin_recibo: entregaMultiSinRecibo, delivered_at: today, delivered_by: user.name });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "entregado", payment_method: entregaMultiPayment, delivered_at: today, delivered_by: user.name } : o));
      if (entregaMultiSinRecibo) await printConstanciaSinRecibo(order, null);
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
    const clave = await getClave();
    const pwd = prompt("Ingresa la clave:");
    if (pwd !== clave) { if (pwd !== null) alert("❌ Clave incorrecta"); return; }
    if (order.status === "entregado") {
      if (!window.confirm(`¿Reversar la orden ${order.order_number} a "Listo"?`)) return;
      await db.patch("orders", order.id, { status: "listo", payment_method: null, sin_recibo: false, delivered_at: null, reversada: true });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "listo", payment_method: null, delivered_at: null, reversada: true } : o));
      setReversarResults(prev => prev.map(o => o.id === order.id ? { ...o, status: "listo", reversada: true } : o));
    } else {
      if (!window.confirm(`¿Eliminar la orden ${order.order_number}? El cliente no dejó las prendas.`)) return;
      await db.delete("orders", order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setReversarResults(prev => prev.filter(o => o.id !== order.id));
    }
    setReversarDone(true);
  };

  const addEmployee = async () => {
    if (!newEmployee.name || !newEmployee.pin) return;
    const res = await db.post("employees", newEmployee);
    if (Array.isArray(res) && res[0]) { setEmployees(prev => [...prev, res[0]]); setNewEmployee({ name: "", pin: "", role: "employee", turno: "mañana" }); }
  };
  const updateEmployee = async () => {
    if (!editingEmployee) return;
    await db.patch("employees", editingEmployee.id, { name: editingEmployee.name, pin: editingEmployee.pin, role: editingEmployee.role, turno: editingEmployee.turno });
    setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...editingEmployee } : e));
    setEditingEmployee(null);
  };
  const deleteEmployee = async (id) => {
    const ok = await checkClave("eliminar"); if (!ok) return;
    if (!window.confirm("¿Eliminar este usuario?")) return;
    await db.delete("employees", id); setEmployees(prev => prev.filter(e => e.id !== id));
  };

  useEffect(() => {
    // Load QZ Tray
    if (!window.qz) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
      script.onload = () => { setQzReady(true); };
      document.head.appendChild(script);
    } else {
      setQzReady(true);
    }
  }, []);

  useEffect(() => { db.get("employees").then(data => { if (Array.isArray(data) && data.length) { setEmployees(data); setSelectedEmp(data[0]); } setLoading(false); }); }, []);

  useEffect(() => {
    const checkLicencia = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/config?key=eq.dominio_autorizado&select=value`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        const data = await res.json();
        const dominio = data[0]?.value || "";
        const actual = window.location.hostname;
        // Allow exact match, localhost, or any vercel preview URL containing the project name
        const projectName = dominio.replace(".vercel.app", "");
        const isOk = actual === dominio || 
                     actual === "localhost" || 
                     actual.startsWith(projectName);
        setLicenciaOk(isOk);
      } catch { setLicenciaOk(false); }
    };
    checkLicencia();
  }, []);

  const loadData = async () => {
    const [o, e, c, oi, ab, adv, ag, dom] = await Promise.all([db.get("orders"), db.get("expenses"), db.get("clients"), db.get("order_items"), db.get("abonos"), db.get("employee_advances"), db.get("agencies"), db.get("domiciliarios")]);
    if (Array.isArray(o)) setOrders(o);
    if (Array.isArray(e)) setExpenses(e);
    if (Array.isArray(c)) setClients(c);
    if (Array.isArray(oi)) { const grouped = {}; oi.forEach(item => { if (!grouped[item.order_id]) grouped[item.order_id] = []; grouped[item.order_id].push(item); }); setOrderItems(grouped); }
    if (Array.isArray(ab)) setAbonos(ab);
    if (Array.isArray(adv)) setAdvances(adv);
    if (Array.isArray(ag)) setAgencies(ag);
    if (Array.isArray(dom)) setDomiciliarios(dom);
  };
  useEffect(() => { if (user) loadData(); }, [user]);

  const handleLogin = () => { if (selectedEmp && pin === selectedEmp.pin) { setUser(selectedEmp); setPinError(false); } else { setPinError(true); setPin(""); } };
  const totalGarments = (its) => its.reduce((s, i) => s + Number(i.quantity), 0);
  const totalPrice = (its) => its.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const buildNotes = (its) => { const lines = its.map(it => { const found = conditions.filter(c => { const k=c.toLowerCase().replace(/\s+/g,"_"); return it[k]; }); if (!found.length) return null; const qty = Number(it.quantity)||1; return `${qty>1?qty+" ":""}${it.garment_type}: ${found.join(", ")}`; }).filter(Boolean); return lines.join(" | "); };

  const addOrder = async () => {
    if (!newOrder.client_name || items.length === 0) return;
    setSaving(true);
    const garments = totalGarments(items), price = totalPrice(items);
    const uniqueServices = [...new Set(items.map(it => it.service))];
    const o = { client_name: newOrder.client_name, phone: newOrder.phone, status: newOrder.status, notes: newOrder.notes, delivery_date: newOrder.delivery_date, service: uniqueServices.join(","), employee: user.name, date: today, garments, price, agencia_id: newOrder.agencia_id || null, domiciliario_id: newOrder.domiciliario_id || null, a_domicilio: !!newOrder.a_domicilio, address: newOrder.address || "" };
    const res = await db.post("orders", o);
    if (Array.isArray(res) && res[0]) {
      const orderId = res[0].id;
      for (const item of items) await db.post("order_items", { order_id: orderId, garment_type: item.garment_type, quantity: Number(item.quantity), price: Number(item.price), color: (item.colors||[]).join(", "), service: item.service });
      if (!newOrder.agencia_id && !newOrder.domiciliario_id) {
        const existing = clients.find(c => c.phone === newOrder.phone);
        if (existing) { await db.patch("clients", existing.id, { total_orders: (existing.total_orders||0)+1 }); setClients(prev => prev.map(c => c.id === existing.id ? { ...c, total_orders: (c.total_orders||0)+1 } : c)); }
        else if (newOrder.client_name) { const nc = await db.post("clients", { name: newOrder.client_name, phone: newOrder.phone, email: "", total_orders: 1 }); if (Array.isArray(nc)) setClients(prev => [nc[0], ...prev]); }
      }
    }
    const savedItems = [...items];
    setNewOrder({ ...emptyOrder, delivery_date: getDeliveryDefault() });
    setItems([{ ...emptyItem, price: precioDefaults[emptyItem.garment_type] || "" }]);
    setSaving(false);
    loadData();
    if (Array.isArray(res) && res[0]) {
      const imap = { [res[0].id]: savedItems.map((it,i) => ({ ...it, color: (it.colors||[]).join(", "), id: i, order_id: res[0].id })) };
      setSavedOrder({ order: res[0], itemsMap: imap });
      setModal("reciboOpciones");
    }
  };

  const addItem = () => { const defaultType = emptyItem.garment_type; const defaultSvc = emptyItem.service; const priceByService = precioByService[defaultSvc]?.[defaultType]; const priceDefault = precioDefaults[defaultType]; const defaultPrice = priceByService || priceDefault || ""; setItems(prev => [...prev, { ...emptyItem, price: defaultPrice }]); };
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    setItems(prev => {
      let updated = prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
      if (field === "garment_type" || field === "service") {
        const item = updated[i];
        const svc = field === "service" ? val : item.service;
        const gmt = field === "garment_type" ? val : item.garment_type;
        const priceByService = precioByService[svc]?.[gmt];
        const priceDefault = precioDefaults[gmt];
        const newPrice = priceByService || priceDefault || "";
        if (newPrice) updated = updated.map((it, idx) => idx === i ? { ...it, price: newPrice } : it);
      }
      if (["decolorado","percudido","roto","manchado"].includes(field)) setNewOrder(p => ({ ...p, notes: buildNotes(updated) }));
      return updated;
    });
  };

  const addExpense = async () => { setSaving(true); const res = await db.post("expenses", { ...newExpense, amount: Number(newExpense.amount) }); if (Array.isArray(res)) setExpenses(prev => [res[0], ...prev]); setNewExpense({ concept: "", amount: "", date: today, category: "insumos", payment_method: "efectivo" }); setModal(null); setSaving(false); };
  const deleteExpense = async (id) => { await db.patch("expenses", id, { eliminado: true }); setExpenses(prev => prev.map(e => e.id === id ? { ...e, eliminado: true } : e)); };
  const addAdvance = async () => {
    if (!newAdvance.employee_id || !newAdvance.amount) return;
    setSaving(true);
    const emp = employees.find(e => e.id === newAdvance.employee_id);
    const res = await db.post("employee_advances", { employee_id: newAdvance.employee_id, employee_name: emp?.name || "", amount: Number(newAdvance.amount), date: newAdvance.date, note: newAdvance.note, payment_method: newAdvance.payment_method, created_by: user.name });
    if (Array.isArray(res) && res[0]) setAdvances(prev => [res[0], ...prev]);
    setNewAdvance({ employee_id: "", amount: "", date: today, note: "", payment_method: "efectivo" });
    setModal(null); setSaving(false);
  };
  const deleteAdvance = async (id) => {
    const ok = await checkClave("eliminar"); if (!ok) return;
    if (!window.confirm("¿Eliminar este adelanto?")) return;
    await db.delete("employee_advances", id);
    setAdvances(prev => prev.filter(a => a.id !== id));
  };
  const addClient = async () => { setSaving(true); const res = await db.post("clients", { ...newClient, total_orders: 0 }); if (Array.isArray(res)) setClients(prev => [res[0], ...prev]); setNewClient({ name: "", phone: "", email: "" }); setModal(null); setSaving(false); };
  const deleteClient = async (id) => { setClients(prev => prev.filter(c => c.id !== id)); await db.delete("clients", id); };
  const updateClient = async () => { if (!editingClient) return; await db.patch("clients", editingClient.id, { name: editingClient.name, phone: editingClient.phone, email: editingClient.email }); setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...editingClient } : c)); setEditingClient(null); };
  const addAgency = async () => { if (!newAgency.name) return; setSaving(true); const res = await db.post("agencies", newAgency); if (Array.isArray(res) && res[0]) setAgencies(prev => [res[0], ...prev]); setNewAgency({ name: "", phone: "", contact_name: "", address: "" }); setModal(null); setSaving(false); };
  const deleteAgency = async (id) => { const ok = await checkClave("eliminar"); if (!ok) return; if (!window.confirm("¿Eliminar esta agencia? Sus órdenes históricas no se borran.")) return; await db.delete("agencies", id); setAgencies(prev => prev.filter(a => a.id !== id)); };
  const updateAgency = async () => { if (!editingAgency) return; await db.patch("agencies", editingAgency.id, { name: editingAgency.name, phone: editingAgency.phone, contact_name: editingAgency.contact_name, address: editingAgency.address }); setAgencies(prev => prev.map(a => a.id === editingAgency.id ? { ...a, ...editingAgency } : a)); setEditingAgency(null); };
  const addDomiciliario = async () => { if (!newDomiciliario.name) return; setSaving(true); const res = await db.post("domiciliarios", newDomiciliario); if (Array.isArray(res) && res[0]) setDomiciliarios(prev => [res[0], ...prev]); setNewDomiciliario({ name: "", phone: "", contact_name: "", address: "" }); setModal(null); setSaving(false); };
  const deleteDomiciliario = async (id) => { const ok = await checkClave("eliminar"); if (!ok) return; if (!window.confirm("¿Eliminar este domiciliario? Sus órdenes históricas no se borran.")) return; await db.delete("domiciliarios", id); setDomiciliarios(prev => prev.filter(d => d.id !== id)); };
  const updateDomiciliario = async () => { if (!editingDomiciliario) return; await db.patch("domiciliarios", editingDomiciliario.id, { name: editingDomiciliario.name, phone: editingDomiciliario.phone, contact_name: editingDomiciliario.contact_name, address: editingDomiciliario.address }); setDomiciliarios(prev => prev.map(d => d.id === editingDomiciliario.id ? { ...d, ...editingDomiciliario } : d)); setEditingDomiciliario(null); };
  const deleteOrder = async (id) => { setOrders(prev => prev.filter(o => o.id !== id)); await db.delete("orders", id); };

  const searchEntrega = () => {
    const q = entregaSearch.trim().toLowerCase(); if (!q) return;
    const byOrder = orders.find(o => o.order_number?.toLowerCase() === q);
    const results = byOrder ? [byOrder] : orders.filter(o => o.phone?.toLowerCase().includes(q));
    setEntregaResults(results);
    setEntregaResult(null); setEntregaConfirmed(false); setEntregaSinRecibo(false); setEntregaPayment("efectivo");
    const yaSinRecibo = results.filter(o => o.status === "entregado" && o.sin_recibo);
    if (yaSinRecibo.length > 0) {
      const msg = yaSinRecibo.map(o => {
        const fecha = o.delivered_at ? new Date(o.delivered_at + "T00:00:00").toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : "fecha desconocida";
        return `Orden ${o.order_number || "—"}: entregada SIN RECIBO el ${fecha} por ${o.delivered_by || "—"}.`;
      }).join("\n");
      alert("⚠️ ATENCIÓN — Esta orden ya fue entregada SIN RECIBO:\n\n" + msg + "\n\nSi el cliente presenta el comprobante físico, verifica bien antes de entregar nuevamente.");
    }
  };

  const confirmarEntrega = async () => {
    if (!entregaResult) return;
    await db.patch("orders", entregaResult.id, { status: "entregado", payment_method: entregaPayment, sin_recibo: entregaSinRecibo, delivered_at: today, delivered_by: user.name });
    setOrders(prev => prev.map(o => o.id === entregaResult.id ? { ...o, status: "entregado", payment_method: entregaPayment, delivered_at: today, delivered_by: user.name } : o));
    setEntregaResult(prev => ({ ...prev, status: "entregado", payment_method: entregaPayment, sin_recibo: entregaSinRecibo, delivered_at: today, delivered_by: user.name }));
    setEntregaConfirmed(true);
    if (entregaSinRecibo) printConstanciaSinRecibo(entregaResult, null);
  };

  const printOrder = (order, itemsMap) => {
    const its = (itemsMap || orderItems)[order.id] || [];
    const hora = new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
    const w = window.open("", "_blank", "width=400,height=800");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/barcodes/JsBarcode.code128.min.js"><\/script>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:80mm; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        color: #000;
        background: #fff;
        padding: 2mm 3mm;
        width: 80mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .big { font-size: 16px; font-weight: bold; }
      .huge { font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 6px 0; }
      .line { border-top: 1px dashed #000; margin: 5px 0; }
      .line-solid { border-top: 1px solid #000; margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      td { padding: 2px 1px; vertical-align: top; }
      .small { font-size: 11px; }
      .obs { font-size: 9px; }
      .legal { font-size: 10px; text-align: justify; margin-top: 4px; line-height: 1.35; }
      #barcode { display: block; width: 100%; max-width: 180px; margin: 4px auto; }
      @page { size: 80mm auto; margin: 0; }
      @media print {
        html, body { width: 80mm; margin: 0; padding: 2mm 3mm; }
      }
    </style></head><body>
      <div class="center">
        <div style="font-size:11px">Factura No.: ${order.order_number?.replace(/^[A-Za-z]/,"") || ""}</div>
        ${logoEnRecibo && negocioLogo ? `<img src="${negocioLogo}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin:4px 0" />` : ''}
        <div class="big">${negocioNombre.toUpperCase()}</div>
        <div style="font-size:11px;margin-top:2px">${negocioDireccion}</div>
        <div style="font-size:11px">${reciboSubtitulo}</div>
        <div class="huge">*${order.order_number||""}*</div>
        <svg id="barcode"></svg>
      </div>
      <script>
        JsBarcode("#barcode","${order.order_number||''}",{format:"CODE128",width:2,height:48,displayValue:false,margin:2});
      <\/script>
      <div class="line"></div>
      <table>
        <tr><td class="bold">Atendido Por:</td><td>${order.employee||"—"}</td></tr>
        <tr><td class="bold">Fecha Entrada:</td><td>${order.date||"—"}</td></tr>
        <tr><td class="bold">Hora:</td><td>${hora}</td></tr>
        <tr><td class="bold">Fecha Entrega:</td><td>${order.delivery_date||"—"}</td></tr>
        <tr><td class="bold">Cliente</td><td>${order.client_name||"—"}</td></tr>
        <tr><td class="bold">Telefono</td><td>${order.phone||"—"}</td></tr>
        ${order.a_domicilio && order.address ? `<tr><td class="bold">Direccion</td><td>${order.address}</td></tr>` : ''}
      </table>
      <div class="line"></div>
      <table>
        <tr>
          <td class="bold" style="width:36%">Prenda</td>
          <td class="bold" style="width:28%">Servicio</td>
          <td class="bold right" style="width:10%">Cant</td>
          <td class="bold right" style="width:26%">Total</td>
        </tr>
        <tr><td colspan="4"><div class="line-solid"></div></td></tr>
        ${its.map(it => {
          const svcLabel = it.service === 'lavado_normal' ? 'LAV. NORMAL' : it.service === 'planchado' ? 'PLANCHADO' : it.service === 'tintura' ? 'TINTURA' : it.service === 'secado' ? 'SECADO' : (it.service||"").toUpperCase();
          const total = Math.round(Number(it.price) * Number(it.quantity));
          const color = it.color ? it.color.toUpperCase() : '';
          return `<tr>
            <td>${(it.garment_type||"").toUpperCase().substring(0,13)}</td>
            <td>${svcLabel}</td>
            <td class="right">${it.quantity}</td>
            <td class="right">$${total.toLocaleString('es-CO')}</td>
          </tr>${color ? `<tr><td colspan="4" class="small">${color}</td></tr>` : ''}<tr><td colspan="4"><div class="line"></div></td></tr>`;
        }).join('')}
      </table>
      <div class="line"></div>
      <table>
        <tr><td class="bold big">Total a Pagar</td><td class="right bold big">$${Math.round(Number(order.price)).toLocaleString('es-CO')}</td></tr>
        <tr><td class="bold">No. Piezas</td><td class="right bold">${order.garments}</td></tr>
      </table>
      ${order.notes ? `<div class="line"></div><div class="obs"><b>Obs:</b> ${order.notes}</div>` : ''}
      <div class="line"></div>
      <div class="small center">RESPONDEMOS POR SUS PRENDAS SOLO POR 30 DIAS</div>
      <div class="legal">${reciboLegal}</div>
      <br/><br/>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 900);
  };

  const generateReciboImage = (order, itemsMap) => {
    return new Promise((resolve) => {
      const its = (itemsMap || orderItems)[order.id] || [];
      const div = document.createElement("div");
      div.style.cssText = "position:fixed;left:-9999px;top:0;width:300px;background:#fff;padding:16px;font-family:Courier New,monospace;font-size:11px;color:#000;";
      div.innerHTML = `
        <div style="text-align:center;margin-bottom:8px">
          <div style="font-weight:bold;font-size:13px">Factura No.: ${order.order_number?.replace(/^[A-Za-z]/,"")||""}</div>
          ${logoEnRecibo && negocioLogo ? `<img src="${negocioLogo}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:4px" />` : ''}
          <div style="font-weight:bold;font-size:15px;margin:4px 0">${negocioNombre.toUpperCase()}</div>
          <div>${negocioDireccion}</div>
          <div style="font-size:10px">${reciboSubtitulo}</div>
          <div style="font-weight:bold;font-size:20px;letter-spacing:2px;margin:6px 0">*${order.order_number||""}*</div>
        </div>
        <hr style="border:1px dashed #000;margin:6px 0"/>
        <table style="width:100%;font-size:10px">
          <tr><td><b>Atendido Por:</b></td><td>${order.employee||""}</td></tr>
          <tr><td><b>Fecha Entrada:</b></td><td>${order.date||""}</td></tr>
          <tr><td><b>Hora:</b></td><td>${new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'})}</td></tr>
          <tr><td><b>Fecha Entrega:</b></td><td>${order.delivery_date||""}</td></tr>
          <tr><td><b>Cliente:</b></td><td>${order.client_name||""}</td></tr>
          <tr><td><b>Teléfono:</b></td><td>${order.phone||""}</td></tr>
          ${order.a_domicilio && order.address ? `<tr><td><b>📍 Dirección:</b></td><td>${order.address}</td></tr>` : ''}
        </table>
        <hr style="border:1px dashed #000;margin:6px 0"/>
        <table style="width:100%;font-size:10px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #000"><th style="text-align:left">Prenda</th><th style="text-align:left">Serv.</th><th style="text-align:right">Cant</th><th style="text-align:right">Total</th></tr>
          ${its.map(it => {
            const svc = it.service==="lavado_normal"?"LAV.NOR":it.service==="planchado"?"PLANCH":it.service==="lavado_express"?"EXPRESS":it.service==="secado"?"SECADO":"";
            const color = it.color || '';
            return `<tr><td>${(it.garment_type||"").substring(0,10)}</td><td>${svc}</td><td style="text-align:right">${it.quantity}</td><td style="text-align:right">$${Math.round(Number(it.price)*Number(it.quantity)).toLocaleString("es-CO")}</td></tr>${color ? `<tr><td colspan="4" style="font-size:9px;color:#555;padding-top:0">${color}</td></tr>` : ''}`;
          }).join("")}
        </table>
        <hr style="border:1px dashed #000;margin:6px 0"/>
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px"><span>Total a Pagar</span><span>$${Math.round(Number(order.price)).toLocaleString("es-CO")}</span></div>
        <div style="display:flex;justify-content:space-between"><span>No. Piezas</span><span>${order.garments}</span></div>
        ${order.notes ? `<hr style="border:1px dashed #000;margin:6px 0"/><div style="font-size:9px"><b>Obs:</b> ${order.notes}</div>` : ''}
        <hr style="border:1px dashed #000;margin:6px 0"/>
        <div style="font-size:8px;text-align:center;margin-top:4px">${reciboLegal}</div>
      `;
      document.body.appendChild(div);
      window.html2canvas(div, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        document.body.removeChild(div);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `recibo_${order.order_number||"orden"}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        }, "image/png");
      });
    });
  };

  const printOrderQZ = async (order, itemsMap, copies = 2) => {
    const its = (itemsMap || orderItems)[order.id] || [];
    const hora = new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
    const normalize = (txt) => String(txt).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x00-\x7F]/g,"");

    // ESC/POS commands
    const ESC = "\x1B";
    const GS = "\x1D";
    const RESET = ESC + "@";
    const CENTER = ESC + "a\x01";
    const LEFT = ESC + "a\x00";
    const BOLD_ON = ESC + "E\x01";
    const BOLD_OFF = ESC + "E\x00";
    const BIG_ON = GS + "!\x11";   // double width + double height
    const BIG_OFF = GS + "!\x00";
    const SMALL = ESC + "M\x01";   // small font
    const NORMAL_FONT = ESC + "M\x00";
    const CUT = GS + "V\x41\x00";
    const LF = "\n";
    const LINE = "-".repeat(42);
    const W = 42;

    const rpad = (left, right) => {
      const l = normalize(String(left));
      const r = normalize(String(right));
      const spaces = Math.max(1, W - l.length - r.length);
      return l + " ".repeat(spaces) + r;
    };

    let data = "";
    data += RESET;
    data += ESC + "3\x18";  // reduce line spacing to 24 dots
    // Header - centered bold
    data += CENTER + BOLD_ON;
    data += "Factura No.: " + (order.order_number?.replace(/^[A-Za-z]/,"") || "") + LF;
    data += BOLD_OFF;
    data += LF;
    data += BOLD_ON + BIG_ON;
    data += normalize(negocioNombre).toUpperCase() + LF;
    data += BIG_OFF + BOLD_OFF;
    data += normalize(negocioDireccion) + LF;
    // Wrap subtitulo
    const subWords = normalize(reciboSubtitulo).split(" ");
    let subLine = "";
    subWords.forEach(word => {
      if ((subLine + " " + word).trim().length <= W) {
        subLine = (subLine + " " + word).trim();
      } else {
        data += subLine + LF;
        subLine = word;
      }
    });
    if (subLine) data += subLine + LF;
    data += LF;

    // Order number big
    data += BOLD_ON + BIG_ON;
    data += "*" + (order.order_number||"") + "*" + LF;
    data += BIG_OFF + BOLD_OFF;

    // Barcode
    data += CENTER;
    data += GS + "h\x50";          // barcode height 80px
    data += GS + "w\x02";          // barcode width
    data += GS + "H\x00";          // no text below
    data += GS + "k\x49";          // CODE128
    const barcodeData = order.order_number || "";
    data += String.fromCharCode(barcodeData.length) + barcodeData;
    data += LF;

    // Info section - left aligned
    data += LEFT;
    data += LINE + LF;
    data += rpad("Atendido Por:", normalize(order.employee||"")) + LF;
    data += rpad("Fecha Entrada:", order.date||"") + LF;
    data += rpad("Hora:", hora) + LF;
    data += BOLD_ON + rpad("Fecha Entrega:", order.delivery_date||"") + BOLD_OFF + LF;
    data += rpad("Cliente:", normalize(order.client_name||"")) + LF;
    data += rpad("Telefono:", order.phone||"") + LF;
    if (order.a_domicilio && order.address) data += rpad("Direccion:", normalize(order.address)) + LF;
    data += LINE + LF;

    // Items header
    data += BOLD_ON;
    data += "Prenda         Servicio  Cant  Total" + LF;
    data += BOLD_OFF;
    data += LINE + LF;

    // Items
    its.forEach(it => {
      const svc = it.service === 'lavado_normal' ? 'LAV.NOR' : it.service === 'planchado' ? 'PLANCH' : it.service === 'tintura' ? 'TINTURA' : it.service === 'secado' ? 'SECADO' : (it.service||"").toUpperCase().substring(0,7);
      const total = "$" + Math.round(Number(it.price)*Number(it.quantity)).toLocaleString('es-CO');
      const prenda = normalize(it.garment_type||"").toUpperCase().substring(0,13);
      const cant = String(it.quantity);
      const p1 = Math.max(1, 15 - prenda.length);
      const p2 = Math.max(1, 10 - svc.length);
      const p3 = Math.max(1, 6 - cant.length);
      data += prenda + " ".repeat(p1) + svc + " ".repeat(p2) + cant + " ".repeat(p3) + total + LF;
      if (it.color) data += "  " + normalize(it.color).toUpperCase() + LF;
      data += LINE + LF;
    });

    // Totals
    data += LF;
    data += BOLD_ON;
    data += rpad("Total a Pagar:", "$" + Math.round(Number(order.price)).toLocaleString('es-CO')) + LF;
    data += BOLD_OFF;
    data += rpad("No. Piezas:", String(order.garments)) + LF;
    data += LINE + LF;
    if (order.notes) {
      data += NORMAL_FONT;
      data += SMALL;
      data += "Obs: " + normalize(order.notes) + LF;
      data += NORMAL_FONT;
      data += LINE + LF;
    }

    // Footer
    data += CENTER + BOLD_ON;
    data += "RESPONDEMOS POR SUS PRENDAS" + LF;
    data += "SOLO POR 30 DIAS" + LF;
    data += BOLD_OFF + LEFT;
    data += LF;

    // Legal text - smallest font
    const LEGALW = 56;
    const FONT_B = ESC + "M\x01";
    const FONT_A = ESC + "M\x00";
    const TINY = GS + "!\x00" + ESC + "M\x01";
    data += CENTER + TINY;
    const legalNorm = normalize(reciboLegal);
    const legalWords = legalNorm.split(" ");
    let line2 = "";
    legalWords.forEach(word => {
      if ((line2 + " " + word).trim().length <= LEGALW) {
        line2 = (line2 + " " + word).trim();
      } else {
        data += line2 + LF;
        line2 = word;
      }
    });
    if (line2) data += line2 + LF;
    data += FONT_A + GS + "!\x00" + NORMAL_FONT + LEFT;
    data += LF + LF + LF;
    data += CUT;

    try {
      if (!window.qz) throw new Error("QZ no disponible");
      if (!window.qz.websocket.isActive()) await window.qz.websocket.connect();
      const config = window.qz.configs.create(nombreImpresora);
      const printData = Array.from({length: copies}, () => ({ type: 'raw', format: 'plain', data: data }));
      await window.qz.print(config, printData);
    } catch(e) {
      console.error("QZ Error:", e);
      alert("Error con QZ Tray: " + e.message + ". Usando impresion normal...");
      printOrder(order, itemsMap);
    }
  };

  const printConstanciaSinReciboBrowser = (order, itemsMap) => {
    const its = (itemsMap || orderItems)[order.id] || [];
    const detalle = its.length
      ? its.map(it => `${it.quantity} ${it.garment_type}${it.color ? " " + it.color : ""}`).join(", ")
      : `${order.garments} prenda(s)`;
    const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const horaImpresion = new Date().toLocaleString('es-CO');
    const w = window.open("", "_blank", "width=400,height=800");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:80mm; }
      body { font-family:'Courier New', Courier, monospace; font-size:12px; color:#000; background:#fff; padding:3mm; width:80mm; }
      .center { text-align:center; }
      .bold { font-weight:bold; }
      .title { font-size:14px; font-weight:bold; margin-bottom:6px; }
      .line { border-top:1px dashed #000; margin:6px 0; }
      .firma { border-top:1px solid #000; margin-top:36px; padding-top:4px; text-align:center; }
      p { margin:6px 0; line-height:1.4; }
      @page { size:80mm auto; margin:0; }
    </style></head><body>
      <div class="center title">CONSTANCIA DE ENTREGA<br/>SIN RECIBO FÍSICO</div>
      <div class="center">${negocioNombre.toUpperCase()}</div>
      <div class="line"></div>
      <p><b>Fecha:</b> ${fechaHoy}</p>
      <p>Yo <b>${order.client_name || ""}</b>, recibí de parte de <b>${negocioNombre}</b> las siguientes prendas correspondientes a la orden de servicio <b>${order.order_number || ""}</b>:</p>
      <p>${detalle}</p>
      <p>Mi firma en este documento certifica que he recibido las prendas a satisfacción y que el comprobante físico de la orden de servicio <b>${order.order_number || ""}</b> pierde toda validez para el reclamo de prendas.</p>
      <div class="firma">${order.client_name || ""}<br/>C.C./Tel: ${order.phone || ""}</div>
      <div class="line"></div>
      <div class="center" style="font-size:10px">Fecha de impresión: ${horaImpresion}<br/>${negocioNombre}</div>
      <br/><br/>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 700);
  };

  const printConstanciaSinRecibo = async (order, itemsMap) => {
    const its = (itemsMap || orderItems)[order.id] || [];
    const normalize = (txt) => String(txt).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x00-\x7F]/g,"");
    const detalle = its.length
      ? its.map(it => `${it.quantity} ${it.garment_type}${it.color ? " " + it.color : ""}`).join(", ")
      : `${order.garments} prenda(s)`;
    const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const horaImpresion = new Date().toLocaleString('es-CO');

    const ESC = "\x1B";
    const GS = "\x1D";
    const RESET = ESC + "@";
    const CENTER = ESC + "a\x01";
    const LEFT = ESC + "a\x00";
    const BOLD_ON = ESC + "E\x01";
    const BOLD_OFF = ESC + "E\x00";
    const SMALL = ESC + "M\x01";
    const NORMAL_FONT = ESC + "M\x00";
    const CUT = GS + "V\x41\x00";
    const LF = "\n";
    const LINE = "-".repeat(42);
    const W = 42;

    const wrap = (text) => {
      let out = "";
      let line = "";
      normalize(text).split(" ").forEach(word => {
        if ((line + " " + word).trim().length <= W) { line = (line + " " + word).trim(); }
        else { out += line + LF; line = word; }
      });
      if (line) out += line + LF;
      return out;
    };

    let data = "";
    data += RESET;
    data += CENTER + BOLD_ON;
    data += "CONSTANCIA DE ENTREGA" + LF;
    data += "SIN RECIBO FISICO" + LF;
    data += BOLD_OFF;
    data += normalize(negocioNombre).toUpperCase() + LF;
    data += LINE + LF;
    data += LEFT;
    data += "Fecha: " + fechaHoy + LF + LF;
    data += wrap(`Yo ${order.client_name || ""}, recibi de parte de ${negocioNombre} las siguientes prendas correspondientes a la orden de servicio ${order.order_number || ""}:`);
    data += LF;
    data += wrap(detalle);
    data += LF;
    data += wrap(`Mi firma en este documento certifica que he recibido las prendas a satisfaccion y que el comprobante fisico de la orden de servicio ${order.order_number || ""} pierde toda validez para el reclamo de prendas.`);
    data += LF + LF + LF;
    data += CENTER;
    data += "_______________________________" + LF;
    data += normalize(order.client_name || "") + LF;
    data += "C.C./Tel: " + (order.phone || "") + LF;
    data += LINE + LF;
    data += SMALL;
    data += "Fecha de impresion: " + horaImpresion + LF;
    data += NORMAL_FONT;
    data += LF + LF;
    data += CUT;

    try {
      if (!window.qz) throw new Error("QZ no disponible");
      if (!window.qz.websocket.isActive()) await window.qz.websocket.connect();
      const config = window.qz.configs.create(nombreImpresora);
      await window.qz.print(config, [{ type: 'raw', format: 'plain', data: data }]);
    } catch(e) {
      console.error("QZ Error:", e);
      printConstanciaSinReciboBrowser(order, itemsMap);
    }
  };

  const exportClients = () => {
    const csv = [["Nombre","Telefono","Email","Total Ordenes"],...clients.map(c=>[c.name||"",c.phone||"",c.email||"",c.total_orders||0])].map(r=>r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clientes_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const todayOrders = orders.filter(o => o.date === filterDate);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.price), 0);
  const todayExp = expenses.filter(e => e.date === filterDate && !e.eliminado).reduce((s, e) => s + Number(e.amount), 0);
  const todayGarments = todayOrders.reduce((s, o) => s + Number(o.garments), 0);
  const filteredOrders = orderFilterDate ? orders.filter(o => o.date === orderFilterDate) : orders;
  const filteredExpenses = expenseFilterDate ? expenses.filter(e => e.date === expenseFilterDate && !e.eliminado) : expenses.filter(e => !e.eliminado);
  const filteredClients = clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch));
  const isAdmin = user?.role === "admin";
  const getAbonado = (orderId) => abonos.filter(a => a.order_id === orderId).reduce((s,a) => s + Number(a.amount), 0);
  const getSaldo = (order) => Math.max(0, Number(order.price) - getAbonado(order.id));

  const s = { fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", background: "#0D1117", color: "#E6EDF3" };
  const card = { background: "#161B22", borderRadius: 14, padding: 20, border: "1px solid #30363D" };
  const btn = { padding: "10px 18px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 };
  const inp = { padding: "10px 12px", borderRadius: 8, border: "1px solid #30363D", background: "#0D1117", color: "#E6EDF3", fontSize: 14, width: "100%", boxSizing: "border-box" };

  if (loading) return <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#4FC3F7", fontSize: 18 }}>🫧 Cargando...</div>;

  if (licenciaOk === false) return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "#161B22", borderRadius: 20, padding: "48px 40px", width: 380, maxWidth: "90vw", border: "1px solid rgba(239,83,80,0.4)", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: "#EF5350", fontSize: 22, fontWeight: 800, margin: "0 0 12px" }}>Acceso No Autorizado</h2>
        <p style={{ color: "#8B949E", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>Esta aplicación no está autorizada para funcionar en este dominio.</p>
        <p style={{ color: "#484F58", fontSize: 12 }}>Si crees que es un error contacta al administrador del sistema.</p>
      </div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F2027,#203A43,#2C5364)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderRadius: 24, padding: "48px 40px", width: 340, maxWidth: "90vw", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {negocioLogo
            ? <img src={negocioLogo} alt="logo" style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover", marginBottom: 12 }} />
            : <div style={{ fontSize: 48, marginBottom: 8 }}>🫧</div>}
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>{negocioNombre}</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>Sistema de Gestión</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>USUARIO</label>
          <select value={selectedEmp?.id || ""} onChange={e => setSelectedEmp(employees.find(u => u.id === e.target.value))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14 }}>
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
    { id: "agencias", label: "Agencias", icon: "🏢" },
    { id: "domiciliarios", label: "Domiciliarios", icon: "🛵" },
    { id: "expenses", label: "Gastos", icon: "💰" },
    { id: "nomina", label: "Nómina", icon: "💸" },
    { id: "report", label: "Informes", icon: "📋" },
    { id: "config", label: "Configuración", icon: "⚙️" },
    { id: "reversar", label: "Reversar", icon: "↩️" },
  ];

  const PayMethod = ({ m }) => { const map = { nequi: ["📱 Nequi","#C792EA","rgba(199,146,234,0.15)"], daviplata: ["💜 Daviplata","#667EEA","rgba(102,126,234,0.15)"], breb: ["🔵 Bre-b","#4FC3F7","rgba(79,195,247,0.15)"], efectivo: ["💵 Efectivo","#66BB6A","rgba(102,187,106,0.15)"] }; const [l,c,b] = map[m]||map.efectivo; return <span style={{ fontSize:12,background:b,color:c,padding:"3px 10px",borderRadius:20 }}>{l}</span>; };

  return (
    <div style={s}>
      <style>{`
        .lv-mobile-topbar { display:none; }
        .lv-sidebar-overlay { display:none; }
        .lv-sidebar-close { display:none; }
        @media (max-width: 860px) {
          .lv-app-shell { flex-direction: column !important; }
          .lv-mobile-topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#161B22; border-bottom:1px solid #30363D; position:sticky; top:0; z-index:60; }
          .lv-sidebar { position:fixed !important; top:0; left:0; height:100vh !important; z-index:100; transform:translateX(-104%); transition:transform .22s ease; box-shadow:4px 0 30px rgba(0,0,0,0.6); }
          .lv-sidebar.open { transform:translateX(0); }
          .lv-sidebar-overlay.open { display:block; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:90; }
          .lv-sidebar-close { display:block !important; }
          .lv-main { padding:14px !important; }
        }
        .lv-item-grid { display:grid; grid-template-columns:2fr 55px 75px 1fr 30px; gap:6px; align-items:center; }
        @media (max-width: 600px) {
          .lv-item-header { display:none !important; }
          .lv-item-grid { grid-template-columns: 1fr 1fr; row-gap:8px; }
          .lv-item-grid > *:nth-child(1) { grid-column: 1 / -1; }
          .lv-item-grid > *:nth-child(4) { grid-column: 1 / -1; }
          .lv-item-grid > *:nth-child(5) { grid-column: 1 / -1; justify-self:end; }
        }
        @media (max-width: 480px) {
          .lv-kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <div className="lv-app-shell" style={{ display: "flex", minHeight: "100vh" }}>
        {/* MOBILE TOPBAR */}
        <div className="lv-mobile-topbar">
          <button onClick={() => setSidebarOpen(true)} style={{ background: "transparent", border: "1px solid #30363D", borderRadius: 8, color: "#4FC3F7", fontSize: 20, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#4FC3F7" }}>{negocioNombre}</div>
          <div style={{ width: 36 }} />
        </div>
        <div className={`lv-sidebar-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />
        {/* SIDEBAR */}
        <div className={`lv-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 200, background: "#161B22", borderRight: "1px solid #30363D", display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0, overflowY: "auto" }}>
          <button className="lv-sidebar-close" onClick={() => setSidebarOpen(false)} style={{ alignSelf: "flex-end", background: "transparent", border: "none", color: "#8B949E", fontSize: 20, cursor: "pointer", marginBottom: 8 }}>✕</button>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            {negocioLogo
              ? <img src={negocioLogo} alt="logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", marginBottom: 6 }} />
              : <div style={{ fontSize: 28 }}>🫧</div>}
            <div style={{ fontWeight: 800, fontSize: 15, color: "#4FC3F7", lineHeight: 1.2 }}>{negocioNombre}</div>
          </div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }} style={{ ...btn, background: tab === t.id ? "rgba(79,195,247,0.15)" : "transparent", color: tab === t.id ? "#4FC3F7" : "#8B949E", textAlign: "left", padding: "10px 14px", marginBottom: 4, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              {t.icon} {t.label}
            </button>
          ))}
          <div style={{ marginTop: "auto" }}>
            <button onClick={() => { setShowTotalPrendas(true); setEditingPrecio(false); setSidebarOpen(false); }} style={{ ...btn, width: "100%", background: "linear-gradient(135deg,rgba(255,213,79,0.2),rgba(245,127,23,0.2))", color: "#FFD54F", border: "1px solid rgba(255,213,79,0.3)", padding: "10px 14px", marginBottom: 8, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              👕 Total Prendas
            </button>
            <button onClick={() => { setShowInformeDiario(true); setSidebarOpen(false); }} style={{ ...btn, width: "100%", background: "rgba(199,146,234,0.15)", color: "#C792EA", border: "1px solid rgba(199,146,234,0.3)", padding: "8px 14px", marginBottom: 8, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              💳 Informe Diario
            </button>
            <button onClick={() => { setShowAyuda(true); setAyudaSeccion(tab); setSidebarOpen(false); }} style={{ ...btn, width: "100%", background: "rgba(102,187,106,0.15)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", padding: "8px 14px", marginBottom: 12, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              ❓ Ayuda
            </button>
            <div style={{ borderTop: "1px solid #30363D", paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: "#8B949E" }}>👤 {user.name}</div>
              <div style={{ fontSize: 11, color: "#484F58", marginBottom: 8 }}>{user.role === "admin" ? "Administrador" : "Empleado"}</div>
              <button onClick={() => setUser(null)} style={{ ...btn, background: "transparent", color: "#EF5350", padding: "6px 10px", fontSize: 12 }}>Cerrar sesión</button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="lv-main" style={{ flex: 1, padding: 28, overflowY: "auto", minWidth: 0 }}>

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dashboard</h2>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 160 }} />
              </div>
              <div className="lv-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginBottom: 24 }}>
                {[{label:"Ingresos del día",value:`$${Math.round(todayRevenue)}`,icon:"💵",color:"#66BB6A"},{label:"Gastos del día",value:`$${Math.round(todayExp)}`,icon:"📤",color:"#EF5350"},{label:"Utilidad",value:`$${Math.round(todayRevenue-todayExp)}`,icon:"📈",color:"#4FC3F7"},{label:"Prendas del día",value:todayGarments,icon:"👕",color:"#FFD54F"}].map((kpi,i) => (
                  <div key={i} style={{ ...card, borderLeft: `4px solid ${kpi.color}` }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{kpi.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#8B949E" }}>Órdenes recientes</h3>
                  {todayOrders.slice(0,5).map(o => (
                    <div key={o.id} style={{ padding: "10px 0", borderBottom: "1px solid #21262D" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            {o.order_number && <span style={{ fontSize: 11, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "2px 7px", borderRadius: 6 }}>{o.order_number}</span>}
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{o.client_name}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#8B949E" }}>{getServiceLabel(o.service, services)} · {o.garments} prendas</div>
                          {orderItems[o.id] && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{orderItems[o.id].map((it,i) => <span key={i} style={{ fontSize: 11, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", padding: "2px 7px", borderRadius: 10 }}>{it.service&&(() => { const sv=services.find(s=>s.id===it.service); return sv?sv.icon+" ":""; })()}{GARMENT_ICONS[it.garment_type]||"👕"} {it.garment_type} x{it.quantity}{it.color?` · ${it.color}`:""} · ${Math.round(Number(it.price)*Number(it.quantity))}</span>)}</div>}
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
                  {services.map(sv => {
                    const cnt = todayOrders.filter(o => (o.service||"").split(",").map(s=>s.trim()).includes(sv.id)).length;
                    return <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 18 }}>{sv.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{sv.label}</span><span style={{ fontWeight: 700 }}>{cnt}</span></div>
                        <div style={{ height: 6, borderRadius: 3, background: "#21262D" }}><div style={{ height: 6, borderRadius: 3, background: sv.color, width: `${todayOrders.length?(cnt/todayOrders.length)*100:0}%`, transition: "width 0.5s" }} /></div>
                      </div>
                    </div>;
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
                  <input type="date" value={orderFilterDate} onChange={e => setOrderFilterDate(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 160, fontSize: 13 }} />
                  {orderFilterDate && <button onClick={() => setOrderFilterDate("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todas</button>}
                </div>
                <button onClick={() => {
                  const defaultSvc = emptyItem.service;
                  const defaultType = emptyItem.garment_type;
                  const priceByService = precioByService[defaultSvc]?.[defaultType];
                  const priceDefault = precioDefaults[defaultType];
                  const defaultPrice = priceByService || priceDefault || "";
                  setItems([{ ...emptyItem, price: defaultPrice }]);
                  setModal("newOrder");
                }} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff" }}>+ Nueva Orden</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr style={{ background: "#21262D" }}>{["# Orden","Cliente","Prendas","Servicio","Total","Fecha","Entrega","Recibo",""].map((h,i) => <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                        <td style={{ padding: "12px 14px" }}><span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "4px 10px", borderRadius: 8, fontSize: 13 }}>{o.order_number||"—"}</span></td>
                        <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600, display:"flex", alignItems:"center", gap:6 }}>{o.client_name}{o.a_domicilio && <span title="Recibido a domicilio" style={{ fontSize: 11, background: "rgba(102,187,106,0.15)", color: "#66BB6A", padding: "1px 6px", borderRadius: 10 }}>🛵</span>}</div><div style={{ fontSize: 11, color: "#8B949E" }}>{o.phone}</div></td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{o.garments} prendas</div>
                          {orderItems[o.id] && <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 3 }}>{orderItems[o.id].map((it,i) => <span key={i} style={{ fontSize: 10, background: "#21262D", borderRadius: 8, padding: "3px 7px" }}>{it.service&&(() => { const sv=services.find(s=>s.id===it.service); return sv?sv.icon+" ":""; })()}{GARMENT_ICONS[it.garment_type]||"👕"} {it.garment_type}{it.color&&<span style={{ color: "#C792EA" }}> · {it.color}</span>}<span style={{ color: "#66BB6A", fontWeight: 700 }}> ${Math.round(Number(it.price)*Number(it.quantity))}</span></span>)}</div>}
                        </td>
                        <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{(o.service||"").split(",").map(sid => { const sv=services.find(s=>s.id===sid.trim()); return sv?<span key={sid} style={{ background:sv.color+"22",color:sv.color,padding:"2px 8px",borderRadius:20,fontSize:11 }}>{sv.icon} {sv.label}</span>:null; })}</div></td>
                        <td style={{ padding: "12px 14px", fontWeight: 800, color: "#66BB6A", fontSize: 16 }}>${Math.round(Number(o.price))}</td>
                        <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.date}</td>
                        <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 12, background: "rgba(255,213,79,0.1)", color: "#FFD54F", padding: "3px 8px", borderRadius: 8 }}>📅 {o.delivery_date||"—"}</span></td>
                        <td style={{ padding: "12px 14px" }}>
                          {o.recibo_enviado === "whatsapp"
                            ? <span style={{ background:"rgba(37,211,102,0.15)",color:"#25D366",padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600 }}>📱 WA</span>
                            : o.recibo_enviado === "impreso"
                            ? <span style={{ background:"rgba(79,195,247,0.15)",color:"#4FC3F7",padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600 }}>🖨️ Impreso</span>
                            : <span style={{ color:"#484F58",fontSize:11 }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {(() => { const abonado=getAbonado(o.id); const saldo=getSaldo(o); return abonado>0?<div style={{ fontSize:11 }}><div style={{ color:"#66BB6A" }}>Abonado: ${Math.round(abonado).toLocaleString()}</div><div style={{ color:saldo>0?"#FFD54F":"#66BB6A",fontWeight:700 }}>Saldo: ${Math.round(saldo).toLocaleString()}</div></div>:null; })()}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button title="Registrar abono" onClick={() => { setAbonoModal(o); setNewAbono({ amount:"", payment_method:"efectivo" }); }} style={{ ...btn, background: "rgba(255,213,79,0.15)", color: "#FFD54F", padding: "5px 10px", fontSize: 12 }}>💰</button>
                            <button onClick={() => printOrderQZ(o, null, 1)} title="Imprimir" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "5px 10px", fontSize: 12 }}>🖨️</button>
                            <button onClick={async () => { const ok=await checkClave("eliminar"); if(!ok)return; if(window.confirm("¿Eliminar esta orden?"))deleteOrder(o.id); }} title="Eliminar" style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>
                          </div>
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
                  <input style={{ ...inp, flex: 1, fontSize: 16 }} placeholder="Ej: 3105604421 o S0001" value={entregaSearch} onChange={e => { setEntregaSearch(e.target.value); setEntregaResults(null); setEntregaResult(null); }} onKeyDown={e => e.key === "Enter" && searchEntrega()} />
                  <button onClick={searchEntrega} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: "10px 24px" }}>🔍 Buscar</button>
                </div>
              </div>

              {entregaResults !== null && entregaResults.length === 0 && <div style={{ ...card, textAlign: "center", color: "#EF5350", padding: 32 }}><div style={{ fontSize: 40, marginBottom: 8 }}>😕</div><div style={{ fontWeight: 600 }}>No se encontró ninguna orden</div></div>}

              {entregaResults !== null && entregaResults.length > 0 && !entregaResult && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: "#8B949E" }}>Se encontraron <strong style={{ color: "#4FC3F7" }}>{entregaResults.length} órdenes</strong> para este cliente</div>
                    {entregaResults.some(o => o.status !== "entregado") && (
                      <button onClick={() => { const pending=entregaResults.filter(o=>o.status!=="entregado"); if(selectedEntregas.length===pending.length)setSelectedEntregas([]);else setSelectedEntregas(pending); }} style={{ ...btn, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", padding: "6px 14px", fontSize: 12 }}>
                        {selectedEntregas.length===entregaResults.filter(o=>o.status!=="entregado").length?"Deseleccionar todo":"Seleccionar pendientes"}
                      </button>
                    )}
                  </div>
                  {entregaResults.map(o => {
                    const isSelected=selectedEntregas.some(s=>s.id===o.id), isPending=o.status!=="entregado";
                    const yaSinRecibo = !isPending && o.sin_recibo;
                    return <div key={o.id} style={{ ...card, marginBottom: 10, borderLeft: `4px solid ${yaSinRecibo?"#EF5350":isSelected?"#66BB6A":STATUS_LABELS[o.status]?.color||"#30363D"}`, background: yaSinRecibo?"rgba(239,83,80,0.06)":isSelected?"rgba(102,187,106,0.06)":"#161B22" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                          {isPending && <input type="checkbox" checked={isSelected} onChange={() => setSelectedEntregas(prev=>isSelected?prev.filter(s=>s.id!==o.id):[...prev,o])} style={{ width:20,height:20,accentColor:"#66BB6A",cursor:"pointer",flexShrink:0 }} />}
                          {!isPending && <span style={{ fontSize: 18, flexShrink: 0 }}>{yaSinRecibo?"⚠️":"✅"}</span>}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "3px 10px", borderRadius: 6, fontSize: 13 }}>{o.order_number||"—"}</span>
                              <span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[o.status]?.label}</span>
                              {yaSinRecibo && <span style={{ background: "rgba(239,83,80,0.2)", color: "#EF5350", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⚠️ Entregada sin recibo</span>}
                            </div>
                            <div style={{ fontSize: 13, color: "#8B949E" }}>{getServiceLabel(o.service, services)} · {o.garments} prendas</div>
                            <div style={{ fontSize: 12, color: "#484F58", marginTop: 2 }}>Ingreso: {o.date} · Entrega: {o.delivery_date||"—"}{o.delivered_by&&<span style={{ color:"#C792EA" }}> · 👤 {o.delivered_by}</span>}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", marginLeft: 12 }}>
                          <div style={{ fontWeight: 800, fontSize: 18, color: "#66BB6A", marginBottom: 4 }}>${Math.round(Number(o.price))}</div>
                          <button onClick={() => { setEntregaResult(o); setEntregaConfirmed(false); setEntregaPayment(o.payment_method||"efectivo"); }} style={{ ...btn, background: yaSinRecibo?"rgba(239,83,80,0.15)":"rgba(79,195,247,0.1)", color: yaSinRecibo?"#EF5350":"#4FC3F7", padding: "4px 10px", fontSize: 11 }}>Ver detalle →</button>
                        </div>
                      </div>
                    </div>;
                  })}
                  {selectedEntregas.length > 0 && (
                    <div style={{ ...card, border: "1px solid #66BB6A", background: "rgba(102,187,106,0.06)", marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#66BB6A", fontSize: 16 }}>{selectedEntregas.length} orden{selectedEntregas.length>1?"es":""} seleccionada{selectedEntregas.length>1?"s":""}</div>
                          <div style={{ fontSize: 13, color: "#8B949E" }}>Total: <strong style={{ color: "#66BB6A" }}>${Math.round(selectedEntregas.reduce((s,o)=>s+Number(o.price),0))}</strong> · {selectedEntregas.reduce((s,o)=>s+Number(o.garments),0)} prendas</div>
                        </div>
                        <button onClick={() => setSelectedEntregas([])} style={{ ...btn, background: "transparent", color: "#8B949E", padding: "4px 10px", fontSize: 12 }}>✕ Cancelar</button>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8, fontWeight: 600 }}>MÉTODO DE PAGO</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"},{value:"breb",label:"🔵 Bre-b"}].map(opt => (
                            <label key={opt.value} onClick={() => setEntregaMultiPayment(opt.value)} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,fontWeight:600,background:entregaMultiPayment===opt.value?"rgba(102,187,106,0.2)":"rgba(255,255,255,0.04)",border:`2px solid ${entregaMultiPayment===opt.value?"#66BB6A":"#30363D"}`,borderRadius:8,padding:"8px 4px",color:entregaMultiPayment===opt.value?"#66BB6A":"#8B949E" }}>{opt.label}</label>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label onClick={() => setEntregaMultiSinRecibo(!entregaMultiSinRecibo)} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:entregaMultiSinRecibo?"rgba(255,213,79,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${entregaMultiSinRecibo?"#FFD54F":"#30363D"}`,borderRadius:8,padding:"10px 14px" }}>
                          <input type="checkbox" checked={entregaMultiSinRecibo} onChange={e=>setEntregaMultiSinRecibo(e.target.checked)} style={{ width:16,height:16,accentColor:"#FFD54F" }} />
                          <span style={{ fontSize:13,color:entregaMultiSinRecibo?"#FFD54F":"#8B949E" }}>📋 Entregado sin recibo</span>
                        </label>
                      </div>
                      <button onClick={confirmarMultiEntrega} style={{ ...btn, width:"100%",background:"linear-gradient(135deg,#66BB6A,#388E3C)",color:"#fff",padding:14,fontSize:15,fontWeight:800,borderRadius:10 }}>
                        ✅ Confirmar {selectedEntregas.length} entrega{selectedEntregas.length>1?"s":""} · ${Math.round(selectedEntregas.reduce((s,o)=>s+Number(o.price),0))}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {entregaResult && (
                <div>
                  {entregaResults && entregaResults.length > 1 && <button onClick={() => { setEntregaResult(null); setEntregaConfirmed(false); }} style={{ ...btn, background: "rgba(79,195,247,0.1)", color: "#4FC3F7", marginBottom: 16, fontSize: 13, padding: "8px 16px" }}>← Volver a la lista</button>}
                  <div style={{ ...card, border: entregaConfirmed ? "1px solid #66BB6A" : "1px solid #4FC3F7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "4px 12px", borderRadius: 8, fontSize: 16 }}>{entregaResult.order_number||"—"}</span>
                          <span style={{ background: STATUS_LABELS[entregaResult.status]?.color+"22", color: STATUS_LABELS[entregaResult.status]?.color, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{STATUS_LABELS[entregaResult.status]?.label}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 2 }}>{entregaResult.client_name}</div>
                        <div style={{ color: "#8B949E", fontSize: 14 }}>📞 {entregaResult.phone}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 28, color: "#66BB6A" }}>${Math.round(Number(entregaResult.price))}</div>
                        <div style={{ fontSize: 12, color: "#8B949E" }}>Total orden</div>
                        {getAbonado(entregaResult.id) > 0 && <>
                          <div style={{ fontSize: 13, color: "#4FC3F7", marginTop: 4 }}>Abonado: ${Math.round(getAbonado(entregaResult.id)).toLocaleString()}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#FFD54F" }}>Saldo: ${Math.round(getSaldo(entregaResult)).toLocaleString()}</div>
                        </>}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
                      {[{label:"SERVICIO",value:getServiceLabel(entregaResult.service, services)},{label:"PRENDAS",value:`${entregaResult.garments} prendas`},{label:"FECHA ENTREGA",value:`📅 ${entregaResult.delivery_date||"—"}`,color:"#FFD54F"}].map((item,i) => (
                        <div key={i} style={{ background: "#0D1117", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontWeight: 600, color: item.color||"#E6EDF3" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {orderItems[entregaResult.id] && <div style={{ marginBottom: 20 }}><div style={{ fontSize: 12, color: "#8B949E", marginBottom: 8, fontWeight: 600 }}>DETALLE DE PRENDAS</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{orderItems[entregaResult.id].map((it,i) => <div key={i} style={{ background: "#21262D", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>{it.service&&(() => { const sv=services.find(s=>s.id===it.service); return sv?<span style={{ color:sv.color }}>{sv.icon} </span>:null; })()}<span>{GARMENT_ICONS[it.garment_type]||"👕"} {it.garment_type}</span>{it.color&&<span style={{ color:"#C792EA" }}> · {it.color}</span>}<span style={{ color:"#66BB6A",fontWeight:700 }}> · ${Math.round(Number(it.price)*Number(it.quantity))}</span></div>)}</div></div>}
                    {entregaResult.notes && <div style={{ background: "rgba(255,213,79,0.08)", border: "1px solid rgba(255,213,79,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#FFD54F" }}>📝 {entregaResult.notes}</div>}
                    {entregaResult.status !== "entregado" && !entregaConfirmed && (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 8, fontWeight: 600 }}>MÉTODO DE PAGO</label>
                          <div style={{ display: "flex", gap: 10 }}>
                            {[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"},{value:"breb",label:"🔵 Bre-b"}].map(opt => (
                              <label key={opt.value} onClick={() => setEntregaPayment(opt.value)} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:entregaPayment===opt.value?"rgba(79,195,247,0.15)":"rgba(255,255,255,0.04)",border:`2px solid ${entregaPayment===opt.value?"#4FC3F7":"#30363D"}`,borderRadius:10,padding:"8px 4px",color:entregaPayment===opt.value?"#4FC3F7":"#8B949E" }}>{opt.label}</label>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                          <label onClick={() => setEntregaSinRecibo(!entregaSinRecibo)} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:entregaSinRecibo?"rgba(255,213,79,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${entregaSinRecibo?"#FFD54F":"#30363D"}`,borderRadius:10,padding:"12px 16px" }}>
                            <input type="checkbox" checked={entregaSinRecibo} onChange={e=>setEntregaSinRecibo(e.target.checked)} style={{ width:18,height:18,accentColor:"#FFD54F" }} />
                            <div><div style={{ fontWeight:600,color:entregaSinRecibo?"#FFD54F":"#8B949E" }}>📋 Entregado sin recibo</div><div style={{ fontSize:12,color:"#484F58" }}>El cliente no presentó recibo físico</div></div>
                          </label>
                        </div>
                        <button onClick={confirmarEntrega} style={{ ...btn, width:"100%",background:"linear-gradient(135deg,#66BB6A,#388E3C)",color:"#fff",padding:16,fontSize:16,fontWeight:800,borderRadius:10 }}>✅ Confirmar Entrega · ${Math.round(Number(entregaResult.price))}</button>
                      </>
                    )}
                    {(entregaResult.status === "entregado" || entregaConfirmed) && (
                      <div style={{ padding: "16px 0" }}>
                        <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 48, marginBottom: 8 }}>✅</div><div style={{ fontWeight: 800, fontSize: 20, color: "#66BB6A" }}>¡Entrega confirmada!</div></div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
                          {[{label:"📅 FECHA DE ENTREGA",value:entregaResult.delivered_at||today,color:"#66BB6A"},{label:"💳 MÉTODO DE PAGO",value:entregaResult.payment_method==="nequi"?"📱 Nequi":entregaResult.payment_method==="daviplata"?"💜 Daviplata":"💵 Efectivo",color:"#4FC3F7"},{label:"💰 TOTAL COBRADO",value:`$${Math.round(Number(entregaResult.price))}`,color:"#66BB6A"},{label:"📋 RECIBO",value:entregaResult.sin_recibo?"⚠️ Sin recibo":"✅ Con recibo",color:entregaResult.sin_recibo?"#FFD54F":"#66BB6A"},{label:"👤 ENTREGADO POR",value:entregaResult.delivered_by||"—",color:"#C792EA"}].map((item,i) => (
                            <div key={i} style={{ background: "#0D1117", borderRadius: 10, padding: "14px 16px" }}>
                              <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                              <div style={{ fontWeight: 800, fontSize: 16, color: item.color }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => printOrderQZ(entregaResult, null, 1)} title="Imprimir recibo" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", flex: 1, padding: 12 }}>🖨️ Imprimir recibo</button>
                          {entregaResult.sin_recibo && <button onClick={() => printConstanciaSinRecibo(entregaResult, null)} title="Imprimir constancia sin recibo" style={{ ...btn, background: "rgba(255,213,79,0.15)", color: "#FFD54F", flex: 1, padding: 12 }}>📝 Reimprimir constancia</button>}
                          <button onClick={() => { setEntregaResult(null); setEntregaResults(null); setEntregaSearch(""); setEntregaConfirmed(false); }} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", flex: 1, padding: 12 }}>🔍 Nueva búsqueda</button>
                        </div>
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
                <div style={{ display: "flex", gap: 10 }}>
                  {isAdmin && <button onClick={exportClients} style={{ ...btn, background: "rgba(102,187,106,0.15)", color: "#66BB6A", padding: "8px 14px", fontSize: 12 }}>📥 Exportar Excel</button>}
                  <button onClick={() => setModal("newClient")} style={{ ...btn, background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff" }}>+ Nuevo Cliente</button>
                </div>
              </div>
              <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <input style={{ ...inp, maxWidth: 320 }} placeholder="🔍 Buscar por nombre o teléfono..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                {clientSearch && <button onClick={() => setClientSearch("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "8px 14px", fontSize: 12 }}>✕ Limpiar</button>}
                <span style={{ fontSize: 13, color: "#8B949E" }}>{filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
                {filteredClients.map(c => (
                  <div key={c.id} style={{ ...card, borderTop: "3px solid #4FC3F7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 28 }}>👤</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditingClient({ ...c })} title="Editar" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "4px 10px", fontSize: 12 }}>✏️</button>
                        <button onClick={async () => { const ok=await checkClave("eliminar"); if(!ok)return; if(window.confirm("¿Eliminar este cliente?"))deleteClient(c.id); }} title="Eliminar" style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "4px 10px", fontSize: 12 }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                    <div style={{ color: "#8B949E", fontSize: 13, marginTop: 4 }}>📞 {c.phone}</div>
                    {c.email && <div style={{ color: "#8B949E", fontSize: 13 }}>✉️ {c.email}</div>}
                    <div style={{ marginTop: 12, background: "rgba(79,195,247,0.1)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#8B949E" }}>Total órdenes</span>
                      <span style={{ fontWeight: 800, color: "#4FC3F7" }}>{c.total_orders||0}</span>
                    </div>
                  </div>
                ))}
                {filteredClients.length === 0 && <p style={{ color: "#484F58" }}>No se encontraron clientes</p>}
              </div>
            </div>
          )}

          {/* AGENCIAS */}
          {tab === "agencias" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🏢 Agencias</h2>
                <button onClick={() => setModal("newAgency")} style={{ ...btn, background: "linear-gradient(135deg,#FF8A65,#E64A19)", color: "#fff" }}>+ Nueva Agencia</button>
              </div>
              <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <input style={{ ...inp, maxWidth: 320 }} placeholder="🔍 Buscar por nombre o teléfono..." value={agencySearch} onChange={e => setAgencySearch(e.target.value)} />
                {agencySearch && <button onClick={() => setAgencySearch("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "8px 14px", fontSize: 12 }}>✕ Limpiar</button>}
              </div>

              {(() => {
                const filteredAgencies = agencies.filter(a => a.name?.toLowerCase().includes(agencySearch.toLowerCase()) || a.phone?.includes(agencySearch));
                return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 24 }}>
                  {filteredAgencies.map(ag => {
                    const agOrders = orders.filter(o => o.agencia_id === ag.id);
                    const totalValor = agOrders.reduce((s,o) => s+Number(o.price), 0);
                    return <div key={ag.id} style={{ ...card, borderTop: "3px solid #FF8A65" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontSize: 28 }}>🏢</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditingAgency({ ...ag })} title="Editar" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "4px 10px", fontSize: 12 }}>✏️</button>
                          <button onClick={() => deleteAgency(ag.id)} title="Eliminar" style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "4px 10px", fontSize: 12 }}>🗑</button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{ag.name}</div>
                      {ag.contact_name && <div style={{ color: "#8B949E", fontSize: 13, marginTop: 2 }}>👤 {ag.contact_name}</div>}
                      {ag.phone && <div style={{ color: "#8B949E", fontSize: 13 }}>📞 {ag.phone}</div>}
                      {ag.address && <div style={{ color: "#8B949E", fontSize: 13 }}>📍 {ag.address}</div>}
                      <div style={{ marginTop: 12, background: "rgba(255,138,101,0.1)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "#8B949E" }}>{agOrders.length} orden{agOrders.length!==1?"es":""}</span>
                        <span style={{ fontWeight: 800, color: "#FF8A65" }}>${Math.round(totalValor).toLocaleString()}</span>
                      </div>
                      <button onClick={() => {
                        const defaultSvc = emptyItem.service, defaultType = emptyItem.garment_type;
                        const priceByService = precioByService[defaultSvc]?.[defaultType];
                        const priceDefault = precioDefaults[defaultType];
                        const defaultPrice = priceByService || priceDefault || "";
                        setNewOrder({ ...emptyOrder, client_name: ag.name, phone: ag.phone||"", agencia_id: ag.id, delivery_date: getDeliveryDefault() });
                        setItems([{ ...emptyItem, price: defaultPrice }]);
                        setModal("newOrder");
                      }} style={{ ...btn, width: "100%", background: "linear-gradient(135deg,#FF8A65,#E64A19)", color: "#fff", padding: 10, fontSize: 13, fontWeight: 700 }}>+ Nueva Orden</button>
                    </div>;
                  })}
                  {filteredAgencies.length === 0 && <p style={{ color: "#484F58" }}>No se encontraron agencias</p>}
                </div>;
              })()}

              <div style={{ ...card }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#8B949E" }}>Órdenes de agencias</h3>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={selectedAgencyId} onChange={e => setSelectedAgencyId(e.target.value)} style={{ ...inp, width: 180, fontSize: 13 }}>
                      <option value="" style={{ background:"#1a1a2e" }}>Todas las agencias</option>
                      {agencies.map(ag => <option key={ag.id} value={ag.id} style={{ background:"#1a1a2e" }}>{ag.name}</option>)}
                    </select>
                    <input type="date" value={agencyOrderFilterDate} onChange={e => setAgencyOrderFilterDate(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                    {agencyOrderFilterDate && <button onClick={() => setAgencyOrderFilterDate("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todas</button>}
                  </div>
                </div>
                {(() => {
                  const agencyOrders = orders.filter(o => o.agencia_id && (!selectedAgencyId || o.agencia_id === selectedAgencyId) && (!agencyOrderFilterDate || o.date === agencyOrderFilterDate));
                  return agencyOrders.length === 0
                    ? <div style={{ textAlign: "center", padding: 32, color: "#484F58" }}><div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div><div>No hay órdenes de agencias con este filtro</div></div>
                    : <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                          <thead><tr style={{ background: "#21262D" }}>{["# Orden","Agencia","Prendas","Total","Fecha","Entrega","Estado",""].map((h,i) => <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {agencyOrders.map(o => (
                              <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                                <td style={{ padding: "12px 14px" }}><span style={{ background: "rgba(255,138,101,0.15)", color: "#FF8A65", fontWeight: 800, padding: "4px 10px", borderRadius: 8, fontSize: 13 }}>{o.order_number||"—"}</span></td>
                                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{o.client_name}</td>
                                <td style={{ padding: "12px 14px" }}>{o.garments} prendas</td>
                                <td style={{ padding: "12px 14px", fontWeight: 800, color: "#66BB6A" }}>${Math.round(Number(o.price)).toLocaleString()}</td>
                                <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.date}</td>
                                <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.delivery_date||"—"}</td>
                                <td style={{ padding: "12px 14px" }}><span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[o.status]?.label}</span></td>
                                <td style={{ padding: "12px 14px" }}>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => printOrderQZ(o, null, 1)} title="Imprimir" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "5px 10px", fontSize: 12 }}>🖨️</button>
                                    <button onClick={async () => { const ok=await checkClave("eliminar"); if(!ok)return; if(window.confirm("¿Eliminar esta orden de agencia?"))deleteOrder(o.id); }} title="Eliminar" style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>;
                })()}
              </div>
            </div>
          )}

          {/* DOMICILIARIOS */}
          {tab === "domiciliarios" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🛵 Domiciliarios</h2>
                <button onClick={() => setModal("newDomiciliario")} style={{ ...btn, background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff" }}>+ Nuevo Domiciliario</button>
              </div>
              <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <input style={{ ...inp, maxWidth: 320 }} placeholder="🔍 Buscar por nombre o teléfono..." value={domiciliarioSearch} onChange={e => setDomiciliarioSearch(e.target.value)} />
                {domiciliarioSearch && <button onClick={() => setDomiciliarioSearch("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "8px 14px", fontSize: 12 }}>✕ Limpiar</button>}
              </div>

              {(() => {
                const filteredDomiciliarios = domiciliarios.filter(d => d.name?.toLowerCase().includes(domiciliarioSearch.toLowerCase()) || d.phone?.includes(domiciliarioSearch));
                return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 24 }}>
                  {filteredDomiciliarios.map(dm => {
                    const dmOrders = orders.filter(o => o.domiciliario_id === dm.id);
                    const totalValor = dmOrders.reduce((s,o) => s+Number(o.price), 0);
                    return <div key={dm.id} style={{ ...card, borderTop: "3px solid #66BB6A" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontSize: 28 }}>🛵</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditingDomiciliario({ ...dm })} title="Editar" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "4px 10px", fontSize: 12 }}>✏️</button>
                          <button onClick={() => deleteDomiciliario(dm.id)} title="Eliminar" style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "4px 10px", fontSize: 12 }}>🗑</button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{dm.name}</div>
                      {dm.contact_name && <div style={{ color: "#8B949E", fontSize: 13, marginTop: 2 }}>👤 {dm.contact_name}</div>}
                      {dm.phone && <div style={{ color: "#8B949E", fontSize: 13 }}>📞 {dm.phone}</div>}
                      {dm.address && <div style={{ color: "#8B949E", fontSize: 13 }}>📍 {dm.address}</div>}
                      <div style={{ marginTop: 12, background: "rgba(102,187,106,0.1)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "#8B949E" }}>{dmOrders.length} orden{dmOrders.length!==1?"es":""}</span>
                        <span style={{ fontWeight: 800, color: "#66BB6A" }}>${Math.round(totalValor).toLocaleString()}</span>
                      </div>
                      <button onClick={() => {
                        const defaultSvc = emptyItem.service, defaultType = emptyItem.garment_type;
                        const priceByService = precioByService[defaultSvc]?.[defaultType];
                        const priceDefault = precioDefaults[defaultType];
                        const defaultPrice = priceByService || priceDefault || "";
                        setNewOrder({ ...emptyOrder, client_name: dm.name, phone: dm.phone||"", domiciliario_id: dm.id, delivery_date: getDeliveryDefault() });
                        setItems([{ ...emptyItem, price: defaultPrice }]);
                        setModal("newOrder");
                      }} style={{ ...btn, width: "100%", background: "linear-gradient(135deg,#66BB6A,#388E3C)", color: "#fff", padding: 10, fontSize: 13, fontWeight: 700 }}>+ Nueva Orden</button>
                    </div>;
                  })}
                  {filteredDomiciliarios.length === 0 && <p style={{ color: "#484F58" }}>No se encontraron domiciliarios</p>}
                </div>;
              })()}

              <div style={{ ...card }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#8B949E" }}>Órdenes de domiciliarios</h3>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={selectedDomiciliarioId} onChange={e => setSelectedDomiciliarioId(e.target.value)} style={{ ...inp, width: 180, fontSize: 13 }}>
                      <option value="" style={{ background:"#1a1a2e" }}>Todos los domiciliarios</option>
                      {domiciliarios.map(dm => <option key={dm.id} value={dm.id} style={{ background:"#1a1a2e" }}>{dm.name}</option>)}
                    </select>
                    <input type="date" value={domiciliarioOrderFilterDate} onChange={e => setDomiciliarioOrderFilterDate(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                    {domiciliarioOrderFilterDate && <button onClick={() => setDomiciliarioOrderFilterDate("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todas</button>}
                  </div>
                </div>
                {(() => {
                  const domiciliarioOrders = orders.filter(o => o.domiciliario_id && (!selectedDomiciliarioId || o.domiciliario_id === selectedDomiciliarioId) && (!domiciliarioOrderFilterDate || o.date === domiciliarioOrderFilterDate));
                  return domiciliarioOrders.length === 0
                    ? <div style={{ textAlign: "center", padding: 32, color: "#484F58" }}><div style={{ fontSize: 36, marginBottom: 8 }}>🛵</div><div>No hay órdenes de domiciliarios con este filtro</div></div>
                    : <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                          <thead><tr style={{ background: "#21262D" }}>{["# Orden","Domiciliario","Prendas","Total","Fecha","Entrega","Estado",""].map((h,i) => <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#8B949E", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {domiciliarioOrders.map(o => (
                              <tr key={o.id} style={{ borderBottom: "1px solid #21262D" }}>
                                <td style={{ padding: "12px 14px" }}><span style={{ background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontWeight: 800, padding: "4px 10px", borderRadius: 8, fontSize: 13 }}>{o.order_number||"—"}</span></td>
                                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{o.client_name}</td>
                                <td style={{ padding: "12px 14px" }}>{o.garments} prendas</td>
                                <td style={{ padding: "12px 14px", fontWeight: 800, color: "#66BB6A" }}>${Math.round(Number(o.price)).toLocaleString()}</td>
                                <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.date}</td>
                                <td style={{ padding: "12px 14px", color: "#8B949E", fontSize: 12 }}>{o.delivery_date||"—"}</td>
                                <td style={{ padding: "12px 14px" }}><span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[o.status]?.label}</span></td>
                                <td style={{ padding: "12px 14px" }}>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => printOrderQZ(o, null, 1)} title="Imprimir" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", padding: "5px 10px", fontSize: 12 }}>🖨️</button>
                                    <button onClick={async () => { const ok=await checkClave("eliminar"); if(!ok)return; if(window.confirm("¿Eliminar esta orden de domiciliario?"))deleteOrder(o.id); }} title="Eliminar" style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "5px 10px", fontSize: 12 }}>🗑</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>;
                })()}
              </div>
            </div>
          )}

          {/* EXPENSES */}
          {tab === "expenses" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Gastos</h2>
                  {!showEliminados && <>
                    <input type="date" value={expenseFilterDate} onChange={e => setExpenseFilterDate(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 160, fontSize: 13 }} />
                    {expenseFilterDate && <button onClick={() => setExpenseFilterDate("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todos</button>}
                  </>}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowEliminados(!showEliminados)} style={{ ...btn, background: showEliminados?"rgba(239,83,80,0.2)":"rgba(255,255,255,0.05)", color: showEliminados?"#EF5350":"#8B949E", padding: "8px 14px", fontSize: 12 }}>
                    {showEliminados ? "← Volver" : "🗑 Ver eliminados"}
                  </button>
                  {!showEliminados && <button onClick={() => setModal("newExpense")} style={{ ...btn, background: "linear-gradient(135deg,#EF5350,#B71C1C)", color: "#fff" }}>+ Nuevo Gasto</button>}
                </div>
              </div>

              {showEliminados && (
                <div>
                  <div style={{ ...card, marginBottom: 16, border: "1px solid rgba(239,83,80,0.4)" }}>
                    <div style={{ display: "flex", gap: 40 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: "#EF5350" }}>${Math.round(expenses.filter(e=>e.eliminado).reduce((s,e)=>s+Number(e.amount),0))}</div><div style={{ fontSize: 12, color: "#8B949E" }}>Total eliminado</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: "#FFD54F" }}>{expenses.filter(e=>e.eliminado).length}</div><div style={{ fontSize: 12, color: "#8B949E" }}>Registros</div></div>
                    </div>
                  </div>
                  {expenses.filter(e=>e.eliminado).length === 0
                    ? <div style={{ ...card, textAlign: "center", padding: 40, color: "#484F58" }}><div style={{ fontSize: 40, marginBottom: 8 }}>🗑</div><div>No hay gastos eliminados</div></div>
                    : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead><tr style={{ background: "#21262D" }}>{["Concepto","Categoría","Pago","Monto","Fecha",""].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:12 }}>{h}</th>)}</tr></thead>
                        <tbody>{expenses.filter(e=>e.eliminado).map(e=>(
                          <tr key={e.id} style={{ borderBottom:"1px solid #21262D",opacity:0.7 }}>
                            <td style={{ padding:"12px 14px",fontWeight:600 }}>{e.concept}</td>
                            <td style={{ padding:"12px 14px" }}><span style={{ background:"rgba(255,213,79,0.1)",color:"#FFD54F",padding:"3px 10px",borderRadius:20,fontSize:12 }}>{e.category}</span></td>
                            <td style={{ padding:"12px 14px" }}><PayMethod m={e.payment_method} /></td>
                            <td style={{ padding:"12px 14px",fontWeight:700,color:"#EF5350" }}>${e.amount}</td>
                            <td style={{ padding:"12px 14px",color:"#8B949E",fontSize:12 }}>{e.date}</td>
                            <td style={{ padding:"12px 14px" }}><button onClick={async()=>{ await db.patch("expenses",e.id,{eliminado:false}); setExpenses(prev=>prev.map(ex=>ex.id===e.id?{...ex,eliminado:false}:ex)); }} title="Restaurar" style={{ ...btn,background:"rgba(102,187,106,0.15)",color:"#66BB6A",padding:"5px 10px",fontSize:12 }}>↩️ Restaurar</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                  }
                </div>
              )}

              {!showEliminados && <>
                <div style={{ ...card, marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 40 }}>
                    <div><div style={{ fontSize: 22, fontWeight: 800, color: "#EF5350" }}>${Math.round(filteredExpenses.reduce((s,e)=>s+Number(e.amount),0))}</div><div style={{ fontSize: 12, color: "#8B949E" }}>{expenseFilterDate?"Gastos del día":"Total gastos"}</div></div>
                    <div><div style={{ fontSize: 22, fontWeight: 800, color: "#FFD54F" }}>{filteredExpenses.length}</div><div style={{ fontSize: 12, color: "#8B949E" }}>Registros</div></div>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr style={{ background: "#21262D" }}>{["Concepto","Categoría","Pago","Monto","Fecha",""].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:12 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredExpenses.map(e => (
                      <tr key={e.id} style={{ borderBottom: "1px solid #21262D" }}>
                        <td style={{ padding:"12px 14px",fontWeight:600 }}>{e.concept}</td>
                        <td style={{ padding:"12px 14px" }}><span style={{ background:"rgba(255,213,79,0.1)",color:"#FFD54F",padding:"3px 10px",borderRadius:20,fontSize:12 }}>{e.category}</span></td>
                        <td style={{ padding:"12px 14px" }}><PayMethod m={e.payment_method} /></td>
                        <td style={{ padding:"12px 14px",fontWeight:700,color:"#EF5350" }}>${e.amount}</td>
                        <td style={{ padding:"12px 14px",color:"#8B949E",fontSize:12 }}>{e.date}</td>
                        <td style={{ padding:"12px 14px" }}><button onClick={async()=>{ const ok=await checkClave("eliminar"); if(!ok)return; if(window.confirm("¿Eliminar este gasto?"))deleteExpense(e.id); }} title="Eliminar" title="Eliminar" style={{ ...btn,background:"rgba(239,83,80,0.15)",color:"#EF5350",padding:"5px 10px",fontSize:12 }}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>}
            </div>
          )}

          {/* NOMINA */}
          {tab === "nomina" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>💸 Nómina — Adelantos de Empleados</h2>
                <button onClick={() => setModal("newAdvance")} style={{ ...btn, background: "linear-gradient(135deg,#FFD54F,#F57F17)", color: "#000" }}>+ Registrar Adelanto</button>
              </div>

              <div style={{ ...card, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={advanceFrom} onChange={e => setAdvanceFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={advanceTo} onChange={e => setAdvanceTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
                    <button onClick={() => { const d=new Date(); const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; setAdvanceFrom(`${ym}-01`); setAdvanceTo(`${ym}-15`); }} style={{ ...btn, background: "rgba(255,213,79,0.15)", color: "#FFD54F", padding: "8px 14px", fontSize: 12 }}>Quincena 1 (1-15)</button>
                    <button onClick={() => { const d=new Date(); const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; const lastDay=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); setAdvanceFrom(`${ym}-16`); setAdvanceTo(`${ym}-${String(lastDay).padStart(2,"0")}`); }} style={{ ...btn, background: "rgba(255,213,79,0.15)", color: "#FFD54F", padding: "8px 14px", fontSize: 12 }}>Quincena 2 (16-fin)</button>
                  </div>
                </div>
              </div>

              {(() => {
                const filteredAdvances = advances.filter(a => a.date >= advanceFrom && a.date <= advanceTo);
                const totalPeriodo = filteredAdvances.reduce((s,a) => s + Number(a.amount), 0);
                const porEmpleado = {};
                filteredAdvances.forEach(a => {
                  const key = a.employee_id || a.employee_name || "—";
                  if (!porEmpleado[key]) porEmpleado[key] = { name: a.employee_name || "—", total: 0, count: 0 };
                  porEmpleado[key].total += Number(a.amount);
                  porEmpleado[key].count += 1;
                });
                const empleadosList = Object.values(porEmpleado).sort((a,b) => b.total - a.total);

                const exportNomina = () => {
                  const csv = [
                    ["Empleado","Fecha","Monto","Método","Nota","Registrado por"],
                    ...filteredAdvances.map(a => [a.employee_name||"", a.date, Math.round(Number(a.amount)), a.payment_method||"efectivo", a.note||"", a.created_by||""]),
                    ["","","TOTAL", Math.round(totalPeriodo), "", "", ""]
                  ].map(r => r.join(",")).join("\n");
                  const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob); const a = document.createElement("a");
                  a.href = url; a.download = `adelantos_${advanceFrom}_${advanceTo}.csv`; a.click(); URL.revokeObjectURL(url);
                };

                return <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 20 }}>
                    <div style={{ ...card, borderLeft: "4px solid #FFD54F" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>💸</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#FFD54F" }}>${Math.round(totalPeriodo).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>Total adelantado en el período</div>
                    </div>
                    <div style={{ ...card, borderLeft: "4px solid #4FC3F7" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>👥</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#4FC3F7" }}>{empleadosList.length}</div>
                      <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>Empleados con adelantos</div>
                    </div>
                    <div style={{ ...card, borderLeft: "4px solid #66BB6A" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#66BB6A" }}>{filteredAdvances.length}</div>
                      <div style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>Registros</div>
                    </div>
                  </div>

                  {empleadosList.length > 0 && (
                    <div style={{ ...card, marginBottom: 20 }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#8B949E" }}>Total a descontar por empleado</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                        {empleadosList.map((emp,i) => (
                          <div key={i} style={{ background: "#0D1117", borderRadius: 10, padding: "12px 16px", borderLeft: "3px solid #FFD54F" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{emp.name}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontSize: 11, color: "#8B949E" }}>{emp.count} adelanto{emp.count!==1?"s":""}</span>
                              <span style={{ fontWeight: 800, fontSize: 17, color: "#FFD54F" }}>${Math.round(emp.total).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isAdmin && filteredAdvances.length > 0 && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                    <button onClick={exportNomina} style={{ ...btn,background:"rgba(102,187,106,0.15)",color:"#66BB6A",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                  </div>}

                  {filteredAdvances.length === 0
                    ? <div style={{ ...card, textAlign: "center", padding: 40, color: "#484F58" }}><div style={{ fontSize: 40, marginBottom: 8 }}>💸</div><div>No hay adelantos registrados en este período</div></div>
                    : <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                          <thead><tr style={{ background: "#21262D" }}>{["Empleado","Fecha","Monto","Método","Nota","Registrado por",""].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:12 }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {filteredAdvances.map(a => (
                              <tr key={a.id} style={{ borderBottom: "1px solid #21262D" }}>
                                <td style={{ padding:"12px 14px",fontWeight:600 }}>{a.employee_name}</td>
                                <td style={{ padding:"12px 14px",color:"#8B949E",fontSize:12 }}>{a.date}</td>
                                <td style={{ padding:"12px 14px",fontWeight:700,color:"#FFD54F" }}>${Math.round(Number(a.amount)).toLocaleString()}</td>
                                <td style={{ padding:"12px 14px" }}><PayMethod m={a.payment_method||"efectivo"} /></td>
                                <td style={{ padding:"12px 14px",color:"#8B949E",fontSize:13 }}>{a.note||"—"}</td>
                                <td style={{ padding:"12px 14px",color:"#8B949E",fontSize:12 }}>{a.created_by||"—"}</td>
                                <td style={{ padding:"12px 14px" }}><button onClick={()=>deleteAdvance(a.id)} title="Eliminar" style={{ ...btn,background:"rgba(239,83,80,0.15)",color:"#EF5350",padding:"5px 10px",fontSize:12 }}>🗑</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  }
                </>;
              })()}
            </div>
          )}

          {/* REPORT */}
          {tab === "report" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Informe del Día</h2>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 160 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginBottom: 20 }}>
                <div style={{ ...card, borderColor: "#66BB6A" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#66BB6A" }}>💵 Resumen Financiero</h3>
                  {[["Ingresos totales",`$${Math.round(todayRevenue)}`,"#66BB6A"],["Gastos totales",`$${Math.round(todayExp)}`,"#EF5350"],["Utilidad neta",`$${Math.round(todayRevenue-todayExp)}`,"#4FC3F7"]].map(([l,v,c]) => (
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #21262D" }}><span style={{ color:"#8B949E" }}>{l}</span><span style={{ fontWeight:800,color:c,fontSize:16 }}>{v}</span></div>
                  ))}
                </div>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", color: "#4FC3F7" }}>👕 Resumen de Prendas</h3>
                  {[["Total prendas",todayGarments],["Total órdenes",todayOrders.length],["Ticket promedio",todayOrders.length?`$${Math.round(todayRevenue/todayOrders.length)}`:"$0"]].map(([l,v]) => (
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #21262D" }}><span style={{ color:"#8B949E" }}>{l}</span><span style={{ fontWeight:800,fontSize:16 }}>{v}</span></div>
                  ))}
                </div>
              </div>
              <div style={card}>
                <h3 style={{ margin: "0 0 16px", color: "#8B949E" }}>📊 Desglose por Servicio</h3>
                {services.map(sv => {
                  const ords=todayOrders.filter(o=>(o.service||"").split(",").map(s=>s.trim()).includes(sv.id));
                  return <div key={sv.id} style={{ display:"flex",alignItems:"center",gap:16,padding:"12px 0",borderBottom:"1px solid #21262D" }}>
                    <div style={{ fontSize:24 }}>{sv.icon}</div>
                    <div style={{ flex:1 }}><div style={{ fontWeight:600 }}>{sv.label}</div><div style={{ fontSize:12,color:"#8B949E" }}>{ords.length} órdenes · {ords.reduce((s,o)=>s+Number(o.garments),0)} prendas</div></div>
                    <div style={{ fontWeight:800,color:sv.color,fontSize:16 }}>${Math.round(ords.reduce((s,o)=>s+Number(o.price),0))}</div>
                  </div>;
                })}
              </div>
              <div style={{ ...card, marginTop: 16 }}>
                <h3 style={{ margin: "0 0 16px", color: "#8B949E" }}>📋 Estado de órdenes</h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_LABELS).map(([k,v]) => {
                    const cnt=todayOrders.filter(o=>o.status===k).length;
                    return <div key={k} style={{ background:v.color+"15",border:`1px solid ${v.color}40`,borderRadius:10,padding:"12px 20px",textAlign:"center",minWidth:100 }}>
                      <div style={{ fontWeight:800,fontSize:24,color:v.color }}>{cnt}</div>
                      <div style={{ fontSize:12,color:"#8B949E",marginTop:2 }}>{v.label}</div>
                    </div>;
                  })}
                </div>
              </div>

              {/* INFORME POR RANGO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#4FC3F7" }}>📊 Informe por Rango de Fechas</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
                    <button onClick={() => setReportView("dia")} style={{ ...btn, background: reportView==="dia"?"linear-gradient(135deg,#4FC3F7,#0288D1)":"rgba(255,255,255,0.05)", color: reportView==="dia"?"#fff":"#8B949E", padding: "8px 16px", fontSize: 12 }}>Por Día</button>
                    <button onClick={() => setReportView("mes")} style={{ ...btn, background: reportView==="mes"?"linear-gradient(135deg,#4FC3F7,#0288D1)":"rgba(255,255,255,0.05)", color: reportView==="mes"?"#fff":"#8B949E", padding: "8px 16px", fontSize: 12 }}>Por Mes</button>
                  </div>
                </div>
                {(() => {
                  const inRange = orders.filter(o => o.date >= reportFrom && o.date <= reportTo);
                  const deliveredInRange = orders.filter(o => o.delivered_at >= reportFrom && o.delivered_at <= reportTo && o.status === "entregado");
                  if (reportView === "dia") {
                    const days = {};
                    inRange.forEach(o => { if (!days[o.date]) days[o.date] = { ingresos:0,ordenes:0,prendas:0 }; days[o.date].ingresos+=Number(o.price); days[o.date].ordenes+=1; days[o.date].prendas+=Number(o.garments); });
                    deliveredInRange.forEach(o => { const d=o.delivered_at; if (!days[d]) days[d]={ingresos:0,ordenes:0,prendas:0}; if(!days[d].entregas)days[d].entregas=0; if(!days[d].valorEntregado)days[d].valorEntregado=0; days[d].entregas+=1; days[d].valorEntregado+=Number(o.price); });
                    const sortedDays = Object.keys(days).sort();
                    const totalIng=sortedDays.reduce((s,d)=>s+(days[d].ingresos||0),0), totalEnt=sortedDays.reduce((s,d)=>s+(days[d].valorEntregado||0),0), totalOrd=sortedDays.reduce((s,d)=>s+(days[d].ordenes||0),0), totalPrend=sortedDays.reduce((s,d)=>s+(days[d].prendas||0),0);
                    const exportDia = () => {
                      const csv=[["Fecha","Ordenes Ingresadas","Prendas","Valor Ingresado","Entregas","Valor Entregado"],...sortedDays.map(d=>[d,days[d].ordenes||0,days[d].prendas||0,Math.round(days[d].ingresos||0),days[d].entregas||0,Math.round(days[d].valorEntregado||0)]),["TOTAL",totalOrd,totalPrend,Math.round(totalIng),sortedDays.reduce((s,d)=>s+(days[d].entregas||0),0),Math.round(totalEnt)]].map(r=>r.join(",")).join("\n");
                      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`informe_diario_${reportFrom}_${reportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                    };
                    return sortedDays.length===0 ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay datos en este rango de fechas</p> : (
                      <>
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16 }}>
                          {[{label:"Total Ingresado",value:`$${Math.round(totalIng).toLocaleString()}`,color:"#66BB6A"},{label:"Total Entregado",value:`$${Math.round(totalEnt).toLocaleString()}`,color:"#4FC3F7"},{label:"Órdenes",value:totalOrd,color:"#FFD54F"},{label:"Prendas",value:totalPrend,color:"#FF8A65"}].map((k,i)=>(
                            <div key={i} style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${k.color}` }}><div style={{ fontWeight:800,fontSize:18,color:k.color }}>{k.value}</div><div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>{k.label}</div></div>
                          ))}
                        </div>
                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}><button onClick={exportDia} style={{ ...btn,background:"rgba(102,187,106,0.15)",color:"#66BB6A",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button></div>}
                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>{["Fecha","Órdenes","Prendas","Valor Ingresado","Entregas","Valor Entregado"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {sortedDays.map(d=>(<tr key={d} style={{ borderBottom:"1px solid #21262D" }}><td style={{ padding:"10px 12px",fontWeight:600 }}>{d}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{days[d].ordenes||0}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{days[d].prendas||0}</td><td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(days[d].ingresos||0).toLocaleString()}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{days[d].entregas||0}</td><td style={{ padding:"10px 12px",fontWeight:700,color:"#4FC3F7" }}>${Math.round(days[d].valorEntregado||0).toLocaleString()}</td></tr>))}
                              <tr style={{ background:"#21262D",fontWeight:800 }}><td style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{totalOrd}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{totalPrend}</td><td style={{ padding:"10px 12px",color:"#66BB6A" }}>${Math.round(totalIng).toLocaleString()}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{sortedDays.reduce((s,d)=>s+(days[d].entregas||0),0)}</td><td style={{ padding:"10px 12px",color:"#4FC3F7" }}>${Math.round(totalEnt).toLocaleString()}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  }
                  const months={};
                  inRange.forEach(o=>{ const m=o.date?.substring(0,7); if(!m)return; if(!months[m])months[m]={ingresos:0,ordenes:0,prendas:0,entregas:0,valorEntregado:0}; months[m].ingresos+=Number(o.price); months[m].ordenes+=1; months[m].prendas+=Number(o.garments); });
                  deliveredInRange.forEach(o=>{ const m=o.delivered_at?.substring(0,7); if(!m)return; if(!months[m])months[m]={ingresos:0,ordenes:0,prendas:0,entregas:0,valorEntregado:0}; months[m].entregas+=1; months[m].valorEntregado+=Number(o.price); });
                  const monthNames={"01":"Enero","02":"Febrero","03":"Marzo","04":"Abril","05":"Mayo","06":"Junio","07":"Julio","08":"Agosto","09":"Septiembre","10":"Octubre","11":"Noviembre","12":"Diciembre"};
                  const sortedMonths=Object.keys(months).sort();
                  const mTotalIng=sortedMonths.reduce((s,m)=>s+(months[m].ingresos||0),0), mTotalEnt=sortedMonths.reduce((s,m)=>s+(months[m].valorEntregado||0),0), mTotalOrd=sortedMonths.reduce((s,m)=>s+(months[m].ordenes||0),0), mTotalPrend=sortedMonths.reduce((s,m)=>s+(months[m].prendas||0),0);
                  const exportMes = () => {
                    const csv=[["Mes","Ordenes Ingresadas","Prendas","Valor Ingresado","Entregas","Valor Entregado"],...sortedMonths.map(m=>{const[y,mo]=m.split("-");return[`${monthNames[mo]} ${y}`,months[m].ordenes||0,months[m].prendas||0,Math.round(months[m].ingresos||0),months[m].entregas||0,Math.round(months[m].valorEntregado||0)];}),["TOTAL",mTotalOrd,mTotalPrend,Math.round(mTotalIng),sortedMonths.reduce((s,m)=>s+(months[m].entregas||0),0),Math.round(mTotalEnt)]].map(r=>r.join(",")).join("\n");
                    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`informe_mensual_${reportFrom}_${reportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };
                  return sortedMonths.length===0 ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay datos en este rango de fechas</p> : (
                    <>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16 }}>
                        {[{label:"Total Ingresado",value:`$${Math.round(mTotalIng).toLocaleString()}`,color:"#66BB6A"},{label:"Total Entregado",value:`$${Math.round(mTotalEnt).toLocaleString()}`,color:"#4FC3F7"},{label:"Órdenes",value:mTotalOrd,color:"#FFD54F"},{label:"Prendas",value:mTotalPrend,color:"#FF8A65"}].map((k,i)=>(
                          <div key={i} style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${k.color}` }}><div style={{ fontWeight:800,fontSize:18,color:k.color }}>{k.value}</div><div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>{k.label}</div></div>
                        ))}
                      </div>
                      {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}><button onClick={exportMes} style={{ ...btn,background:"rgba(102,187,106,0.15)",color:"#66BB6A",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button></div>}
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                          <thead><tr style={{ background:"#21262D" }}>{["Mes","Órdenes","Prendas","Valor Ingresado","Entregas","Valor Entregado"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {sortedMonths.map(m=>{const[y,mo]=m.split("-");return<tr key={m} style={{ borderBottom:"1px solid #21262D" }}><td style={{ padding:"10px 12px",fontWeight:600 }}>{monthNames[mo]} {y}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{months[m].ordenes||0}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{months[m].prendas||0}</td><td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(months[m].ingresos||0).toLocaleString()}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{months[m].entregas||0}</td><td style={{ padding:"10px 12px",fontWeight:700,color:"#4FC3F7" }}>${Math.round(months[m].valorEntregado||0).toLocaleString()}</td></tr>;})}
                            <tr style={{ background:"#21262D",fontWeight:800 }}><td style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{mTotalOrd}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{mTotalPrend}</td><td style={{ padding:"10px 12px",color:"#66BB6A" }}>${Math.round(mTotalIng).toLocaleString()}</td><td style={{ padding:"10px 12px",textAlign:"center" }}>{sortedMonths.reduce((s,m)=>s+(months[m].entregas||0),0)}</td><td style={{ padding:"10px 12px",color:"#4FC3F7" }}>${Math.round(mTotalEnt).toLocaleString()}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* GASTOS POR RANGO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#EF5350" }}>💰 Gastos por Rango de Fechas</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                </div>
                {(() => {
                  const gastosRango = expenses.filter(e => !e.eliminado && e.date >= reportFrom && e.date <= reportTo);
                  const totalGastosRango = gastosRango.reduce((s,e) => s + Number(e.amount), 0);

                  // Group by day
                  const byDay = {};
                  gastosRango.forEach(e => {
                    if (!byDay[e.date]) byDay[e.date] = { total: 0, items: [] };
                    byDay[e.date].total += Number(e.amount);
                    byDay[e.date].items.push(e);
                  });
                  const sortedDays = Object.keys(byDay).sort();

                  // Group by category
                  const byCat = {};
                  gastosRango.forEach(e => {
                    if (!byCat[e.category]) byCat[e.category] = 0;
                    byCat[e.category] += Number(e.amount);
                  });

                  const exportGastos = () => {
                    const csv = [
                      ["Fecha","Concepto","Categoría","Método de Pago","Monto"],
                      ...gastosRango.map(e => [e.date, e.concept||"", e.category||"", e.payment_method||"", Math.round(Number(e.amount))]),
                      ["","","","TOTAL", Math.round(totalGastosRango)]
                    ].map(r => r.join(",")).join("\n");
                    const blob = new Blob(["﻿"+csv], {type:"text/csv;charset=utf-8;"});
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href=url; a.download=`gastos_${reportFrom}_${reportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };

                  return gastosRango.length === 0
                    ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay gastos en este rango de fechas</p>
                    : <>
                        {/* KPIs */}
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16 }}>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #EF5350" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#EF5350" }}>${Math.round(totalGastosRango).toLocaleString()}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Total gastos</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FFD54F" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#FFD54F" }}>{gastosRango.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Registros</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #4FC3F7" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#4FC3F7" }}>{sortedDays.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Días con gastos</div>
                          </div>
                        </div>

                        {/* Por categoría */}
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:12,color:"#8B949E",fontWeight:600,marginBottom:8 }}>POR CATEGORÍA</div>
                          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                            {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,total]) => (
                              <div key={cat} style={{ background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:10,padding:"8px 14px" }}>
                                <div style={{ fontSize:11,color:"#8B949E",marginBottom:2 }}>{cat.charAt(0).toUpperCase()+cat.slice(1)}</div>
                                <div style={{ fontWeight:800,color:"#EF5350" }}>${Math.round(total).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                          <button onClick={exportGastos} style={{ ...btn,background:"rgba(239,83,80,0.15)",color:"#EF5350",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                        </div>}

                        {/* Tabla detalle */}
                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>
                              {["Fecha","Concepto","Categoría","Pago","Monto"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                              {gastosRango.map(e => (
                                <tr key={e.id} style={{ borderBottom:"1px solid #21262D" }}>
                                  <td style={{ padding:"10px 12px",color:"#8B949E",fontSize:12 }}>{e.date}</td>
                                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{e.concept}</td>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(255,213,79,0.1)",color:"#FFD54F",padding:"2px 8px",borderRadius:20,fontSize:11 }}>{e.category}</span></td>
                                  <td style={{ padding:"10px 12px" }}><PayMethod m={e.payment_method} /></td>
                                  <td style={{ padding:"10px 12px",fontWeight:700,color:"#EF5350" }}>${Math.round(Number(e.amount)).toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr style={{ background:"#21262D",fontWeight:800 }}>
                                <td colSpan={4} style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td>
                                <td style={{ padding:"10px 12px",color:"#EF5350" }}>${Math.round(totalGastosRango).toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>;
                })()}
              </div>

              {/* ABONOS POR RANGO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#FFD54F" }}>💰 Abonos por Rango de Fechas</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                </div>
                {(() => {
                  const abonosRango = abonos.filter(a => a.date >= reportFrom && a.date <= reportTo);
                  const totalAbonos = abonosRango.reduce((s,a) => s + Number(a.amount), 0);

                  // Group by day
                  const byDay = {};
                  abonosRango.forEach(a => {
                    if (!byDay[a.date]) byDay[a.date] = { total: 0, items: [] };
                    byDay[a.date].total += Number(a.amount);
                    byDay[a.date].items.push(a);
                  });
                  const sortedDays = Object.keys(byDay).sort();

                  // By payment method
                  const byMetodo = { efectivo:0, nequi:0, daviplata:0, breb:0 };
                  abonosRango.forEach(a => { byMetodo[a.payment_method||"efectivo"] = (byMetodo[a.payment_method||"efectivo"]||0) + Number(a.amount); });

                  const exportAbonos = () => {
                    const csv = [
                      ["Fecha","Orden","Cliente","Empleado","Metodo","Monto"],
                      ...abonosRango.map(a => {
                        const orden = orders.find(o => o.id === a.order_id);
                        return [a.date, orden?.order_number||"", orden?.client_name||"", a.employee||"", a.payment_method||"efectivo", Math.round(Number(a.amount))];
                      }),
                      ["","","","","TOTAL", Math.round(totalAbonos)]
                    ].map(r => r.join(",")).join("\n");
                    const blob = new Blob(["﻿"+csv], {type:"text/csv;charset=utf-8;"});
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href=url; a.download=`abonos_${reportFrom}_${reportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };

                  return abonosRango.length === 0
                    ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay abonos en este rango de fechas</p>
                    : <>
                        {/* KPIs */}
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16 }}>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FFD54F" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#FFD54F" }}>${Math.round(totalAbonos).toLocaleString()}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Total abonado</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #4FC3F7" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#4FC3F7" }}>{abonosRango.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Total abonos</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #66BB6A" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#66BB6A" }}>{new Set(abonosRango.map(a=>a.order_id)).size}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Órdenes con abono</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FF8A65" }}>
                            <div style={{ fontWeight:800,fontSize:20,color:"#FF8A65" }}>{sortedDays.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Días con abonos</div>
                          </div>
                        </div>

                        {/* Por método */}
                        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:16 }}>
                          {[{k:"efectivo",l:"💵 Efectivo",c:"#66BB6A"},{k:"nequi",l:"📱 Nequi",c:"#C792EA"},{k:"daviplata",l:"💜 Daviplata",c:"#667EEA"},{k:"breb",l:"🔵 Bre-b",c:"#4FC3F7"}].filter(m=>byMetodo[m.k]>0).map(m=>(
                            <div key={m.k} style={{ background:m.c+"15",border:`1px solid ${m.c}40`,borderRadius:10,padding:"8px 14px" }}>
                              <div style={{ fontSize:11,color:"#8B949E" }}>{m.l}</div>
                              <div style={{ fontWeight:800,color:m.c }}>${Math.round(byMetodo[m.k]).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>

                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                          <button onClick={exportAbonos} style={{ ...btn,background:"rgba(255,213,79,0.15)",color:"#FFD54F",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                        </div>}

                        {/* Tabla detalle */}
                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>
                              {["Fecha","# Orden","Cliente","Empleado","Método","Monto"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                              {abonosRango.map(a => {
                                const orden = orders.find(o => o.id === a.order_id);
                                return <tr key={a.id} style={{ borderBottom:"1px solid #21262D" }}>
                                  <td style={{ padding:"10px 12px",color:"#8B949E",fontSize:12 }}>{a.date}</td>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(79,195,247,0.15)",color:"#4FC3F7",fontWeight:800,padding:"2px 8px",borderRadius:6,fontSize:12 }}>{orden?.order_number||"—"}</span></td>
                                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{orden?.client_name||"—"}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E",fontSize:12 }}>{a.employee||"—"}</td>
                                  <td style={{ padding:"10px 12px" }}><PayMethod m={a.payment_method||"efectivo"} /></td>
                                  <td style={{ padding:"10px 12px",fontWeight:700,color:"#FFD54F" }}>${Math.round(Number(a.amount)).toLocaleString()}</td>
                                </tr>;
                              })}
                              <tr style={{ background:"#21262D",fontWeight:800 }}>
                                <td colSpan={5} style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td>
                                <td style={{ padding:"10px 12px",color:"#FFD54F" }}>${Math.round(totalAbonos).toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>;
                })()}
              </div>

              {/* AGENCIAS POR RANGO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#FF8A65" }}>🏢 Informe de Agencias</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={agencyReportFrom} onChange={e => setAgencyReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={agencyReportTo} onChange={e => setAgencyReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>AGENCIA</label>
                    <select value={agencyReportId} onChange={e => setAgencyReportId(e.target.value)} style={{ ...inp, width: 180, fontSize: 13 }}>
                      <option value="todas" style={{ background:"#1a1a2e" }}>Todas las agencias</option>
                      {agencies.map(ag => <option key={ag.id} value={ag.id} style={{ background:"#1a1a2e" }}>{ag.name}</option>)}
                    </select>
                  </div>
                </div>
                {(() => {
                  const rango = orders.filter(o => o.agencia_id && o.date >= agencyReportFrom && o.date <= agencyReportTo && (agencyReportId === "todas" || o.agencia_id === agencyReportId));
                  const totalValor = rango.reduce((s,o) => s+Number(o.price), 0);
                  const totalPrendas = rango.reduce((s,o) => s+Number(o.garments), 0);
                  const porAgencia = {};
                  rango.forEach(o => {
                    const key = o.agencia_id;
                    if (!porAgencia[key]) porAgencia[key] = { name: o.client_name, total: 0, garments: 0, count: 0 };
                    porAgencia[key].total += Number(o.price);
                    porAgencia[key].garments += Number(o.garments);
                    porAgencia[key].count += 1;
                  });
                  const agenciasList = Object.values(porAgencia).sort((a,b) => b.total - a.total);

                  const exportAgencias = () => {
                    const csv = [
                      ["# Orden","Agencia","Prendas","Servicio","Total","Fecha","Entrega","Estado"],
                      ...rango.map(o => [o.order_number||"", o.client_name, o.garments, getServiceLabel(o.service, services), Math.round(Number(o.price)), o.date, o.delivery_date||"", STATUS_LABELS[o.status]?.label||""]),
                      ["","","","","TOTAL", Math.round(totalValor), "", ""]
                    ].map(r => r.join(",")).join("\n");
                    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href = url; a.download = `agencias_${agencyReportFrom}_${agencyReportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };

                  return rango.length === 0
                    ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay órdenes de agencias en este rango de fechas</p>
                    : <>
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16 }}>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FF8A65" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#FF8A65" }}>${Math.round(totalValor).toLocaleString()}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Total facturado</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FFD54F" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#FFD54F" }}>{rango.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Órdenes</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #4FC3F7" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#4FC3F7" }}>{totalPrendas}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Prendas</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #66BB6A" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#66BB6A" }}>{agenciasList.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Agencias activas</div>
                          </div>
                        </div>

                        {agencyReportId === "todas" && agenciasList.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize:12,color:"#8B949E",fontWeight:600,marginBottom:8 }}>TOTAL A FACTURAR POR AGENCIA</div>
                            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12 }}>
                              {agenciasList.map((ag,i) => (
                                <div key={i} style={{ background:"#0D1117",borderRadius:10,padding:"12px 16px",borderLeft:"3px solid #FF8A65" }}>
                                  <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>{ag.name}</div>
                                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
                                    <span style={{ fontSize:11,color:"#8B949E" }}>{ag.count} orden{ag.count!==1?"es":""} · {ag.garments} prendas</span>
                                    <span style={{ fontWeight:800,fontSize:17,color:"#FF8A65" }}>${Math.round(ag.total).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                          <button onClick={exportAgencias} style={{ ...btn,background:"rgba(255,138,101,0.15)",color:"#FF8A65",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                        </div>}

                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>{["# Orden","Agencia","Prendas","Total","Fecha","Entrega","Estado"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {rango.map(o => (
                                <tr key={o.id} style={{ borderBottom:"1px solid #21262D" }}>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(255,138,101,0.15)",color:"#FF8A65",fontWeight:800,padding:"2px 8px",borderRadius:6 }}>{o.order_number||"—"}</span></td>
                                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{o.client_name}</td>
                                  <td style={{ padding:"10px 12px" }}>{o.garments}</td>
                                  <td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(Number(o.price)).toLocaleString()}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E" }}>{o.date}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E" }}>{o.delivery_date||"—"}</td>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:STATUS_LABELS[o.status]?.color+"22",color:STATUS_LABELS[o.status]?.color,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600 }}>{STATUS_LABELS[o.status]?.label}</span></td>
                                </tr>
                              ))}
                              <tr style={{ background:"#21262D",fontWeight:800 }}>
                                <td colSpan={3} style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td>
                                <td style={{ padding:"10px 12px",color:"#66BB6A" }}>${Math.round(totalValor).toLocaleString()}</td>
                                <td colSpan={3}></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>;
                })()}
              </div>

              {/* DOMICILIARIOS POR RANGO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#66BB6A" }}>🛵 Informe de Domiciliarios</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={domiciliarioReportFrom} onChange={e => setDomiciliarioReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={domiciliarioReportTo} onChange={e => setDomiciliarioReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DOMICILIARIO</label>
                    <select value={domiciliarioReportId} onChange={e => setDomiciliarioReportId(e.target.value)} style={{ ...inp, width: 180, fontSize: 13 }}>
                      <option value="todas" style={{ background:"#1a1a2e" }}>Todos los domiciliarios</option>
                      {domiciliarios.map(dm => <option key={dm.id} value={dm.id} style={{ background:"#1a1a2e" }}>{dm.name}</option>)}
                    </select>
                  </div>
                </div>
                {(() => {
                  const rango = orders.filter(o => o.domiciliario_id && o.date >= domiciliarioReportFrom && o.date <= domiciliarioReportTo && (domiciliarioReportId === "todas" || o.domiciliario_id === domiciliarioReportId));
                  const totalValor = rango.reduce((s,o) => s+Number(o.price), 0);
                  const totalPrendas = rango.reduce((s,o) => s+Number(o.garments), 0);
                  const porDomiciliario = {};
                  rango.forEach(o => {
                    const key = o.domiciliario_id;
                    if (!porDomiciliario[key]) porDomiciliario[key] = { name: o.client_name, total: 0, garments: 0, count: 0 };
                    porDomiciliario[key].total += Number(o.price);
                    porDomiciliario[key].garments += Number(o.garments);
                    porDomiciliario[key].count += 1;
                  });
                  const domiciliariosList = Object.values(porDomiciliario).sort((a,b) => b.total - a.total);

                  const exportDomiciliarios = () => {
                    const csv = [
                      ["# Orden","Domiciliario","Prendas","Servicio","Total","Fecha","Entrega","Estado"],
                      ...rango.map(o => [o.order_number||"", o.client_name, o.garments, getServiceLabel(o.service, services), Math.round(Number(o.price)), o.date, o.delivery_date||"", STATUS_LABELS[o.status]?.label||""]),
                      ["","","","","TOTAL", Math.round(totalValor), "", ""]
                    ].map(r => r.join(",")).join("\n");
                    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href = url; a.download = `domiciliarios_${domiciliarioReportFrom}_${domiciliarioReportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };

                  return rango.length === 0
                    ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay órdenes de domiciliarios en este rango de fechas</p>
                    : <>
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16 }}>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #66BB6A" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#66BB6A" }}>${Math.round(totalValor).toLocaleString()}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Total facturado</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FFD54F" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#FFD54F" }}>{rango.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Órdenes</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #4FC3F7" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#4FC3F7" }}>{totalPrendas}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Prendas</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FF8A65" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#FF8A65" }}>{domiciliariosList.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Domiciliarios activos</div>
                          </div>
                        </div>

                        {domiciliarioReportId === "todas" && domiciliariosList.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize:12,color:"#8B949E",fontWeight:600,marginBottom:8 }}>TOTAL A FACTURAR POR DOMICILIARIO</div>
                            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12 }}>
                              {domiciliariosList.map((dm,i) => (
                                <div key={i} style={{ background:"#0D1117",borderRadius:10,padding:"12px 16px",borderLeft:"3px solid #66BB6A" }}>
                                  <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>{dm.name}</div>
                                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
                                    <span style={{ fontSize:11,color:"#8B949E" }}>{dm.count} orden{dm.count!==1?"es":""} · {dm.garments} prendas</span>
                                    <span style={{ fontWeight:800,fontSize:17,color:"#66BB6A" }}>${Math.round(dm.total).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                          <button onClick={exportDomiciliarios} style={{ ...btn,background:"rgba(102,187,106,0.15)",color:"#66BB6A",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                        </div>}

                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>{["# Orden","Domiciliario","Prendas","Total","Fecha","Entrega","Estado"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {rango.map(o => (
                                <tr key={o.id} style={{ borderBottom:"1px solid #21262D" }}>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(102,187,106,0.15)",color:"#66BB6A",fontWeight:800,padding:"2px 8px",borderRadius:6 }}>{o.order_number||"—"}</span></td>
                                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{o.client_name}</td>
                                  <td style={{ padding:"10px 12px" }}>{o.garments}</td>
                                  <td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(Number(o.price)).toLocaleString()}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E" }}>{o.date}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E" }}>{o.delivery_date||"—"}</td>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:STATUS_LABELS[o.status]?.color+"22",color:STATUS_LABELS[o.status]?.color,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600 }}>{STATUS_LABELS[o.status]?.label}</span></td>
                                </tr>
                              ))}
                              <tr style={{ background:"#21262D",fontWeight:800 }}>
                                <td colSpan={3} style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td>
                                <td style={{ padding:"10px 12px",color:"#66BB6A" }}>${Math.round(totalValor).toLocaleString()}</td>
                                <td colSpan={3}></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>;
                })()}
              </div>

              {/* DOMICILIOS PROPIOS POR RANGO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#4FC3F7" }}>🛵 Domicilios Propios (recogidos en casa del cliente)</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8B949E" }}>Órdenes marcadas como "Recibido a domicilio"</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={domicilioReportFrom} onChange={e => setDomicilioReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={domicilioReportTo} onChange={e => setDomicilioReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                </div>
                {(() => {
                  const rango = orders.filter(o => o.a_domicilio && o.date >= domicilioReportFrom && o.date <= domicilioReportTo);
                  const totalValor = rango.reduce((s,o) => s+Number(o.price), 0);
                  const totalPrendas = rango.reduce((s,o) => s+Number(o.garments), 0);

                  const exportDomicilios = () => {
                    const csv = [
                      ["# Orden","Cliente","Dirección","Empleado","Prendas","Servicio","Total","Fecha","Entrega","Estado"],
                      ...rango.map(o => [o.order_number||"", o.client_name, `"${(o.address||"").replace(/"/g,'""')}"`, o.employee||"", o.garments, getServiceLabel(o.service, services), Math.round(Number(o.price)), o.date, o.delivery_date||"", STATUS_LABELS[o.status]?.label||""]),
                      ["","","","","","","TOTAL", Math.round(totalValor), "", ""]
                    ].map(r => r.join(",")).join("\n");
                    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href = url; a.download = `domicilios_propios_${domicilioReportFrom}_${domicilioReportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };

                  return rango.length === 0
                    ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay órdenes a domicilio en este rango de fechas</p>
                    : <>
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16 }}>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #4FC3F7" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#4FC3F7" }}>${Math.round(totalValor).toLocaleString()}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Total recaudado</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #FFD54F" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#FFD54F" }}>{rango.length}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Órdenes a domicilio</div>
                          </div>
                          <div style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #66BB6A" }}>
                            <div style={{ fontWeight:800,fontSize:18,color:"#66BB6A" }}>{totalPrendas}</div>
                            <div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>Prendas</div>
                          </div>
                        </div>

                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                          <button onClick={exportDomicilios} style={{ ...btn,background:"rgba(79,195,247,0.15)",color:"#4FC3F7",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                        </div>}

                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>{["# Orden","Cliente","Dirección","Empleado","Prendas","Total","Fecha","Estado"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {rango.map(o => (
                                <tr key={o.id} style={{ borderBottom:"1px solid #21262D" }}>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(79,195,247,0.15)",color:"#4FC3F7",fontWeight:800,padding:"2px 8px",borderRadius:6 }}>{o.order_number||"—"}</span></td>
                                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{o.client_name}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E",fontSize:12 }}>{o.address||"—"}</td>
                                  <td style={{ padding:"10px 12px",color:"#C792EA" }}>{o.employee||"—"}</td>
                                  <td style={{ padding:"10px 12px" }}>{o.garments}</td>
                                  <td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(Number(o.price)).toLocaleString()}</td>
                                  <td style={{ padding:"10px 12px",color:"#8B949E" }}>{o.date}</td>
                                  <td style={{ padding:"10px 12px" }}><span style={{ background:STATUS_LABELS[o.status]?.color+"22",color:STATUS_LABELS[o.status]?.color,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600 }}>{STATUS_LABELS[o.status]?.label}</span></td>
                                </tr>
                              ))}
                              <tr style={{ background:"#21262D",fontWeight:800 }}>
                                <td colSpan={5} style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td>
                                <td style={{ padding:"10px 12px",color:"#66BB6A" }}>${Math.round(totalValor).toLocaleString()}</td>
                                <td colSpan={2}></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>;
                })()}
              </div>

              {/* PAGOS POR MÉTODO */}
              <div style={{ ...card, marginTop: 20, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#C792EA" }}>💳 Pagos por Método — Rango de Fechas</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DESDE</label>
                    <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>HASTA</label>
                    <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 150, fontSize: 13 }} />
                  </div>
                </div>
                {(() => {
                  const entregadas = orders.filter(o => o.status === "entregado" && o.delivered_at >= reportFrom && o.delivered_at <= reportTo);
                  const metodos = [
                    { key: "efectivo", label: "💵 Efectivo", color: "#66BB6A" },
                    { key: "nequi", label: "📱 Nequi", color: "#C792EA" },
                    { key: "daviplata", label: "💜 Daviplata", color: "#667EEA" },
                    { key: "breb", label: "🔵 Bre-b", color: "#4FC3F7" },
                  ];
                  const totalesPorMetodo = metodos.map(m => ({
                    ...m,
                    total: entregadas.filter(o => (o.payment_method||"efectivo") === m.key).reduce((s,o) => s+Number(o.price), 0),
                    count: entregadas.filter(o => (o.payment_method||"efectivo") === m.key).length,
                  }));
                  const totalGeneral = totalesPorMetodo.reduce((s,m) => s+m.total, 0);

                  // Group by day for detail table
                  const byDay = {};
                  entregadas.forEach(o => {
                    const d = o.delivered_at;
                    if (!byDay[d]) byDay[d] = { efectivo:0, nequi:0, daviplata:0, breb:0, total:0 };
                    const m = o.payment_method||"efectivo";
                    byDay[d][m] = (byDay[d][m]||0) + Number(o.price);
                    byDay[d].total += Number(o.price);
                  });
                  const sortedDays = Object.keys(byDay).sort();

                  const exportPagos = () => {
                    const csv = [
                      ["Fecha","Efectivo","Nequi","Daviplata","Bre-b","Total"],
                      ...sortedDays.map(d => [d, Math.round(byDay[d].efectivo||0), Math.round(byDay[d].nequi||0), Math.round(byDay[d].daviplata||0), Math.round(byDay[d].breb||0), Math.round(byDay[d].total||0)]),
                      ["TOTAL", Math.round(totalesPorMetodo.find(m=>m.key==="efectivo")?.total||0), Math.round(totalesPorMetodo.find(m=>m.key==="nequi")?.total||0), Math.round(totalesPorMetodo.find(m=>m.key==="daviplata")?.total||0), Math.round(totalesPorMetodo.find(m=>m.key==="breb")?.total||0), Math.round(totalGeneral)]
                    ].map(r => r.join(",")).join("\n");
                    const blob = new Blob(["﻿"+csv], {type:"text/csv;charset=utf-8;"});
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href=url; a.download=`pagos_${reportFrom}_${reportTo}.csv`; a.click(); URL.revokeObjectURL(url);
                  };

                  return entregadas.length === 0
                    ? <p style={{ color:"#484F58",textAlign:"center",padding:32 }}>No hay entregas en este rango de fechas</p>
                    : <>
                        {/* KPIs por método */}
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16 }}>
                          {totalesPorMetodo.map(m => (
                            <div key={m.key} style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${m.color}` }}>
                              <div style={{ fontSize:13,color:"#8B949E",marginBottom:4 }}>{m.label}</div>
                              <div style={{ fontWeight:800,fontSize:18,color:m.color }}>${Math.round(m.total).toLocaleString()}</div>
                              <div style={{ fontSize:11,color:"#484F58",marginTop:2 }}>{m.count} entrega{m.count!==1?"s":""}</div>
                            </div>
                          ))}
                        </div>

                        {/* Total general */}
                        <div style={{ background:"rgba(199,146,234,0.08)",border:"1px solid rgba(199,146,234,0.3)",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <span style={{ fontWeight:600,color:"#8B949E" }}>Total recaudado en el período</span>
                          <span style={{ fontWeight:800,fontSize:20,color:"#C792EA" }}>${Math.round(totalGeneral).toLocaleString()}</span>
                        </div>

                        {isAdmin && <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:10 }}>
                          <button onClick={exportPagos} style={{ ...btn,background:"rgba(199,146,234,0.15)",color:"#C792EA",padding:"6px 14px",fontSize:12 }}>📥 Exportar Excel</button>
                        </div>}

                        {/* Tabla por día */}
                        {sortedDays.length > 0 && <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                            <thead><tr style={{ background:"#21262D" }}>
                              {["Fecha","💵 Efectivo","📱 Nequi","💜 Daviplata","🔵 Bre-b","Total"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                              {sortedDays.map(d => (
                                <tr key={d} style={{ borderBottom:"1px solid #21262D" }}>
                                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{d}</td>
                                  <td style={{ padding:"10px 12px",color:"#66BB6A",fontWeight:600 }}>{byDay[d].efectivo>0?`$${Math.round(byDay[d].efectivo).toLocaleString()}`:"—"}</td>
                                  <td style={{ padding:"10px 12px",color:"#C792EA",fontWeight:600 }}>{byDay[d].nequi>0?`$${Math.round(byDay[d].nequi).toLocaleString()}`:"—"}</td>
                                  <td style={{ padding:"10px 12px",color:"#667EEA",fontWeight:600 }}>{byDay[d].daviplata>0?`$${Math.round(byDay[d].daviplata).toLocaleString()}`:"—"}</td>
                                  <td style={{ padding:"10px 12px",color:"#4FC3F7",fontWeight:600 }}>{(byDay[d].breb||0)>0?`$${Math.round(byDay[d].breb).toLocaleString()}`:"—"}</td>
                                  <td style={{ padding:"10px 12px",fontWeight:800 }}>${Math.round(byDay[d].total).toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr style={{ background:"#21262D",fontWeight:800 }}>
                                <td style={{ padding:"10px 12px",color:"#FFD54F" }}>TOTAL</td>
                                <td style={{ padding:"10px 12px",color:"#66BB6A" }}>${Math.round(totalesPorMetodo.find(m=>m.key==="efectivo")?.total||0).toLocaleString()}</td>
                                <td style={{ padding:"10px 12px",color:"#C792EA" }}>${Math.round(totalesPorMetodo.find(m=>m.key==="nequi")?.total||0).toLocaleString()}</td>
                                <td style={{ padding:"10px 12px",color:"#667EEA" }}>${Math.round(totalesPorMetodo.find(m=>m.key==="daviplata")?.total||0).toLocaleString()}</td>
                                <td style={{ padding:"10px 12px",color:"#4FC3F7" }}>${Math.round(totalesPorMetodo.find(m=>m.key==="breb")?.total||0).toLocaleString()}</td>
                                <td style={{ padding:"10px 12px" }}>${Math.round(totalGeneral).toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>}
                      </>;
                })()}
              </div>

              {/* REVERSADAS */}
              <div style={{ ...card, marginTop: 20 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#FFD54F" }}>↩️ Órdenes Reversadas</h3>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8B949E" }}>Órdenes que estuvieron entregadas y fueron reversadas</p>
                <div style={{ marginBottom: 14, display: "flex", gap: 10 }}>
                  <input style={{ ...inp, maxWidth: 300 }} placeholder="🔍 Buscar por nombre, teléfono o # orden..." value={reversadasSearch} onChange={e => setReversadasSearch(e.target.value)} />
                  {reversadasSearch && <button onClick={() => setReversadasSearch("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "8px 12px", fontSize: 12 }}>✕</button>}
                </div>
                {(() => {
                  const q=reversadasSearch.toLowerCase();
                  const reversadas=orders.filter(o=>{ if(!o.reversada)return false; if(!q)return true; return o.client_name?.toLowerCase().includes(q)||o.phone?.includes(q)||o.order_number?.toLowerCase().includes(q); });
                  return reversadas.length===0
                    ?<div style={{ textAlign:"center",padding:32,color:"#484F58" }}><div style={{ fontSize:32,marginBottom:8 }}>↩️</div><div>{reversadasSearch?"No se encontraron con ese criterio":"No hay órdenes reversadas aún"}</div></div>
                    :<div style={{ overflowX:"auto" }}>
                        <div style={{ fontSize:13,color:"#8B949E",marginBottom:12 }}><strong style={{ color:"#FFD54F" }}>{reversadas.length}</strong> orden{reversadas.length!==1?"es":""} reversada{reversadas.length!==1?"s":""}</div>
                        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                          <thead><tr style={{ background:"#21262D" }}>{["# Orden","Cliente","Teléfono","Servicio","Total","Entregado por","Estado"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11 }}>{h}</th>)}</tr></thead>
                          <tbody>{reversadas.map(o=>(<tr key={o.id} style={{ borderBottom:"1px solid #21262D" }}><td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(255,213,79,0.15)",color:"#FFD54F",fontWeight:800,padding:"2px 8px",borderRadius:6 }}>{o.order_number||"—"}</span></td><td style={{ padding:"10px 12px",fontWeight:600 }}>{o.client_name}</td><td style={{ padding:"10px 12px",color:"#8B949E" }}>{o.phone}</td><td style={{ padding:"10px 12px" }}>{(o.service||"").split(",").map(sid=>{const sv=services.find(s=>s.id===sid.trim());return sv?<span key={sid} style={{ background:sv.color+"22",color:sv.color,padding:"1px 6px",borderRadius:10,fontSize:11,marginRight:3 }}>{sv.icon} {sv.label}</span>:null;})}</td><td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(Number(o.price))}</td><td style={{ padding:"10px 12px" }}>{o.delivered_by?<span style={{ color:"#C792EA",fontSize:12 }}>👤 {o.delivered_by}</span>:<span style={{ color:"#484F58",fontSize:12 }}>—</span>}</td><td style={{ padding:"10px 12px" }}><span style={{ background:"#66BB6A22",color:"#66BB6A",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600 }}>↩️ Reversada</span></td></tr>))}</tbody>
                        </table>
                      </div>;
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
                    <input type="date" value={inventoryFilter} onChange={e => setInventoryFilter(e.target.value)} style={{ ...inp, colorScheme: "dark", width: 160, fontSize: 13 }} />
                    {inventoryFilter && <button onClick={() => setInventoryFilter("")} style={{ ...btn, background: "rgba(255,255,255,0.05)", color: "#8B949E", padding: "6px 12px", fontSize: 12 }}>Ver todas</button>}
                    <select value={inventoryDaysFilter} onChange={e => setInventoryDaysFilter(e.target.value)} style={{ ...inp, width: 160, fontSize: 13 }}>
                      <option value="">Todos los días</option>
                      <option value="7">Más de 7 días</option>
                      <option value="30">Más de 30 días</option>
                      <option value="60">Más de 60 días</option>
                      <option value="90">Más de 90 días</option>
                    </select>
                    {isAdmin && <button onClick={() => {
                      const rows=orders.filter(o=>o.status!=="entregado"&&(!inventoryFilter||o.date===inventoryFilter));
                      const daysIn=r=>Math.floor((new Date()-new Date(r.date))/(1000*60*60*24));
                      const csv=[["# Orden","Cliente","Telefono","Servicio","Prendas","Valor","Estado","F. Ingreso","F. Entrega","Dias"],...rows.map(o=>[o.order_number||"",o.client_name,o.phone,getServiceLabel(o.service, services),o.garments,Math.round(Number(o.price)),STATUS_LABELS[o.status]?.label,o.date,o.delivery_date||"",daysIn(o)])].map(r=>r.join(",")).join("\n");
                      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`inventario_${today}.csv`; a.click(); URL.revokeObjectURL(url);
                    }} style={{ ...btn, background: "rgba(102,187,106,0.15)", color: "#66BB6A", padding: "6px 14px", fontSize: 12 }}>📥 Exportar Excel</button>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
                  {[{label:"Órdenes pendientes",value:orders.filter(o=>o.status!=="entregado"&&(!inventoryFilter||o.date===inventoryFilter)).length,color:"#4FC3F7"},{label:"Prendas en local",value:orders.filter(o=>o.status!=="entregado"&&(!inventoryFilter||o.date===inventoryFilter)).reduce((s,o)=>s+Number(o.garments),0),color:"#FFD54F"},{label:"Valor en inventario",value:`$${Math.round(orders.filter(o=>o.status!=="entregado"&&(!inventoryFilter||o.date===inventoryFilter)).reduce((s,o)=>s+Number(o.price),0))}`,color:"#66BB6A"},{label:"Listas para retiro",value:orders.filter(o=>o.status==="listo"&&(!inventoryFilter||o.date===inventoryFilter)).length,color:"#FF8A65"}].map((kpi,i)=>(
                    <div key={i} style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${kpi.color}` }}><div style={{ fontWeight:800,fontSize:18,color:kpi.color }}>{kpi.value}</div><div style={{ fontSize:11,color:"#8B949E",marginTop:2 }}>{kpi.label}</div></div>
                  ))}
                </div>
                {(() => {
                  const pendingOrders=orders.filter(o=>{ if(o.status==="entregado")return false; if(inventoryFilter&&o.date!==inventoryFilter)return false; if(inventoryDaysFilter){const d=Math.floor((new Date()-new Date(o.date))/(1000*60*60*24));if(Number(inventoryDaysFilter)>0&&d<Number(inventoryDaysFilter))return false;} return true; }).sort((a,b)=>new Date(a.delivery_date||"9999")-new Date(b.delivery_date||"9999"));
                  return pendingOrders.length===0
                    ?<div style={{ textAlign:"center",padding:32,color:"#484F58" }}><div style={{ fontSize:40,marginBottom:8 }}>✅</div><div>No hay prendas pendientes de retiro</div></div>
                    :<div style={{ overflowX:"auto" }}>
                        {/* Botones selección masiva */}
                        <div style={{ display:"flex",gap:10,marginBottom:10,flexWrap:"wrap",alignItems:"center" }}>
                          <button onClick={() => setSelectedInventory(pendingOrders.filter(o=>o.phone).map(o=>o.id))} style={{ ...btn,background:"rgba(37,211,102,0.15)",color:"#25D366",padding:"6px 12px",fontSize:12 }}>✅ Seleccionar todos</button>
                          <button onClick={() => setSelectedInventory(pendingOrders.filter(o=>o.status==="listo"&&o.phone).map(o=>o.id))} style={{ ...btn,background:"rgba(102,187,106,0.15)",color:"#66BB6A",padding:"6px 12px",fontSize:12 }}>🟢 Solo "Listo"</button>
                          {selectedInventory.length > 0 && <>
                            <button onClick={() => setSelectedInventory([])} style={{ ...btn,background:"rgba(255,255,255,0.05)",color:"#8B949E",padding:"6px 12px",fontSize:12 }}>✕ Limpiar</button>
                            <button onClick={() => {
                              const selected = pendingOrders.filter(o => selectedInventory.includes(o.id) && o.phone);
                              selected.forEach(o => {
                                const msg = waMensaje.replace("{nombre}", o.client_name).replace("{orden}", o.order_number||"");
                                window.open("https://wa.me/" + negocioPais + (o.phone||"").replace(/[^0-9]/g,"") + "?text=" + encodeURIComponent(msg), "_blank");
                              });
                            }} style={{ ...btn,background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff",padding:"6px 14px",fontSize:12,fontWeight:700 }}>
                              📱 Enviar WA a {selectedInventory.length} seleccionado{selectedInventory.length!==1?"s":""}
                            </button>
                          </>}
                        </div>
                        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                          <thead><tr style={{ background:"#21262D" }}>{["","# Orden","Cliente","Teléfono","Servicio","Prendas","Valor","Estado","F. Ingreso","F. Entrega","Días","📱"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",color:"#8B949E",fontWeight:600,fontSize:11,whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
                          <tbody>{pendingOrders.map(o=>{
                            const daysIn=Math.floor((new Date()-new Date(o.date))/(1000*60*60*24));
                            const isLate=o.delivery_date&&new Date(o.delivery_date)<new Date()&&o.status!=="entregado";
                            const isSelected = selectedInventory.includes(o.id);
                            return<tr key={o.id} style={{ borderBottom:"1px solid #21262D",background:isSelected?"rgba(37,211,102,0.05)":isLate?"rgba(239,83,80,0.05)":"transparent" }}>
                              <td style={{ padding:"10px 12px" }}>
                                {o.phone && <input type="checkbox" checked={isSelected} onChange={() => setSelectedInventory(prev => isSelected ? prev.filter(id=>id!==o.id) : [...prev,o.id])} style={{ width:16,height:16,accentColor:"#25D366",cursor:"pointer" }} />}
                              </td>
                              <td style={{ padding:"10px 12px" }}><span style={{ background:"rgba(79,195,247,0.15)",color:"#4FC3F7",fontWeight:800,padding:"2px 8px",borderRadius:6,fontSize:12 }}>{o.order_number||"—"}</span></td>
                              <td style={{ padding:"10px 12px",fontWeight:600 }}>{o.client_name}</td>
                              <td style={{ padding:"10px 12px",color:"#8B949E",fontSize:12 }}>{o.phone}</td>
                              <td style={{ padding:"10px 12px" }}><div style={{ display:"flex",flexWrap:"wrap",gap:3 }}>{(o.service||"").split(",").map(sid=>{const sv=services.find(s=>s.id===sid.trim());return sv?<span key={sid} style={{ background:sv.color+"22",color:sv.color,padding:"1px 6px",borderRadius:10,fontSize:11,whiteSpace:"nowrap" }}>{sv.icon} {sv.label}</span>:null;})}</div></td>
                              <td style={{ padding:"10px 12px",fontWeight:600,textAlign:"center" }}>{o.garments}</td>
                              <td style={{ padding:"10px 12px",fontWeight:700,color:"#66BB6A" }}>${Math.round(Number(o.price))}</td>
                              <td style={{ padding:"10px 12px" }}><span style={{ background:STATUS_LABELS[o.status]?.color+"22",color:STATUS_LABELS[o.status]?.color,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:"nowrap" }}>{STATUS_LABELS[o.status]?.label}</span></td>
                              <td style={{ padding:"10px 12px",color:"#8B949E",fontSize:12 }}>{o.date}</td>
                              <td style={{ padding:"10px 12px",fontSize:12 }}><span style={{ color:isLate?"#EF5350":"#FFD54F",fontWeight:isLate?700:400 }}>{isLate?"⚠️ ":"📅 "}{o.delivery_date||"—"}</span></td>
                              <td style={{ padding:"10px 12px",textAlign:"center" }}><span style={{ fontWeight:700,color:daysIn>7?"#EF5350":daysIn>3?"#FFD54F":"#8B949E",fontSize:13 }}>{daysIn}d</span></td>
                              <td style={{ padding:"8px 10px" }}>{o.phone&&o.status==="listo"&&(<a href={`https://wa.me/${negocioPais}${o.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(waMensaje.replace("{nombre}",o.client_name).replace("{orden}",o.order_number||""))}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp" style={{ ...btn,background:"rgba(37,211,102,0.15)",color:"#25D366",padding:"4px 8px",fontSize:11,textDecoration:"none",display:"inline-block",borderRadius:8,border:"1px solid rgba(37,211,102,0.3)" }}>📱 WA</a>)}</td>
                            </tr>;
                          })}</tbody>
                        </table>
                      </div>;
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
                  <input style={{ ...inp, flex: 1, fontSize: 16 }} placeholder="Ej: 3105604421 o S0001" value={reversarSearch} onChange={e => { setReversarSearch(e.target.value); setReversarResults(null); setReversarDone(false); }} onKeyDown={e => e.key === "Enter" && searchReversar()} />
                  <button onClick={searchReversar} style={{ ...btn, background: "linear-gradient(135deg,#FFD54F,#F57F17)", color: "#000", padding: "10px 24px", fontWeight: 800 }}>🔍 Buscar</button>
                </div>
              </div>
              {reversarResults !== null && reversarResults.length === 0 && <div style={{ ...card, textAlign: "center", padding: 32 }}><div style={{ fontSize: 40, marginBottom: 8 }}>😕</div><div style={{ fontWeight: 600, color: "#8B949E" }}>No se encontraron órdenes</div></div>}
              {reversarDone && <div style={{ ...card, textAlign: "center", padding: 24, border: "1px solid #66BB6A", marginBottom: 16 }}><div style={{ fontSize: 36, marginBottom: 6 }}>✅</div><div style={{ fontWeight: 800, fontSize: 16, color: "#66BB6A" }}>¡Acción realizada correctamente!</div></div>}
              {reversarResults !== null && reversarResults.length > 0 && (
                <div>{reversarResults.map(o => (
                  <div key={o.id} style={{ ...card, marginBottom: 12, borderLeft: `4px solid ${STATUS_LABELS[o.status]?.color||"#30363D"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ background: "rgba(79,195,247,0.15)", color: "#4FC3F7", fontWeight: 800, padding: "3px 10px", borderRadius: 6, fontSize: 13 }}>{o.order_number||"—"}</span>
                          <span style={{ background: STATUS_LABELS[o.status]?.color+"22", color: STATUS_LABELS[o.status]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[o.status]?.label}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{o.client_name}</div>
                        <div style={{ fontSize: 13, color: "#8B949E" }}>📞 {o.phone} · {getServiceLabel(o.service, services)} · {o.garments} prendas</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "#484F58" }}>
                          <span>📅 Ingreso: {o.date}</span>
                          {o.delivered_at && <span>✅ Entregado: {o.delivered_at}</span>}
                          {o.payment_method && <span>{o.payment_method==="nequi"?"📱 Nequi":o.payment_method==="daviplata"?"💜 Daviplata":"💵 Efectivo"}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontWeight: 800, fontSize: 22, color: "#66BB6A", marginBottom: 8 }}>${Math.round(Number(o.price))}</div>
                        <button onClick={() => confirmarReversar(o)} style={{ ...btn, background: o.status==="entregado"?"linear-gradient(135deg,#FFD54F,#F57F17)":"linear-gradient(135deg,#EF5350,#B71C1C)", color: o.status==="entregado"?"#000":"#fff", padding: "10px 18px", fontWeight: 800, fontSize: 13 }}>
                          {o.status==="entregado"?"↩️ Reversar":"🗑 Eliminar orden"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          {/* CONFIG */}
          {tab === "config" && (
            <div>
              <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800 }}>⚙️ Configuración</h2>
              {/* INFO DEL NEGOCIO */}
              <div style={{ ...card, marginBottom: 20, border: "1px solid rgba(79,195,247,0.3)" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#4FC3F7" }}>🏪 Información del Negocio</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8B949E" }}>Estos datos aparecen en el recibo y en la app</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>NOMBRE DEL NEGOCIO</label>
                    <input style={{ ...inp, borderColor: "rgba(79,195,247,0.3)" }} value={negocioNombre} onChange={e => setNegocioNombre(e.target.value)} placeholder="Ej: Lavanderías Shaddai" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>TELÉFONO</label>
                    <input style={{ ...inp }} value={negocioTelefono} onChange={e => setNegocioTelefono(e.target.value)} placeholder="Ej: 3105604421" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>CÓDIGO DE PAÍS (WhatsApp)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#8B949E", fontSize: 13 }}>+</span>
                      <input style={{ ...inp }} value={negocioPais} onChange={e => setNegocioPais(e.target.value.replace(/[^0-9]/g,""))} placeholder="57" maxLength={4} />
                    </div>
                    <div style={{ fontSize: 11, color: "#484F58", marginTop: 4 }}>Colombia = 57, México = 52, Venezuela = 58</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>🖨️ NOMBRE DE LA IMPRESORA (QZ Tray)</label>
                    <input style={{ ...inp, borderColor: "rgba(79,195,247,0.3)" }} value={nombreImpresora} onChange={e => setNombreImpresora(e.target.value)} placeholder="Ej: BIXOLON SRP-330II" />
                    <div style={{ fontSize: 11, color: "#484F58", marginTop: 4 }}>Debe coincidir exactamente con el nombre en Windows → Dispositivos e impresoras</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 4 }}>DIRECCIÓN</label>
                    <input style={{ ...inp }} value={negocioDireccion} onChange={e => setNegocioDireccion(e.target.value)} placeholder="Ej: Carrera 113 # 75-56" />
                  </div>
                </div>
                <div style={{ gridColumn: "span 2", marginTop: 4 }}>
                  <label style={{ fontSize: 11, color: "#8B949E", display: "block", marginBottom: 8 }}>LOGO DEL NEGOCIO</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {negocioLogo
                      ? <img src={negocioLogo} alt="logo" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: "1px solid #30363D" }} />
                      : <div style={{ width: 64, height: 64, borderRadius: 10, background: "#0D1117", border: "2px dashed #30363D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🫧</div>}
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setNegocioLogo(ev.target.result);
                          try { localStorage.setItem("negocioLogo", ev.target.result); } catch {}
                        };
                        reader.readAsDataURL(file);
                      }} style={{ display: "none" }} id="logoInput" />
                      <label htmlFor="logoInput" style={{ ...btn, background: "rgba(79,195,247,0.15)", color: "#4FC3F7", border: "1px solid rgba(79,195,247,0.3)", cursor: "pointer", display: "inline-block", fontSize: 12, padding: "8px 14px" }}>
                        📁 Subir logo
                      </label>
                      {negocioLogo && <button onClick={() => { setNegocioLogo(""); try { localStorage.removeItem("negocioLogo"); } catch {} }} style={{ ...btn, background: "rgba(239,83,80,0.15)", color: "#EF5350", fontSize: 12, padding: "8px 14px", marginLeft: 8 }}>🗑 Quitar</button>}
                      <div style={{ fontSize: 11, color: "#484F58", marginTop: 6 }}>PNG, JPG. Recomendado: cuadrado 200x200px</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label onClick={() => { setLogoEnRecibo(!logoEnRecibo); try { localStorage.setItem("logoEnRecibo", String(!logoEnRecibo)); } catch {} }} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:logoEnRecibo?"rgba(79,195,247,0.08)":"rgba(255,255,255,0.03)",border:`1px solid ${logoEnRecibo?"rgba(79,195,247,0.3)":"#30363D"}`,borderRadius:8,padding:"8px 12px" }}>
                      <input type="checkbox" checked={logoEnRecibo} onChange={() => {}} style={{ accentColor:"#4FC3F7" }} />
                      <span style={{ fontSize: 12, color: logoEnRecibo ? "#4FC3F7" : "#8B949E" }}>Mostrar logo en el recibo impreso</span>
                    </label>
                  </div>
                </div>
                <button onClick={async () => {
                  const ok = await checkClave("guardar");
                  if (!ok) return;
                  try { localStorage.setItem("negocioNombre", negocioNombre); localStorage.setItem("negocioDireccion", negocioDireccion); localStorage.setItem("negocioTelefono", negocioTelefono); localStorage.setItem("negocioPais", negocioPais); localStorage.setItem("nombreImpresora", nombreImpresora); } catch {}
                  alert("✅ Información guardada");
                }} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", marginTop: 14, width: "100%" }}>
                  💾 Guardar información
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#4FC3F7" }}>👕 Tipos de Prenda</h3>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input style={{ ...inp, flex: 1 }} placeholder="Nueva prenda..." value={newGarment} onChange={e => setNewGarment(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&newGarment.trim()){saveGarmentTypes([...garmentTypes,newGarment.trim()]);setNewGarment("");} }} />
                    <button onClick={() => { if(newGarment.trim()){saveGarmentTypes([...garmentTypes,newGarment.trim()]);setNewGarment("");} }} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: "10px 16px" }}>+ Agregar</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 350, overflowY: "auto" }}>
                    {garmentTypes.map((g,i) => <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0D1117",borderRadius:8,padding:"8px 12px" }}>
                      <span>{GARMENT_ICONS[g]||"👕"} {g}</span>
                      <button onClick={() => { if(window.confirm(`¿Eliminar "${g}"?`))saveGarmentTypes(garmentTypes.filter((_,idx)=>idx!==i)); }} style={{ background:"rgba(239,83,80,0.15)",color:"#EF5350",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer" }}>✕</button>
                    </div>)}
                  </div>
                  <button onClick={() => { if(window.confirm("¿Restaurar lista por defecto?"))saveGarmentTypes(DEFAULT_GARMENT_TYPES); }} style={{ marginTop:12,width:"100%",padding:8,borderRadius:8,border:"1px solid #30363D",background:"transparent",color:"#8B949E",cursor:"pointer",fontSize:12 }}>🔄 Restaurar por defecto</button>
                </div>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#C792EA" }}>🎨 Colores</h3>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input style={{ ...inp, flex: 1 }} placeholder="Nuevo color..." value={newColor} onChange={e => setNewColor(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&newColor.trim()){saveColors([...colors,newColor.trim()]);setNewColor("");} }} />
                    <button onClick={() => { if(newColor.trim()){saveColors([...colors,newColor.trim()]);setNewColor("");} }} style={{ ...btn, background: "linear-gradient(135deg,#C792EA,#9B59B6)", color: "#fff", padding: "10px 16px" }}>+ Agregar</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 350, overflowY: "auto" }}>
                    {colors.map((c,i) => <div key={i} style={{ display:"flex",alignItems:"center",gap:4,background:"rgba(199,146,234,0.1)",border:"1px solid rgba(199,146,234,0.3)",borderRadius:20,padding:"4px 10px" }}>
                      <span style={{ fontSize:13,color:"#C792EA" }}>🎨 {c}</span>
                      <button onClick={() => { if(window.confirm(`¿Eliminar "${c}"?`))saveColors(colors.filter((_,idx)=>idx!==i)); }} style={{ background:"none",color:"#EF5350",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,padding:"0 2px" }}>×</button>
                    </div>)}
                  </div>
                  <button onClick={() => { if(window.confirm("¿Restaurar colores por defecto?"))saveColors(DEFAULT_COLORS); }} style={{ marginTop:12,width:"100%",padding:8,borderRadius:8,border:"1px solid #30363D",background:"transparent",color:"#8B949E",cursor:"pointer",fontSize:12 }}>🔄 Restaurar por defecto</button>
                </div>
              </div>
              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#FF8A65" }}>⚠️ Condiciones de prendas</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Nueva condición... ej: Quemado" value={newCondition} onChange={e => setNewCondition(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&newCondition.trim()){saveConditions([...conditions,newCondition.trim()]);setNewCondition("");} }} />
                  <button onClick={() => { if(newCondition.trim()){saveConditions([...conditions,newCondition.trim()]);setNewCondition("");} }} style={{ ...btn, background: "linear-gradient(135deg,#FF8A65,#E64A19)", color: "#fff", padding: "10px 16px" }}>+ Agregar</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {conditions.map((c,i) => {
                    const colorsArr=["#FFD54F","#EF5350","#FF8A65","#C792EA","#4FC3F7","#66BB6A","#F06292","#FFB74D"];
                    const color=colorsArr[i%colorsArr.length];
                    const isDefault=["Decolorado","Percudido","Roto","Manchado"].includes(c);
                    return <div key={i} style={{ display:"flex",alignItems:"center",gap:6,background:color+"15",border:`1px solid ${color}40`,borderRadius:20,padding:"6px 12px" }}>
                      <span style={{ fontSize:13,color:color,fontWeight:600 }}>{c}</span>
                      {!isDefault&&<button onClick={()=>{if(window.confirm(`¿Eliminar "${c}"?`))saveConditions(conditions.filter((_,idx)=>idx!==i));}} style={{ background:"none",color:"#EF5350",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,padding:"0 2px" }}>×</button>}
                      {isDefault&&<span style={{ fontSize:10,color:color,opacity:0.6 }}>●</span>}
                    </div>;
                  })}
                </div>
                <div style={{ fontSize:11,color:"#484F58",marginTop:10 }}>● Las condiciones base (Decolorado, Percudido, Roto, Manchado) no se pueden eliminar</div>
              </div>
              {/* SERVICIOS */}
              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#C792EA" }}>🧺 Servicios</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8B949E" }}>Personaliza los servicios que aparecen al crear una orden</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {services.map((sv, i) => (
                    <div key={sv.id} style={{ display:"flex",alignItems:"center",gap:10,background:"#0D1117",borderRadius:10,padding:"10px 14px",border:`1px solid ${sv.color}33` }}>
                      <span style={{ fontSize:20 }}>{sv.icon}</span>
                      <div style={{ flex:1 }}>
                        <input value={sv.label} onChange={e => {
                          const updated = services.map((s,idx) => idx===i ? {...s, label: e.target.value} : s);
                          saveServices(updated);
                        }} style={{ ...inp, padding:"6px 10px", fontSize:13, width:"100%", borderColor: sv.color+"55" }} />
                      </div>
                      <div style={{ display:"flex",gap:6 }}>
                        {["💧","🔥","🎨","💨","✂️","👒","🧤","🌿"].map(ico => (
                          <button key={ico} onClick={() => { const updated=services.map((s,idx)=>idx===i?{...s,icon:ico}:s); saveServices(updated); }}
                            style={{ background:sv.icon===ico?"rgba(199,146,234,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${sv.icon===ico?"#C792EA":"#30363D"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:14 }}>{ico}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { if(window.confirm("¿Restaurar servicios por defecto?")) saveServices(DEFAULT_SERVICES); }} style={{ marginTop:12,width:"100%",padding:8,borderRadius:8,border:"1px solid #30363D",background:"transparent",color:"#8B949E",cursor:"pointer",fontSize:12 }}>🔄 Restaurar por defecto</button>
              </div>

              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#66BB6A" }}>💰 Precios por defecto de prendas</h3>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#8B949E" }}>Selecciona un servicio y asigna el precio por prenda. Al crear una orden se llenará automáticamente.</p>
                <p style={{ margin: "0 0 14px", fontSize: 11, color: "#484F58" }}>El precio por servicio tiene prioridad sobre el precio general.</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {services.map(sv => (
                    <button key={sv.id} onClick={() => setConfigServiceTab(sv.id)} style={{ ...btn, background: configServiceTab===sv.id ? sv.color+"33" : "rgba(255,255,255,0.04)", color: configServiceTab===sv.id ? sv.color : "#8B949E", border: `1.5px solid ${configServiceTab===sv.id ? sv.color : "#30363D"}`, padding: "6px 14px", fontSize: 12 }}>
                      {sv.icon} {sv.label}
                    </button>
                  ))}
                  <button onClick={() => setConfigServiceTab("general")} style={{ ...btn, background: configServiceTab==="general" ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.04)", color: configServiceTab==="general" ? "#66BB6A" : "#8B949E", border: `1.5px solid ${configServiceTab==="general" ? "#66BB6A" : "#30363D"}`, padding: "6px 14px", fontSize: 12 }}>
                    🏷️ General
                  </button>
                </div>
                {configServiceTab === "general" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                    {garmentTypes.map(g => <div key={g} style={{ display:"flex",alignItems:"center",gap:8,background:"#0D1117",borderRadius:8,padding:"8px 12px" }}>
                      <span style={{ fontSize:13,flex:1 }}>{GARMENT_ICONS[g]||"👕"} {g}</span>
                      <input type="number" placeholder="Precio" value={precioDefaults[g]||""} onChange={e => { const val=e.target.value; const updated={...precioDefaults,[g]:val?Number(val):undefined}; if(!val)delete updated[g]; setPrecioDefaults(updated); try{localStorage.setItem("precioDefaults",JSON.stringify(updated));}catch{} }} style={{ width:90,padding:"4px 8px",borderRadius:6,border:"1px solid #30363D",background:"#161B22",color:"#66BB6A",fontSize:13,fontWeight:700,textAlign:"right" }} />
                    </div>)}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                    {garmentTypes.map(g => {
                      const val = precioByService[configServiceTab]?.[g] || "";
                      return <div key={g} style={{ display:"flex",alignItems:"center",gap:8,background:"#0D1117",borderRadius:8,padding:"8px 12px" }}>
                        <span style={{ fontSize:13,flex:1 }}>{GARMENT_ICONS[g]||"👕"} {g}</span>
                        <input type="number" placeholder={precioDefaults[g]||"Precio"} value={val} onChange={e => {
                          const newVal = e.target.value;
                          const updated = { ...precioByService, [configServiceTab]: { ...(precioByService[configServiceTab]||{}), [g]: newVal ? Number(newVal) : undefined } };
                          if (!newVal) delete updated[configServiceTab][g];
                          setPrecioByService(updated);
                          try { localStorage.setItem("precioByService", JSON.stringify(updated)); } catch {}
                        }} style={{ width:90,padding:"4px 8px",borderRadius:6,border:"1px solid #30363D",background:"#161B22",color:"#66BB6A",fontSize:13,fontWeight:700,textAlign:"right" }} />
                      </div>;
                    })}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, color: "#FFD54F" }}>👥 Usuarios y Turnos</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
                  <div>
                    <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#8B949E", fontWeight: 600 }}>USUARIOS REGISTRADOS</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {employees.map(e => <div key={e.id} style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",border:`1px solid ${e.id===user.id?"#4FC3F7":"#21262D"}` }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <div>
                            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                              <span style={{ fontWeight:700,fontSize:15 }}>{e.name}</span>
                              {e.id===user.id&&<span style={{ fontSize:10,background:"rgba(79,195,247,0.15)",color:"#4FC3F7",padding:"1px 7px",borderRadius:10 }}>Tú</span>}
                            </div>
                            <div style={{ display:"flex",gap:8 }}>
                              <span style={{ fontSize:11,background:e.role==="admin"?"rgba(255,213,79,0.15)":"rgba(255,255,255,0.05)",color:e.role==="admin"?"#FFD54F":"#8B949E",padding:"2px 8px",borderRadius:10 }}>{e.role==="admin"?"👑 Admin":"👤 Empleado"}</span>
                              <span style={{ fontSize:11,background:"rgba(102,187,106,0.1)",color:"#66BB6A",padding:"2px 8px",borderRadius:10 }}>🕐 {e.turno||"mañana"}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex",gap:6 }}>
                            <button onClick={()=>setEditingEmployee({...e})} title="Editar" style={{ ...btn,background:"rgba(79,195,247,0.15)",color:"#4FC3F7",padding:"5px 10px",fontSize:12 }}>✏️</button>
                            {e.id!==user.id&&<button onClick={()=>deleteEmployee(e.id)} title="Eliminar" title="Eliminar" style={{ ...btn,background:"rgba(239,83,80,0.15)",color:"#EF5350",padding:"5px 10px",fontSize:12 }}>🗑</button>}
                          </div>
                        </div>
                      </div>)}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#8B949E", fontWeight: 600 }}>NUEVO USUARIO</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={inp} placeholder="Nombre del empleado" value={newEmployee.name} onChange={e=>setNewEmployee(p=>({...p,name:e.target.value}))} /></div>
                      <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>PIN (4-6 dígitos)</label><input style={inp} type="password" placeholder="••••" maxLength={6} value={newEmployee.pin} onChange={e=>setNewEmployee(p=>({...p,pin:e.target.value}))} /></div>
                      <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>ROL</label><select style={inp} value={newEmployee.role} onChange={e=>setNewEmployee(p=>({...p,role:e.target.value}))}><option value="employee" style={{ background:"#1a1a2e" }}>👤 Empleado</option><option value="admin" style={{ background:"#1a1a2e" }}>👑 Administrador</option></select></div>
                      <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>TURNO</label><select style={inp} value={newEmployee.turno} onChange={e=>setNewEmployee(p=>({...p,turno:e.target.value}))}><option value="mañana" style={{ background:"#1a1a2e" }}>🌅 Mañana</option><option value="tarde" style={{ background:"#1a1a2e" }}>🌆 Tarde</option><option value="noche" style={{ background:"#1a1a2e" }}>🌙 Noche</option><option value="completo" style={{ background:"#1a1a2e" }}>⏰ Día completo</option></select></div>
                      <button onClick={addEmployee} disabled={!newEmployee.name||!newEmployee.pin} style={{ ...btn,background:"linear-gradient(135deg,#FFD54F,#F57F17)",color:"#000",padding:12,fontWeight:800,opacity:!newEmployee.name||!newEmployee.pin?0.5:1 }}>+ Crear Usuario</button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, ...card }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#4FC3F7" }}>🖨️ Texto del Recibo</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8B949E" }}>Personaliza los textos que aparecen en el recibo impreso</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 6, fontWeight: 600 }}>MENSAJE DE WHATSAPP 📱</label>
                    <p style={{ fontSize: 11, color: "#484F58", marginBottom: 8 }}>Usa <strong style={{color:"#25D366"}}>{"{nombre}"}</strong> para el nombre del cliente y <strong style={{color:"#25D366"}}>{"{orden}"}</strong> para el número de orden</p>
                    <textarea value={waMensaje} onChange={e => setWaMensaje(e.target.value)} style={{ ...inp, height: 90, resize: "vertical", fontSize: 12, lineHeight: 1.5, borderColor: "rgba(37,211,102,0.3)" }} />
                    <button onClick={async()=>{const ok=await checkClave("guardar");if(!ok)return;try{localStorage.setItem("waMensaje",waMensaje);}catch{}alert("✅ Mensaje guardado");}} style={{ ...btn, background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)", padding: "8px 16px", marginTop: 8, fontSize: 12 }}>💾 Guardar mensaje</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 6, fontWeight: 600 }}>SUBTÍTULO (debajo de la dirección)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input style={{ ...inp, flex: 1 }} value={reciboSubtitulo} onChange={e => setReciboSubtitulo(e.target.value)} placeholder="Ej: PRENDAS EL DIA INDICADO DESPUES DE LAS 5" />
                      <button onClick={async()=>{const ok=await checkClave("guardar");if(!ok)return;try{localStorage.setItem("reciboSubtitulo",reciboSubtitulo);}catch{}alert("✅ Guardado");}} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: "10px 16px", whiteSpace: "nowrap" }}>Guardar</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#8B949E", display: "block", marginBottom: 6, fontWeight: 600 }}>TEXTO LEGAL (al final del recibo)</label>
                    <textarea value={reciboLegal} onChange={e => setReciboLegal(e.target.value)} style={{ ...inp, height: 120, resize: "vertical", fontSize: 12, lineHeight: 1.5 }} />
                    <button onClick={async()=>{const ok=await checkClave("guardar");if(!ok)return;try{localStorage.setItem("reciboLegal",reciboLegal);}catch{}alert("✅ Guardado");}} style={{ ...btn, background: "linear-gradient(135deg,#4FC3F7,#0288D1)", color: "#fff", padding: "10px 16px", marginTop: 8, width: "100%" }}>💾 Guardar texto legal</button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, ...card }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#FFD54F" }}>🔑 Clave de Administrador</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#8B949E" }}>Cambia la clave que protege las acciones importantes</p>
                  </div>
                  <button onClick={() => setShowCambiarClave(!showCambiarClave)} style={{ ...btn, background: showCambiarClave?"rgba(255,213,79,0.2)":"rgba(255,255,255,0.05)", color: "#FFD54F", border: "1px solid rgba(255,213,79,0.3)", padding: "8px 16px", fontSize: 12 }}>
                    {showCambiarClave ? "✕ Cancelar" : "🔑 Cambiar clave"}
                  </button>
                </div>
                {showCambiarClave && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>CLAVE ACTUAL</label><input type="password" style={{ ...inp, maxWidth: 300 }} placeholder="••••" value={claveActual} onChange={e=>setClaveActual(e.target.value)} /></div>
                    <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>NUEVA CLAVE</label><input type="password" style={{ ...inp, maxWidth: 300 }} placeholder="••••" value={claveNueva} onChange={e=>setClaveNueva(e.target.value)} /></div>
                    <div><label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>CONFIRMAR NUEVA CLAVE</label><input type="password" style={{ ...inp, maxWidth: 300 }} placeholder="••••" value={claveConfirm} onChange={e=>setClaveConfirm(e.target.value)} /></div>
                    <button onClick={async()=>{
                      if(claveNueva.length<4){alert("❌ La nueva clave debe tener al menos 4 caracteres");return;}
                      if(claveNueva!==claveConfirm){alert("❌ Las claves nuevas no coinciden");return;}
                      const claveDB=await getClave();
                      if(claveActual!==claveDB){alert("❌ La clave actual es incorrecta");return;}
                      await fetch(`${SUPABASE_URL}/rest/v1/config?key=eq.admin_clave`,{method:"PATCH",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({value:claveNueva})});
                      setClaveActual("");setClaveNueva("");setClaveConfirm("");setShowCambiarClave(false);
                      alert("✅ Clave cambiada correctamente");
                    }} style={{ ...btn, background: "linear-gradient(135deg,#FFD54F,#F57F17)", color: "#000", padding: 12, fontWeight: 800, maxWidth: 300 }}>💾 Guardar nueva clave</button>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 20, ...card, border: "1px solid rgba(239,83,80,0.4)" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#EF5350" }}>⚠️ Zona de Peligro</h3>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "#8B949E" }}>Acciones irreversibles. Se requiere clave para ejecutar.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
                  <div style={{ background:"#0D1117",borderRadius:12,padding:20,border:"1px solid #21262D" }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>🔢</div>
                    <div style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>Consecutivo de recibos</div>
                    <div style={{ fontSize:13,color:"#8B949E",marginBottom:12 }}>Elige desde qué número quieres que empiece el consecutivo. Las órdenes existentes no se borran.</div>
                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>NÚMERO DE INICIO (ej: 68957)</label>
                      <input type="number" min={1} placeholder="Ej: 68957" value={nuevoConsecutivo} onChange={e => setNuevoConsecutivo(e.target.value)} style={{ ...inp, fontSize:15, fontWeight:700, borderColor:"rgba(239,83,80,0.3)" }} />
                      {nuevoConsecutivo && <div style={{ fontSize:11,color:"#8B949E",marginTop:4 }}>La próxima orden será: <strong style={{ color:"#4FC3F7" }}>S{String(Number(nuevoConsecutivo)).padStart(6,"0")}</strong></div>}
                    </div>
                    <button onClick={async () => {
                      if (!nuevoConsecutivo || Number(nuevoConsecutivo) < 1) { alert("Ingresa un número válido"); return; }
                      const clave = await getClave();
                      const pwd = prompt("Clave para cambiar consecutivo:");
                      if (pwd !== clave) { if (pwd !== null) alert("❌ Clave incorrecta"); return; }
                      if (!window.confirm(`¿Iniciar el consecutivo en S${String(Number(nuevoConsecutivo)).padStart(6,"0")}?`)) return;
                      await fetch(`${SUPABASE_URL}/rest/v1/rpc/reset_order_seq`, {
                        method: "POST",
                        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({})
                      });
                      // Advance sequence to desired number
                      const target = Number(nuevoConsecutivo) - 1;
                      if (target > 0) {
                        await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_order_seq`, {
                          method: "POST",
                          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
                          body: JSON.stringify({ val: target })
                        });
                      }
                      alert(`✅ Consecutivo actualizado. La próxima orden será S${String(Number(nuevoConsecutivo)).padStart(6,"0")}.`);
                      setNuevoConsecutivo("");
                    }} disabled={!nuevoConsecutivo} style={{ ...btn,background:"rgba(239,83,80,0.15)",color:"#EF5350",border:"1px solid rgba(239,83,80,0.3)",width:"100%",padding:10,fontSize:13,opacity:!nuevoConsecutivo?0.5:1 }}>
                      🔢 Aplicar consecutivo
                    </button>
                    <button onClick={resetOrderCounter} style={{ ...btn,background:"transparent",color:"#484F58",border:"1px solid #21262D",width:"100%",padding:8,fontSize:12,marginTop:8 }}>
                      Reiniciar desde S0001
                    </button>
                  </div>
                  <div style={{ background:"#0D1117",borderRadius:12,padding:20,border:"1px solid #21262D" }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>👤</div>
                    <div style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>Eliminar todos los clientes</div>
                    <div style={{ fontSize:13,color:"#8B949E",marginBottom:16 }}>Borra toda la base de datos de clientes. Las órdenes no se eliminan.</div>
                    <button onClick={deleteAllClients} style={{ ...btn,background:"rgba(239,83,80,0.15)",color:"#EF5350",border:"1px solid rgba(239,83,80,0.3)",width:"100%",padding:10,fontSize:13 }}>🗑 Eliminar todos los clientes</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODALS */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#161B22",borderRadius:16,padding:28,width:460,maxWidth:"92vw",border:"1px solid #30363D",maxHeight:"90vh",overflowY:"auto" }}>

            {modal === "newOrder" && (
              <>
                <h3 style={{ margin:"0 0 20px",fontSize:18 }}>➕ Nueva Orden</h3>
                {newOrder.agencia_id && <div style={{ background:"rgba(255,138,101,0.1)",border:"1px solid rgba(255,138,101,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:13,color:"#FF8A65",display:"flex",alignItems:"center",gap:6 }}>🏢 Orden para agencia: <b>{newOrder.client_name}</b></div>}
                {newOrder.domiciliario_id && <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:13,color:"#66BB6A",display:"flex",alignItems:"center",gap:6 }}>🛵 Orden para domiciliario: <b>{newOrder.client_name}</b></div>}
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div style={{ position:"relative" }}>
                    <label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label>
                    <input style={{ ...inp,borderColor:clients.find(c=>c.phone===newOrder.phone)?"#66BB6A":"#30363D" }} placeholder="Escribe el teléfono..." value={newOrder.phone} onChange={e=>setNewOrder(p=>({...p,phone:e.target.value,client_name:""}))} onKeyDown={e=>{if(e.key==="Enter"){const f=clients.find(c=>c.phone===newOrder.phone);if(f)setNewOrder(p=>({...p,client_name:f.name}));}}} />
                    {newOrder.phone.length>=3&&(()=>{ const matches=clients.filter(c=>c.phone.includes(newOrder.phone)&&c.phone!==newOrder.phone); return matches.length>0?<div style={{ position:"absolute",top:"100%",left:0,right:0,background:"#1C2128",border:"1px solid #30363D",borderRadius:8,zIndex:50,overflow:"hidden",marginTop:2 }}>{matches.slice(0,4).map(c=><div key={c.id} onClick={()=>setNewOrder(p=>({...p,phone:c.phone,client_name:c.name}))} style={{ padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #21262D" }} onMouseEnter={e=>e.currentTarget.style.background="#21262D"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{ fontWeight:600 }}>{c.name}</span><span style={{ color:"#8B949E",fontSize:12 }}>{c.phone}</span></div>)}</div>:null; })()}
                    {clients.find(c=>c.phone===newOrder.phone)&&!newOrder.client_name&&<div style={{ marginTop:6,background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center" }}><span style={{ fontSize:13 }}>👤 {clients.find(c=>c.phone===newOrder.phone)?.name}</span><button onClick={()=>setNewOrder(p=>({...p,client_name:clients.find(c=>c.phone===p.phone)?.name||""}))} style={{ ...btn,background:"#66BB6A",color:"#fff",padding:"4px 10px",fontSize:12 }}>↵ Seleccionar</button></div>}
                  </div>
                  <div>
                    <label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE DEL CLIENTE</label>
                    <input style={{ ...inp,background:newOrder.client_name&&clients.find(c=>c.phone===newOrder.phone)?"rgba(102,187,106,0.08)":"#0D1117",borderColor:newOrder.client_name&&clients.find(c=>c.phone===newOrder.phone)?"#66BB6A":"#30363D" }} placeholder={newOrder.phone&&!clients.find(c=>c.phone===newOrder.phone)?"Cliente nuevo — escribe el nombre":"Nombre del cliente"} value={newOrder.client_name} onChange={e=>setNewOrder(p=>({...p,client_name:e.target.value}))} />
                    {newOrder.phone&&!clients.find(c=>c.phone===newOrder.phone)&&newOrder.client_name&&<div style={{ fontSize:11,color:"#FFD54F",marginTop:4 }}>⚡ Cliente nuevo — se creará automáticamente</div>}
                    {newOrder.client_name&&clients.find(c=>c.phone===newOrder.phone)&&<div style={{ fontSize:11,color:"#66BB6A",marginTop:4 }}>✅ Cliente existente</div>}
                  </div>
                  {(()=>{ const pendientes=orders.filter(o=>o.phone===newOrder.phone&&(o.status==="listo"||o.status==="en_proceso"||o.status==="recibido")); return pendientes.length>0?<div style={{ background:"rgba(255,213,79,0.08)",border:"1px solid rgba(255,213,79,0.4)",borderRadius:10,padding:"12px 14px" }}><div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}><span style={{ fontSize:16 }}>⚠️</span><span style={{ fontWeight:700,color:"#FFD54F",fontSize:13 }}>Tiene {pendientes.length} orden{pendientes.length>1?"es":""} pendiente{pendientes.length>1?"s":""} por recoger</span></div>{pendientes.map(p=><div key={p.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,213,79,0.15)" }}><div><span style={{ fontWeight:700,color:"#4FC3F7",fontSize:13 }}>{p.order_number||"—"}</span><span style={{ color:"#8B949E",fontSize:12 }}> · {getServiceLabel(p.service)} · {p.garments} prendas</span></div><div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ fontWeight:700,color:"#66BB6A",fontSize:13 }}>${Math.round(Number(p.price))}</span><span style={{ fontSize:11,background:STATUS_LABELS[p.status]?.color+"22",color:STATUS_LABELS[p.status]?.color,padding:"2px 8px",borderRadius:20 }}>{STATUS_LABELS[p.status]?.label}</span></div></div>)}<div style={{ display:"flex",justifyContent:"space-between",marginTop:8 }}><span style={{ fontSize:12,color:"#8B949E" }}>Total pendiente</span><span style={{ fontWeight:800,color:"#FFD54F",fontSize:15 }}>${Math.round(pendientes.reduce((s,p)=>s+Number(p.price),0))}</span></div></div>:null; })()}
                  <div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                      <label style={{ fontSize:12,color:"#8B949E",fontWeight:600 }}>PRENDAS</label>
                      <button onClick={addItem} style={{ ...btn,background:"rgba(79,195,247,0.15)",color:"#4FC3F7",padding:"4px 10px",fontSize:12 }}>+ Agregar</button>
                    </div>
                    <div className="lv-item-grid lv-item-header" style={{ marginBottom:4 }}>{["Tipo de prenda","Cant.","Precio c/u","Colores",""].map((h,i)=><div key={i} style={{ fontSize:10,color:"#484F58",fontWeight:600 }}>{h}</div>)}</div>
                    {items.map((item,i) => (
                      <div key={i} style={{ marginBottom:10,background:"rgba(255,255,255,0.02)",borderRadius:10,padding:10,border:"1px solid #21262D" }}>
                        <div style={{ display:"flex",gap:4,marginBottom:8 }}>{services.map(sv=>{ const sel=item.service===sv.id; return <label key={sv.id} onClick={()=>updateItem(i,"service",sv.id)} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",fontSize:10,fontWeight:600,background:sel?sv.color+"22":"rgba(255,255,255,0.03)",border:`1.5px solid ${sel?sv.color:"#30363D"}`,borderRadius:6,padding:"4px 2px",color:sel?sv.color:"#484F58",userSelect:"none" }}>{sv.icon} {sv.label}</label>; })}</div>
                        <div className="lv-item-grid" style={{ alignItems:"center",marginBottom:8 }}>
                          <select value={item.garment_type} onChange={e=>updateItem(i,"garment_type",e.target.value)} style={{ ...inp,padding:"8px 10px" }}>{garmentTypes.map(g=><option key={g} value={g} style={{ background:"#1a1a2e" }}>{GARMENT_ICONS[g]||"👕"} {g}</option>)}</select>
                          <input type="number" min={1} placeholder="Cant." value={item.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} style={{ ...inp,padding:"8px 6px",textAlign:"center" }} />
                          <input type="number" min={0} placeholder="0" value={item.price} onChange={e=>updateItem(i,"price",e.target.value)} style={{ ...inp,padding:"8px 6px" }} />
                          <div style={{ position:"relative" }}>
                            {(item.colors||[]).length>0&&<div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:3 }}>{(item.colors||[]).map((c,ci)=><span key={ci} style={{ fontSize:10,background:"rgba(199,146,234,0.2)",color:"#C792EA",border:"1px solid rgba(199,146,234,0.4)",borderRadius:10,padding:"1px 6px",display:"flex",alignItems:"center",gap:2 }}>{c}<span onMouseDown={()=>updateItem(i,"colors",(item.colors||[]).filter((_,idx)=>idx!==ci))} style={{ cursor:"pointer",color:"#EF5350",fontWeight:700 }}>×</span></span>)}</div>}
                            {(item.colors||[]).length>0&&(item.colors||[]).length<Number(item.quantity)&&<div style={{ fontSize:10,color:"#FFD54F",marginBottom:2 }}>⚠️ Faltan {Number(item.quantity)-(item.colors||[]).length} color{Number(item.quantity)-(item.colors||[]).length>1?"es":""}</div>}
                            {(item.colors||[]).length>=Number(item.quantity)&&Number(item.quantity)>0
                              ?<div style={{ fontSize:10,color:"#66BB6A" }}>✅ {item.quantity} color{Number(item.quantity)>1?"es":""} asignado{Number(item.quantity)>1?"s":""}</div>
                              :<input type="text" placeholder="Color..." value={item.colorInput||""} onChange={e=>updateItem(i,"colorInput",e.target.value)} onFocus={()=>setColorFocusIdx(i)} onBlur={()=>setTimeout(()=>setColorFocusIdx(null),150)} style={{ ...inp,padding:"6px 8px",fontSize:12 }} autoComplete="off" />
                            }
                            {colorFocusIdx===i&&(item.colors||[]).length<Number(item.quantity)&&(()=>{ const val=item.colorInput||""; const matches=val.length>=1?colors.filter(c=>c.toLowerCase().includes(val.toLowerCase())):colors; return matches.length>0?<div style={{ position:"absolute",top:"100%",left:0,right:0,background:"#1C2128",border:"1px solid #30363D",borderRadius:8,zIndex:99,overflow:"hidden",marginTop:2,maxHeight:160,overflowY:"auto" }}>{matches.map(c=><div key={c} onMouseDown={()=>{ updateItem(i,"colors",[...(item.colors||[]),c]); updateItem(i,"colorInput",""); }} style={{ padding:"7px 12px",cursor:"pointer",fontSize:12,borderBottom:"1px solid #21262D" }} onMouseEnter={e=>e.currentTarget.style.background="#21262D"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>🎨 {c}</div>)}</div>:null; })()}
                          </div>
                          {items.length>1?<button onClick={()=>removeItem(i)} style={{ background:"rgba(239,83,80,0.2)",color:"#EF5350",border:"none",borderRadius:6,padding:"6px 8px",cursor:"pointer",fontSize:12 }}>✕</button>:<div/>}
                        </div>
                        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{conditions.map((condLabel,ci) => {
                          const condKey=condLabel.toLowerCase().replace(/\s+/g,"_");
                          const colorsArr=["#FFD54F","#EF5350","#FF8A65","#C792EA","#4FC3F7","#66BB6A","#F06292","#FFB74D"];
                          const color=colorsArr[ci%colorsArr.length];
                          return <label key={condKey} style={{ display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,background:item[condKey]?color+"22":"rgba(255,255,255,0.04)",border:`1px solid ${item[condKey]?color:"#30363D"}`,borderRadius:20,padding:"3px 10px",userSelect:"none" }}><input type="checkbox" checked={!!item[condKey]} onChange={e=>updateItem(i,condKey,e.target.checked)} style={{ accentColor:color,cursor:"pointer" }} /><span style={{ color:item[condKey]?color:"#8B949E" }}>{condLabel}</span></label>;
                        })}</div>
                      </div>
                    ))}
                    <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",marginTop:8 }}>
                      <span style={{ fontSize:13,color:"#8B949E" }}>Total · {totalGarments(items)} prendas</span>
                      <span style={{ fontWeight:800,color:"#66BB6A",fontSize:16 }}>${Math.round(totalPrice(items))}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOTAS <span style={{ color:"#484F58",fontWeight:400 }}>(se llena automáticamente)</span></label>
                    <textarea style={{ ...inp,height:60,resize:"none",borderColor:newOrder.notes?"rgba(255,213,79,0.4)":"#30363D" }} placeholder="Marca condiciones arriba para llenar automáticamente..." value={newOrder.notes} onChange={e=>setNewOrder(p=>({...p,notes:e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>📅 FECHA DE ENTREGA</label>
                    <input type="date" style={{ ...inp,colorScheme:"dark",borderColor:"#FFD54F44" }} value={newOrder.delivery_date} onChange={e=>setNewOrder(p=>({...p,delivery_date:e.target.value}))} />
                    <div style={{ fontSize:11,color:"#8B949E",marginTop:4 }}>Por defecto: 2 días después de hoy. Puedes cambiarla.</div>
                  </div>
                  {!newOrder.agencia_id && !newOrder.domiciliario_id && (
                    <label onClick={()=>setNewOrder(p=>({...p,a_domicilio:!p.a_domicilio}))} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:newOrder.a_domicilio?"rgba(102,187,106,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${newOrder.a_domicilio?"#66BB6A":"#30363D"}`,borderRadius:10,padding:"10px 14px" }}>
                      <input type="checkbox" checked={!!newOrder.a_domicilio} onChange={e=>setNewOrder(p=>({...p,a_domicilio:e.target.checked}))} style={{ width:18,height:18,accentColor:"#66BB6A" }} />
                      <div><div style={{ fontWeight:600,color:newOrder.a_domicilio?"#66BB6A":"#8B949E" }}>🛵 Recibido a domicilio</div><div style={{ fontSize:11,color:"#484F58" }}>Marca esto si fuiste tú (o tu empleado) a recoger la ropa donde el cliente</div></div>
                    </label>
                  )}
                  {newOrder.a_domicilio && (
                    <div>
                      <label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>📍 DIRECCIÓN DEL CLIENTE</label>
                      <input style={{ ...inp,borderColor:"rgba(102,187,106,0.4)" }} placeholder="Ej: Calle 45 # 20-10, apto 302" value={newOrder.address} onChange={e=>setNewOrder(p=>({...p,address:e.target.value}))} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={addOrder} disabled={saving||!newOrder.client_name} style={{ ...btn,flex:1,minWidth:120,background:"rgba(79,195,247,0.15)",color:"#4FC3F7",border:"1px solid rgba(79,195,247,0.4)",padding:12,fontSize:13,opacity:saving||!newOrder.client_name?0.6:1 }}>
                      {saving?"Guardando...":"💾 Solo Guardar"}
                    </button>
                    <button onClick={async () => {
                      if (!newOrder.client_name || items.length === 0) return;
                      setSaving(true);
                      const garments=totalGarments(items), price=totalPrice(items);
                      const uniqueServices=[...new Set(items.map(it=>it.service))];
                      const o={client_name:newOrder.client_name,phone:newOrder.phone,status:newOrder.status,notes:newOrder.notes,delivery_date:newOrder.delivery_date,service:uniqueServices.join(","),employee:user.name,date:today,garments,price,agencia_id:newOrder.agencia_id||null,domiciliario_id:newOrder.domiciliario_id||null,a_domicilio:!!newOrder.a_domicilio,address:newOrder.address||""};
                      const res=await db.post("orders",o);
                      if(Array.isArray(res)&&res[0]){
                        const savedOrder=res[0], orderId=savedOrder.id;
                        for(const item of items)await db.post("order_items",{order_id:orderId,garment_type:item.garment_type,quantity:Number(item.quantity),price:Number(item.price),color:(item.colors||[]).join(", "),service:item.service});
                        if(!newOrder.agencia_id&&!newOrder.domiciliario_id){
                          const existing=clients.find(c=>c.phone===newOrder.phone);
                          if(existing){await db.patch("clients",existing.id,{total_orders:(existing.total_orders||0)+1});setClients(prev=>prev.map(c=>c.id===existing.id?{...c,total_orders:(c.total_orders||0)+1}:c));}
                          else if(newOrder.client_name){const nc=await db.post("clients",{name:newOrder.client_name,phone:newOrder.phone,email:"",total_orders:1});if(Array.isArray(nc))setClients(prev=>[nc[0],...prev]);}
                        }
                        await loadData();
                        const freshOrders=await db.get("orders");
                        const freshOrder=Array.isArray(freshOrders)?freshOrders.find(ord=>ord.id===orderId):null;
                        const freshItems=await db.get("order_items",`&order_id=eq.${orderId}`);
                        const itemsMap={[orderId]:Array.isArray(freshItems)?freshItems:[]};
                        setOrderItems(prev=>({...prev,...itemsMap}));
                        if(freshOrder)printOrderQZ({...freshOrder},itemsMap);
                      }
                      setNewOrder({...emptyOrder,delivery_date:getDeliveryDefault()});
                      setItems([{...emptyItem,price:precioDefaults[emptyItem.garment_type]||""}]);
                      setModal(null);setSaving(false);loadData();
                    }} disabled={saving||!newOrder.client_name} style={{ ...btn,flex:1,minWidth:120,background:"linear-gradient(135deg,#66BB6A,#388E3C)",color:"#fff",padding:12,fontSize:13,fontWeight:800,opacity:saving||!newOrder.client_name?0.6:1 }}>
                      {saving?"Guardando...":"🖨️ Guardar e Imprimir"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {modal === "newExpense" && (
              <>
                <h3 style={{ margin:"0 0 20px",fontSize:18 }}>💰 Nuevo Gasto</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>CONCEPTO</label><input style={inp} placeholder="Ej: Detergente" value={newExpense.concept} onChange={e=>setNewExpense(p=>({...p,concept:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>CATEGORÍA</label><select style={inp} value={newExpense.category} onChange={e=>setNewExpense(p=>({...p,category:e.target.value}))}>{["insumos","servicios","mantenimiento","otros"].map(c=><option key={c} value={c} style={{ background:"#1a1a2e" }}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:8 }}>MÉTODO DE PAGO</label><div style={{ display:"flex",gap:10 }}>{[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"},{value:"breb",label:"🔵 Bre-b"}].map(opt=><label key={opt.value} onClick={()=>setNewExpense(p=>({...p,payment_method:opt.value}))} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:newExpense.payment_method===opt.value?"rgba(79,195,247,0.15)":"rgba(255,255,255,0.04)",border:`2px solid ${newExpense.payment_method===opt.value?"#4FC3F7":"#30363D"}`,borderRadius:10,padding:"10px 6px",color:newExpense.payment_method===opt.value?"#4FC3F7":"#8B949E" }}>{opt.label}</label>)}</div></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>MONTO ($)</label><input style={inp} type="number" placeholder="0" value={newExpense.amount} onChange={e=>setNewExpense(p=>({...p,amount:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>FECHA</label><input style={{ ...inp,colorScheme:"dark" }} type="date" value={newExpense.date} onChange={e=>setNewExpense(p=>({...p,date:e.target.value}))} /></div>
                  <button onClick={addExpense} disabled={saving} style={{ ...btn,background:"linear-gradient(135deg,#EF5350,#B71C1C)",color:"#fff",padding:12,opacity:saving?0.7:1 }}>{saving?"Guardando...":"Guardar Gasto"}</button>
                </div>
              </>
            )}

            {modal === "newAdvance" && (
              <>
                <h3 style={{ margin:"0 0 20px",fontSize:18 }}>💸 Registrar Adelanto</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div>
                    <label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>EMPLEADO</label>
                    <select style={inp} value={newAdvance.employee_id} onChange={e=>setNewAdvance(p=>({...p,employee_id:e.target.value}))}>
                      <option value="" style={{ background:"#1a1a2e" }}>Selecciona un empleado...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id} style={{ background:"#1a1a2e" }}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>MONTO ($)</label><input style={inp} type="number" placeholder="0" value={newAdvance.amount} onChange={e=>setNewAdvance(p=>({...p,amount:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:8 }}>MÉTODO DE PAGO</label><div style={{ display:"flex",gap:10 }}>{[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"},{value:"breb",label:"🔵 Bre-b"}].map(opt=><label key={opt.value} onClick={()=>setNewAdvance(p=>({...p,payment_method:opt.value}))} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:newAdvance.payment_method===opt.value?"rgba(255,213,79,0.15)":"rgba(255,255,255,0.04)",border:`2px solid ${newAdvance.payment_method===opt.value?"#FFD54F":"#30363D"}`,borderRadius:10,padding:"10px 6px",color:newAdvance.payment_method===opt.value?"#FFD54F":"#8B949E" }}>{opt.label}</label>)}</div></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>FECHA</label><input style={{ ...inp,colorScheme:"dark" }} type="date" value={newAdvance.date} onChange={e=>setNewAdvance(p=>({...p,date:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOTA (opcional)</label><input style={inp} placeholder="Ej: Adelanto para transporte" value={newAdvance.note} onChange={e=>setNewAdvance(p=>({...p,note:e.target.value}))} /></div>
                  <button onClick={addAdvance} disabled={saving||!newAdvance.employee_id||!newAdvance.amount} style={{ ...btn,background:"linear-gradient(135deg,#FFD54F,#F57F17)",color:"#000",padding:12,opacity:(saving||!newAdvance.employee_id||!newAdvance.amount)?0.5:1 }}>{saving?"Guardando...":"Guardar Adelanto"}</button>
                </div>
              </>
            )}

            {modal === "reciboOpciones" && savedOrder && (
              <>
                <div style={{ textAlign:"center",marginBottom:24 }}>
                  <div style={{ fontSize:48,marginBottom:8 }}>✅</div>
                  <h3 style={{ margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#66BB6A" }}>¡Orden guardada!</h3>
                  <div style={{ fontSize:13,color:"#8B949E",marginTop:4 }}>
                    <span style={{ background:"rgba(79,195,247,0.15)",color:"#4FC3F7",fontWeight:800,padding:"2px 10px",borderRadius:6 }}>{savedOrder.order?.order_number||"—"}</span>
                    {" · "}{savedOrder.order?.client_name}
                  </div>
                  <div style={{ fontSize:14,color:"#66BB6A",fontWeight:700,marginTop:6 }}>${Math.round(Number(savedOrder.order?.price||0))}</div>
                </div>
                <p style={{ fontSize:13,color:"#8B949E",textAlign:"center",marginBottom:20 }}>¿Cómo quieres entregar el comprobante al cliente?</p>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  <button onClick={async () => {
                    printOrderQZ(savedOrder.order, savedOrder.itemsMap, 1);
                    await db.patch("orders", savedOrder.order.id, { recibo_enviado: "impreso" });
                    setOrders(prev => prev.map(o => o.id === savedOrder.order.id ? { ...o, recibo_enviado: "impreso" } : o));
                  }} style={{ ...btn,background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",padding:14,fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                    🖨️ Imprimir recibo físico
                  </button>
                  <button onClick={async () => {
                    const o = savedOrder.order;
                    await generateReciboImage(o, savedOrder.itemsMap);
                    const phone = (o.phone||"").replace(/[^0-9]/g,"");
                    const partes = ["Hola " + o.client_name + ", adjunto su recibo de Lavanderias Shaddai.","Orden: " + (o.order_number||""),"Total: $" + Math.round(Number(o.price)),"Entrega: " + (o.delivery_date||""),"Gracias por preferirnos!"];
                    const msg = partes.join(String.fromCharCode(10));
                    window.open("https://wa.me/" + negocioPais + phone + "?text=" + encodeURIComponent(msg), "_blank");
                    await db.patch("orders", o.id, { recibo_enviado: "whatsapp" });
                    setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, recibo_enviado: "whatsapp" } : ord));
                  }} style={{ ...btn,background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff",padding:14,fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                    📱 Generar imagen y abrir WhatsApp
                  </button>
                  <button onClick={() => { setModal(null); setSavedOrder(null); }} style={{ ...btn,background:"rgba(255,255,255,0.05)",color:"#8B949E",padding:12,fontSize:13 }}>
                    📋 Sin recibo por ahora
                  </button>
                </div>
              </>
            )}

            {modal === "newClient" && (
              <>
                <h3 style={{ margin:"0 0 20px",fontSize:18 }}>👤 Nuevo Cliente</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={inp} placeholder="Nombre completo" value={newClient.name} onChange={e=>setNewClient(p=>({...p,name:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label><input style={inp} placeholder="555-0000" value={newClient.phone} onChange={e=>setNewClient(p=>({...p,phone:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>EMAIL</label><input style={inp} type="email" placeholder="correo@email.com" value={newClient.email} onChange={e=>setNewClient(p=>({...p,email:e.target.value}))} /></div>
                  <button onClick={addClient} disabled={saving} style={{ ...btn,background:"linear-gradient(135deg,#66BB6A,#388E3C)",color:"#fff",padding:12,opacity:saving?0.7:1 }}>{saving?"Guardando...":"Guardar Cliente"}</button>
                </div>
              </>
            )}

            {modal === "newAgency" && (
              <>
                <h3 style={{ margin:"0 0 20px",fontSize:18 }}>🏢 Nueva Agencia</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE DE LA AGENCIA</label><input style={inp} placeholder="Ej: Lavandería El Rápido" value={newAgency.name} onChange={e=>setNewAgency(p=>({...p,name:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>PERSONA DE CONTACTO</label><input style={inp} placeholder="Nombre del contacto" value={newAgency.contact_name} onChange={e=>setNewAgency(p=>({...p,contact_name:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label><input style={inp} placeholder="555-0000" value={newAgency.phone} onChange={e=>setNewAgency(p=>({...p,phone:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>DIRECCIÓN</label><input style={inp} placeholder="Dirección de la agencia" value={newAgency.address} onChange={e=>setNewAgency(p=>({...p,address:e.target.value}))} /></div>
                  <button onClick={addAgency} disabled={saving||!newAgency.name} style={{ ...btn,background:"linear-gradient(135deg,#FF8A65,#E64A19)",color:"#fff",padding:12,opacity:(saving||!newAgency.name)?0.6:1 }}>{saving?"Guardando...":"Guardar Agencia"}</button>
                </div>
              </>
            )}

            {modal === "newDomiciliario" && (
              <>
                <h3 style={{ margin:"0 0 20px",fontSize:18 }}>🛵 Nuevo Domiciliario</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={inp} placeholder="Nombre del domiciliario" value={newDomiciliario.name} onChange={e=>setNewDomiciliario(p=>({...p,name:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>PERSONA DE CONTACTO</label><input style={inp} placeholder="Si aplica" value={newDomiciliario.contact_name} onChange={e=>setNewDomiciliario(p=>({...p,contact_name:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label><input style={inp} placeholder="555-0000" value={newDomiciliario.phone} onChange={e=>setNewDomiciliario(p=>({...p,phone:e.target.value}))} /></div>
                  <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>DIRECCIÓN</label><input style={inp} placeholder="Si aplica" value={newDomiciliario.address} onChange={e=>setNewDomiciliario(p=>({...p,address:e.target.value}))} /></div>
                  <button onClick={addDomiciliario} disabled={saving||!newDomiciliario.name} style={{ ...btn,background:"linear-gradient(135deg,#66BB6A,#388E3C)",color:"#fff",padding:12,opacity:(saving||!newDomiciliario.name)?0.6:1 }}>{saving?"Guardando...":"Guardar Domiciliario"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ABONO MODAL */}
      {abonoModal && (
        <div onClick={() => setAbonoModal(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:16,padding:28,width:400,maxWidth:"92vw",border:"1px solid #FFD54F",fontFamily:"'Segoe UI',sans-serif" }}>
            <h3 style={{ margin:"0 0 4px",fontSize:18,color:"#E6EDF3" }}>💰 Registrar Abono</h3>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                <span style={{ background:"rgba(79,195,247,0.15)",color:"#4FC3F7",fontWeight:800,padding:"2px 10px",borderRadius:6 }}>{abonoModal.order_number}</span>
                <span style={{ fontWeight:600 }}>{abonoModal.client_name}</span>
              </div>
              <div style={{ display:"flex",gap:16,background:"#0D1117",borderRadius:8,padding:"10px 14px",fontSize:13 }}>
                <div><div style={{ color:"#8B949E",fontSize:11 }}>TOTAL ORDEN</div><div style={{ fontWeight:800,color:"#E6EDF3" }}>${Math.round(Number(abonoModal.price)).toLocaleString()}</div></div>
                <div><div style={{ color:"#8B949E",fontSize:11 }}>ABONADO</div><div style={{ fontWeight:800,color:"#66BB6A" }}>${Math.round(getAbonado(abonoModal.id)).toLocaleString()}</div></div>
                <div><div style={{ color:"#8B949E",fontSize:11 }}>SALDO</div><div style={{ fontWeight:800,color:"#FFD54F" }}>${Math.round(getSaldo(abonoModal)).toLocaleString()}</div></div>
              </div>
            </div>
            {abonos.filter(a=>a.order_id===abonoModal.id).length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,color:"#8B949E",fontWeight:600,marginBottom:6 }}>ABONOS ANTERIORES</div>
                {abonos.filter(a=>a.order_id===abonoModal.id).map(a=>(
                  <div key={a.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#0D1117",borderRadius:8,marginBottom:4,fontSize:12 }}>
                    <span style={{ color:"#8B949E" }}>{a.date} · {a.employee}</span>
                    <span style={{ fontWeight:700,color:"#66BB6A" }}>${Math.round(Number(a.amount)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div>
                <label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:4 }}>MONTO DEL ABONO</label>
                <input type="number" style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #FFD54F",background:"#0D1117",color:"#E6EDF3",fontSize:16,fontWeight:700,width:"100%",boxSizing:"border-box" }} placeholder="0" value={newAbono.amount} onChange={e=>setNewAbono(p=>({...p,amount:e.target.value}))} autoFocus />
                {newAbono.amount && Number(newAbono.amount) > 0 && <div style={{ fontSize:11,color:"#8B949E",marginTop:4 }}>Saldo restante: <strong style={{ color:"#FFD54F" }}>${Math.max(0,Math.round(getSaldo(abonoModal)-Number(newAbono.amount))).toLocaleString()}</strong></div>}
              </div>
              <div>
                <label style={{ fontSize:11,color:"#8B949E",display:"block",marginBottom:6 }}>MÉTODO DE PAGO</label>
                <div style={{ display:"flex",gap:8 }}>
                  {[{value:"efectivo",label:"💵 Efectivo"},{value:"nequi",label:"📱 Nequi"},{value:"daviplata",label:"💜 Daviplata"},{value:"breb",label:"🔵 Bre-b"}].map(opt=>(
                    <label key={opt.value} onClick={()=>setNewAbono(p=>({...p,payment_method:opt.value}))} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,fontWeight:600,background:newAbono.payment_method===opt.value?"rgba(255,213,79,0.15)":"rgba(255,255,255,0.04)",border:`2px solid ${newAbono.payment_method===opt.value?"#FFD54F":"#30363D"}`,borderRadius:8,padding:"8px 4px",color:newAbono.payment_method===opt.value?"#FFD54F":"#8B949E" }}>{opt.label}</label>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                <button onClick={()=>setAbonoModal(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={async () => {
                  if (!newAbono.amount || Number(newAbono.amount) <= 0) { alert("Ingresa un monto válido"); return; }
                  const abono = { order_id: abonoModal.id, amount: Number(newAbono.amount), payment_method: newAbono.payment_method, date: today, employee: user.name };
                  const res = await db.post("abonos", abono);
                  if (Array.isArray(res) && res[0]) {
                    setAbonos(prev => [...prev, res[0]]);
                    setNewAbono({ amount:"", payment_method:"efectivo" });
                    alert("✅ Abono registrado correctamente");
                  }
                }} disabled={!newAbono.amount||Number(newAbono.amount)<=0} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#FFD54F,#F57F17)",color:"#000",fontWeight:800,cursor:"pointer",fontSize:13,opacity:!newAbono.amount||Number(newAbono.amount)<=0?0.5:1 }}>
                  💰 Guardar Abono
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div onClick={() => setEditingEmployee(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:16,padding:28,width:400,maxWidth:"92vw",border:"1px solid #FFD54F",fontFamily:"'Segoe UI',sans-serif" }}>
            <h3 style={{ margin:"0 0 20px",fontSize:18,color:"#E6EDF3" }}>✏️ Editar Usuario</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingEmployee.name} onChange={e=>setEditingEmployee(p=>({...p,name:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>PIN</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} type="password" maxLength={6} value={editingEmployee.pin} onChange={e=>setEditingEmployee(p=>({...p,pin:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>ROL</label><select style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingEmployee.role} onChange={e=>setEditingEmployee(p=>({...p,role:e.target.value}))}><option value="employee" style={{ background:"#1a1a2e" }}>👤 Empleado</option><option value="admin" style={{ background:"#1a1a2e" }}>👑 Administrador</option></select></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TURNO</label><select style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingEmployee.turno||"mañana"} onChange={e=>setEditingEmployee(p=>({...p,turno:e.target.value}))}><option value="mañana" style={{ background:"#1a1a2e" }}>🌅 Mañana</option><option value="tarde" style={{ background:"#1a1a2e" }}>🌆 Tarde</option><option value="noche" style={{ background:"#1a1a2e" }}>🌙 Noche</option><option value="completo" style={{ background:"#1a1a2e" }}>⏰ Día completo</option></select></div>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setEditingEmployee(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={updateEmployee} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#FFD54F,#F57F17)",color:"#000",fontWeight:800,cursor:"pointer",fontSize:13 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOTAL PRENDAS MODAL */}
      {showTotalPrendas && (
        <div onClick={() => setShowTotalPrendas(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:20,padding:32,width:360,maxWidth:"92vw",border:"1px solid rgba(255,213,79,0.4)",boxShadow:"0 8px 40px rgba(0,0,0,0.6)",fontFamily:"'Segoe UI',sans-serif" }}>
            <div style={{ textAlign:"center",marginBottom:24 }}>
              <div style={{ fontSize:48,marginBottom:8 }}>👕</div>
              <h2 style={{ margin:0,fontSize:20,fontWeight:800,color:"#E6EDF3" }}>Total de Prendas del Día</h2>
              <p style={{ margin:"6px 0 0",fontSize:13,color:"#8B949E" }}>{filterDate}</p>
            </div>
            <div style={{ background:"#0D1117",borderRadius:14,padding:20,marginBottom:20 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingBottom:12,borderBottom:"1px solid #21262D" }}><span style={{ color:"#8B949E",fontSize:13 }}>Ingresos del día</span><span style={{ fontWeight:700,color:"#66BB6A",fontSize:16 }}>${Math.round(todayRevenue)}</span></div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingBottom:12,borderBottom:"1px solid #21262D" }}><span style={{ color:"#8B949E",fontSize:13 }}>Precio por prenda</span><span style={{ fontWeight:700,color:"#FFD54F",fontSize:16 }}>${precioPrend.toLocaleString()}</span></div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><span style={{ color:"#8B949E",fontSize:13 }}>Total prendas estimado</span><span style={{ fontWeight:800,color:"#4FC3F7",fontSize:28 }}>{precioPrend>0?Math.round(todayRevenue/precioPrend):0}</span></div>
            </div>
            <div style={{ background:"rgba(79,195,247,0.06)",border:"1px solid rgba(79,195,247,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:20,textAlign:"center",fontSize:13,color:"#8B949E" }}>
              ${Math.round(todayRevenue)} ÷ ${precioPrend.toLocaleString()} = <strong style={{ color:"#4FC3F7" }}>{precioPrend>0?Math.round(todayRevenue/precioPrend):0} prendas</strong>
            </div>
            {!editingPrecio
              ?<button onClick={()=>{setEditingPrecio(true);setTempPrecio(String(precioPrend));}} style={{ width:"100%",padding:"10px",borderRadius:10,border:"1px solid #30363D",background:"transparent",color:"#8B949E",cursor:"pointer",fontSize:13,marginBottom:12 }}>✏️ Cambiar precio por prenda (actual: ${precioPrend.toLocaleString()})</button>
              :<div style={{ marginBottom:12 }}><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:6 }}>NUEVO PRECIO POR PRENDA</label><div style={{ display:"flex",gap:8 }}><input type="number" value={tempPrecio} onChange={e=>setTempPrecio(e.target.value)} style={{ flex:1,padding:"10px 12px",borderRadius:8,border:"1px solid #FFD54F",background:"#0D1117",color:"#E6EDF3",fontSize:16,fontWeight:700 }} autoFocus /><button onClick={()=>{const val=Number(tempPrecio);if(val>0){setPrecioPrend(val);try{localStorage.setItem("precioPrend",String(val));}catch{}}setEditingPrecio(false);}} style={{ padding:"10px 16px",borderRadius:8,border:"none",background:"#FFD54F",color:"#000",fontWeight:800,cursor:"pointer" }}>Guardar</button><button onClick={()=>setEditingPrecio(false)} style={{ padding:"10px 12px",borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",cursor:"pointer" }}>✕</button></div></div>
            }
            <button onClick={()=>setShowTotalPrendas(false)} style={{ width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#FFD54F,#F57F17)",color:"#000",fontWeight:800,cursor:"pointer",fontSize:14 }}>Cerrar</button>
          </div>
        </div>
      )}


      {/* INFORME DIARIO MODAL */}
      {showInformeDiario && (
        <div onClick={() => setShowInformeDiario(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,fontFamily:"'Segoe UI',sans-serif" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:20,padding:28,width:420,maxWidth:"92vw",border:"1px solid rgba(199,146,234,0.4)",boxShadow:"0 8px 40px rgba(0,0,0,0.8)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0,fontSize:20,fontWeight:800,color:"#C792EA" }}>💳 Informe Diario</h2>
                <p style={{ margin:0,fontSize:12,color:"#8B949E" }}>{filterDate}</p>
              </div>
              <button onClick={()=>setShowInformeDiario(false)} style={{ background:"none",border:"none",color:"#8B949E",fontSize:24,cursor:"pointer" }}>✕</button>
            </div>

            {(() => {
              const entregadasHoy = orders.filter(o => o.status === "entregado" && o.delivered_at === filterDate);
              const metodos = [
                { key:"efectivo", label:"💵 Efectivo", color:"#66BB6A" },
                { key:"nequi", label:"📱 Nequi", color:"#C792EA" },
                { key:"daviplata", label:"💜 Daviplata", color:"#667EEA" },
                { key:"breb", label:"🔵 Bre-b", color:"#4FC3F7" },
              ];
              const totalGeneral = entregadasHoy.reduce((s,o) => s+Number(o.price), 0);
              const totalAbonos = abonos.filter(a => a.date === filterDate).reduce((s,a) => s+Number(a.amount), 0);
              const advancesHoy = advances.filter(a => a.date === filterDate);
              const totalAdvancesHoy = advancesHoy.reduce((s,a) => s+Number(a.amount), 0);
              const netoCaja = totalGeneral + totalAbonos - totalAdvancesHoy;

              return <>
                {/* Totales por método */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:16 }}>
                  {metodos.map(m => {
                    const total = entregadasHoy.filter(o => (o.payment_method||"efectivo") === m.key).reduce((s,o) => s+Number(o.price), 0);
                    const count = entregadasHoy.filter(o => (o.payment_method||"efectivo") === m.key).length;
                    const abonosMetodo = abonos.filter(a => a.date === filterDate && (a.payment_method||"efectivo") === m.key).reduce((s,a) => s+Number(a.amount), 0);
                    const advancesMetodo = advancesHoy.filter(a => (a.payment_method||"efectivo") === m.key).reduce((s,a) => s+Number(a.amount), 0);
                    return (
                      <div key={m.key} style={{ background:"#0D1117",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${m.color}` }}>
                        <div style={{ fontSize:13,color:"#8B949E",marginBottom:4 }}>{m.label}</div>
                        <div style={{ fontWeight:800,fontSize:18,color:m.color }}>${Math.round(total+abonosMetodo-advancesMetodo).toLocaleString()}</div>
                        <div style={{ fontSize:11,color:"#484F58",marginTop:2 }}>{count} entrega{count!==1?"s":""}{abonosMetodo>0?` + $${Math.round(abonosMetodo).toLocaleString()} abono`:""}{advancesMetodo>0?` − $${Math.round(advancesMetodo).toLocaleString()} adelanto`:""}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Total general */}
                <div style={{ background:"rgba(199,146,234,0.08)",border:"1px solid rgba(199,146,234,0.3)",borderRadius:10,padding:"14px 16px",marginBottom:16 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:13,color:"#8B949E" }}>Neto en caja (después de adelantos)</div>
                      <div style={{ fontSize:11,color:"#484F58" }}>{entregadasHoy.length} entregas · {abonos.filter(a=>a.date===filterDate).length} abonos · {advancesHoy.length} adelanto{advancesHoy.length!==1?"s":""}</div>
                    </div>
                    <div style={{ fontWeight:800,fontSize:24,color:"#C792EA" }}>${Math.round(netoCaja).toLocaleString()}</div>
                  </div>
                </div>

                {/* Desglose entregas vs abonos vs adelantos */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16 }}>
                  <div style={{ background:"#0D1117",borderRadius:10,padding:"10px 14px",borderLeft:"3px solid #66BB6A" }}>
                    <div style={{ fontSize:11,color:"#8B949E" }}>Entregas</div>
                    <div style={{ fontWeight:800,color:"#66BB6A" }}>${Math.round(totalGeneral).toLocaleString()}</div>
                  </div>
                  <div style={{ background:"#0D1117",borderRadius:10,padding:"10px 14px",borderLeft:"3px solid #FFD54F" }}>
                    <div style={{ fontSize:11,color:"#8B949E" }}>Abonos</div>
                    <div style={{ fontWeight:800,color:"#FFD54F" }}>${Math.round(totalAbonos).toLocaleString()}</div>
                  </div>
                  <div style={{ background:"#0D1117",borderRadius:10,padding:"10px 14px",borderLeft:"3px solid #EF5350" }}>
                    <div style={{ fontSize:11,color:"#8B949E" }}>Adelantos</div>
                    <div style={{ fontWeight:800,color:"#EF5350" }}>− ${Math.round(totalAdvancesHoy).toLocaleString()}</div>
                  </div>
                </div>

                {entregadasHoy.length === 0 && totalAbonos === 0 && totalAdvancesHoy === 0 && (
                  <p style={{ textAlign:"center",color:"#484F58",fontSize:13 }}>No hay entregas, abonos ni adelantos hoy</p>
                )}

                <button onClick={()=>setShowInformeDiario(false)} style={{ width:"100%",padding:12,borderRadius:10,border:"none",background:"linear-gradient(135deg,#C792EA,#9B59B6)",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:14 }}>Cerrar</button>
              </>;
            })()}
          </div>
        </div>
      )}

      {/* AYUDA MODAL */}
      {showAyuda && (
        <div onClick={() => setShowAyuda(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,fontFamily:"'Segoe UI',sans-serif" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:20,width:"90%",maxWidth:780,maxHeight:"88vh",border:"1px solid #30363D",display:"flex",flexDirection:"column",overflow:"hidden" }}>
            {/* Header */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #30363D",flexShrink:0 }}>
              <div><h2 style={{ margin:0,fontSize:20,fontWeight:800,color:"#4FC3F7" }}>❓ Manual de Usuario</h2><p style={{ margin:0,fontSize:12,color:"#8B949E" }}>Guía de uso de Lavanderías App</p></div>
              <button onClick={()=>setShowAyuda(false)} style={{ background:"none",border:"none",color:"#8B949E",fontSize:24,cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"flex",flex:1,overflow:"hidden" }}>
              {/* Sidebar nav */}
              <div style={{ width:180,borderRight:"1px solid #30363D",padding:"16px 12px",flexShrink:0,overflowY:"auto" }}>
                {[
                  {id:"login",icon:"🔐",label:"Inicio de Sesión"},
                  {id:"dashboard",icon:"📊",label:"Dashboard"},
                  {id:"orders",icon:"👕",label:"Órdenes"},
                  {id:"entregas",icon:"📦",label:"Entregas"},
                  {id:"clients",icon:"👤",label:"Clientes"},
                  {id:"expenses",icon:"💰",label:"Gastos"},
                  {id:"report",icon:"📋",label:"Informes"},
                  {id:"reversar",icon:"↩️",label:"Reversar"},
                  {id:"config",icon:"⚙️",label:"Configuración"},
                  {id:"calc",icon:"🧮",label:"Calculadora"},
                  {id:"faq",icon:"❓",label:"Preguntas"},
                  {id:"qz",icon:"🖨️",label:"Impresora QZ Tray"},
                  {id:"informe",icon:"💳",label:"Informe Diario"},
                ].map(s => (
                  <button key={s.id} onClick={()=>setAyudaSeccion(s.id)} style={{ width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,border:"none",background:ayudaSeccion===s.id?"rgba(79,195,247,0.15)":"transparent",color:ayudaSeccion===s.id?"#4FC3F7":"#8B949E",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>{s.icon} {s.label}</button>
                ))}
              </div>
              {/* Content */}
              <div style={{ flex:1,padding:"20px 24px",overflowY:"auto",fontSize:13,lineHeight:1.7,color:"#E6EDF3" }}>
                {ayudaSeccion==="login" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>🔐 Inicio de Sesión</h3>
                  <p>Al abrir la app aparece la pantalla de inicio de sesión.</p>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Selecciona tu nombre en la lista desplegable.</li>
                    <li>Escribe tu PIN (4 a 6 dígitos) y presiona Enter.</li>
                    <li>Si el PIN es incorrecto aparecerá un mensaje en rojo.</li>
                  </ul>
                  <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#66BB6A" }}>✅ El administrador puede crear usuarios desde ⚙️ Configuración → Usuarios y Turnos.</div>
                </div>}
                {ayudaSeccion==="dashboard" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>📊 Dashboard</h3>
                  <p>Muestra un resumen del día seleccionado.</p>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li><strong>💵 Ingresos:</strong> suma de todas las órdenes del día.</li>
                    <li><strong>📤 Gastos:</strong> suma de todos los gastos del día.</li>
                    <li><strong>📈 Utilidad:</strong> ingresos menos gastos.</li>
                    <li><strong>👕 Prendas:</strong> total de prendas recibidas.</li>
                    <li><strong>Órdenes recientes:</strong> últimas 5 órdenes.</li>
                    <li><strong>Servicios:</strong> gráfico de distribución por servicio.</li>
                  </ul>
                  <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#66BB6A" }}>✅ Puedes cambiar la fecha con el selector en la esquina superior derecha.</div>
                </div>}
                {ayudaSeccion==="orders" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>👕 Órdenes</h3>
                  <h4 style={{ color:"#8B949E" }}>Crear nueva orden</h4>
                  <ol style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Clic en <strong>+ Nueva Orden</strong>.</li>
                    <li>Escribe el teléfono — si el cliente existe aparece autocompletado.</li>
                    <li>Agrega las prendas: servicio, tipo, cantidad, precio y colores.</li>
                    <li>Marca condiciones de las prendas si aplica.</li>
                    <li>Ajusta la fecha de entrega (por defecto 2 días).</li>
                    <li>Elige 💾 Solo Guardar o 🖨️ Guardar e Imprimir (imprime 2 copias).</li>
                  </ol>
                  <h4 style={{ color:"#8B949E" }}>Comprobante</h4>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>🖨️ Imprimir recibo físico — al crear imprime 2 copias, al reimprimir 1 copia</li>
                    <li>📱 Generar imagen PNG y abrir WhatsApp</li>
                    <li>📋 Sin recibo por ahora</li>
                  </ul>
                  <h4 style={{ color:"#8B949E" }}>Registrar abono 💰</h4>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Clic en 💰 en la fila de la orden.</li>
                    <li>Ingresa el monto y método de pago (Efectivo, Nequi, Daviplata, Bre-b).</li>
                    <li>El saldo pendiente se actualiza automáticamente.</li>
                    <li>Al entregar, el sistema muestra cuánto abonó y cuánto falta.</li>
                  </ul>
                  <div style={{ background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#EF5350" }}>⚠️ Eliminar una orden requiere clave de administrador.</div>
                </div>}
                {ayudaSeccion==="entregas" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>📦 Entregas</h3>
                  <ol style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Escribe el teléfono o número de orden y clic en 🔍 Buscar.</li>
                    <li>Si tienes pistola lectora, escanea el código de barras del recibo.</li>
                    <li>Selecciona las órdenes a entregar (una o varias).</li>
                    <li>Elige método de pago: Efectivo, Nequi, Daviplata o Bre-b.</li>
                    <li>Marca "Sin recibo" si el cliente no presentó el recibo físico.</li>
                    <li>Clic en ✅ Confirmar Entrega.</li>
                  </ol>
                  <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#66BB6A" }}>✅ Si el cliente tiene abonos, el sistema muestra automáticamente el saldo pendiente.</div>
                </div>}
                {ayudaSeccion==="clients" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>👤 Clientes</h3>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Busca por nombre o teléfono.</li>
                    <li>✏️ Editar datos del cliente.</li>
                    <li>🗑 Eliminar cliente (requiere clave admin).</li>
                    <li>📥 Exportar lista en Excel (solo administrador).</li>
                  </ul>
                  <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#66BB6A" }}>✅ Los clientes se crean automáticamente al crear una orden nueva.</div>
                </div>}
                {ayudaSeccion==="expenses" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>💰 Gastos</h3>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Filtra por fecha con el selector.</li>
                    <li>+ Nuevo Gasto: concepto, categoría, método y monto.</li>
                    <li>🗑 Eliminar (no se borra, pasa a eliminados).</li>
                    <li>🗑 Ver eliminados → ↩️ Restaurar si fue por error.</li>
                  </ul>
                  <p style={{ color:"#8B949E" }}>Categorías: Insumos, Servicios, Mantenimiento, Otros.</p>
                </div>}
                {ayudaSeccion==="report" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>📋 Informes</h3>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li><strong>Informe del Día:</strong> resumen financiero, prendas y estado de órdenes.</li>
                    <li><strong>Rango de Fechas:</strong> detalle por día o por mes con exportar Excel.</li>
                    <li><strong>Gastos por Rango:</strong> detalle de gastos por período.</li>
                    <li><strong>Abonos por Rango:</strong> lista de abonos recibidos.</li>
                    <li><strong>Pagos por Método:</strong> cuánto se cobró en Efectivo, Nequi, Daviplata y Bre-b.</li>
                    <li><strong>Inventario:</strong> prendas sin retirar con envío de WhatsApp masivo.</li>
                    <li><strong>Órdenes Reversadas:</strong> historial de reversas.</li>
                  </ul>
                </div>}
                {ayudaSeccion==="reversar" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>↩️ Reversar</h3>
                  <p>Permite corregir errores en entregas.</p>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Busca por teléfono o número de orden.</li>
                    <li>Orden entregada → ↩️ Reversar la devuelve a estado "Listo".</li>
                    <li>Orden no entregada → 🗑 Eliminar orden.</li>
                  </ul>
                  <div style={{ background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#EF5350" }}>⚠️ Requiere clave de administrador. Las reversas quedan registradas en Informes.</div>
                </div>}
                {ayudaSeccion==="config" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>⚙️ Configuración</h3>
                  <p style={{ color:"#8B949E" }}>Solo para administradores.</p>
                  {[
                    ["🏪 Información del Negocio","Nombre, dirección, teléfono, código de país WA y logo."],
                    ["👕 Tipos de Prenda","Agregar, eliminar o restaurar tipos de prenda."],
                    ["🎨 Colores","Agregar o eliminar colores disponibles."],
                    ["⚠️ Condiciones","Agregar condiciones personalizadas de prendas."],
                    ["🧺 Servicios","Cambiar nombre e ícono de cada servicio."],
                    ["💰 Precios por defecto","Precios por servicio y prenda para auto-completar al crear órdenes."],
                    ["👥 Usuarios y Turnos","Crear, editar y eliminar usuarios del sistema."],
                    ["🖨️ Texto del Recibo","Personalizar mensaje WA, subtítulo y texto legal del recibo."],
                    ["🔑 Clave Administrador","Cambiar la clave de acceso administrativo."],
                    ["⚠️ Zona de Peligro","Cambiar el consecutivo de órdenes o reiniciarlo desde S000001."],
                  ].map(([t,d]) => <div key={t} style={{ marginBottom:10,background:"#0D1117",borderRadius:8,padding:"10px 14px" }}><div style={{ fontWeight:700,color:"#E6EDF3",marginBottom:3 }}>{t}</div><div style={{ fontSize:12,color:"#8B949E" }}>{d}</div></div>)}
                </div>}
                {ayudaSeccion==="calc" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>🧮 Calculadora y Total Prendas</h3>
                  <h4 style={{ color:"#8B949E" }}>Calculadora</h4>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Clic en el botón 🧮 flotante (esquina inferior derecha).</li>
                    <li>Puedes usar el teclado cuando está abierta.</li>
                    <li>Operaciones: + - × ÷ %</li>
                    <li>Escape para cerrar, C para borrar.</li>
                  </ul>
                  <h4 style={{ color:"#8B949E" }}>👕 Total Prendas</h4>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Estima cuántas prendas entran según los ingresos del día.</li>
                    <li>Configura el precio promedio por prenda.</li>
                  </ul>
                </div>}
                {ayudaSeccion==="qz" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>🖨️ Impresión con QZ Tray</h3>
                  <p style={{ color:"#8B949E",fontSize:12 }}>QZ Tray permite imprimir recibos nítidos directamente en la impresora térmica.</p>
                  <h4 style={{ color:"#8B949E" }}>Instalación (una sola vez)</h4>
                  <ol style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Descarga QZ Tray en <strong>qz.io/download</strong> e instálalo.</li>
                    <li>Queda corriendo en la bandeja del sistema (ícono azul).</li>
                    <li>La primera vez que imprimas, QZ pide permiso — clic en <strong>Allow</strong>.</li>
                  </ol>
                  <h4 style={{ color:"#8B949E" }}>Configurar nombre de impresora</h4>
                  <ol style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Panel de Control → Dispositivos e impresoras.</li>
                    <li>Copia el nombre exacto de tu impresora.</li>
                    <li>⚙️ Configuración → Información del Negocio → 🖨️ Nombre de la Impresora → pegar y guardar.</li>
                  </ol>
                  <h4 style={{ color:"#8B949E" }}>Copias</h4>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>🖨️ <strong>Guardar e Imprimir</strong> → 2 copias (cliente + lavandería)</li>
                    <li>🖨️ <strong>Botón imprimir en Órdenes</strong> → 1 copia</li>
                    <li>🖨️ <strong>Imprimir en Entregas</strong> → 1 copia</li>
                  </ul>
                  <div style={{ background:"rgba(102,187,106,0.1)",border:"1px solid rgba(102,187,106,0.3)",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:12,color:"#66BB6A" }}>✅ Compatible con cualquier impresora térmica ESC/POS de 80mm. Usa Chrome o Edge.</div>
                </div>}
                {ayudaSeccion==="informe" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>💳 Informe Diario</h3>
                  <p style={{ color:"#C9D1D9" }}>Botón rápido en el sidebar que muestra el resumen de cobros del día.</p>
                  <ul style={{ paddingLeft:20,color:"#C9D1D9" }}>
                    <li>Lo recaudado por <strong>Efectivo, Nequi, Daviplata y Bre-b</strong>.</li>
                    <li>Incluye tanto entregas como abonos del día.</li>
                    <li>Total general = entregas + abonos.</li>
                    <li>Usa la misma fecha del Dashboard.</li>
                  </ul>
                </div>}
                {ayudaSeccion==="faq" && <div>
                  <h3 style={{ color:"#4FC3F7",marginTop:0 }}>❓ Preguntas Frecuentes</h3>
                  {[
                    ["¿Cómo cambio mi PIN?","⚙️ Configuración → Usuarios y Turnos → ✏️ de tu usuario."],
                    ["¿Cómo imprimo un recibo antiguo?","Órdenes → busca la orden → 🖨️ (imprime 1 copia)."],
                    ["¿Qué pasa si elimino un gasto por error?","Gastos → 🗑 Ver eliminados → ↩️ Restaurar."],
                    ["¿Puedo cambiar el número de orden?","⚙️ Configuración → Zona de Peligro → ingresa el número deseado."],
                    ["¿Cómo envío WhatsApp a varios clientes?","Informes → Inventario → checkboxes → 📱 Enviar WA."],
                    ["¿Qué es un abono?","Pago parcial antes de retirar. El saldo se descuenta al entregar."],
                    ["¿Cómo cambio el logo?","⚙️ Configuración → Información del Negocio → 📁 Subir logo."],
                    ["¿Cómo configuro la impresora?","⚙️ Configuración → Información del Negocio → 🖨️ Nombre de la Impresora."],
                    ["¿Qué pasa si QZ Tray no está instalado?","La app usa la impresión del navegador automáticamente."],
                    ["¿Cómo veo cuánto se cobró por Nequi hoy?","Clic en 💳 Informe Diario en el sidebar."],
                  ].map(([q,a]) => <div key={q} style={{ marginBottom:14,borderBottom:"1px solid #21262D",paddingBottom:12 }}>
                    <div style={{ fontWeight:700,color:"#4FC3F7",marginBottom:4 }}>▶ {q}</div>
                    <div style={{ fontSize:12,color:"#C9D1D9" }}>{a}</div>
                  </div>)}
                </div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CALCULATOR */}
      <button onClick={() => setShowCalc(!showCalc)} title="Calculadora" style={{ position:"fixed",bottom:28,right:28,zIndex:300,width:56,height:56,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:"0 4px 20px rgba(79,195,247,0.4)",display:"flex",alignItems:"center",justifyContent:"center" }}>🧮</button>

      {showCalc && (
        <div style={{ position:"fixed",bottom:96,right:28,zIndex:300,background:"#1C2128",borderRadius:20,padding:16,border:"1px solid #30363D",boxShadow:"0 8px 40px rgba(0,0,0,0.6)",width:260,fontFamily:"'Segoe UI',sans-serif" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <span style={{ color:"#8B949E",fontSize:13,fontWeight:600 }}>Calculadora <span style={{ fontSize:10,color:"#484F58" }}>(teclado activado)</span></span>
            <button onClick={() => setShowCalc(false)} style={{ background:"none",border:"none",color:"#8B949E",fontSize:18,cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ background:"#0D1117",borderRadius:12,padding:"12px 16px",marginBottom:12,textAlign:"right" }}>
            {calcOp && <div style={{ fontSize:12,color:"#8B949E",marginBottom:2 }}>{calcPrev} {calcOp}</div>}
            <div style={{ fontSize:32,fontWeight:700,color:"#E6EDF3",overflowX:"auto",whiteSpace:"nowrap" }}>{calcDisplay}</div>
          </div>
          {[[{l:"AC",fn:calcClear,style:{background:"#EF5350",color:"#fff"}},{l:"+/-",fn:calcToggleSign,style:{background:"#30363D",color:"#E6EDF3"}},{l:"%",fn:calcPercent,style:{background:"#30363D",color:"#E6EDF3"}},{l:"÷",fn:()=>calcOperation("÷"),style:{background:"#4FC3F7",color:"#000"}}],[{l:"7",fn:()=>calcInput("7")},{l:"8",fn:()=>calcInput("8")},{l:"9",fn:()=>calcInput("9")},{l:"×",fn:()=>calcOperation("×"),style:{background:"#4FC3F7",color:"#000"}}],[{l:"4",fn:()=>calcInput("4")},{l:"5",fn:()=>calcInput("5")},{l:"6",fn:()=>calcInput("6")},{l:"-",fn:()=>calcOperation("-"),style:{background:"#4FC3F7",color:"#000"}}],[{l:"1",fn:()=>calcInput("1")},{l:"2",fn:()=>calcInput("2")},{l:"3",fn:()=>calcInput("3")},{l:"+",fn:()=>calcOperation("+"),style:{background:"#4FC3F7",color:"#000"}}],[{l:"⌫",fn:calcBackspace,style:{background:"#30363D",color:"#FFD54F"}},{l:"0",fn:()=>calcInput("0")},{l:".",fn:calcDot},{l:"=",fn:calcEquals,style:{background:"#66BB6A",color:"#fff"}}]].map((row,ri) => (
            <div key={ri} style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8 }}>
              {row.map((b,bi) => <button key={bi} onClick={b.fn} style={{ padding:"14px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:16,background:b.style?.background||"#21262D",color:b.style?.color||"#E6EDF3" }} onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{b.l}</button>)}
            </div>
          ))}
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {editingClient && (
        <div onClick={() => setEditingClient(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:16,padding:28,width:400,maxWidth:"92vw",border:"1px solid #4FC3F7",fontFamily:"'Segoe UI',sans-serif" }}>
            <h3 style={{ margin:"0 0 20px",fontSize:18,color:"#E6EDF3" }}>✏️ Editar Cliente</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingClient.name} onChange={e=>setEditingClient(p=>({...p,name:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingClient.phone} onChange={e=>setEditingClient(p=>({...p,phone:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>EMAIL</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} type="email" value={editingClient.email||""} onChange={e=>setEditingClient(p=>({...p,email:e.target.value}))} /></div>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setEditingClient(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={updateClient} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAgency && (
        <div onClick={() => setEditingAgency(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:16,padding:28,width:400,maxWidth:"92vw",border:"1px solid #FF8A65",fontFamily:"'Segoe UI',sans-serif" }}>
            <h3 style={{ margin:"0 0 20px",fontSize:18,color:"#E6EDF3" }}>✏️ Editar Agencia</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingAgency.name} onChange={e=>setEditingAgency(p=>({...p,name:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>PERSONA DE CONTACTO</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingAgency.contact_name||""} onChange={e=>setEditingAgency(p=>({...p,contact_name:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingAgency.phone||""} onChange={e=>setEditingAgency(p=>({...p,phone:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>DIRECCIÓN</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingAgency.address||""} onChange={e=>setEditingAgency(p=>({...p,address:e.target.value}))} /></div>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setEditingAgency(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={updateAgency} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#FF8A65,#E64A19)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingDomiciliario && (
        <div onClick={() => setEditingDomiciliario(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#161B22",borderRadius:16,padding:28,width:400,maxWidth:"92vw",border:"1px solid #66BB6A",fontFamily:"'Segoe UI',sans-serif" }}>
            <h3 style={{ margin:"0 0 20px",fontSize:18,color:"#E6EDF3" }}>✏️ Editar Domiciliario</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>NOMBRE</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingDomiciliario.name} onChange={e=>setEditingDomiciliario(p=>({...p,name:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>PERSONA DE CONTACTO</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingDomiciliario.contact_name||""} onChange={e=>setEditingDomiciliario(p=>({...p,contact_name:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>TELÉFONO</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingDomiciliario.phone||""} onChange={e=>setEditingDomiciliario(p=>({...p,phone:e.target.value}))} /></div>
              <div><label style={{ fontSize:12,color:"#8B949E",display:"block",marginBottom:4 }}>DIRECCIÓN</label><input style={{ padding:"10px 12px",borderRadius:8,border:"1px solid #30363D",background:"#0D1117",color:"#E6EDF3",fontSize:14,width:"100%",boxSizing:"border-box" }} value={editingDomiciliario.address||""} onChange={e=>setEditingDomiciliario(p=>({...p,address:e.target.value}))} /></div>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setEditingDomiciliario(null)} style={{ flex:1,padding:12,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"#8B949E",fontWeight:600,cursor:"pointer",fontSize:13 }}>Cancelar</button>
                <button onClick={updateDomiciliario} style={{ flex:2,padding:12,borderRadius:8,border:"none",background:"linear-gradient(135deg,#66BB6A,#388E3C)",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
