export type Creator = {
  id: number;
  name: string;
  nickname: string | null;
  /** 12 prices in BD, see lib/seed/creators.ts for the order. */
  rates: (number | null)[] | null;
};

export type Campaign = {
  id: string;
  name: string;
  objective: string;
  platforms: string[];
  budget: number;
  startDate: string;
  endDate: string;
  brief: string;
  status: "Draft" | "Live" | "Completed";
};

export type OfferStatus = "Pending" | "Countered" | "Accepted" | "Declined";
export type OfferMessage = { fromBrand: boolean; text: string; amount?: number; simulated?: boolean };
export type Offer = {
  id: string;
  creatorId: number;
  campaignId: string;
  rateIndex: number;
  listPrice: number;
  amount: number;
  status: OfferStatus;
  messages: OfferMessage[];
  done: Record<number, boolean>;
};

export type OutdoorFormat =
  | "Billboard" | "LED screen" | "Unipole" | "Mall screen" | "Bridge banner" | "Airport screen" | "Bus shelters";

export type OutdoorSite = {
  id: number;
  name: string;
  format: OutdoorFormat;
  area: string;
  lat: number;
  lng: number;
  size: string;
  faces: string;
  dailyViews: number;
  weeklyPrice: number;
  lighting: string;
  /** Week indexes (0 = week of WEEK_ZERO) that are already booked. */
  bookedWeeks: number[];
};

export type OutdoorBooking = { id: string; siteId: number; weeks: number[]; total: number; status: "Requested" | "Confirmed"; simulated?: boolean };

export type Outlet = {
  id: string;
  name: string;
  nameAr?: string;
  kind: "daily" | "monthly";
  language: "Arabic" | "English";
  about: string;
  /** Daily papers: price per column centimetre in BD. */
  columnCmRate?: number;
  /** Magazines: price per placement per issue in BD. */
  magazine?: { full: number; half: number; dps: number; ifc: number; obc: number };
  /** [leaderboard per week, MPU per week] */
  web: [number, number];
  /** [Instagram post, Instagram story] */
  social: [number, number];
};

export type PrPackage = { key: string; label: string; price: number; description: string };
export type IoLine = { id: string; outlet: string; description: string; when: string; deadline?: string; total: number };
export type InsertionOrder = { id: string; number: string; lines: IoLine[]; total: number; status: "Requested" | "Confirmed"; simulated?: boolean };
