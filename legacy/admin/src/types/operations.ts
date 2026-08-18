export interface SeatType {
  id: string;
  name: string;
  description?: string;
  additional_value?: number;
}

export interface Seat {
  id: string;
  room_id: string;
  seat_type: string | null;
  seat_code: string;
  row_code: string;
  column_number: number;
  accessible: boolean;
  active: boolean;
  seat_types?: SeatType;
}

export interface Room {
  id: string;
  cinema_complex_id: string;
  room_number: string;
  name: string | null;
  capacity: number;
  projection_type: string | null;
  audio_type: string | null;
  active: boolean | null;
  seat_layout: string | null;
  total_rows: number | null;
  total_columns: number | null;
  room_design: string | null;
  layout_image: string | null;
  projection_types?: { id: string; name: string };
  audio_types?: { id: string; name: string };
  seats?: Seat[];
}

export interface CinemaComplex {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  active?: boolean | null;
  rooms?: Room[];
}

export interface ProjectionType {
  id: string;
  name: string;
}

export interface AudioType {
  id: string;
  name: string;
}

export interface SeatLayoutRow {
  row_code: string;
  seats: SeatLayoutItem[];
}

export interface SeatLayoutItem {
  column_number: number;
  seat_type_id: string | null;
  accessible: boolean;
}
