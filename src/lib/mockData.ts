import barbersImg from "@/assets/categories/barbers.jpg";
import makeupImg from "@/assets/categories/makeup-artists.jpg";
import nailsImg from "@/assets/categories/nail-techs.jpg";
import eventImg from "@/assets/categories/event-planners.jpg";
import cakeImg from "@/assets/categories/cake-vendors.jpg";
import photographersImg from "@/assets/categories/photographers.jpg";
import hairdressersImg from "@/assets/categories/hairdressers.jpg";
import caterersImg from "@/assets/categories/caterers.jpg";

export interface MockProvider {
  id: string;
  name: string;
  category: string;
  image: string;
  coverImage: string;
  avatarImage: string;
  rating: number;
  reviewCount: number;
  city: string;
  address: string;
  isNew?: boolean;
  isVerified?: boolean;
  isPromoted?: boolean;
  totalBookings: number;
  description: string;
  businessHours: { day: string; hours: string }[];
  message?: string;
  services: MockService[];
  photos: string[];
}

export interface MockService {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  image?: string;
}

export const mockProviders: MockProvider[] = [
  {
    id: "p1",
    name: "Glowup by Chisom",
    category: "Makeup Artists",
    image: makeupImg,
    coverImage: makeupImg,
    avatarImage: makeupImg,
    rating: 5.0,
    reviewCount: 28,
    city: "Ikoyi",
    address: "10 Kingsway Road, Ikoyi",
    isNew: true,
    isVerified: true,
    isPromoted: true,
    totalBookings: 156,
    description: "Bridal and event makeup artistry. Airbrush, HD, and SFX makeup available.",
    message: "All clients must come with a clean face. No skin products before the appointment.",
    businessHours: [
      { day: "Sunday", hours: "Closed" },
      { day: "Monday", hours: "09:00 – 18:00" },
      { day: "Tuesday", hours: "09:00 – 18:00" },
      { day: "Wednesday", hours: "09:00 – 18:00" },
      { day: "Thursday", hours: "09:00 – 18:00" },
      { day: "Friday", hours: "09:00 – 18:00" },
      { day: "Saturday", hours: "10:00 – 16:00" },
    ],
    services: [
      { id: "s1", name: "Full Glam Makeup", price: 20000, duration: 90, description: "Full beat face for events and photoshoots" },
      { id: "s2", name: "Bridal Makeup", price: 50000, duration: 180, description: "Includes trial session + wedding day makeup" },
    ],
    photos: [makeupImg],
  },
  {
    id: "p2",
    name: "KingsCuts Barbershop",
    category: "Barbers",
    image: barbersImg,
    coverImage: barbersImg,
    avatarImage: barbersImg,
    rating: 4.9,
    reviewCount: 43,
    city: "Ikeja",
    address: "15 Allen Avenue, Ikeja",
    isVerified: true,
    isPromoted: true,
    totalBookings: 312,
    description: "Premium barbershop offering classic and modern cuts. Walk-ins welcome.",
    businessHours: [
      { day: "Sunday", hours: "Closed" },
      { day: "Monday", hours: "08:00 – 20:00" },
      { day: "Tuesday", hours: "08:00 – 20:00" },
      { day: "Wednesday", hours: "08:00 – 20:00" },
      { day: "Thursday", hours: "08:00 – 20:00" },
      { day: "Friday", hours: "08:00 – 20:00" },
      { day: "Saturday", hours: "09:00 – 18:00" },
    ],
    services: [
      { id: "s3", name: "Classic Haircut", price: 2500, duration: 45, description: "Clean cut with hot towel finish" },
      { id: "s4", name: "Beard Trim", price: 1500, duration: 30, description: "Shape and trim with precision" },
      { id: "s5", name: "Full Grooming", price: 5000, duration: 90, description: "Haircut + beard + facial treatment" },
    ],
    photos: [barbersImg],
  },
  {
    id: "p3",
    name: "Glam Nails Studio",
    category: "Nail Techs",
    image: nailsImg,
    coverImage: nailsImg,
    avatarImage: nailsImg,
    rating: 4.7,
    reviewCount: 65,
    city: "Lekki",
    address: "23 Admiralty Way, Lekki",
    isVerified: true,
    totalBookings: 489,
    description: "Premium nail art and care. Gel, acrylic, and natural nail services.",
    businessHours: [
      { day: "Sunday", hours: "12:00 – 18:00" },
      { day: "Monday", hours: "09:00 – 19:00" },
      { day: "Tuesday", hours: "09:00 – 19:00" },
      { day: "Wednesday", hours: "09:00 – 19:00" },
      { day: "Thursday", hours: "09:00 – 19:00" },
      { day: "Friday", hours: "09:00 – 19:00" },
      { day: "Saturday", hours: "10:00 – 18:00" },
    ],
    services: [
      { id: "s6", name: "Gel Manicure", price: 8000, duration: 60, description: "Long-lasting gel polish with nail care" },
      { id: "s7", name: "Acrylic Full Set", price: 15000, duration: 120, description: "Full set acrylic nails with design" },
      { id: "s8", name: "Pedicure", price: 5000, duration: 45, description: "Foot soak, scrub, and polish" },
    ],
    photos: [nailsImg],
  },
  {
    id: "p4",
    name: "Royal Events NG",
    category: "Event Planners",
    image: eventImg,
    coverImage: eventImg,
    avatarImage: eventImg,
    rating: 4.6,
    reviewCount: 19,
    city: "Victoria Island",
    address: "5 Ozumba Mbadiwe, VI",
    isVerified: true,
    isPromoted: true,
    totalBookings: 87,
    description: "Full-service event planning for weddings, corporate events, and parties.",
    businessHours: [
      { day: "Sunday", hours: "Closed" },
      { day: "Monday", hours: "09:00 – 17:00" },
      { day: "Tuesday", hours: "09:00 – 17:00" },
      { day: "Wednesday", hours: "09:00 – 17:00" },
      { day: "Thursday", hours: "09:00 – 17:00" },
      { day: "Friday", hours: "09:00 – 17:00" },
      { day: "Saturday", hours: "10:00 – 15:00" },
    ],
    services: [
      { id: "s9", name: "Wedding Planning", price: 500000, duration: 480, description: "Full wedding coordination and design" },
      { id: "s10", name: "Birthday Party", price: 150000, duration: 360, description: "Complete birthday event setup" },
    ],
    photos: [eventImg],
  },
  {
    id: "p5",
    name: "Sweet Cakes Lagos",
    category: "Cake Vendors",
    image: cakeImg,
    coverImage: cakeImg,
    avatarImage: cakeImg,
    rating: 4.9,
    reviewCount: 52,
    city: "Surulere",
    address: "44 Bode Thomas St, Surulere",
    isVerified: true,
    totalBookings: 234,
    description: "Custom cakes for all occasions. Wedding, birthday, and celebration cakes.",
    businessHours: [
      { day: "Sunday", hours: "Closed" },
      { day: "Monday", hours: "08:00 – 18:00" },
      { day: "Tuesday", hours: "08:00 – 18:00" },
      { day: "Wednesday", hours: "08:00 – 18:00" },
      { day: "Thursday", hours: "08:00 – 18:00" },
      { day: "Friday", hours: "08:00 – 18:00" },
      { day: "Saturday", hours: "09:00 – 16:00" },
    ],
    services: [
      { id: "s11", name: "Birthday Cake", price: 25000, duration: 1440, description: "Custom 2-tier birthday cake" },
      { id: "s12", name: "Wedding Cake", price: 120000, duration: 4320, description: "3-tier fondant wedding cake" },
      { id: "s13", name: "Cupcake Box (12)", price: 8000, duration: 720, description: "Box of 12 assorted cupcakes" },
    ],
    photos: [cakeImg],
  },
  {
    id: "p6",
    name: "SnapPerfect Photography",
    category: "Photographers",
    image: photographersImg,
    coverImage: photographersImg,
    avatarImage: photographersImg,
    rating: 4.8,
    reviewCount: 37,
    city: "Ikeja",
    address: "12 Toyin Street, Ikeja",
    isVerified: true,
    totalBookings: 178,
    description: "Professional photography for events, portraits, and commercial projects.",
    businessHours: [
      { day: "Sunday", hours: "By appointment" },
      { day: "Monday", hours: "09:00 – 18:00" },
      { day: "Tuesday", hours: "09:00 – 18:00" },
      { day: "Wednesday", hours: "09:00 – 18:00" },
      { day: "Thursday", hours: "09:00 – 18:00" },
      { day: "Friday", hours: "09:00 – 18:00" },
      { day: "Saturday", hours: "10:00 – 17:00" },
    ],
    services: [
      { id: "s14", name: "Portrait Session", price: 30000, duration: 60, description: "Studio or outdoor portrait session" },
      { id: "s15", name: "Event Coverage", price: 100000, duration: 480, description: "Full event photography + editing" },
    ],
    photos: [photographersImg],
  },
  {
    id: "p7",
    name: "Bella Hair Studio",
    category: "Hairdressers",
    image: hairdressersImg,
    coverImage: hairdressersImg,
    avatarImage: hairdressersImg,
    rating: 4.5,
    reviewCount: 91,
    city: "Lekki",
    address: "8 Fola Osibo Street, Lekki",
    isVerified: true,
    isPromoted: true,
    totalBookings: 567,
    description: "Expert hair styling, braiding, weaving, and treatments.",
    businessHours: [
      { day: "Sunday", hours: "Closed" },
      { day: "Monday", hours: "09:00 – 19:00" },
      { day: "Tuesday", hours: "09:00 – 19:00" },
      { day: "Wednesday", hours: "09:00 – 19:00" },
      { day: "Thursday", hours: "09:00 – 19:00" },
      { day: "Friday", hours: "09:00 – 19:00" },
      { day: "Saturday", hours: "09:00 – 17:00" },
    ],
    services: [
      { id: "s16", name: "Box Braids", price: 15000, duration: 240, description: "Medium to long box braids" },
      { id: "s17", name: "Silk Press", price: 12000, duration: 120, description: "Straightening with silk finish" },
      { id: "s18", name: "Hair Treatment", price: 8000, duration: 60, description: "Deep conditioning treatment" },
    ],
    photos: [hairdressersImg],
  },
  {
    id: "p8",
    name: "Delicious Bites Catering",
    category: "Caterers",
    image: caterersImg,
    coverImage: caterersImg,
    avatarImage: caterersImg,
    rating: 4.4,
    reviewCount: 22,
    city: "Ajah",
    address: "3 Abraham Adesanya, Ajah",
    totalBookings: 67,
    description: "Nigerian and continental cuisine for events of all sizes.",
    businessHours: [
      { day: "Sunday", hours: "Closed" },
      { day: "Monday", hours: "08:00 – 17:00" },
      { day: "Tuesday", hours: "08:00 – 17:00" },
      { day: "Wednesday", hours: "08:00 – 17:00" },
      { day: "Thursday", hours: "08:00 – 17:00" },
      { day: "Friday", hours: "08:00 – 17:00" },
      { day: "Saturday", hours: "09:00 – 15:00" },
    ],
    services: [
      { id: "s19", name: "Small Chops (100pcs)", price: 35000, duration: 1440, description: "Assorted small chops for events" },
      { id: "s20", name: "Full Event Catering", price: 200000, duration: 1440, description: "Complete food service for 50 guests" },
    ],
    photos: [caterersImg],
  },
];

export const getProviderById = (id: string) => mockProviders.find(p => p.id === id);
export const getServiceById = (serviceId: string) => {
  for (const p of mockProviders) {
    const s = p.services.find(s => s.id === serviceId);
    if (s) return { service: s, provider: p };
  }
  return null;
};
