// src/engine/aiParser.ts
import { ITripMember } from '../models/Trip';
import { AiLog } from '../models/AiLog';
import { Types } from 'mongoose';

export interface ParsedExpenseOutput {
  description: string;
  amountPaise: number;
  paidByMemberId: string;
  category: string;
  splitType: 'equal' | 'shares' | 'exact' | 'percent';
  splits: { memberId: string }[];
  confidence: number;
}

/**
 * Fallback heuristic parser that runs locally with zero API latency or cost.
 */
function heuristicParse(text: string, members: ITripMember[]): ParsedExpenseOutput {
  const lower = text.toLowerCase();

  // 1. Extract amount (looks for ₹, rs, or raw numbers)
  const amountMatch = text.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  const amountPaise = Math.round(amount * 100);

  // 2. Identify who paid
  let paidMember = members[0]; // default to first member
  for (const m of members) {
    const nameLower = m.name.toLowerCase();
    if (new RegExp(`\\b${nameLower}\\s+(?:paid|spent|bought)\\b`, 'i').test(text)) {
      paidMember = m;
      break;
    }
  }

  // 3. Identify who is involved in the split
  const involvedMembers: ITripMember[] = [];
  const forMatch = text.match(/\bfor\s+(.*)$/i);

  if (forMatch) {
    const candidateClause = forMatch[1].toLowerCase();
    if (candidateClause.includes('all') || candidateClause.includes('everyone')) {
      involvedMembers.push(...members);
    } else {
      for (const m of members) {
        if (candidateClause.includes(m.name.toLowerCase())) {
          involvedMembers.push(m);
        }
      }
    }
  }

  // Default to all members if none explicitly isolated
  const finalMembers = involvedMembers.length > 0 ? involvedMembers : members;

  // 4. Category guess
  let category = 'General';
  if (/snack|dinner|lunch|breakfast|food|coffee|tea|cafe|restaurant/i.test(text)) {
    category = 'Food';
  } else if (/taxi|uber|ola|auto|petrol|fuel|toll|metro|train/i.test(text)) {
    category = 'Transport';
  } else if (/hotel|room|stay|resort/i.test(text)) {
    category = 'Accommodation';
  } else if (/ticket|movie|entry|show/i.test(text)) {
    category = 'Entertainment';
  }

  // 5. Clean description
  let description = text.trim();
  const descMatch = text.match(/(?:for|on)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:for|between|among)|\s*$)/i);
  if (descMatch && descMatch[1].trim().length > 2) {
    description = descMatch[1].trim();
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    description,
    amountPaise,
    paidByMemberId: paidMember.memberId,
    category,
    splitType: 'equal',
    splits: finalMembers.map((m) => ({ memberId: m.memberId })),
    confidence: 0.92,
  };
}

/**
 * Main parse function with automatic fallback and MongoDB audit logging.
 */
export async function parseNaturalLanguageExpense(params: {
  tripId: string | Types.ObjectId;
  text: string;
  members: ITripMember[];
}): Promise<ParsedExpenseOutput> {
  const startTime = Date.now();
  const { tripId, text, members } = params;

  let parsed: ParsedExpenseOutput;

  // Check if an external LLM key is available (e.g., GROQ_API_KEY)
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You extract expense details from conversational text.
Available members: ${JSON.stringify(members.map((m) => ({ id: m.memberId, name: m.name })))}.
Return JSON matching:
{
  "description": string,
  "amountPaise": number (total amount in paise, 1 INR = 100 paise),
  "paidByMemberId": string,
  "category": "Food" | "Transport" | "Accommodation" | "Entertainment" | "General",
  "involvedMemberIds": string[]
}`,
            },
            { role: 'user', content: text },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = JSON.parse(json.choices[0].message.content);
        parsed = {
          description: content.description || 'Expense',
          amountPaise: content.amountPaise || 0,
          paidByMemberId: content.paidByMemberId || members[0].memberId,
          category: content.category || 'General',
          splitType: 'equal',
          splits: (content.involvedMemberIds || members.map((m) => m.memberId)).map((id: string) => ({
            memberId: id,
          })),
          confidence: 0.98,
        };
      } else {
        parsed = heuristicParse(text, members);
      }
    } catch {
      parsed = heuristicParse(text, members);
    }
  } else {
    parsed = heuristicParse(text, members);
  }

  // Audit log into AiLog collection
  try {
    await AiLog.create({
      tripId: new Types.ObjectId(tripId.toString()),
      inputText: text,
      source: 'nl_text',
      parsedOutput: parsed,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error('Failed to write AI audit log:', err);
  }

  return parsed;
}