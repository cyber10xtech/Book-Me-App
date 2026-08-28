import { Heart, Star, MapPin, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ProviderCardProps {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  city?: string;
  isNew?: boolean;
  isVerified?: boolean;
}

const ProviderCard = ({ name, category, image, rating, reviewCount, city, isNew, isVerified }: ProviderCardProps) => {
  const [isFav, setIsFav] = useState(false);

  return (
    <div className="min-w-[260px] max-w-[280px] rounded-2xl overflow-hidden bg-card shadow-sm border border-border snap-start">
      <div className="relative h-44">
        <img src={image} alt={name} loading="lazy" className="w-full h-full object-cover" />
        {isVerified && (
          <span className="absolute top-3 left-3 bg-success text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsFav(!isFav); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-foreground text-sm truncate">{name}</h3>
          {isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">{category}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber text-amber" />
            <span className="text-xs font-semibold text-foreground">
              {isNew ? "New" : (rating ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>
          {city && (
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">{city}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
