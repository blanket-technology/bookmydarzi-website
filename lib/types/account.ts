// Types mirroring the real BookMyDarzi backend response schemas exactly
// (app/schemas/customer_order.py, app/schemas/address.py,
// app/schemas/measurement.py, app/schemas/user.py) - snake_case field names
// as returned over the wire, no client-side aliasing/guessing.

// ─── Orders: GET /customer/orders/active | completed | cancelled ──────────

export interface CustomerOrderListItem {
  order_id: number;
  order_code: string | null;
  service_name: string | null;
  category_name: string | null;
  price: number;
  payment_status: string;
  payment_method: string | null;
  status: string;
  expected_delivery_date: string | null;
  completed_at?: string | null;
  created_at: string | null;
  thumbnail: string | null;
  pickup_type: string | null;
  pickup_time_slot: string | null;
  scheduled_pickup_at: string | null;
  cancelled_at?: string | null;
  reason?: string | null;
  penalty_amount?: number;
  refund_amount?: number;
}

export interface PaginatedOrderList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Order details: GET /customer/orders/{id}/details ─────────────────────

export interface CustomerPickupPartner {
  name: string;
  photo_url: string | null;
  mobile: string | null;
}

export interface CustomerDetailsOrder {
  order_id: number;
  order_code: string | null;
  status: string;
  customer_status: string | null;
  urgency_level: string | null;
  pickup_type: string | null;
  pickup_time_slot: string | null;
  scheduled_pickup_at: string | null;
  image_references: string[] | null;
  customization_notes: string | null;
  pickup_partner: CustomerPickupPartner | null;
}

export interface CustomerDetailsService {
  service_id: number | null;
  service_name: string | null;
  category_name: string | null;
  base_price: number | null;
}

export interface CustomerMeasurementSnapshot {
  profile_name: string | null;
  gender: string | null;
  fit: string | null;
  neck: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  shoulder: number | null;
  sleeve_length: number | null;
  inseam: number | null;
  height: number | null;
  notes: string | null;
}

export interface CustomerOrderLineItem {
  order_item_id: number | null;
  person_name: string | null;
  service_id: number | null;
  service_name: string | null;
  category_name: string | null;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  measurement: CustomerMeasurementSnapshot | null;
  stitching_preferences: Record<string, unknown> | null;
}

export interface CustomerDetailsAddress {
  name: string | null;
  mobile: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
}

export interface CustomerPaymentSnapshot {
  payment_method: string | null;
  payment_status: string;
  transaction_id: string | null;
  amount: number;
}

export interface CustomerPricingSnapshot {
  base_amount: number;
  discount_amount: number;
  platform_fee: number;
  service_fee: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  penalty_amount: number;
  final_amount: number;
  advance_amount: number;
  remaining_amount: number;
}

export interface CustomerTimelineEntry {
  status: string;
  timestamp: string | null;
}

export interface CustomerOrderDetailsResponse {
  order: CustomerDetailsOrder;
  service: CustomerDetailsService;
  measurement: CustomerMeasurementSnapshot | null;
  line_items: CustomerOrderLineItem[];
  delivery_address: CustomerDetailsAddress | null;
  payment: CustomerPaymentSnapshot;
  pricing: CustomerPricingSnapshot;
  tracking_timeline: CustomerTimelineEntry[];
  pending_penalty_amount: number | null;
}

// ─── Profile: GET /users/profile, PATCH /users/profile ────────────────────

export interface ProfileEditForm {
  first_name: string;
  last_name: string;
  email: string | null;
  gender: string | null;
  profile_image: string | null;
  photo_upload_path: string;
  phone: string | null;
  address: string | null;
}

export interface UserProfile {
  Id: number;
  UserCode: string | null;
  FirstName: string;
  MiddleName: string | null;
  LastName: string;
  Email: string | null;
  FullName: string | null;
  SuggestedMeasurementProfileName: string | null;
  Address: string | null;
  DefaultAddressId: number | null;
  Mobile: string | null;
  Role: string;
  IsActive: boolean;
  IsEmailVerified: boolean;
  IsMobileVerified: boolean;
  ProfileImage: string | null;
  ProfileImageUrl: string | null;
  Gender: string | null;
  EditProfile: ProfileEditForm | null;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  gender?: string;
  email?: string;
}

// ─── Addresses: /users/addresses ───────────────────────────────────────────

export type AddressType = "home" | "office" | "other";

export interface Address {
  id: number;
  user_id: number;
  full_name: string;
  mobile: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  address_type: AddressType;
  is_default: boolean;
  can_delete: boolean;
  delete_path: string;
  created_at: string;
  updated_at: string | null;
}

export interface AddressListResponse {
  addresses: Address[];
  total: number;
  default_address_id: number | null;
  delete_address_path_template: string;
}

export interface AddressPayload {
  full_name: string;
  mobile: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  address_type: AddressType;
  is_default?: boolean;
  // Required by the backend before an address can be saved - see
  // app/services/location/serviceability_service.py's assert_serviceable,
  // which 422s ("needs a precise location") when either is null. Populated
  // via lib/useAddressLocation.ts (browser geolocation -> /location/reverse-
  // geocode + /location/check-serviceability), mirroring react_app/app/
  // address.tsx's gpsCoords flow.
  latitude: number | null;
  longitude: number | null;
}

// ─── Measurements: /users/measurements ─────────────────────────────────────

export type MeasurementGender = "male" | "female" | "kids" | "other";
export type FitPreference = "slim" | "regular" | "loose";

export interface Measurement {
  id: number;
  user_id: number;
  profile_name: string;
  gender: MeasurementGender | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  shoulder: number | null;
  neck: number | null;
  sleeve_length: number | null;
  inseam: number | null;
  height: number | null;
  fit_preference: FitPreference | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface MeasurementListResponse {
  measurements: Measurement[];
  total: number;
  default_measurement_id: number | null;
  suggested_profile_name: string | null;
}

/** PATCH-only, per product decision: customers may edit an existing
 * measurement profile but never create or delete one from this app -
 * profiles are created by staff at pickup. */
export interface MeasurementUpdatePayload {
  profile_name?: string | null;
  gender?: MeasurementGender | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulder?: number | null;
  neck?: number | null;
  sleeve_length?: number | null;
  inseam?: number | null;
  height?: number | null;
  fit_preference?: FitPreference | null;
  notes?: string | null;
  is_default?: boolean;
}
