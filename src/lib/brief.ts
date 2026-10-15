import type { Creator } from "./types";
import { rateIndex } from "./pricing";

/** Brief form vocabulary, taken from RAMA's original influencer request form. */
export type BriefPlatform = "instagram" | "tiktok" | "snapchat";
export const BRIEF_PLATFORMS: { key: BriefPlatform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "snapchat", label: "Snapchat" },
];
export const CONTENT_TYPES: Record<BriefPlatform, { key: string; label: string }[]> = {
  instagram: [
    { key: "story", label: "Story" }, { key: "reel", label: "Reel" }, { key: "postSingle", label: "Post (single)" },
    { key: "postCarousel", label: "Post (carousel)" }, { key: "live", label: "Instagram Live" },
  ],
  tiktok: [
    { key: "shortVideo", label: "Short video" }, { key: "sparkAd", label: "Spark Ad ready" }, { key: "live", label: "TikTok Live" },
    { key: "duet", label: "Duet / Stitch" }, { key: "photoMode", label: "Photo mode post" },
  ],
  snapchat: [
    { key: "snapStory", label: "Snap Story" }, { key: "spotlight", label: "Spotlight video" }, { key: "snapAd", label: "Snap Ad" },
    { key: "collectionAd", label: "Collection Ad" }, { key: "commercial", label: "Commercial" },
  ],
};
export const VIDEO_QUALITY = [
  { key: "professional", label: "Professional (DSLR / mirrorless)" },
  { key: "phone", label: "Phone camera" },
  { key: "client", label: "Video with client" },
] as const;
export const LOCATION_TYPES = [
  { key: "studio", label: "Studio" },
  { key: "outdoor", label: "Specific outdoor location" },
  { key: "influencer", label: "Influencer's choice" },
] as const;
export const SPONSORED_ADS = [
  { key: "yes", label: "Yes, we will use it as ads" },
  { key: "no", label: "No, organic use only" },
  { key: "later", label: "Maybe later" },
] as const;
export const DRESS_CODE = [
  { key: "outfit", label: "Outfit" },
  { key: "colorCode", label: "Colour code" },
  { key: "thingsToAvoid", label: "Things to avoid" },
  { key: "noRestrictions", label: "No restrictions" },
] as const;

export type ContentSelection = Record<BriefPlatform, string[]>;
export type CreatorBrief = {
  creatorId: number;
  platforms: BriefPlatform[];
  content: ContentSelection;
  specificBrief: string;
  videoQuality: (typeof VIDEO_QUALITY)[number]["key"];
  locationType: (typeof LOCATION_TYPES)[number]["key"];
  sponsoredAds: (typeof SPONSORED_ADS)[number]["key"];
  submissionDeadline: string;
  postingDate: string;
  postingTime: string;
};
export type BriefStatus = "Draft" | "Submitted" | "In review" | "Confirmed" | "Cancelled";
export type Brief = {
  id: string;
  campaignName: string;
  budget: string;
  companyName: string;
  email: string;
  phone: string;
  mode: "shared" | "perCreator";
  languages: ("arabic" | "english")[];
  text: string;
  attachmentName?: string;
  attachmentPath?: string;
  defaultContent: ContentSelection;
  submissionDeadline: string;
  postingDate: string;
  postingTime: string;
  dressCode: string[];
  dressCodeComments: string;
  notes: string;
  creators: CreatorBrief[];
  estimate: number | null;
  status: BriefStatus;
  createdAt: string;
};

export const emptyContent = (): ContentSelection => ({ instagram: [], tiktok: [], snapchat: [] });
export const newCreatorBrief = (c: Creator, defaults: ContentSelection): CreatorBrief => ({
  creatorId: c.id,
  platforms: (["instagram", "tiktok", "snapchat"] as BriefPlatform[]).filter((p) => p === "instagram" || (c.platforms ?? []).includes(p)),
  content: { instagram: [...defaults.instagram], tiktok: [...defaults.tiktok], snapchat: [...defaults.snapchat] },
  specificBrief: "",
  videoQuality: "professional",
  locationType: "studio",
  sponsoredAds: "yes",
  submissionDeadline: "",
  postingDate: "",
  postingTime: "",
});

/**
 * Rate card estimate for one creator's brief: videography unless they film on a phone,
 * Snapchat when it is one of the chosen platforms, and the "with ads" scope when the
 * brand will run the content as sponsored ads. Null when the creator has no RAMA prices.
 */
export function creatorEstimate(c: Creator | undefined, b: CreatorBrief) {
  if (!c?.rates) return null;
  const idx = rateIndex({ video: b.videoQuality !== "phone", snapchat: b.platforms.includes("snapchat"), ads: b.sponsoredAds === "yes", twoRounds: false });
  return c.rates[idx] ?? null;
}

export const hasArabic = (t: string) => /[؀-ۿ]/.test(t);
export const hasEnglish = (t: string) => /[A-Za-z]/.test(t);
/** The original form's rule: the brief text must contain each language the brand ticked. */
export function languageProblem(text: string, langs: Brief["languages"]) {
  const ar = langs.includes("arabic"), en = langs.includes("english");
  if (ar && en && (!hasArabic(text) || !hasEnglish(text))) return "Write the brief in both Arabic and English, or attach a file that has both.";
  if (ar && !en && !hasArabic(text)) return "Write the brief in Arabic, or attach the Arabic brief file.";
  if (en && !ar && !hasEnglish(text)) return "Write the brief in English, or attach the English brief file.";
  return null;
}
export const ATTACHMENT_TYPES = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
export const ATTACHMENT_MAX = 10 * 1024 * 1024;
