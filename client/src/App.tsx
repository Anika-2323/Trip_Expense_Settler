// client/src/App.tsx
import { useState, useEffect } from 'react';
import { tripApi } from './api/tripApi';
import type { Trip, Balance, Transfer, MemberAudit } from './api/tripApi';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Wallet, 
  Users, 
  Receipt, 
  RefreshCw, 
  PlusCircle, 
  IndianRupee, 
  X, 
  FolderPlus, 
  Trash2, 
  Share2, 
  Check, 
  ChevronDown, 
  QrCode, 
  ExternalLink, 
  MessageSquare, 
  Bot, 
  Send, 
  Camera, 
  FileText 
} from 'lucide-react';

export default function App() {
  const [tripList, setTripList] = useState<Trip[]>([]);
  const [tripId, setTripId] = useState<string>(() => {
    return localStorage.getItem('last_active_trip_id') || '';
  });
  const [trip, setTrip] = useState<Trip | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [algo, setAlgo] = useState<'optimal' | 'greedy'>('optimal');
  const [copied, setCopied] = useState(false);

  // AI Prompt Bar State
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Manual Form State
  const [showManualModal, setShowManualModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState('Food');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Create Trip Modal State
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newMembers, setNewMembers] = useState<string[]>(['', '']);
  const [creatingTrip, setCreatingTrip] = useState(false);

  // Member Details Drawer State
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<MemberAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // UPI QR Modal State
  const [activeTransfer, setActiveTransfer] = useState<Transfer | null>(null);
  const [customUpiId, setCustomUpiId] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Hi! Ask me anything about your trip expenses, who owes what, or category spending.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Receipt Scan State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; pricePaise: number; assignedTo: string[] }>>([]);
  const [receiptPayer, setReceiptPayer] = useState('');
  const [receiptTaxPaise, setReceiptTaxPaise] = useState(0);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTripData = async (targetId: string, currentAlgo: 'optimal' | 'greedy' = algo) => {
    if (!targetId) return;
    try {
      setLoading(true);
      setError(null);
      const [tripRes, balRes, setRes] = await Promise.all([
        tripApi.getTrip(targetId),
        tripApi.getBalances(targetId),
        tripApi.getSettlement(targetId, currentAlgo),
      ]);
      setTrip(tripRes);
      setBalances(balRes?.balances || []);
      setTransfers(setRes?.transfers || []);
      if (tripRes?.members?.length > 0) {
        setPaidBy(tripRes.members[0].memberId);
      }
      localStorage.setItem('last_active_trip_id', targetId);
    } catch (err: any) {
      console.error('Error loading trip details:', err);
      setError(err.message || 'Error loading trip details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTripsAndInit = async () => {
    try {
      setLoading(true);
      const all = await tripApi.getAllTrips();
      setTripList(all || []);

      if (all && all.length > 0) {
        const stored = localStorage.getItem('last_active_trip_id');
        const match = all.find((t) => t._id === stored);
        const selectedId = match ? match._id : all[0]._id;
        setTripId(selectedId);
        await loadTripData(selectedId, algo);
      } else {
        setShowCreateTripModal(true);
      }
    } catch (e: any) {
      console.error('Could not list trips', e);
      setError(e.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndInit();
  }, []);

  const handleTripChange = (newId: string) => {
    setTripId(newId);
    setSelectedMember(null);
    setAuditData(null);
    setActiveTransfer(null);
    loadTripData(newId, algo);
  };

  const handleAlgoChange = (newAlgo: 'optimal' | 'greedy') => {
    setAlgo(newAlgo);
    if (tripId) {
      loadTripData(tripId, newAlgo);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim() || !tripId) return;

    try {
      setAiLoading(true);
      setAiFeedback(null);
      const res = await tripApi.addAiExpense(tripId, aiText);
      setAiFeedback(`Added: "${res.parsed.description}" (₹${res.parsed.amountPaise / 100})`);
      setAiText('');
      await loadTripData(tripId);
    } catch (err: any) {
      setAiFeedback(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amountRupees || !paidBy || !trip) return;

    try {
      setSubmittingManual(true);
      const paise = Math.round(parseFloat(amountRupees) * 100);
      const payload = {
        clientId: `client_${Date.now()}`,
        type: 'expense',
        paidBy,
        amountPaise: paise,
        description: desc,
        category,
        splitType: 'equal',
        splits: (trip.members || []).map((m) => ({ memberId: m.memberId })),
      };

      await tripApi.addManualExpense(tripId, payload);
      setDesc('');
      setAmountRupees('');
      setShowManualModal(false);
      await loadTripData(tripId);
    } catch (err: any) {
      alert(`Failed to save expense: ${err.message}`);
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMembers = newMembers.map((m) => m.trim()).filter((m) => m.length > 0);
    if (!newTripName.trim() || validMembers.length < 2) {
      alert('Please enter a trip name and at least 2 member names');
      return;
    }

    try {
      setCreatingTrip(true);
      const created = await tripApi.createTrip({
        name: newTripName.trim(),
        currency: 'INR',
        members: validMembers,
      });
      await fetchTripsAndInit();
      setTripId(created._id);
      setShowCreateTripModal(false);
      setNewTripName('');
      setNewMembers(['', '']);
      await loadTripData(created._id);
    } catch (err: any) {
      alert(`Error creating trip: ${err.message}`);
    } finally {
      setCreatingTrip(false);
    }
  };

  const openAuditDrawer = async (memberId: string) => {
    setSelectedMember(memberId);
    try {
      setAuditLoading(true);
      const data = await tripApi.getMemberAudit(tripId, memberId);
      setAuditData(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to remove this expense?')) return;

    try {
      await tripApi.deleteExpense(tripId, expenseId);
      await loadTripData(tripId);
      if (selectedMember) {
        const updatedAudit = await tripApi.getMemberAudit(tripId, selectedMember);
        setAuditData(updatedAudit);
      }
    } catch (err: any) {
      alert(`Could not delete expense: ${err.message}`);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!activeTransfer || !trip) return;

    try {
      setMarkingPaid(true);
      const totalPaise = Number(activeTransfer.amountPaise) || Math.round(Number(activeTransfer.amountRupees) * 100);

      const payload = {
        clientId: `pay_${Date.now()}`,
        type: 'payment',
        paidBy: activeTransfer.fromId,
        amountPaise: totalPaise,
        description: `Settlement: ${activeTransfer.fromName} paid ${activeTransfer.toName}`,
        category: 'Settlement',
        splitType: 'exact',
        splits: [
          { 
            memberId: activeTransfer.toId, 
            exactPaise: totalPaise,
            amountPaise: totalPaise,
            owedPaise: totalPaise
          }
        ],
      };

      await tripApi.addManualExpense(tripId, payload);
      setActiveTransfer(null);
      await loadTripData(tripId);
    } catch (err: any) {
      alert(`Could not record payment: ${err.message}`);
    } finally {
      setMarkingPaid(false);
    }
  };

  const copySettlementSummary = () => {
    if (!trip) return;

    let text = `✈️ *Trip Settlement: ${trip.name}*\n`;
    text += `👥 Members: ${trip.members.map((m) => m.name).join(', ')}\n\n`;

    if (!transfers || transfers.length === 0) {
      text += `✅ Everyone is completely settled up! No transfers needed.\n`;
    } else {
      text += `💰 *Payments to make (${algo === 'optimal' ? 'Fewest Transfers' : 'Direct Pay'}):*\n`;
      transfers.forEach((t) => {
        text += `👉 *${t.fromName}* sends *₹${t.amountRupees}* to *${t.toName}*\n`;
      });
    }

    text += `\n_Generated via Trip Expense Settler_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !trip) return;

    const q = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);

    try {
      setChatLoading(true);
      const res = await tripApi.sendChatMessage(tripId, q);
      setChatMessages((prev) => [...prev, { sender: 'bot', text: res.answer }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setScanningReceipt(true);
        const base64 = reader.result as string;
        const data = await tripApi.parseReceipt(tripId, base64);
        
        const memberIds = trip?.members?.map((m) => m.memberId) || [];
        const rawItems = Array.isArray(data.items) ? data.items : [];
        
        const initialized = rawItems.map((item: any) => ({
          name: item.name || 'Item',
          pricePaise: Number(item.pricePaise) || 0,
          assignedTo: memberIds,
        }));

        setScannedItems(initialized);
        setReceiptTaxPaise(Number(data.taxPaise) || 0);
        if (trip?.members?.length) {
          setReceiptPayer(trip.members[0].memberId);
        }
        setShowReceiptModal(true);
      } catch (err: any) {
        console.error('Scan error:', err);
        alert(`Receipt Scan Failed: ${err.message}`);
      } finally {
        setScanningReceipt(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleItemMember = (itemIdx: number, memberId: string) => {
    setScannedItems((prev) => {
      const clone = [...prev];
      const current = clone[itemIdx].assignedTo;
      if (current.includes(memberId)) {
        clone[itemIdx].assignedTo = current.filter((id) => id !== memberId);
      } else {
        clone[itemIdx].assignedTo = [...current, memberId];
      }
      return clone;
    });
  };

  const handleSaveScannedReceipt = async () => {
    if (!trip || scannedItems.length === 0) return;
    const payer = receiptPayer || trip.members[0]?.memberId;
    const totalAmountPaise = scannedItems.reduce((acc, it) => acc + it.pricePaise, 0) + receiptTaxPaise;

    try {
      const payload = {
        clientId: `rcpt_${Date.now()}`,
        type: 'expense',
        paidBy: payer,
        amountPaise: totalAmountPaise,
        description: 'Restaurant Bill (Scanned Receipt)',
        category: 'Food',
        splitType: 'items',
        items: scannedItems,
        taxPaise: receiptTaxPaise,
        source: 'receipt',
      };

      await tripApi.addManualExpense(tripId, payload);
      setShowReceiptModal(false);
      await loadTripData(tripId);
    } catch (err: any) {
      alert(`Could not save itemized receipt: ${err.message}`);
    }
  };

  // Generate UPI URI
  const upiIdToUse = customUpiId.trim() || `${activeTransfer?.toName.toLowerCase().replace(/\s+/g, '')}@okaxis`;
  const upiLink = activeTransfer
    ? `upi://pay?pa=${encodeURIComponent(upiIdToUse)}&pn=${encodeURIComponent(activeTransfer.toName)}&am=${activeTransfer.amountRupees}&cu=INR&tn=${encodeURIComponent(`Settlement for ${trip?.name || 'Trip'}`)}`
    : '';

  const qrCodeUrl = activeTransfer
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Trip Expense Settler</h1>
            <p className="text-xs text-slate-400">Smart Trip Splitter & Auto Calculator</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Trip Selector Dropdown */}
          <div className="relative flex items-center bg-slate-800/80 rounded-lg px-3 py-1.5 border border-slate-700/80">
            <span className="text-xs text-slate-400 mr-2">Trip:</span>
            <select
              value={tripId}
              onChange={(e) => handleTripChange(e.target.value)}
              className="bg-transparent text-xs text-indigo-300 font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
            >
              {tripList.map((t) => (
                <option key={t._id} value={t._id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
              {!tripList.some((t) => t._id === tripId) && trip && (
                <option value={tripId} className="bg-slate-900 text-white">
                  {trip.name}
                </option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
          </div>

          <button
            onClick={() => setShowCreateTripModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            New Trip
          </button>

          <button
            onClick={() => {
              fetchTripsAndInit();
            }}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title="Refresh details"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Trip Banner */}
        {trip && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full">
                Trip Code: {trip.inviteCode}
              </span>
              <h2 className="text-2xl font-bold mt-2 text-white">{trip.name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                <Users className="w-4 h-4 text-slate-500" />
                {(trip.members || []).map((m) => m.name).join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium text-sm transition-colors text-slate-200 cursor-pointer">
                <Camera className="w-4 h-4 text-indigo-400" />
                {scanningReceipt ? 'Scanning...' : 'Scan Receipt'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowManualModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-sm transition-colors text-white cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Add Expense Manually
              </button>
            </div>
          </div>
        )}

        {/* Quick Add Prompt Bar */}
        <section className="bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/30 border border-indigo-800/40 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-indigo-200">Quick Add with AI</h3>
          </div>
          <form onSubmit={handleAiSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder='Type anything like: "Priya paid 650 for petrol for everyone" or "Anika spent 320 on coffee"'
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiText.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Add Expense
            </button>
          </form>
          {aiFeedback && (
            <p className="mt-3 text-xs text-indigo-300 font-mono bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-900/50">
              {aiFeedback}
            </p>
          )}
        </section>

        {/* Two-Column Grid: Net Balances & Debt Settlement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Member Net Balances */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Who Pays & Who Gets Back
              </h3>
              <span className="text-xs text-slate-500">Click a person to see bill history</span>
            </div>

            <div className="space-y-3 flex-1">
              {(balances || []).map((b) => {
                const isPositive = b.netPaise > 0;
                const isZero = b.netPaise === 0;
                return (
                  <div
                    key={b.memberId}
                    onClick={() => openAuditDrawer(b.memberId)}
                    className="flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl cursor-pointer transition"
                  >
                    <div>
                      <span className="font-medium text-slate-200">{b.name}</span>
                      <span className="block text-[11px] text-slate-500">Click to see details</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isZero
                            ? 'text-slate-400'
                            : isPositive
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? `+₹${b.netRupees}` : isZero ? '₹0.00' : `-₹${Math.abs(Number(b.netRupees)).toFixed(2)}`}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {isPositive ? 'gets back' : isZero ? 'all settled' : 'needs to pay'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Debt Settlement Plan */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                How to Settle Debts
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copySettlementSummary}
                  disabled={!transfers || transfers.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                  title="Copy summary for WhatsApp"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
                  <span>{copied ? 'Copied!' : 'Share'}</span>
                </button>

                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => handleAlgoChange('optimal')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                      algo === 'optimal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fewest Transfers
                  </button>
                  <button
                    onClick={() => handleAlgoChange('greedy')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                      algo === 'greedy' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Direct Pay
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {(!transfers || transfers.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
                  <p className="text-sm">Everyone is all settled up!</p>
                </div>
              ) : (
                transfers.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="w-7 h-7 rounded-full bg-rose-950 border border-rose-800 text-rose-300 flex items-center justify-center text-xs font-bold">
                        {t.fromName?.charAt(0) || '?'}
                      </span>
                      <span className="text-sm text-slate-300 font-medium">{t.fromName}</span>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <span className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center text-xs font-bold">
                        {t.toName?.charAt(0) || '?'}
                      </span>
                      <span className="text-sm text-slate-300 font-medium">{t.toName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-bold text-indigo-400 font-mono">
                          ₹{t.amountRupees}
                        </span>
                        <span className="block text-[10px] text-slate-500">to transfer</span>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTransfer(t);
                          setCustomUpiId('');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium transition cursor-pointer"
                        title="Pay via UPI or scan QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pay UPI</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Itemized Scanned Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Assign Scanned Items
              </h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <label className="text-xs text-slate-400 block mb-1">Who paid the bill at the restaurant?</label>
              <select
                value={receiptPayer || trip?.members?.[0]?.memberId || ''}
                onChange={(e) => setReceiptPayer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {(trip?.members || []).map((m) => (
                  <option key={m.memberId} value={m.memberId}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
              {scannedItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="font-mono text-indigo-400 font-bold">₹{(item.pricePaise / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(trip?.members || []).map((m) => {
                      const active = item.assignedTo.includes(m.memberId);
                      return (
                        <button
                          key={m.memberId}
                          type="button"
                          onClick={() => toggleItemMember(idx, m.memberId)}
                          className={`px-2.5 py-1 text-[11px] rounded-lg border transition ${
                            active
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-medium'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Tax / GST included: <strong className="text-white font-mono">₹{(receiptTaxPaise / 100).toFixed(2)}</strong>
              </span>
              <button
                onClick={handleSaveScannedReceipt}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Confirm & Compute Splits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR & Payment Modal */}
      {activeTransfer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Settle via UPI
              </h3>
              <button
                onClick={() => setActiveTransfer(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                <strong className="text-white">{activeTransfer.fromName}</strong> pays{' '}
                <strong className="text-emerald-400">{activeTransfer.toName}</strong>
              </p>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                ₹{activeTransfer.amountRupees}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl inline-block shadow-inner mx-auto">
              <img
                src={qrCodeUrl}
                alt="UPI QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 text-left">
                Recipient UPI ID (optional customize):
              </label>
              <input
                type="text"
                placeholder={`${activeTransfer.toName.toLowerCase()}@okaxis`}
                value={customUpiId}
                onChange={(e) => setCustomUpiId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <a
              href={upiLink}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              <ExternalLink className="w-4 h-4" />
              Open UPI App (GPay / PhonePe)
            </a>

            <button
              onClick={handleMarkAsPaid}
              disabled={markingPaid}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {markingPaid ? 'Recording...' : 'Mark as Paid in App'}
            </button>
          </div>
        </div>
      )}

      {/* Create New Trip Modal */}
      {showCreateTripModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                Create New Trip
              </h3>
              <button
                onClick={() => setShowCreateTripModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Trip Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pondicherry Road Trip"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Members</label>
                <div className="space-y-2">
                  {newMembers.map((member, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Member ${idx + 1} Name`}
                        value={member}
                        onChange={(e) => {
                          const updated = [...newMembers];
                          updated[idx] = e.target.value;
                          setNewMembers(updated);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                      {newMembers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewMembers(newMembers.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewMembers([...newMembers, ''])}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  + Add Another Member
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTripModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTrip}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  {creatingTrip ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Expense Modal */}
      {showManualModal && trip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Expense Manually</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">What was this for?</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Resort Booking, Grocery, Dinner"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Total Bill (₹)</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Who paid?</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(trip.members || []).map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Food">Food & Drinks</option>
                  <option value="Transport">Transport & Fuel</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  {submittingManual ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Details Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Bill Breakdown & Summary</h3>
                <p className="text-xs text-slate-400">All payments and individual shares</p>
              </div>
              <button
                onClick={() => { setSelectedMember(null); setAuditData(null); }}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-12">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
                Loading history...
              </div>
            ) : auditData ? (
              <div className="space-y-6 mt-6">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <span className="text-xs text-slate-500 block">Total Paid by Them</span>
                    <span className="text-emerald-400 font-bold font-mono text-sm">
                      ₹{((auditData.totalPaidPaise || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Their Actual Share</span>
                    <span className="text-rose-400 font-bold font-mono text-sm">
                      ₹{((auditData.totalOwedPaise || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Itemized Bill History
                  </h4>

                  {(!auditData.breakdown || auditData.breakdown.length === 0) ? (
                    <p className="text-xs text-slate-600 italic">No activity recorded for this member.</p>
                  ) : (
                    <div className="space-y-3">
                      {auditData.breakdown.map((item) => {
                        const isPayer = item.paidByYou > 0;
                        const hasShare = item.yourShare > 0;

                        return (
                          <div
                            key={item.expenseId}
                            className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1">
                              <span className="text-sm text-slate-200 font-medium block">
                                {item.description}
                              </span>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                                <span>Bill: ₹{((item.totalAmountPaise || 0) / 100).toFixed(2)}</span>
                                {isPayer && (
                                  <span className="text-emerald-400 font-medium">
                                    Paid: ₹{((item.paidByYou || 0) / 100).toFixed(2)}
                                  </span>
                                )}
                                {hasShare && (
                                  <span className="text-rose-400 font-medium">
                                    Share: ₹{((item.yourShare || 0) / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`text-xs font-bold font-mono ${
                                  item.netImpactPaise > 0
                                    ? 'text-emerald-400'
                                    : item.netImpactPaise < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {item.netImpactPaise > 0
                                  ? `+₹${((item.netImpactPaise || 0) / 100).toFixed(2)}`
                                  : item.netImpactPaise < 0
                                  ? `-₹${((Math.abs(item.netImpactPaise) || 0) / 100).toFixed(2)}`
                                  : '₹0.00'}
                              </span>

                              <button
                                onClick={() => handleDeleteExpense(item.expenseId)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                                title="Delete this bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer z-40 flex items-center justify-center"
        title="Open AI Trip Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Floating Chat Drawer */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 w-96 max-w-[calc(100vw-2rem)] h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Trip AI Assistant</h4>
                <p className="text-[10px] text-slate-400">Powered by tool-calling</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[80%] whitespace-pre-line leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Ask about bills, owes, totals..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}