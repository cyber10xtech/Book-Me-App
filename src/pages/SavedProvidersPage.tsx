import { useState, useEffect } from "react";
import { ChevronLeft, Heart, Star, MapPin, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const defaultCover = "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=60";

const SavedProvidersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Bug fix: was using mockData — now reads real DB
      const { data, error } = await supabase
        .from("saved_providers")
        .select(`
          id,
          provider_id,
          provider:profiles!saved_providers_provider_id_fkey(
            id, full_name, business_name, avatar_url,
            cover_image_url, cover_photo_url, category,
            average_rating, review_count, city, is_verified
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setSaved(data || []);
      setLoading(false);
    })();
  }, [user]);

  const remove = async (savedRowId: string, providerId: string) => {
    setSaved(prev => prev.filter(s => s.id !== savedRowId));
    await supabase.from("saved_providers").delete().eq("id", savedRowId);
    toast("Removed from saved");
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))", paddingTop: "env(safe-area-inset-top)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-5"
        style={{ background: "linear-gradient(135deg, hsl(220 100% 12%), hsl(199 100% 47%))", borderRadius: "0 0 2rem 2rem" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white">Saved Providers</h1>
            <p className="text-white/70 text-xs">{saved.length} saved</p>
          </div>
          <Heart className="w-5 h-5 text-white/40 ml-auto" />
        </div>
      </div>

      <div className="px-5 mt-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Heart className="w-9 h-9 text-muted-foreground" />
            </div>
            <p className="font-extrabold text-foreground">No saved providers yet</p>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              Tap the heart on any provider profile to save them here.
            </p>
            <button onClick={() => navigate("/search")}
              className="mt-5 px-6 py-3 rounded-2xl text-white font-bold text-sm tap-scale"
              style={{ background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))", boxShadow: "var(--shadow-sky)" }}>
              Browse Providers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {saved.map(s => {
              const p = s.provider;
              if (!p) return null;
              const cover = p.cover_image_url || p.cover_photo_url || p.avatar_url || defaultCover;
              return (
                <div key={s.id} className="rounded-3xl overflow-hidden animate-fade-in"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                  <div className="relative h-36 cursor-pointer" onClick={() => navigate(`/provider/${p.id}`)}>
                    <img src={cover} alt={p.business_name || p.full_name} className="w-full h-full object-cover" />
                    {p.is_verified && (
                      <span className="absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 text-white"
                        style={{ background: "hsl(142 71% 45%)" }}>
                        <CheckCircle className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); remove(s.id, p.id); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center tap-scale"
                      style={{ background: "rgba(255,255,255,0.85)" }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                  <div className="p-3 cursor-pointer" onClick={() => navigate(`/provider/${p.id}`)}>
                    <p className="font-extrabold text-xs text-foreground truncate">{p.business_name || p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{p.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-extrabold">{(p.average_rating || 0).toFixed(1)}</span>
                      </div>
                      {p.city && (
                        <div className="flex items-center gap-0.5 text-muted-foreground">
                          <MapPin className="w-2.5 h-2.5" />
                          <span className="text-[10px]">{p.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedProvidersPage;
