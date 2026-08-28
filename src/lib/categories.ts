// Service categories — mirrored 1:1 from the BookMe Business App
// (src/lib/categories.ts), which is the single source of truth.
// Keep `id`, `name`, and image assets in sync with the Business App
// whenever categories change there.
import barbersImg from "@/assets/categories/barbers.jpg";
import cakeVendorsImg from "@/assets/categories/cake-vendors.jpg";
import cateringImg from "@/assets/categories/catering.jpg";
import cleaningServicesImg from "@/assets/categories/cleaning-services.jpg";
import generatorMechanicsImg from "@/assets/categories/generator-mechanics.png";
import djsImg from "@/assets/categories/djs.jpg";
import eventPlannersImg from "@/assets/categories/event-planners.jpg";
import hairdressersImg from "@/assets/categories/hairdressers.jpg";
import lashTechsImg from "@/assets/categories/lash-techs.jpg";
import lessonTeachersImg from "@/assets/categories/lesson-teachers.jpg";
import makeupArtistsImg from "@/assets/categories/makeup-artists.jpg";
import mechanicsImg from "@/assets/categories/mechanics.jpg";
import nailTechsImg from "@/assets/categories/nail-techs.png";
import personalTrainersImg from "@/assets/categories/personal-trainers.jpg";
import petServicesImg from "@/assets/categories/pet-services.jpg";
import photographersImg from "@/assets/categories/photographers.jpg";
import piercingsImg from "@/assets/categories/piercings.png";
import skinCareImg from "@/assets/categories/skin-care.png";
import tattooArtistsImg from "@/assets/categories/tattoo-artists.jpg";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
}

// Order and identifiers match the Business App's CATEGORIES list exactly.
export const categories: Category[] = [
  { id: "barbers", name: "Barbers", slug: "barbers", image: barbersImg },
  { id: "cake_vendors", name: "Cake Vendors", slug: "cake-vendors", image: cakeVendorsImg },
  { id: "caterers", name: "Caterers", slug: "caterers", image: cateringImg },
  { id: "cleaning_services", name: "Cleaning Services", slug: "cleaning-services", image: cleaningServicesImg },
  { id: "generator_mechanics", name: "Generator Mechanics", slug: "generator-mechanics", image: generatorMechanicsImg },
  { id: "djs", name: "DJs", slug: "djs", image: djsImg },
  { id: "event_planners", name: "Event Planners", slug: "event-planners", image: eventPlannersImg },
  { id: "hairdressers", name: "Hairdressers", slug: "hairdressers", image: hairdressersImg },
  { id: "lash_techs", name: "Lash Techs", slug: "lash-techs", image: lashTechsImg },
  { id: "lesson_teachers", name: "Lesson Teachers", slug: "lesson-teachers", image: lessonTeachersImg },
  { id: "makeup_artists", name: "Makeup Artists", slug: "makeup-artists", image: makeupArtistsImg },
  { id: "mechanics", name: "Mechanics", slug: "mechanics", image: mechanicsImg },
  { id: "nail_techs", name: "Nail Techs", slug: "nail-techs", image: nailTechsImg },
  { id: "personal_trainers", name: "Personal Trainers", slug: "personal-trainers", image: personalTrainersImg },
  { id: "pet_services", name: "Pet Services", slug: "pet-services", image: petServicesImg },
  { id: "photographers", name: "Photographers", slug: "photographers", image: photographersImg },
  { id: "piercings", name: "Piercings", slug: "piercings", image: piercingsImg },
  { id: "skin_care", name: "Skin Care", slug: "skin-care", image: skinCareImg },
  { id: "tattoo_artists", name: "Tattoo Artists", slug: "tattoo-artists", image: tattooArtistsImg },
];
