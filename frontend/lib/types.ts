// Shapes returned by the excursi-backend API (subset used by the traveler UI).

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ExperienceCard {
  id: string;
  slug: string;
  title: string;
  destination: string | null;
  gallery: string[] | null;
  category: { name: string; slug: string } | null;
  fromPrice: number | null;
  currency: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExperienceListResponse {
  items: ExperienceCard[];
  pagination: Pagination;
}

export interface ItineraryStep {
  title: string;
  description?: string;
}

export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  totalCapacity: number;
  availableCapacity: number;
}

export interface Option {
  id: string;
  name: string;
  price: string; // Decimal serialized as string
  currency: string;
  capacity: number;
  durationMinutes: number;
  slots: Slot[];
}

export interface ExperienceDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  destination: string | null;
  itinerary: ItineraryStep[] | null;
  inclusions: string[] | null;
  gallery: string[] | null;
  status: string;
  operator: { id: string; businessName: string };
  category: { name: string; slug: string } | null;
  options: Option[];
}

export interface ExperienceFilters {
  q?: string;
  destination?: string;
  category?: string;
  date?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
}

export type Role = "TRAVELER" | "OPERATOR" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface MyBooking {
  id: string;
  adults: number;
  kids: number;
  totalAmount: string;
  currency: string;
  status: BookingStatus;
  createdAt: string;
  experience: { title: string; slug: string };
  option: { name: string; durationMinutes: number };
  slot: { startTime: string; endTime: string };
  payment: { status: string; provider: string } | null;
}

export interface CreateOrderResponse {
  bookingId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  provider: "razorpay" | "mock";
}
