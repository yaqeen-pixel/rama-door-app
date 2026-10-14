import type { Creator, OutdoorSite, Outlet, PrPackage } from "../types";
import creators from "./creators.json";
import sites from "./outdoor-sites.json";
import outlets from "./media-outlets.json";
import packages from "./pr-packages.json";

/**
 * Built-in data used in demo mode (no Supabase keys) and to generate supabase/seed.sql.
 * creators.json   = RAMA influencer rate card (real names and prices)
 * outdoor-sites   = SAMPLE sites, replace with RAMA inventory
 * media-outlets   = real Bahrain outlets with SAMPLE rates
 * pr-packages     = SAMPLE PR service prices
 */
export const CREATORS = creators as Creator[];
export const OUTDOOR_SITES = sites as OutdoorSite[];
export const OUTLETS = outlets as Outlet[];
export const PR_PACKAGES = packages as PrPackage[];
