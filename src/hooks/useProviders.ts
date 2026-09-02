import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";

export type ProviderProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];

export const useProviders = () => {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "provider")
        .eq("is_active", true);

      if (error) throw error;
      
      const fetchedProviders = data || [];
      if (fetchedProviders.length === 0) {
        setProviders([]);
        return;
      }

      // Efficient booking count aggregation: Fetch only provider_ids from bookings
      const providerIds = fetchedProviders.map(p => p.id);
      
      // Batch into chunks if there are many providers to avoid URL too long errors
      const chunkSize = 100;
      let allBookings: any[] = [];
      
      for (let i = 0; i < providerIds.length; i += chunkSize) {
        const chunk = providerIds.slice(i, i + chunkSize);
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("provider_id")
          .in("provider_id", chunk);
          
        if (bookingsData) {
          allBookings = [...allBookings, ...bookingsData];
        }
      }

      // Calculate counts
      const bookingCounts = allBookings.reduce((acc: Record<string, number>, b) => {
        acc[b.provider_id] = (acc[b.provider_id] || 0) + 1;
        return acc;
      }, {});

      // Filter to only include providers with 0 bookings
      const zeroBookingProviders = fetchedProviders.filter(p => !bookingCounts[p.id]);

      // Randomize array
      const shuffled = [...zeroBookingProviders].sort(() => Math.random() - 0.5);
      
      // Ensure no duplicate providers
      const uniqueProviders = Array.from(new Map(shuffled.map(p => [p.id, p])).values());

      setProviders(uniqueProviders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return { providers, loading, error, refresh: fetchProviders };
};

export const useProviderDetail = (id: string) => {
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (profileError) throw profileError;
        setProvider(profileData);

        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*")
          .eq("provider_id", id)
          .eq("is_active", true);

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  return { provider, services, loading, error };
};
