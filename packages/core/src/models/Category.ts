import { BaseEntity, CategoryType } from '../types';

export interface Category extends BaseEntity {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  parentId?: string;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string;
  parentId?: string | null; // null to explicitly remove parent
  isActive?: boolean;
}
