// src/models/Expense.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpenseSplit {
  memberId: string;
  owedPaise: number;
}

export interface IExpenseItem {
  name: string;
  pricePaise: number;
  assignedTo: string[];
}

export interface IExpense extends Document {
  tripId: Types.ObjectId;
  clientId: string;
  type: 'expense' | 'payment';
  paidBy: string;
  amountPaise: number;
  description: string;
  category: string;
  date: Date;
  splitType: 'equal' | 'shares' | 'exact' | 'percent' | 'nights' | 'items';
  splits: IExpenseSplit[];
  items?: IExpenseItem[];
  taxPaise: number;
  servicePaise: number;
  source: 'manual' | 'nl' | 'receipt';
  deletedAt?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSplitSchema = new Schema<IExpenseSplit>(
  {
    memberId: { type: String, required: true },
    owedPaise: { type: Number, required: true },
  },
  { _id: false }
);

const expenseItemSchema = new Schema<IExpenseItem>(
  {
    name: { type: String, required: true },
    pricePaise: { type: Number, required: true },
    assignedTo: [{ type: String, required: true }],
  },
  { _id: false }
);

const expenseSchema = new Schema<IExpense>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    clientId: { type: String, required: true },
    type: { type: String, enum: ['expense', 'payment'], default: 'expense' },
    paidBy: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    date: { type: Date, default: Date.now },
    splitType: {
      type: String,
      enum: ['equal', 'shares', 'exact', 'percent', 'nights', 'items'],
      required: true,
    },
    splits: [expenseSplitSchema],
    items: [expenseItemSchema],
    taxPaise: { type: Number, default: 0 },
    servicePaise: { type: Number, default: 0 },
    source: { type: String, enum: ['manual', 'nl', 'receipt'], default: 'manual' },
    deletedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound index for idempotency
expenseSchema.index({ tripId: 1, clientId: 1 }, { unique: true });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);