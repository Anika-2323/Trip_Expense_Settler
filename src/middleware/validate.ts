// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e: any) => ({
            field: e.path ? e.path.join('.') : 'field',
            message: e.message,
          })),
        });
      }
      return res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

export const CreateExpenseSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  type: z.enum(['expense', 'payment']).default('expense'),
  paidBy: z.string().min(1, 'paidBy memberId is required'),
  amountPaise: z.number().int().positive('amountPaise must be a positive integer'),
  description: z.string().min(1, 'description is required'),
  category: z.string().optional().default('General'),
  date: z.string().optional(),
  splitType: z.enum(['equal', 'shares', 'exact', 'percent', 'nights', 'items']),
  splits: z
    .array(
      z.object({
        memberId: z.string().min(1),
        weight: z.number().positive().optional(),
        exactPaise: z.number().int().nonnegative().optional(),
        percent: z.number().positive().optional(),
      })
    )
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        pricePaise: z.number().int().positive(),
        assignedTo: z.array(z.string().min(1)).min(1),
      })
    )
    .optional(),
  taxPaise: z.number().int().nonnegative().optional(),
  servicePaise: z.number().int().nonnegative().optional(),
  source: z.enum(['manual', 'nl', 'receipt']).default('manual'),
});