import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import StateLgaSelector from "@/components/common/StateLgaSelector";
import { PhoneInput, isValidNigerianPhone } from "@/components/PhoneInput";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setUsername(data.username || "");
          setPhone(data.phone || "");
          setState(data.state || "");
          setCity(data.city || "");
          setAvatarUrl(data.avatar_url || null);
        }
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Add cache-busting query param
    const url = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    toast.success("Photo updated!");
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (phone && !isValidNigerianPhone(phone)) {
      toast.error("Enter a valid 11-digit Nigerian phone number.");
      return;
    }

    const cleanUsername = username.trim();
    if (cleanUsername) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .neq("user_id", user.id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error("That username is already taken.");
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      username: cleanUsername,
      phone,
      state,
      city,
    }).eq("user_id", user.id);

    if (error) {
      if (error.message.includes("23505") || error.message.toLowerCase().includes("username")) {
        toast.error("That username is already taken.");
      } else {
        toast.error("Failed to save profile: " + error.message);
      }
    } else {
      toast.success("Profile updated!");
      navigate(-1);
    }
    setSaving(false);
  };

  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "BM";

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="gradient-hero px-5 pt-10 pb-16 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <h1 className="text-lg font-extrabold text-primary-foreground">Edit Profile</h1>
        </div>
      </div>

      <div className="px-5 -mt-10">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex justify-center mb-6">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow border-2 border-card"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-primary-foreground" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-primary uppercase tracking-wide mb-1 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-2xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary uppercase tracking-wide mb-1 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-4 py-3 rounded-2xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-primary uppercase tracking-wide mb-1 block">Phone Number</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
              />
            </div>

            <StateLgaSelector
              stateValue={state}
              lgaValue={city}
              onStateChange={setState}
              onLgaChange={setCity}
              stateLabel="State"
              lgaLabel="City / LGA"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm mt-6 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
