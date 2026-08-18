import { apiClient } from './api-config';

export interface ProductStock {
  id: string;
  product_id: string;
  complex_id: string;
  current_quantity: number;
  minimum_quantity: number;
  maximum_quantity: number;
  location?: string;
  active: boolean;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  complex_id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  current_quantity: number;
  unit_value?: string;
  total_value?: string;
  origin_type?: string;
  origin_id?: string;
  movement_date: string;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string;
  category_name?: string;
  product_code: string;
  name: string;
  description: string | null;
  image_url: string | null;
  ncm_code: string | null;
  unit: string | null;
  minimum_stock: number | null;
  supplier_id: string | null;
  barcode: string | null;
  is_available_online: boolean | null;
  active: boolean | null;
  created_at: string;
}

export const StockService = {
  async getProductStock(complex_id?: string) {
    const response = await apiClient.get('/v1/stock/products', {
      params: complex_id ? { complex_id } : undefined,
    });
    return (response.data ?? []) as ProductStock[];
  },

  async getLowStockProducts(complex_id?: string) {
    const response = await apiClient.get('/v1/stock/products/low-stock', {
      params: complex_id ? { complex_id } : undefined,
    });
    return (response.data ?? []) as ProductStock[];
  },

  async getStockMovements(filters?: {
    product_id?: string;
    complex_id?: string;
    movement_type?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await apiClient.get('/v1/stock/movements', { params: filters });
    return (response.data ?? []) as StockMovement[];
  },

  async getProducts() {
    const response = await apiClient.get('/v1/products', { params: { active: 'true' } });
    return (response.data ?? []) as Product[];
  },

  async getSuppliers() {
    const response = await apiClient.get('/v1/suppliers');
    return (response.data ?? []) as unknown[];
  },
};
