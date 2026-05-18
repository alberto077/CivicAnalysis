import {
  Home,
  GraduationCap,
  Shield,
  BusFront,
  Leaf,
  HeartPulse,
  Scale,
  Users,
  Building2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface PolicyAreaMetadata {
  id: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  keywords: string[];
}

export const POLICY_AREAS: readonly PolicyAreaMetadata[] = [
  {
    id: "All",
    label: "All Issues",
    Icon: Building2,
    color: "#ee7a85",
    keywords: []
  },
  {
    id: "Housing and Community Development",
    label: "Housing and Community Development",
    Icon: Home,
    color: "#10b981",
    keywords: ["housing", "rent", "zoning", "tenant", "building", "dwelling", "afford", "landlord", "hpd", "nycha"]
  },
  {
    id: "Education",
    label: "Education",
    Icon: GraduationCap,
    color: "#3b82f6",
    keywords: ["school", "education", "student", "teacher", "curriculum", "literacy", "college", "doe"]
  },
  {
    id: "Transportation and Public Works",
    label: "Transportation and Public Works",
    Icon: BusFront,
    color: "#f59e0b",
    keywords: ["transit", "mta", "bus", "subway", "street", "traffic", "parking", "bike", "ferry", "dot"]
  },
  {
    id: "Environmental Protection",
    label: "Environmental Protection",
    Icon: Leaf,
    color: "#22c55e",
    keywords: ["environment", "climate", "green", "pollution", "emission", "waste", "park", "tree", "dep"]
  },
  {
    id: "Health",
    label: "Health",
    Icon: HeartPulse,
    color: "#ec4899",
    keywords: ["health", "medical", "hospital", "covid", "care", "mental", "wellness", "dohmh"]
  },
  {
    id: "Immigration",
    label: "Immigration",
    Icon: Scale,
    color: "#8b5cf6",
    keywords: ["immigrant", "immigration", "visa", "asylum", "citizenship", "migrant"]
  },
  {
    id: "Taxation",
    label: "Taxation",
    Icon: Scale,
    color: "#6366f1",
    keywords: ["tax", "levy", "assessment", "exemption", "abatement", "revenue", "fiscal"]
  },
  {
    id: "Labor and Employment",
    label: "Labor and Employment",
    Icon: Users,
    color: "#f97316",
    keywords: ["labor", "worker", "wage", "employment", "union", "job", "hire", "workplace"]
  },
  {
    id: "Commerce",
    label: "Commerce",
    Icon: Building2,
    color: "#a855f7",
    keywords: ["business", "commerce", "retail", "vendor", "license", "market", "sbs"]
  },
  {
    id: "Families",
    label: "Families",
    Icon: HeartPulse,
    color: "#f43f5e",
    keywords: ["famil", "child", "parent", "domestic", "foster", "elder", "senior", "youth", "acs"]
  },
  {
    id: "Crime and Law Enforcement",
    label: "Crime and Law Enforcement",
    Icon: Shield,
    color: "#ef4444",
    keywords: ["police", "crime", "safety", "law", "officer", "prison", "fire", "nypd"]
  },
  {
    id: "Government Operations and Politics",
    label: "Government Operations and Politics",
    Icon: Building2,
    color: "#64748b",
    keywords: ["council", "mayor", "agency", "government", "election", "commission", "board"]
  },
  {
    id: "Economics and Public Finance",
    label: "Economics and Public Finance",
    Icon: Building2,
    color: "#0ea5e9",
    keywords: ["budget", "economy", "finance", "spending", "bond", "capital", "fiscal", "comptroller"]
  },
  {
    id: "Civil Rights and Liberties, Minority Issues",
    label: "Civil Rights and Liberties",
    Icon: Users,
    color: "#f43f5e",
    keywords: ["civil rights", "discrimination", "equity", "minority", "bias", "ada"]
  },
  {
    id: "Arts, Culture, Religion",
    label: "Arts, Culture, and Religion",
    Icon: Sparkles,
    color: "#d946ef",
    keywords: ["arts", "culture", "religion", "museum", "library", "heritage", "festival"]
  },
  {
    id: "Science, Technology, Communications",
    label: "Science, Technology, Communications",
    Icon: Sparkles,
    color: "#06b6d4",
    keywords: ["tech", "digital", "data", "software", "broadband", "cyber", "ai", "internet"]
  },
  {
    id: "Social Welfare",
    label: "Social Welfare",
    Icon: HeartPulse,
    color: "#fb7185",
    keywords: ["welfare", "social service", "benefit", "snap", "medicaid", "voucher", "hra"]
  },
  {
    id: "Armed Forces and National Security",
    label: "Armed Forces and National Security",
    Icon: Shield,
    color: "#475569",
    keywords: ["security", "military", "national defense", "homeland", "veterans"]
  },
  {
    id: "Agriculture and Food",
    label: "Agriculture and Food",
    Icon: Leaf,
    color: "#65a30d",
    keywords: ["food", "agriculture", "farm", "restaurant", "nutrition", "grocery"]
  },
  {
    id: "Energy",
    label: "Energy",
    Icon: Leaf,
    color: "#ca8a04",
    keywords: ["energy", "solar", "utility", "electric", "grid", "power", "fuel"]
  },
  {
    id: "International Affairs",
    label: "International Affairs",
    Icon: Building2,
    color: "#2563eb",
    keywords: ["international", "foreign", "global", "diplomatic", "trade"]
  },
  {
    id: "Emergency Management",
    label: "Emergency Management",
    Icon: Shield,
    color: "#dc2626",
    keywords: ["emergency", "disaster", "hurricane", "flood", "crisis", "oem"]
  },
  {
    id: "Public Lands and Natural Resources",
    label: "Public Lands and Natural Resources",
    Icon: Leaf,
    color: "#15803d",
    keywords: ["park", "land", "forest", "waterfront", "open space", "preserve", "dpr"]
  }
];

export const SRC_COLORS: Record<string, string> = {
  Legislation: "#3b82f6",
  Transcript: "#8b5cf6",
  Resolution: "#10b981",
  Notice: "#f59e0b",
  Report: "#ec4899",
  Rule: "#ef4444",
  Hearing: "#0ea5e9",
};

export function srcColor(t: string): string {
  return SRC_COLORS[t] ?? "#64748b";
}

export function getPolicyAreaMetadata(name: string): PolicyAreaMetadata {
  const normalized = name.trim().toLowerCase();

  // direct match on ID or Label
  const direct = POLICY_AREAS.find((a) => a.id.toLowerCase() === normalized || a.label.toLowerCase() === normalized);
  if (direct) return direct;

  // key shorthand mapping (eg. from profile or interest areas)
  const shorthandMapping: Record<string, string> = {
    housing: "Housing and Community Development",
    transit: "Transportation and Public Works",
    transportation: "Transportation and Public Works",
    environment: "Environmental Protection",
    policing: "Crime and Law Enforcement",
    police: "Crime and Law Enforcement",
    labor: "Labor and Employment",
    economy: "Economics and Public Finance",
    health: "Health",
    immigration: "Immigration",
    education: "Education",
    taxation: "Taxation",
    commerce: "Commerce",
    families: "Families",
    government: "Government Operations and Politics",
    arts: "Arts, Culture, Religion",
    culture: "Arts, Culture, Religion",
    religion: "Arts, Culture, Religion",
    science: "Science, Technology, Communications",
    technology: "Science, Technology, Communications",
    welfare: "Social Welfare",
    agriculture: "Agriculture and Food",
    food: "Agriculture and Food",
    energy: "Energy",
  };

  const keyMatch = Object.keys(shorthandMapping).find(k => normalized.includes(k));
  if (keyMatch) {
    const mappedId = shorthandMapping[keyMatch];
    const matched = POLICY_AREAS.find((a) => a.id === mappedId);
    if (matched) return matched;
  }

  // fallback to "All Issues"
  return POLICY_AREAS[0];
}

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (isNaN(diff) || diff < 0) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
