import { BaseEntity } from '../types';

export interface Budget extends BaseEntity {
  categoryId: string;
  amount: number;
  month: number; // 1-12
  year: number;
}

export interface CreateBudgetInput {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}

export interface UpdateBudgetInput {
  id: string;
  amount?: number;
}

export interface BudgetWithProgress extends Budget {
  categoryName: string;
  categoryColor?: string;
  categoryIcon?: string;
  spent: number;
  remaining: number;
  percentage: number;
}
