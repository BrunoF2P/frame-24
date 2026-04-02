export interface RequestUser {
  sub: string;
  identity_id: string;
  company_user_id: string;
  employee_id: string;
  email: string;
  name: string;
  tenant_slug: string;
  company_id: string;
  role_id: string;
  role: string;
  role_hierarchy: number;
  permissions: string[];
  session_context: 'EMPLOYEE';
}

export interface CustomerUser {
  sub: string;
  identity_id: string;
  customer_id: string;
  company_id: string;
  email: string;
  name: string;
  tenant_slug: string;
  session_context: 'CUSTOMER';
  loyalty_level?: string;
  accumulated_points?: number;
}
