

export type SplitType = 'equal' | 'shares' | 'exact' | 'percent' | 'nights' | 'items';

export interface SplitInput {
  memberId: string;
  weight?: number;      // for 'shares' or 'nights'
  exactPaise?: number;  // for 'exact'
  percent?: number;     // for 'percent'
}

export interface SplitAllocation {
  memberId: string;
  owedPaise: number;
}

export interface ItemAllocationInput {
  name: string;
  pricePaise: number;
  assignedTo: string[]; // memberIds sharing this specific item
}

export interface ItemizedExpenseInput {
  items: ItemAllocationInput[];
  taxPaise?: number;
  servicePaise?: number;
}

export interface ExpenseRecord {
  _id?: string;
  tripId: string;
  type: 'expense' | 'payment';
  paidBy: string; // memberId
  amountPaise: number;
  splits: SplitAllocation[]; // owed per member
  deletedAt?: Date | null;
}

export interface MemberBalance {
  memberId: string;
  netPaise: number; // positive = creditor (is owed), negative = debtor (owes)
}

export interface Transfer {
  from: string; // debtor memberId
  to: string;   // creditor memberId
  amountPaise: number;
}