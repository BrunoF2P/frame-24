export interface Movie {
  id: string;
  original_title: string;
  brazil_title?: string;
  duration_minutes: number;
  release_date?: string;
  national: boolean;
  active: boolean;
  age_rating?: {
    code: string;
    name: string;
  };
  distributor?: {
    trade_name: string;
  };
}
