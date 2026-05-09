"use client";

import {
  MapPin, Users, Layers, Search, Map as MapIcon, ExternalLink, Info,
  ChevronRight, Building2, Flag, AlertCircle,
  // Landmark,
  Loader2, X, Maximize2, Calendar, Eye, EyeOff, ChevronDown, ChevronUp,
  Phone, Mail
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getDistricts, getDistrictsMap, type District } from "@/lib/api";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { AnimatePresence, motion } from "framer-motion";


type Tab = "nys" | "nyc" | "events" | "resources";
type GeoResult = { label: string; lat: number; lng: number };

type RepCard = {
  level: string;
  sublabel: string;
  compact?: boolean;
  icon: React.ReactNode;
  colorClasses: string;
  accentColor: string;
  name: string;
  title: string;
  district?: string;
  website?: string;
  phone?: string;
  email?: string;
  resolved: boolean; // true = inline data, false = needs external lookup
};

type PinCategory =
  | "city-hall" | "borough-hall" | "council"
  | "community-board" | "state" | "federal" | "courthouse";

type CivicPin = {
  id: string; name: string; category: PinCategory;
  address: string; lat: number; lng: number; url?: string;
};

type BoundaryLayer = {
  id: string; label: string; description: string; govLevel: string;
  color: string; weight: number; opacity: number; url: string; enabled: boolean;
};

type GovLevelRes = "City" | "State" | "Federal";
type Resource = {
  title: string; org: string; tag: string;
  useCase: string; bestFor: string; govLevel: GovLevelRes; link: string;
};


// borough helpers
function boroughFromId(id: number): string {
  if (id <= 10) return "Manhattan";
  if (id <= 18) return "Bronx";
  if (id <= 35) return "Brooklyn";
  if (id <= 45) return "Queens";
  return "Staten Island";
}

const BOROUGH_PRESIDENTS: Record<string, { name: string; url: string }> = {
  Manhattan:      { name: "Mark Levine",        url: "https://www.manhattanbp.nyc.gov/" },
  Bronx:          { name: "Vanessa Gibson",     url: "https://www.bronxboroughpresident.com/" },
  Brooklyn:       { name: "Antonio Reynoso",    url: "https://www.brooklynbp.nyc.gov/" },
  Queens:         { name: "Donovan Richards",   url: "https://www.queensbp.org/" },
  "Staten Island":{ name: "Vito Fossella",      url: "https://www.statenislandusa.com/" },
};

const BOROUGH_CB_URLS: Record<string, string> = {
  Manhattan:      "https://www.nyc.gov/site/cau/community-boards/manhattan-boards.page",
  Bronx:          "https://www.nyc.gov/site/cau/community-boards/bronx-boards.page",
  Brooklyn:       "https://www.nyc.gov/site/cau/community-boards/brooklyn-boards.page",
  Queens:         "https://www.nyc.gov/site/cau/community-boards/queens-boards.page",
  "Staten Island":"https://www.nyc.gov/site/cau/community-boards/staten-island-boards.page",
};

function buildRepCards(district: District, distId: number): RepCard[] {
  const borough = boroughFromId(distId);
  const bp = BOROUGH_PRESIDENTS[borough];
  return [
    // NYC cards
    {
      level: "City Council",
      sublabel: `District ${distId}`,
      icon: <Building2 className="h-4 w-4" />,
      colorClasses: "bg-blue-50 border-blue-100",
      accentColor: "#2563eb",
      name: district.rep || "Council Member",
      title: "NYC Council Member",
      district: `District ${distId}`,
      website: `https://council.nyc.gov/district-${distId}/`,
      resolved: true,
    },
    {
      level: "Borough President",
      sublabel: borough,
      icon: <Flag className="h-4 w-4" />,
      colorClasses: "bg-violet-50 border-violet-100",
      accentColor: "#7c3aed",
      name: bp.name,
      title: `Borough President of ${borough}`,
      website: bp.url,
      resolved: true,
    },
    {
      level: "Community Board",
      sublabel: `${borough} — Neighborhood Advisory Body`,
      icon: <Users className="h-4 w-4" />,
      colorClasses: "bg-emerald-50 border-emerald-100",
      accentColor: "#059669",
      name: `Find Your ${borough} Community Board`,
      title: `${borough} Community Boards`,
      website: BOROUGH_CB_URLS[borough],
      resolved: false,
    },
    // compact state/federal row
    // {
    //   level: "State Assembly",
    //   sublabel: `${borough}`,
    //   icon: <Landmark className="h-4 w-4" />,
    //   colorClasses: "bg-amber-50 border-amber-100",
    //   accentColor: "#d97706",
    //   name: "Find Assembly Member",
    //   title: "NYS Assembly",
    //   website: "https://data.gis.ny.gov/datasets/sharegisny::nys-assembly-districts/explore?location=40.807870%2C-73.766162%2C10",
    //   resolved: false,
    //   compact: true,
    // },
    // {
    //   level: "State Senate",
    //   sublabel: `${borough}`,
    //   icon: <Landmark className="h-4 w-4" />,
    //   colorClasses: "bg-rose-50 border-rose-100",
    //   accentColor: "#dc2626",
    //   name: "Find State Senator",
    //   title: "NYS Senate",
    //   website: "https://www.nysenate.gov/find-my-senator",
    //   resolved: false,
    //   compact: true,
    // },
    // {
    //   level: "US Congress",
    //   sublabel: `${borough}`,
    //   icon: <Flag className="h-4 w-4" />,
    //   colorClasses: "bg-slate-100 border-slate-200",
    //   accentColor: "#475569",
    //   name: "Find US Rep",
    //   title: "US House",
    //   website: "https://www.house.gov/representatives/find-your-representative",
    //   resolved: false,
    //   compact: true,
    // },
  ];
}

