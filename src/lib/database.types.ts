/**
 * TypeScript types for the unified/shared external Supabase schema.
 * Source of truth: the SQL schema provided by the project owner.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type DeliveryMode = 'at_shop' | 'at_home';
export type UserRole = 'customer' | 'provider';
export type NotificationType =
  | 'booking_confirmed'
  | 'booking_completed'
  | 'new_message'
  | 'review_received'
  | 'promotion';
export type DocumentType = string; // USER-DEFINED in schema
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type Gender = 'male' | 'female' | 'other';

// ─── Row types ───

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  gender: Gender | null;
  date_of_birth: string | null;
  business_name: string | null;
  business_description: string | null;
  business_registration_number: string | null;
  tax_id: string | null;
  owner_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  subcategories: string[] | null;
  cover_image_url: string | null;
  business_logo_url: string | null;
  average_rating: number | null;
  review_count: number | null;
  total_bookings: number | null;
  is_verified: boolean | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  verification_date: string | null;
  business_hours: Json | null;
  bio: string | null;
  website: string | null;
  social_links: Json | null;
  fcm_token: string | null;
  notification_preferences: Json | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  username: string | null;
  is_promoted: boolean | null;
  cover_photo_url: string | null;
  rating: number | null;
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  price: number;
  currency: string | null;
  duration_minutes: number;
  is_active: boolean | null;
  is_featured: boolean | null;
  delivery_modes: DeliveryMode[] | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  duration: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: BookingStatus;
  delivery_mode: DeliveryMode;
  booking_date: string;
  booking_time: string;
  service_price: number;
  discount_amount: number | null;
  total_price: number;
  currency: string | null;
  notes: string | null;
  customer_location: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
  cancelled_by_role: UserRole | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  booking_time_text: string | null;
  business_user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string | null;
  price: number | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  provider_id: string;
  created_at: string;
}

export interface FcmToken {
  id: string;
  user_id: string;
  token: string;
  platform: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_booking_id: string | null;
  related_provider_id: string | null;
  data: Json | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  message: string | null;
  type_enum: string | null;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  business_user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_bookings: number | null;
  last_booking_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  profile_id: string;
  document_type: DocumentType;
  document_number: string;
  document_url: string;
  status: DocumentStatus | null;
  verification_date: string | null;
  verification_notes: string | null;
  verified_by_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  service_id: string | null;
  is_active: boolean | null;
  start_date: string;
  end_date: string | null;
  usage_limit: number | null;
  usage_count: number | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

// ─── Database interface for createClient<ExternalDatabase> ───

export interface ExternalDatabase {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { user_id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      services: {
        Row: Service;
        Insert: Partial<Service> & { provider_id: string; name: string; category: string; price: number };
        Update: Partial<Service>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: Partial<Booking> & {
          customer_id: string;
          provider_id: string;
          service_id: string;
          booking_date: string;
          booking_time: string;
          service_price: number;
          total_price: number;
        };
        Update: Partial<Booking>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Partial<Favorite> & { user_id: string; provider_id: string };
        Update: Partial<Favorite>;
        Relationships: [];
      };
      fcm_tokens: {
        Row: FcmToken;
        Insert: Partial<FcmToken> & { user_id: string; token: string };
        Update: Partial<FcmToken>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          booking_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & {
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
        };
        Update: Partial<Notification>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Partial<Review> & {
          booking_id: string;
          customer_id: string;
          provider_id: string;
          rating: number;
        };
        Update: Partial<Review>;
        Relationships: [];
      };
      availability: {
        Row: Availability;
        Insert: Partial<Availability> & {
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Availability>;
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: Partial<Client> & { business_user_id: string; name: string };
        Update: Partial<Client>;
        Relationships: [];
      };
      documents: {
        Row: Document;
        Insert: Partial<Document> & {
          profile_id: string;
          document_type: DocumentType;
          document_number: string;
          document_url: string;
        };
        Update: Partial<Document>;
        Relationships: [];
      };
      gallery_photos: {
        Row: GalleryPhoto;
        Insert: Partial<GalleryPhoto> & { user_id: string; photo_url: string };
        Update: Partial<GalleryPhoto>;
        Relationships: [];
      };
      promotions: {
        Row: Promotion;
        Insert: Partial<Promotion> & {
          provider_id: string;
          title: string;
          discount_type: 'percentage' | 'fixed_amount';
          discount_value: number;
        };
        Update: Partial<Promotion>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
      delivery_mode: DeliveryMode;
      user_role: UserRole;
      notification_type: NotificationType;
      document_status: DocumentStatus;
      gender: Gender;
    };
    CompositeTypes: Record<string, never>;
  };
}
