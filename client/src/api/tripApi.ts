// client/src/api/tripApi.ts

// In development, empty '' lets requests hit '/api' which Vite proxies and rewrites.
// In production on Netlify, VITE_API_URL points directly to your Render backend (e.g. https://trip-settler-api.onrender.com).
const BASE_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') 
  : '/api';

export interface Member {
  memberId: string;
  name: string;
}

export interface Trip {
  _id: string;
  name: string;
  currency: string;
  members: Member[];
  inviteCode: string;
}

export interface Balance {
  memberId: string;
  name: string;
  netPaise: number;
  netRupees: string;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountPaise: number;
  amountRupees: string;
}

export interface AuditItem {
  expenseId: string;
  description: string;
  date: string;
  totalAmountPaise: number;
  paidByYou: number;
  yourShare: number;
  netImpactPaise: number;
}

export interface MemberAudit {
  memberId: string;
  totalPaidPaise: number;
  totalOwedPaise: number;
  netBalancePaise: number;
  breakdown: AuditItem[];
}

export const tripApi = {
  async getTrip(tripId: string): Promise<Trip> {
    const res = await fetch(`${BASE_URL}/trips/${tripId}`);
    if (!res.ok) throw new Error('Failed to fetch trip details');
    return res.json();
  },

  async getBalances(tripId: string): Promise<{ balances: Balance[] }> {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/balances`);
    if (!res.ok) throw new Error('Failed to fetch balances');
    return res.json();
  },

  async getSettlement(tripId: string, algo: 'optimal' | 'greedy' = 'optimal'): Promise<{
    algorithm: string;
    transferCount: number;
    transfers: Transfer[];
  }> {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/settlement?algo=${algo}`);
    if (!res.ok) throw new Error('Failed to fetch settlement');
    return res.json();
  },

  async getMemberAudit(tripId: string, memberId: string): Promise<MemberAudit> {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/members/${memberId}/explain`);
    if (!res.ok) throw new Error('Failed to fetch audit breakdown');
    return res.json();
  },

  async addAiExpense(tripId: string, text: string) {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, autoCreate: true }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to parse AI expense');
    }
    return res.json();
  },

  async addManualExpense(tripId: string, payload: any) {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save expense');
    }
    return res.json();
  },

  async createTrip(payload: { name: string; currency?: string; members: string[] }): Promise<Trip> {
    const res = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create new trip');
    }
    return res.json();
  },

  async deleteExpense(tripId: string, expenseId: string) {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete expense');
    }
    return res.json();
  },

  async getAllTrips(): Promise<Trip[]> {
    const res = await fetch(`${BASE_URL}/trips`);
    if (!res.ok) throw new Error('Failed to fetch trips');
    return res.json();
  },

  async sendChatMessage(tripId: string, question: string) {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send chat message');
    }
    return res.json();
  },

  async parseReceipt(tripId: string, imageBase64: string) {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/receipts/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to scan receipt');
    }
    return res.json();
  },
};