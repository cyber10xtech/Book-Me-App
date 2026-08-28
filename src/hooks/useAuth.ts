/**
 * useAuth — re-exports from AuthContext so all existing imports keep working.
 * Auth state is now shared via React Context — one instance across the whole
 * app, which fixes the infinite loading / stale user / "BookMe User" bugs.
 */
export { useAuth } from "@/contexts/AuthContext";