// Geocode — NYC Planning Labs (free, no key)
async function geocodeAddress(query: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(query)}&size=1`
    );
    const data = await res.json();
    const f = data?.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { label: f.properties.label, lat, lng };
  } catch { return null; }
}

function pointInPolygon(point: [number, number], ring: number[][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findDistrictForPoint(lat: number, lng: number, geoData: any): number | null {
  if (!geoData?.features) return null;
  for (const f of geoData.features) {
    const distId = parseInt(f.properties.coun_dist);
    const polys: number[][][] =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates[0]]
        : f.geometry.coordinates.map((c: number[][][]) => c[0]);
    for (const ring of polys) {
      if (pointInPolygon([lng, lat], ring)) return distId;
    }
  }
  return null;
}

// geo pins for civic events map (semi-permanent?)
const CIVIC_PINS: CivicPin[] = [
  { id: "city-hall",         name: "NYC City Hall",                    category: "city-hall",       address: "City Hall, New York, NY 10007",                  lat: 40.7128, lng: -74.0060, url: "https://www.nyc.gov/office-of-the-mayor/index.page" },
  { id: "council-chambers",  name: "NYC Council Chambers",             category: "council",         address: "250 Broadway, New York, NY 10007",               lat: 40.7133, lng: -74.0079, url: "https://council.nyc.gov/" },
  { id: "manhattan-muni",    name: "Manhattan Municipal Building",     category: "city-hall",       address: "1 Centre St, New York, NY 10007",                lat: 40.7127, lng: -74.0028 },
  { id: "bh-manhattan",      name: "Manhattan Borough Hall",           category: "borough-hall",    address: "1 Centre St, New York, NY 10007",                lat: 40.7126, lng: -74.0030, url: "https://www.manhattanbp.nyc.gov/" },
  { id: "bh-brooklyn",       name: "Brooklyn Borough Hall",            category: "borough-hall",    address: "209 Joralemon St, Brooklyn, NY 11201",           lat: 40.6924, lng: -73.9900, url: "https://www.brooklynbp.nyc.gov/" },
  { id: "bh-queens",         name: "Queens Borough Hall",              category: "borough-hall",    address: "120-55 Queens Blvd, Queens, NY 11424",           lat: 40.7085, lng: -73.8330, url: "https://www.queensbp.org/" },
  { id: "bh-bronx",          name: "Bronx Borough Hall",               category: "borough-hall",    address: "851 Grand Concourse, Bronx, NY 10451",           lat: 40.8238, lng: -73.9265, url: "https://www.bronxboroughpresident.com/" },
  { id: "bh-staten-island",  name: "Staten Island Borough Hall",       category: "borough-hall",    address: "10 Richmond Terrace, Staten Island, NY 10301",  lat: 40.6437, lng: -74.0768, url: "https://www.statenislandusa.com/" },
  { id: "cb-mn1",            name: "Manhattan CB 1",                   category: "community-board", address: "1 Centre St Suite 2400, New York, NY 10007",     lat: 40.7128, lng: -74.0035, url: "https://www.cb1manhattan.org/" },
  { id: "cb-mn6",            name: "Manhattan CB 6",                   category: "community-board", address: "757 3rd Ave Suite 1400, New York, NY 10017",     lat: 40.7540, lng: -73.9717, url: "https://cbsix.org/" },
  { id: "cb-mn12",           name: "Manhattan CB 12",                  category: "community-board", address: "711 W 168th St, New York, NY 10032",             lat: 40.8402, lng: -73.9394 },
  { id: "cb-bk1",            name: "Brooklyn CB 1",                    category: "community-board", address: "435 Graham Ave, Brooklyn, NY 11211",             lat: 40.7147, lng: -73.9435 },
  { id: "cb-bk6",            name: "Brooklyn CB 6",                    category: "community-board", address: "250 Baltic St, Brooklyn, NY 11201",              lat: 40.6840, lng: -73.9930 },
  { id: "cb-qn1",            name: "Queens CB 1",                      category: "community-board", address: "120-55 Queens Blvd Rm 213, Queens, NY 11424",   lat: 40.7081, lng: -73.8326 },
  { id: "cb-qn6",            name: "Queens CB 6",                      category: "community-board", address: "60-01 Metropolitan Ave, Ridgewood, NY 11385",   lat: 40.7062, lng: -73.8988 },
  { id: "cb-bx1",            name: "Bronx CB 1",                       category: "community-board", address: "3024 E Tremont Ave, Bronx, NY 10461",            lat: 40.8491, lng: -73.8481 },
  { id: "cb-si1",            name: "Staten Island CB 1",               category: "community-board", address: "1000 Richmond Terrace, Staten Island, NY 10301",lat: 40.6418, lng: -74.0900 },
  { id: "cb-si3",            name: "Staten Island CB 3",               category: "community-board", address: "1243 Woodrow Rd, Staten Island, NY 10309",       lat: 40.5438, lng: -74.1935 },
  { id: "co-d1",             name: "Council District 1 Office",        category: "council",         address: "1 Centre St Suite 2424, New York, NY 10007",     lat: 40.7129, lng: -74.0032, url: "https://council.nyc.gov/district-1/" },
  { id: "co-d3",             name: "Council District 3 Office",        category: "council",         address: "250 Broadway Suite 1875, New York, NY 10007",    lat: 40.7132, lng: -74.0081, url: "https://council.nyc.gov/district-3/" },
  { id: "co-d7",             name: "Council District 7 Office",        category: "council",         address: "2200 Grand Concourse, Bronx, NY 10457",          lat: 40.8527, lng: -73.9104, url: "https://council.nyc.gov/district-7/" },
  { id: "nys-capitol",       name: "NYS Capitol",                      category: "state",           address: "State St & Washington Ave, Albany, NY 12224",   lat: 42.6526, lng: -73.7573, url: "https://www.nyassembly.gov/" },
  { id: "nys-leg-office",    name: "NYS Legislative Office Building",  category: "state",           address: "198 State St, Albany, NY 12210",                 lat: 42.6521, lng: -73.7560 },
  { id: "nys-senate",        name: "NYS Senate Chamber",               category: "state",           address: "State Capitol, Albany, NY 12247",                lat: 42.6527, lng: -73.7575, url: "https://www.nysenate.gov/" },
  { id: "nys-gov-nyc",       name: "NYS Governor's NYC Office",        category: "state",           address: "633 3rd Ave, New York, NY 10017",                lat: 40.7529, lng: -73.9722, url: "https://www.governor.ny.gov/" },
  { id: "nysdos-nyc",        name: "NYS Dept. of State NYC Office",    category: "state",           address: "123 William St, New York, NY 10038",             lat: 40.7087, lng: -74.0063 },
  { id: "fed-javits",        name: "Jacob K. Javits Federal Building", category: "federal",         address: "26 Federal Plaza, New York, NY 10278",           lat: 40.7145, lng: -74.0040, url: "https://www.gsa.gov/" },
  { id: "fed-schumer",       name: "Sen. Schumer NYC Office",          category: "federal",         address: "780 3rd Ave Suite 2301, New York, NY 10017",     lat: 40.7564, lng: -73.9720, url: "https://www.schumer.senate.gov/" },
  { id: "fed-gillibrand",    name: "Sen. Gillibrand NYC Office",       category: "federal",         address: "780 3rd Ave Suite 2601, New York, NY 10017",     lat: 40.7565, lng: -73.9719, url: "https://www.gillibrand.senate.gov/" },
  { id: "congress-d12",      name: "Rep. Nadler — CD12",               category: "federal",         address: "201 Varick St Suite 1007, New York, NY 10014",  lat: 40.7281, lng: -74.0026, url: "https://nadler.house.gov/" },
  { id: "congress-d13",      name: "Rep. Espaillat — CD13",            category: "federal",         address: "163 W 125th St Suite 507, New York, NY 10027",  lat: 40.8079, lng: -73.9476, url: "https://espaillat.house.gov/" },
  { id: "congress-d7",       name: "Rep. Velázquez — CD7",             category: "federal",         address: "266 Broadway Suite 201, Brooklyn, NY 11211",    lat: 40.7091, lng: -73.9573, url: "https://velazquez.house.gov/" },
  { id: "court-sdny",        name: "US District Court — SDNY",         category: "courthouse",      address: "40 Foley Square, New York, NY 10007",           lat: 40.7143, lng: -74.0036, url: "https://www.nysd.uscourts.gov/" },
  { id: "court-edny",        name: "US District Court — EDNY",         category: "courthouse",      address: "225 Cadman Plaza East, Brooklyn, NY 11201",     lat: 40.6956, lng: -73.9900, url: "https://www.nyed.uscourts.gov/" },
  { id: "court-2nd-circuit", name: "US Court of Appeals — 2nd Circuit",category: "courthouse",      address: "40 Foley Square, New York, NY 10007",           lat: 40.7142, lng: -74.0038 },
  { id: "court-criminal-mn", name: "NYC Criminal Court (Manhattan)",   category: "courthouse",      address: "100 Centre St, New York, NY 10013",             lat: 40.7148, lng: -74.0022 },
  { id: "court-supreme-mn",  name: "NYS Supreme Court — Manhattan",    category: "courthouse",      address: "60 Centre St, New York, NY 10007",              lat: 40.7146, lng: -74.0041 },
  { id: "court-supreme-bk",  name: "NYS Supreme Court — Brooklyn",     category: "courthouse",      address: "360 Adams St, Brooklyn, NY 11201",              lat: 40.6928, lng: -73.9905 },
  { id: "court-supreme-qn",  name: "NYS Supreme Court — Queens",       category: "courthouse",      address: "88-11 Sutphin Blvd, Queens, NY 11435",          lat: 40.7034, lng: -73.8082 },
  { id: "court-supreme-bx",  name: "NYS Supreme Court — Bronx",        category: "courthouse",      address: "851 Grand Concourse, Bronx, NY 10451",          lat: 40.8235, lng: -73.9263 },
  { id: "court-supreme-si",  name: "NYS Supreme Court — Staten Island",category: "courthouse",      address: "18 Richmond Terrace, Staten Island, NY 10301",  lat: 40.6436, lng: -74.0756 },
];

const PIN_META: Record<PinCategory, { label: string; color: string }> = {
  "city-hall":       { label: "City Hall",       color: "#1d4ed8" },
  "borough-hall":    { label: "Borough Hall",    color: "#7c3aed" },
  "council":         { label: "Council Office",  color: "#0891b2" },
  "community-board": { label: "Community Board", color: "#059669" },
  "state":           { label: "State Office",    color: "#d97706" },
  "federal":         { label: "Federal Office",  color: "#dc2626" },
  "courthouse":      { label: "Courthouse",      color: "#6b7280" },
};

const INITIAL_BOUNDARY_LAYERS: BoundaryLayer[] = [
  { id: "nyc-council",  label: "NYC Council Districts", description: "51 local legislative districts for the NYC City Council. Determines your council member — who votes on city budgets, zoning, and local laws. The most granular level of elected NYC government.",             govLevel: "City",    color: "#2563eb", weight: 1.5, opacity: 0.6, url: "/boundaries-districts.geojson", enabled: true },
  { id: "boroughs",     label: "NYC Boroughs",          description: "The 5 boroughs of New York City (Manhattan, Brooklyn, Queens, the Bronx, Staten Island). Each has a Borough President with advisory and land-use review powers over city planning decisions.",                govLevel: "City",    color: "#7c3aed", weight: 2,   opacity: 0.7, url: "/boundaries-boroughs.geojson", enabled: false },
// # Neighborhoods — NYC DCP Neighborhood Tabulation Areas via Socrata
  { id: "neighborhoods", label: "NYC Neighborhoods",    description: "195 Neighborhood Tabulation Areas (NTAs) defined by NYC Planning. These are aggregations of census tracts that approximate well-known neighborhood names — useful for understanding local character and community context within council districts.", govLevel: "City", color: "#db2777", weight: 1, opacity: 0.4, url: "/boundaries-neighborhoods.geojson", enabled: false },
// # Congressional Districts — official NYS ITS GIS (all 26 NY districts)
  { id: "congressional",label: "Congressional Districts", description: "New York's 26 US Congressional districts, each electing a member of the US House of Representatives — your direct federal legislative representative.",                                                     govLevel: "Federal", color: "#dc2626", weight: 2,   opacity: 0.6, url: "/boundaries-congressional.geojson", enabled: true },
// # NYS Senate Districts — official NYS ITS GIS (all 63 statewide)
  { id: "nys-senate",   label: "NYS Senate Districts",  description: "63 State Senate districts across New York. State Senators serve in the upper chamber of the NYS Legislature, voting on the state budget, taxes, and legislation.",                                            govLevel: "State",   color: "#d97706", weight: 1.5, opacity: 0.5, url: "/boundaries-nys-senate.geojson", enabled: true },
// # NYS Assembly Districts — official NYS ITS GIS (all 150 statewide)
  { id: "nys-assembly", label: "NYS Assembly Districts", description: "150 State Assembly districts. Assembly members serve in the lower chamber of the State Legislature, voting on housing, education, public health, and the state budget.",                                     govLevel: "State",   color: "#059669", weight: 1.5, opacity: 0.5, url: "/boundaries-nys-assembly.geojson", enabled: false },
];

const BOUNDARY_GOV_COLORS: Record<string, string> = {
  City:    "bg-blue-50 text-blue-700 ring-blue-100",
  County:  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  State:   "bg-indigo-50 text-indigo-700 ring-indigo-100",
  Federal: "bg-rose-50 text-rose-700 ring-rose-100",
};


// resourecs
const RESOURCES: Resource[] = [
  { title: "mygovnyc.org", org: "Who Represents Me NYC", tag: "Interactive", useCase: "Enter an NYC address to see every elected rep at the city, state, and federal levels, with names, party, and contact details.", bestFor: "Looking up all reps for a NYC address in one place", govLevel: "City", link: "https://www.mygovnyc.org" },
  { title: "NYC Boundary Explorer", org: "BetaNYC", tag: "Interactive", useCase: "View overlapping civic boundaries like council districts, community boards, school districts, and precincts on one map.", bestFor: "Seeing which local jurisdictions cover a block", govLevel: "City", link: "https://boundaries.beta.nyc/?map=cc" },
  { title: "NYC Council Map Widget", org: "NYC Council", tag: "Official", useCase: "Enter an NYC address to confirm the correct council district from the official city source.", bestFor: "Verifying a council district by address", govLevel: "City", link: "https://council.nyc.gov/map-widget/" },
  { title: "NYC Council Portal", org: "NYC Council", tag: "Official", useCase: "Browse bills, votes, hearings, member profiles, and district office contact info in the main legislative portal.", bestFor: "Tracking Council legislation and member info", govLevel: "City", link: "https://council.nyc.gov/" },
  { title: "NYC Council Livestream", org: "NYC Council", tag: "Live", useCase: "Watch live and archived Council sessions, committee hearings, and oversight meetings without an account.", bestFor: "Streaming or replaying Council meetings", govLevel: "City", link: "https://council.nyc.gov/livestream/" },
  { title: "Legistar — Council Calendar", org: "NYC Council", tag: "Calendar", useCase: "Search the full Council and committee schedule with agendas, minutes, and vote records in Legistar.", bestFor: "Finding meeting dates, agendas, and votes", govLevel: "City", link: "https://legistar.council.nyc.gov/Calendar.aspx" },
  { title: "NYC Public Meetings", org: "NYC Civic Engagement", tag: "Calendar", useCase: "Browse citywide public meetings across agencies, boards, and other civic bodies beyond the Council.", bestFor: "Finding public meetings across NYC agencies", govLevel: "City", link: "https://www.nyc.gov/site/civicengagement/meetings/public-meetings.page" },
  { title: "NYC Community Boards", org: "NYC CAU", tag: "Official", useCase: "Find all 59 Community Boards and their meeting schedules, agendas, and local advisory info.", bestFor: "Locating your community board and its meetings", govLevel: "City", link: "https://www.nyc.gov/site/cau/community-boards/community-boards.page" },
  { title: "Community Board 6", org: "CB6 Manhattan", tag: "Community", useCase: "View Manhattan CB6’s meeting calendar and agendas for full-board and committee sessions.", bestFor: "Tracking CB6 meetings and agendas", govLevel: "City", link: "https://cbsix.org/meetings-calendar/" },
  { title: "NYC Government Hub", org: "NYC.gov", tag: "Official", useCase: "Start here to find NYC agencies, elected officials, and civic services.", bestFor: "Navigating NYC government and services", govLevel: "City", link: "https://www.nyc.gov/main/your-government" },
  { title: "NYS Assembly Districts (NYC)", org: "NYS GIS", tag: "Legislative", useCase: "Use this interactive map to identify an Assembly district in NYC and then find the matching member.", bestFor: "Finding your Assembly district in NYC", govLevel: "State", link: "https://data.gis.ny.gov/datasets/sharegisny::nys-assembly-districts/explore?location=40.807870%2C-73.766162%2C10" },
  { title: "NYS Assembly Districts", org: "NYS Open Data", tag: "Legislative", useCase: "Access statewide Assembly district boundaries for research, comparison, or custom mapping.", bestFor: "Studying Assembly districts statewide", govLevel: "State", link: "https://opdgig.dos.ny.gov/datasets/sharegisny::nys-assembly-districts/about" },
  { title: "NYS Assembly Hearing Schedule", org: "NYS Assembly", tag: "Calendar", useCase: "Search upcoming Assembly hearings by committee, date, topic, witness list, and bill reference.", bestFor: "Finding Assembly hearings to attend", govLevel: "State", link: "https://nyassembly.gov/leg/?sh=hear" },
  { title: "NYS Assembly Hearing Video", org: "NYS Assembly", tag: "Live", useCase: "Watch live and recorded Assembly committee hearings and testimony.", bestFor: "Reviewing Assembly hearing footage", govLevel: "State", link: "https://nyassembly.gov/av/hearings/" },
  { title: "NYS Senate Events & Hearings", org: "NYS Senate", tag: "Calendar", useCase: "Browse Senate sessions, hearings, town halls, and district outreach events statewide.", bestFor: "Tracking Senate hearings and events", govLevel: "State", link: "https://www.nysenate.gov/events" },
  { title: "NYS Senate Districts", org: "NYS Open Data", tag: "Legislative", useCase: "Use the official Senate district map to find your Senator and understand district boundaries.", bestFor: "Finding your State Senator’s district", govLevel: "State", link: "https://opdgig.dos.ny.gov/maps/074d3456e5664f5e85d0fb251d05cc5b/about" },
  { title: "NYS Civil Boundaries", org: "ArcGIS / NYS", tag: "Administrative", useCase: "Reference county, town, and city boundary data to determine local jurisdiction.", bestFor: "Checking jurisdiction across local boundaries", govLevel: "State", link: "https://www.arcgis.com/home/item.html?id=074d3456e5664f5e85d0fb251d05cc5b" },
  { title: "NYS Open GIS Portal", org: "NYS Dept. of State", tag: "Data", useCase: "Search official NYS GIS datasets for boundaries, infrastructure, demographics, and more.", bestFor: "Downloading official GIS data for research", govLevel: "State", link: "https://opdgig.dos.ny.gov/" },
  { title: "Find Your US Representative", org: "US House", tag: "Official", useCase: "Locate your federal representative by address or ZIP code and access their official contact info.", bestFor: "Finding and contacting your US House rep", govLevel: "Federal", link: "https://www.house.gov/representatives/find-your-representative" },
];

const TAG_COLORS: Record<string, string> = {
  Interactive:    "bg-blue-50 text-blue-600 border-blue-100",
  Official:       "bg-emerald-50 text-emerald-700 border-emerald-100",
  Legislative:    "bg-violet-50 text-violet-700 border-violet-100",
  Administrative: "bg-amber-50 text-amber-700 border-amber-100",
  Data:           "bg-slate-100 text-slate-600 border-slate-200",
  Live:           "bg-red-50 text-red-600 border-red-100",
  Calendar:       "bg-sky-50 text-sky-600 border-sky-100",
  Community:      "bg-teal-50 text-teal-700 border-teal-100",
};

const GOV_LEVEL_RES_COLORS: Record<GovLevelRes, string> = {
  City:    "bg-sky-50 text-sky-700 ring-sky-100",
  State:   "bg-indigo-50 text-indigo-700 ring-indigo-100",
  Federal: "bg-rose-50 text-rose-700 ring-rose-100",
};

const ARCGIS_BASE = "https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e";




// rep card components for explorer
function RepCardItem({ card }: { card: RepCard }) {
  if (card.compact) {
    return (
      <div className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 ${card.colorClasses}`}>
        <div className="flex items-center gap-2 min-w-0">
          {/* <div className="shrink-0" style={{ color: card.accentColor }}>{card.icon}</div> */}
          <div className="min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none"
              style={{ color: card.accentColor }}>
            <span className="shrink-0">{card.icon}</span>
            <span>{card.level}</span>
          </div>
            <p className="text-xs font-semibold text-slate-700">{card.name}</p>
          </div>
        </div>
        {card.website && (
          <a href={card.website} target="_blank" rel="noopener noreferrer"
            className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors opacity-50 hover:opacity-100">
            <ExternalLink className="h-3.5 w-3.5" style={{ color: card.accentColor }} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${card.colorClasses}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none mb-1" style={{ color: card.accentColor }}>{card.level}</p>
              <p className="text-sm font-bold text-slate-800 leading-tight">{card.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{card.sublabel}</p>
            </div>
            {card.website && (
              <a href={card.website} target="_blank" rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors opacity-50 hover:opacity-100">
                  <span className="mt-1 mb-1 flex items-center justify-center gap-1 text-xs leading-relaxed">
                    Visit  <ExternalLink className="h-3.5 w-3.5" style={{ color: card.accentColor }} />
                  </span>
              </a>
            )}
          </div>
          {card.level === "City Council" && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your NYC Council member makes decisions on the city budget, laws, zoning, and agency oversight—and you can contact their office for help with housing, permits, and city services.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Lawmaking", "Budget Approval", "Land Use Votes (ULURP)", "Oversight Hearings", "Constituent Services"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-blue-100/60 text-blue-700 text-[10px] font-semibold">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {card.level === "Community Board" && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Community Boards are 50-member volunteer advisory groups. They hold public monthly meetings—open to residents & an accessible way to get involved and have input on local decisions.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Land Use Advisory (ULURP)", "Liquor License Review", "Street & Transit", "Budget Priorities", "District Issues", "Public Meetings"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-emerald-100/60 text-emerald-700 text-[10px] font-semibold">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {card.level === "Borough President" && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The Borough President advocates for their borough, reviews land use, sets budget priorities, appoints half of Community Boards, and supports major projects—but doesn’t pass laws or control budgets.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Land Use Advisory (ULURP Review)", "Budget Recommendations", "Community Board Appointments", "Advocacy for Borough Needs", "Capital Project Influence"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-violet-100/60 text-violet-700 text-[10px] font-semibold">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {(card.phone || card.email) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {card.phone && <a href={`tel:${card.phone}`} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"><Phone className="h-3 w-3" />{card.phone}</a>}
              {card.email && <a href={`mailto:${card.email}`} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"><Mail className="h-3 w-3" />{card.email}</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//  Civic Events - leaflet map
function CivicEventsMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerGroupsRef = useRef<Record<string, any>>({});
  const [activePinCats, setActivePinCats] = useState<Set<PinCategory>>(new Set(Object.keys(PIN_META) as PinCategory[]));
  const [boundaryLayers, setBoundaryLayers] = useState<BoundaryLayer[]>(INITIAL_BOUNDARY_LAYERS);
  const [mapReady, setMapReady] = useState(false);
  const [expandedBoundary, setExpandedBoundary] = useState<string | null>(null);

  const visiblePins = useMemo(() => CIVIC_PINS.filter((p) => activePinCats.has(p.category)), [activePinCats]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = mapContainerRef.current as any;
    if (container._leaflet_id != null) {
      try { container._leaflet_map?.remove(); } catch { /* ignore */ }
      container._leaflet_id = null;
    }
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch { /* ignore */ }
      mapInstanceRef.current = null;
      layerGroupsRef.current = {};
    }

    let cancelled = false; // guard against async completing after unmount

    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const container = mapContainerRef.current as any;
      if (container._leaflet_id != null) {
        container._leaflet_id = null;
      }
      const map = L.map(mapContainerRef.current!, { center: [40.73, -73.99], zoom: 11 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapContainerRef.current as any)._leaflet_map = map;
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).addTo(map as any);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* ignore */ }
        mapInstanceRef.current = null;
        layerGroupsRef.current = {};
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      if (layerGroupsRef.current["pins"]) mapInstanceRef.current.removeLayer(layerGroupsRef.current["pins"]);
      const group = L.layerGroup();
      visiblePins.forEach((pin) => {
        const meta = PIN_META[pin.category];
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:11px;height:11px;border-radius:50%;background:${meta.color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
          iconSize: [11, 11], iconAnchor: [5, 5],
        });
        L.marker([pin.lat, pin.lng], { icon }).bindTooltip(
          `<div style="font-family:system-ui;min-width:190px;padding:2px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${meta.color};margin-bottom:3px">${meta.label}</div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px">${pin.name}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:6px">${pin.address}</div>
            ${pin.url ? `<a href="${pin.url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:600;color:${meta.color}">Official page ↗</a>` : ""}
          </div>`,
          { sticky: true, opacity: 1, className: "civic-tooltip" }
        ).addTo(group);
      });
      group.addTo(mapInstanceRef.current);
      layerGroupsRef.current["pins"] = group;
    });
  }, [visiblePins, mapReady]);

    // store fetched GeoJSON per layer id (fetch once, reuse)
    const geoJsonCacheRef = useRef<Record<string, unknown>>({});

    // fetch GeoJSON for each layer once on mount
    useEffect(() => {
      if (!mapReady || !mapInstanceRef.current) return;
      import("leaflet").then(async (L) => {
        for (const bl of INITIAL_BOUNDARY_LAYERS) {
          if (geoJsonCacheRef.current[bl.id]) continue; // already fetched
          try {
            const res = await fetch(bl.url);
            const raw = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let geoJson: any = raw;
            if (raw.type === "Topology") {
              const topo = await import("topojson-client");
              const key = Object.keys(raw.objects)[0];
              geoJson = topo.feature(raw, raw.objects[key]);
            }
            geoJsonCacheRef.current[bl.id] = geoJson;
            // create the layer but don't add to map yet
            const layer = L.geoJSON(geoJson as Parameters<typeof L.geoJSON>[0], {
              style: { color: bl.color, weight: bl.weight, fillOpacity: 0.04, opacity: bl.opacity },
            });
            layerGroupsRef.current[bl.id] = layer;
            // add if enabled by default
            if (bl.enabled) layer.addTo(mapInstanceRef.current);
          } catch { /* skip on error */ }
        }
      });
    }, [mapReady]); // run once when map is ready

    // show/hide layers based on toggle state - no fetching
    useEffect(() => {
      if (!mapReady || !mapInstanceRef.current) return;
      for (const bl of boundaryLayers) {
        const layer = layerGroupsRef.current[bl.id];
        if (!layer) continue; // not yet fetched
        if (bl.enabled && !mapInstanceRef.current.hasLayer(layer)) {
          layer.addTo(mapInstanceRef.current);
        } else if (!bl.enabled && mapInstanceRef.current.hasLayer(layer)) {
          mapInstanceRef.current.removeLayer(layer);
        }
      }
    }, [boundaryLayers, mapReady]);

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  const togglePin = (cat: PinCategory) => setActivePinCats((p) => { const n = new Set(p); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  const toggleBoundary = (id: string) => setBoundaryLayers((prev) => prev.map((bl) => bl.id === id ? { ...bl, enabled: !bl.enabled } : bl));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 relative bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-175">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <div ref={mapContainerRef} className="w-full h-full" />
          {!mapReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              <p className="text-sm text-slate-400">Loading map…</p>
            </div>
          )}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-999 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md shadow-md border border-slate-200/60 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              Permanent civic locations — live event pins coming soon
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          {/* pin toggles */}
          <div className="bg-white rounded-4xl border border-slate-200 p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Location Types</p>
            <div className="space-y-1.5">
              {(Object.entries(PIN_META) as [PinCategory, { label: string; color: string }][]).map(([cat, meta]) => {
                const active = activePinCats.has(cat);
                const count = CIVIC_PINS.filter((p) => p.category === cat).length;
                return (
                  <button key={cat} onClick={() => togglePin(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-xs ${active ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white border-slate-100 text-slate-400"}`}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full border-[1.5px] border-white shadow-sm shrink-0" style={{ backgroundColor: active ? meta.color : "#cbd5e1" }} />
                      <span className="font-semibold">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">{count}</span>
                      {active ? <Eye className="h-3 w-3 text-slate-400" /> : <EyeOff className="h-3 w-3 text-slate-300" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* boundary toggles */}
          <div className="bg-white rounded-4xl border border-slate-200 p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Boundary Lines</p>
            <div className="space-y-1.5">
              {boundaryLayers.map((bl) => (
                <button key={bl.id} onClick={() => toggleBoundary(bl.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-xs ${bl.enabled ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white border-slate-100 text-slate-400"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2.5 w-6 rounded-full shrink-0" style={{ backgroundColor: bl.enabled ? bl.color : "#e2e8f0" }} />
                    <span className="font-semibold truncate">{bl.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-inset shrink-0 ml-1 ${BOUNDARY_GOV_COLORS[bl.govLevel] ?? ""}`}>
                    {bl.govLevel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* boundary explanations */}
      <div className="bg-white rounded-4xl border border-slate-200 p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" />
          Understanding Boundary Lines &amp; Levels of Government
        </h4>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed max-w-2xl">
          Each boundary on the map represents a different jurisdiction with its own elected officials. Your address typically falls inside multiple overlapping districts simultaneously — each with a different representative who makes decisions affecting your life.
        </p>
        <div className="space-y-2">
          {INITIAL_BOUNDARY_LAYERS.map((bl) => (
            <div key={bl.id} className="rounded-2xl border border-slate-100 overflow-hidden">
              <button onClick={() => setExpandedBoundary(expandedBoundary === bl.id ? null : bl.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-6 rounded-full shrink-0" style={{ backgroundColor: bl.color, opacity: 0.8 }} />
                  <span className="text-sm font-semibold text-slate-700">{bl.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${BOUNDARY_GOV_COLORS[bl.govLevel] ?? ""}`}>{bl.govLevel}</span>
                </div>
                {expandedBoundary === bl.id ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
              </button>
              <AnimatePresence>
                {expandedBoundary === bl.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="px-4 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{bl.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <p className="mt-5 pt-5 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-500">Note:</span> NYC Council Districts load from the CiviQ backend and are always available. Other boundary layers fetch from public GIS APIs and may vary based on external availability.
        </p>
      </div>
    </div>
  );
}


// export props
export type CivicMapProps = { title?: string; subtitle?: string; hideHeader?: boolean };


// main component
export function CivicMap({ title = "NY Explorer", subtitle = "", hideHeader = false }: CivicMapProps) {
  const [activeTab, setActiveTab] = useState<Tab>("nyc");

  /* shared map data */
  const [districts, setDistricts]   = useState<District[]>([]);
  const [geoData, setGeoData]       = useState<unknown>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapLoaded, setMapLoaded]   = useState(false);

  /* NYC explorer state */
  const [hoveredId, setHoveredId]   = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [repCards, setRepCards]     = useState<RepCard[]>([]);
  const [searchMode, setSearchMode] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [geocodeResult, setGeocodeResult] = useState<GeoResult | null>(null);

  /* unified search input (address, zip, rep name, district #) */
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  /* NYS embed */
  const [nysQuery, setNysQuery] = useState("");
  const [nysInput, setNysInput] = useState("");
  const iframeSrc = nysQuery ? `${ARCGIS_BASE}#find=${nysQuery}` : ARCGIS_BASE;

  /* resources filter */
  type ResourceFilter = "all" | GovLevelRes | string;
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");

  /* load geo on NYC tab */
  useEffect(() => {
    if (activeTab === "nyc" && !mapLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapLoading(true);
      Promise.all([getDistricts(), getDistrictsMap()])
        .then(([d, g]) => { setDistricts(d); setGeoData(g); setMapLoaded(true); })
        .catch((e) => console.error(e))
        .finally(() => setMapLoading(false));
    }
  }, [activeTab, mapLoaded]);

  /* selected district object */
  const selectedDistrict = useMemo(() => {
    if (selectedId === null) return null;
    return districts.find((d) => d.id === selectedId) ?? {
      id: selectedId, name: `NYC Council District ${selectedId}`,
      rep: "Council Member", issues: [], zip_codes: [],
    };
  }, [districts, selectedId]);

  /* district search suggestions */
  const districtSuggestions = useMemo(() => {
    const t = searchInput.toLowerCase().trim();
    if (!t || t.length < 2) return [];
    return districts.filter(
      (d) => d.name.toLowerCase().includes(t) || d.rep.toLowerCase().includes(t) ||
        d.id.toString() === t || d.zip_codes?.some((z) => z.includes(t))
    ).slice(0, 6);
  }, [districts, searchInput]);

  /* resolve a district ID into rep cards */
  const resolveDistrict = useCallback((distId: number, geo?: GeoResult) => {
    setSelectedId(distId);
    setGeocodeResult(geo ?? null);
    setShowSuggestions(false);
    setSearchInput("");
    // wait for districts to load if needed
    if (!mapLoaded) return;
    const dist = districts.find((d) => d.id === distId);
    if (!dist) {
      // districts loaded but this ID not found — use minimal fallback
      setRepCards(buildRepCards(
        { id: distId, name: `District ${distId}`, rep: "Council Member", issues: [], zip_codes: [] } as District,
        distId
      ));
    } else {
      setRepCards(buildRepCards(dist, distId));
    }
    setSearchMode("found");
  }, [districts, mapLoaded]);

  /* handle address/zip search submission */
  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchInput.trim()) return;

    // if it looks like a district number, resolve directly
    const asNum = parseInt(searchInput.trim());
    if (!isNaN(asNum) && asNum >= 1 && asNum <= 51) {
      resolveDistrict(asNum);
      return;
    }

    // try district name / rep name match first
    const t = searchInput.toLowerCase().trim();
    const nameMatch = districts.find((d) => d.rep.toLowerCase().includes(t) || d.name.toLowerCase().includes(t));
    if (nameMatch) { resolveDistrict(nameMatch.id); return; }

    // otherwise geocode
    if (!geoData) return;
    setSearchMode("loading");
    const geo = await geocodeAddress(searchInput);
    if (!geo) { setSearchMode("error"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distId = findDistrictForPoint(geo.lat, geo.lng, geoData as any);
    if (distId !== null) { resolveDistrict(distId, geo); }
    else { setGeocodeResult(geo); setSearchMode("error"); }
  }, [searchInput, geoData, districts, resolveDistrict]);

  const clearSearch = () => {
    setSearchMode("idle"); setSearchInput(""); setSelectedId(null);
    setRepCards([]); setGeocodeResult(null); setShowSuggestions(false);
  };

  const filteredResources = useMemo(() => {
    if (resourceFilter === "all") return RESOURCES;
    const govLevels: string[] = ["City", "State", "Federal"];
    if (govLevels.includes(resourceFilter)) return RESOURCES.filter((r) => r.govLevel === resourceFilter);
    return RESOURCES.filter((r) => r.tag === resourceFilter);
  }, [resourceFilter]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "nys",       label: "NYS Explorer", icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "nyc",       label: "NYC Explorer", icon: <MapIcon className="h-3.5 w-3.5" /> },
    { id: "events",    label: "Civic Events", icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "resources", label: "Resources",    icon: <Info className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="w-full py-16">
      {!hideHeader && (
        <div className="mb-8">
          <h2 className="font-display text-4xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-lg text-slate-500">{subtitle}</p>
          <div className="mt-5 bg-blue-50/60 rounded-2xl border border-blue-100/70 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-full">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h5 className="font-bold text-blue-900 text-sm mb-0.5">Why district boundaries matter</h5>
              <p className="text-sm text-blue-700/75 leading-relaxed">
                Your district determines which representatives vote on your behalf — from local land use and city budget decisions to state legislation and federal policy. Knowing who represents you at every level is the foundation of effective civic engagement and policy advocacy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-stretch w-full mb-8 border-b border-slate-200">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === tab.id ? "border-(--accent) text-(--accent)" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ════ NYS EXPLORER ════ */}
        {activeTab === "nys" && (
          <motion.div key="nys" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-175 relative flex flex-col group">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <MapIcon className="h-4 w-4 text-(--accent)" />Interactive Boundary Map — New York State
                </div>
                <div className="flex items-center gap-2">
                  <form onSubmit={(e) => { e.preventDefault(); setNysQuery(nysInput.trim() ? encodeURIComponent(nysInput.trim()) : ""); }} className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input type="text" value={nysInput} onChange={(e) => setNysInput(e.target.value)} placeholder="Address or zip…"
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-(--accent-soft) w-44 transition-shadow" />
                    </div>
                    <button type="submit" className="px-3 py-1.5 rounded-xl bg-(--accent) text-white text-xs font-bold hover:bg-(--accent-hover) transition-colors">Locate</button>
                    {nysQuery && (
                      <button type="button" onClick={() => { setNysQuery(""); setNysInput(""); }}
                        className="px-2 py-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </form>
                  <button onClick={() => window.open(iframeSrc, "_blank")}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-(--accent) transition-colors px-2 py-1.5 rounded-xl hover:bg-slate-100">
                    <Maximize2 className="h-3.5 w-3.5" />Expand
                  </button>
                </div>
              </div>
              <iframe key={iframeSrc} src={iframeSrc} className="w-full flex-1 border-none bg-slate-100" title="NYS Districts ArcGIS Map" allow="geolocation" loading="lazy" />
              {!nysQuery && (
                <div className="absolute bottom-6 left-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md shadow-lg border border-slate-200/50 text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                    💡 Type an address or zip in the toolbar above to zoom in.
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center">
              Powered by <a href="https://nysboe.maps.arcgis.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">NYS Board of Elections ArcGIS</a>
              {" "}· Shows state legislative, congressional, and county boundaries across New York State.
            </p>
          </motion.div>
        )}

        {/* ════ NYC EXPLORER ════ */}
        {activeTab === "nyc" && (
          <motion.div key="nyc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Map */}
            <div className="lg:col-span-8 relative bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-175">
              {mapLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  <p className="text-sm text-slate-400 font-medium">Loading geographic data…</p>
                </div>
              ) : geoData ? (
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 65000, center: [-73.94, 40.7] }} className="w-full h-full">
                  <ZoomableGroup>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Geographies geography={geoData as any}>
                      {({ geographies }) => geographies.map((geo) => {
                        const distId = parseInt(geo.properties.coun_dist);
                        const isActive = selectedId === distId;
                        const isHovered = hoveredId === distId;
                        return (
                          <Geography key={geo.rsmKey} geography={geo}
                            onClick={() => { if (mapLoaded) resolveDistrict(distId); }}
                            onMouseEnter={() => setHoveredId(distId)}
                            onMouseLeave={() => setHoveredId(null)}
                            style={{
                              default: { fill: isActive ? "var(--accent)" : isHovered ? "#dde6f8" : "#f1f5f9", stroke: isActive ? "var(--accent)" : "#cbd5e1", strokeWidth: isActive ? 1.5 : 0.5, outline: "none", transition: "all 200ms" },
                              hover:   { fill: isActive ? "var(--accent)" : "#dde6f8", stroke: "var(--accent)", strokeWidth: 1, outline: "none", cursor: "pointer" },
                              pressed: { fill: "var(--accent-soft)", outline: "none" },
                            }}
                          />
                        );
                      })}
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <AlertCircle className="h-10 w-10 text-slate-300" /><p className="text-sm">Failed to load map data.</p>
                </div>
              )}
              <div className="absolute bottom-5 left-5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur shadow-sm border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
                <Layers className="h-3 w-3" />51 Council Districts
              </div>
              <AnimatePresence>
                {hoveredId && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="absolute bottom-5 right-5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur shadow-md border border-slate-100 text-xs font-semibold text-slate-700 pointer-events-none">
                    District {hoveredId}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* sidebar - right */}
            <div className="lg:col-span-4 space-y-4">

              {/* SEARCH */}
              <div className="bg-white rounded-4xl border border-slate-200 p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Find Representatives
                </p>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Address, zip, rep name, or district #"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-(--accent-soft) transition-shadow placeholder:text-slate-300"
                    />
                  </div>
                  <button type="submit" disabled={searchMode === "loading" || !searchInput.trim() || !mapLoaded}
                    className="px-3 py-2.5 rounded-xl bg-(--accent) text-white text-sm font-bold hover:bg-slate-600 disabled:opacity-40 transition-colors flex items-center">
                    {searchMode === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                  {searchMode !== "idle" && (
                    <button type="button" onClick={clearSearch}
                      className="flex items-center rounded-xl bg-rose-600 hover:bg-rose-400 gap-1 px-3 text-xs text-white transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </form>

                {/* suggestions dropdown */}
                {showSuggestions && districtSuggestions.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-md">
                    {districtSuggestions.map((d) => (
                      <button key={d.id} onClick={() => resolveDistrict(d.id)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{d.rep}</p>
                          <p className="text-[11px] text-slate-400">District {d.id} · {d.name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* geocode result label */}
                {geocodeResult && searchMode === "found" && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate font-medium">{geocodeResult.label}</span>
                  </div>
                )}

                {/* Error */}
                {searchMode === "error" && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Address not found or outside NYC. Try adding a borough — e.g. &quot;Brooklyn, NY&quot;.
                  </div>
                )}

                {/* loading note */}
                {!mapLoaded && searchMode === "idle" && (
                  <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading district data…
                  </p>
                )}
              </div>

              {/* district summary + all rep cards */}
              <AnimatePresence mode="wait">
                {selectedDistrict && searchMode === "found" ? (
                  <motion.div key={selectedDistrict.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                    {/* all rep levels */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">
                      Local Representatives
                    </p>
                  </div>
                    {repCards.filter((c) => !c.compact).map((card) => (
                      <RepCardItem key={card.level} card={card} />
                    ))}
                    {/* {repCards.some((c) => c.compact) && (
                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">
                          State &amp; Federal
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {repCards.filter((c) => c.compact).map((card) => (
                            <div key={card.level} className="w-full min-h-16 sm:w-[40%]">
                              <RepCardItem card={card} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )} */}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-slate-100/50 rounded-4xl border-2 border-dashed border-slate-200 p-12 text-center h-100 flex flex-col items-center justify-center">
                    <MapPin className="h-10 w-10 text-slate-300 mb-4" />
                    <h3 className="text-slate-900 font-bold mb-2">No District Selected</h3>
                    <p className="text-sm text-slate-400 max-w-55">
                      Click any district on the map, or search by address, zip, rep name, or district number.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ════ CIVIC EVENTS ════ */}
        {activeTab === "events" && (
          <motion.div key="events" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <CivicEventsMap />
          </motion.div>
        )}

        {/* ════ RESOURCES ════ */}
        {activeTab === "resources" && (
          <motion.div key="resources" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Info className="h-5 w-5 text-(--accent)" />Civic Map Resources
                </h3>
                <p className="text-slate-500 mt-1 text-sm">
                  Official tools, district finders, calendars, and boundary data — with guidance on when to use each.
                </p>
              </div>
              <a href="https://opdgig.dos.ny.gov/" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-fit py-3 px-5 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-(--accent) hover:text-white transition-all border border-slate-200">
                NYS Open Data Portal <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* filter pills */}
            {(() => {
              const govLevels = ["City", "State", "Federal"] as const;
              const allTags = [...new Set(RESOURCES.map((r) => r.tag))].sort();
              return (
                <div className="space-y-2 mb-6">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setResourceFilter("all")}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${resourceFilter === "all" ? "bg-[rgba(20,31,45,0.85)] text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-slate-600"}`}>
                      All ({RESOURCES.length})
                    </button>
                    {govLevels.map((f) => (
                      <button key={f} onClick={() => setResourceFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${resourceFilter === f ? "bg-[rgba(20,31,45,0.85)] text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-slate-600"}`}>
                        {f} ({RESOURCES.filter((r) => r.govLevel === f).length})
                      </button>
                    ))}
                    {allTags.map((tag) => (
                      <button key={tag} onClick={() => setResourceFilter(tag)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${resourceFilter === tag ? "bg-[rgba(20,31,45,0.85)] text-white border-transparent" : `${TAG_COLORS[tag] ?? "bg-white text-slate-500 border-slate-200"} hover:border-slate-600`}`}>
                        {tag} ({RESOURCES.filter((r) => r.tag === tag).length})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((r) => (
                <motion.div key={r.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.01 }}
                  className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all group flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-widest ${TAG_COLORS[r.tag] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>{r.tag}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${GOV_LEVEL_RES_COLORS[r.govLevel]}`}>{r.govLevel}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-0.5">{r.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-400 mb-3">{r.org}</p>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1">{r.useCase}</p>
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 shrink-0">Use</span>
                    <p className="text-xs font-semibold text-slate-600 leading-snug">{r.bestFor}</p>
                  </div>
                  <a href={r.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-200 text-slate-900 text-xs font-bold hover:bg-(--accent) hover:text-white transition-all">
                    Explore <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}