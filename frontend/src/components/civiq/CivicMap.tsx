"use client";

import {
  MapPin, Users, Layers, Search, Map as MapIcon, ExternalLink, Info,
  ChevronRight, Globe, Building2, Landmark, Flag, AlertCircle,
  Loader2, X, Maximize2, Calendar
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getDistricts, getDistrictsMap, type District } from "@/lib/api";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { AnimatePresence, motion } from "framer-motion";



type Tab = "my-reps" | "nyc" | "nys" | "resources";

type GeoResult = {
  label: string;
  lat: number;
  lng: number;
};

type RepLevel = {
  level: string;
  icon: React.ReactNode;
  colorClasses: string;
  name?: string;
  district?: string;
  website?: string;
  resolved: boolean;
};


const RESOURCES = [
  {
    title: "NYC Boundary Explorer",
    org: "BetaNYC",
    tag: "Interactive",
    useCase: "Visually explore council districts, community boards, school districts, and more. Best for understanding how overlapping boundaries affect your neighborhood.",
    link: "https://boundaries.beta.nyc/?map=cc",
  },
  {
    title: "NYC Council Map Widget",
    org: "NYC Council",
    tag: "Official",
    useCase: "Find your exact council district and representative by address or intersection. The official source for council district assignments.",
    link: "https://council.nyc.gov/map-widget/",
  },
  {
    title: "NYC Council",
    org: "NYC Council",
    tag: "Official",
    useCase: "Full legislative portal — bills, votes, hearings, member pages, and district offices for all 51 council members.",
    link: "https://council.nyc.gov/",
  },
  {
    title: "NYS Assembly Districts",
    org: "NYS GIS",
    tag: "Legislative",
    useCase: "Interactive map of 2024 State Assembly district boundaries zoomed to NYC. Essential for identifying your state-level Assembly representative.",
    link: "https://data.gis.ny.gov/datasets/sharegisny::nys-assembly-districts/explore?location=40.807870%2C-73.766162%2C10",
  },
  {
    title: "NYS Senate Districts",
    org: "NYS Open Data",
    tag: "Legislative",
    useCase: "Official NYS Senate boundary map. Use it to find your State Senator and understand how the upper chamber is carved across the state.",
    link: "https://opdgig.dos.ny.gov/maps/074d3456e5664f5e85d0fb251d05cc5b/about",
  },
  {
    title: "NYS Civil Boundaries",
    org: "ArcGIS / NYS",
    tag: "Administrative",
    useCase: "Authoritative data for county, town, and city divisions across all of New York State. Useful for understanding jurisdictional scope beyond legislative districts.",
    link: "https://www.arcgis.com/home/item.html?id=074d3456e5664f5e85d0fb251d05cc5b",
  },
  {
    title: "NYS Assembly Districts (Overview)",
    org: "NYS Open Data",
    tag: "Legislative",
    useCase: "Statewide view of all NYS Assembly districts with downloadable GIS data. Good for researchers comparing districts across the full state.",
    link: "https://opdgig.dos.ny.gov/datasets/sharegisny::nys-assembly-districts/about",
  },
  {
    title: "NYS Open GIS Portal",
    org: "NYS Dept. of State",
    tag: "Data",
    useCase: "The central repository for all official New York State GIS datasets — boundaries, infrastructure, demographics, and more. Starting point for any data-driven civic research.",
    link: "https://opdgig.dos.ny.gov/",
  },
];

const TAG_COLORS: Record<string, string> = {
  Interactive: "bg-blue-50 text-blue-600 border-blue-100",
  Official: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Legislative: "bg-violet-50 text-violet-700 border-violet-100",
  Administrative: "bg-amber-50 text-amber-700 border-amber-100",
  Data: "bg-slate-100 text-slate-600 border-slate-200",
};

//  Geocode -- NYC Planning Labs (free api, no key)
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
  } catch {
    return null;
  }
}

// Point-in-polygon (ray casting)
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

// helpers
function boroughFromId(id: number): string {
  if (id <= 10) return "Manhattan";
  if (id <= 18) return "Bronx";
  if (id <= 35) return "Brooklyn";
  if (id <= 45) return "Queens";
  return "Staten Island";
}

const BOROUGH_PRESIDENTS: Record<string, string> = {
  Manhattan: "Mark Levine",
  Bronx: "Vanessa Gibson",
  Brooklyn: "Antonio Reynoso",
  Queens: "Donovan Richards",
  "Staten Island": "Vito Fossella",
};

function buildRepLevels(district: District, distId: number): RepLevel[] {
  const borough = boroughFromId(distId);
  return [
    {
      level: "City Council",
      icon: <Building2 className="h-4 w-4" />,
      colorClasses: "bg-blue-50 text-blue-700 border-blue-100",
      name: district.rep || "Council Member",
      district: `District ${distId}`,
      website: `https://council.nyc.gov/district-${distId}/`,
      resolved: true,
    },
    {
      level: "Community Board",
      icon: <Users className="h-4 w-4" />,
      colorClasses: "bg-emerald-50 text-emerald-700 border-emerald-100",
      name: borough,
      district: "Find your CB number →",
      website: "https://www.nyc.gov/site/cau/community-boards/community-boards.page",
      resolved: false,
    },
    {
      level: "Borough President",
      icon: <Flag className="h-4 w-4" />,
      colorClasses: "bg-violet-50 text-violet-700 border-violet-100",
      name: BOROUGH_PRESIDENTS[borough],
      district: borough,
      website: `https://www.${borough.toLowerCase().replace(/\s/g, "")}bp.nyc.gov/`,
      resolved: true,
    },
    {
      level: "State Assembly",
      icon: <Landmark className="h-4 w-4" />,
      colorClasses: "bg-amber-50 text-amber-700 border-amber-100",
      name: "NYS Assembly Member",
      district: borough,
      website: "https://data.gis.ny.gov/datasets/sharegisny::nys-assembly-districts/explore?location=40.807870%2C-73.766162%2C10",
      resolved: false,
    },
    {
      level: "State Senate",
      icon: <Landmark className="h-4 w-4" />,
      colorClasses: "bg-rose-50 text-rose-700 border-rose-100",
      name: "NYS Senator",
      district: borough,
      website: "https://www.nysenate.gov/find-my-senator",
      resolved: false,
    },
    {
      level: "US Congress",
      icon: <Flag className="h-4 w-4" />,
      colorClasses: "bg-slate-100 text-slate-700 border-slate-200",
      name: "US Representative",
      district: "New York",
      website: "https://www.house.gov/representatives/find-your-representative",
      resolved: false,
    },
  ];
}

const ARCGIS_BASE =
  "https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e";

export type CivicMapProps = {
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
};


// -----------------------------------------------------------------------------
export function CivicMap({
  title = "NY Explorer",
  subtitle = "",
  hideHeader = false,
}: CivicMapProps) {
  const [activeTab, setActiveTab] = useState<Tab>("my-reps");

  /* shared map data */
  const [districts, setDistricts] = useState<District[]>([]);
  const [geoData, setGeoData] = useState<unknown>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  /* NYC explore */
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exploreSearch, setExploreSearch] = useState("");

  /* My Reps ?? */
  const [addressInput, setAddressInput] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [geocodeResult, setGeocodeResult] = useState<GeoResult | null>(null);
  const [foundId, setFoundId] = useState<number | null>(null);
  const [repLevels, setRepLevels] = useState<RepLevel[]>([]);

  /* NYS embed */
  const [nysQuery, setNysQuery] = useState("");
  const [nysInput, setNysInput] = useState("");
  const iframeSrc = nysQuery ? `${ARCGIS_BASE}#find=${nysQuery}` : ARCGIS_BASE;

  /* load geo data on map tabs */
  useEffect(() => {
    if ((activeTab === "nyc" || activeTab === "my-reps") && !mapLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapLoading(true);
      Promise.all([getDistricts(), getDistrictsMap()])
        .then(([d, g]) => { setDistricts(d); setGeoData(g); setMapLoaded(true); })
        .catch((e) => console.error(e))
        .finally(() => setMapLoading(false));
    }
  }, [activeTab, mapLoaded]);

  const exploreDistrict = useMemo(() => {
    if (selectedId === null) return null;
    return (
      districts.find((d) => d.id === selectedId) ?? {
        id: selectedId,
        name: `NYC Council District ${selectedId}`,
        rep: "Council Member",
        issues: [],
        zip_codes: [],
      }
    );
  }, [districts, selectedId]);

  const filteredDistricts = useMemo(() => {
    const t = exploreSearch.toLowerCase().trim();
    if (!t) return districts;
    return districts.filter(
      (d) =>
        d.name.toLowerCase().includes(t) ||
        d.rep.toLowerCase().includes(t) ||
        d.id.toString() === t ||
        d.zip_codes?.some((z) => z.includes(t))
    );
  }, [districts, exploreSearch]);

  const handleAddressSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!addressInput.trim() || !geoData) return;
      setSearchState("loading");
      setGeocodeResult(null);
      setFoundId(null);
      setRepLevels([]);
      const geo = await geocodeAddress(addressInput);
      if (!geo) { setSearchState("error"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const distId = findDistrictForPoint(geo.lat, geo.lng, geoData as any);
      setGeocodeResult(geo);
      setFoundId(distId);
      if (distId !== null) {
        const dist = districts.find((d) => d.id === distId) ??
          ({ id: distId, name: `District ${distId}`, rep: "Council Member", issues: [], zip_codes: [] } as District);
        setRepLevels(buildRepLevels(dist, distId));
        setSearchState("found");
      } else {
        setSearchState("error");
      }
    },
    [addressInput, geoData, districts]
  );

  const highlightId = activeTab === "my-reps" ? foundId : selectedId;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "my-reps", label: "Find My Reps", icon: <Search className="h-3.5 w-3.5" /> },
    { id: "nyc", label: "NYC Districts", icon: <MapIcon className="h-3.5 w-3.5" /> },
    { id: "nys", label: "NYS Explorer", icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "resources", label: "Map Resources", icon: <Info className="h-3.5 w-3.5" /> },
  ];

  /* shared SVG map */
  const renderSvgMap = (mode: "my-reps" | "nyc") => (
    <div className="lg:col-span-8 relative bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-175">
      {mapLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">Loading geographic data…</p>
        </div>
      ) : geoData ? (
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 65000, center: [-73.94, 40.7] }}
          className="w-full h-full"
        >
          <ZoomableGroup>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Geographies geography={geoData as any}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const distId = parseInt(geo.properties.coun_dist);
                  const isHighlighted = highlightId === distId;
                  const isHovered = hoveredId === distId;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => { if (mode === "nyc") setSelectedId(distId); }}
                      onMouseEnter={() => setHoveredId(distId)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        default: {
                          fill: isHighlighted ? "var(--accent)" : isHovered ? "#dde6f8" : "#f1f5f9",
                          stroke: isHighlighted ? "var(--accent)" : "#cbd5e1",
                          strokeWidth: isHighlighted ? 1.5 : 0.5,
                          outline: "none",
                          transition: "all 200ms",
                        },
                        hover: {
                          fill: isHighlighted ? "var(--accent)" : "#dde6f8",
                          stroke: "var(--accent)",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: mode === "nyc" ? "pointer" : "default",
                        },
                        pressed: { fill: "var(--accent-soft)", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
          <AlertCircle className="h-10 w-10 text-slate-300" />
          <p className="text-sm">Failed to load map data.</p>
        </div>
      )}
      <div className="absolute bottom-5 left-5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur shadow-sm border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
        <Layers className="h-3 w-3" />
        51 Council Districts
      </div>
      <AnimatePresence>
        {hoveredId && mode === "nyc" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-5 right-5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur shadow-md border border-slate-100 text-xs font-semibold text-slate-700 pointer-events-none"
          >
            District {hoveredId}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="w-full py-16">
      {!hideHeader && (
        <div className="mb-8">
          <h2 className="font-display text-4xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-lg text-slate-500">{subtitle}</p>

          {/* INFO */}
          <div className="mt-5 bg-blue-50/60 rounded-2xl border border-blue-100/70 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-full">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h5 className="font-bold text-blue-900 text-sm mb-0.5">Why district boundaries matter</h5>
              <p className="text-sm text-blue-700/75 leading-relaxed">
                Your district determines which representatives vote on your behalf — from local land use and
                city budget decisions to state legislation and federal policy. Knowing who represents you at
                every level is the foundation of effective civic engagement and policy advocacy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* tabs */}
      <div className="flex items-stretch w-full mb-8 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-(--accent) text-(--accent)"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ════ MY REPS ════ */}
        {activeTab === "my-reps" && (
          <motion.div
            key="my-reps"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {renderSvgMap("my-reps")}

            <div className="lg:col-span-4 space-y-4">
              {/* address input */}
              <div className="bg-white rounded-4xl border border-slate-200 p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  NYC Address
                </p>
                <form onSubmit={handleAddressSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="e.g. 100 Gold Street, NYC"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-(--accent-soft) transition-shadow placeholder:text-slate-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchState === "loading" || !addressInput.trim() || !mapLoaded}
                    className="px-3 py-2.5 rounded-xl bg-(--accent) text-white text-sm font-bold hover:bg-slate-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {searchState === "loading"
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Search className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setSearchState("idle");
                      setAddressInput("");
                      setFoundId(null);
                      setRepLevels([]);
                      setGeocodeResult(null);
                    }}
                    className="flex items-center rounded-xl bg-rose-600 hover:bg-rose-400 gap-1 px-3 text-xs text-white disabled:opacity-40 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>

                {geocodeResult && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate font-medium">{geocodeResult.label}</span>
                  </div>
                )}
                {searchState === "error" && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Address not found or outside NYC. Try adding a borough (e.g. &quot;Brooklyn, NY&quot;).
                  </div>
                )}
                {!mapLoaded && searchState === "idle" && (
                  <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading district data…
                  </p>
                )}
              </div>

              {/* rep cards */}
              {searchState === "found" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                    Your Representatives
                  </p>
                  {repLevels.map((rep) => (
                    <div key={rep.level} className={`rounded-2xl border p-4 shadow-sm ${rep.colorClasses}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg border ${rep.colorClasses}`}>
                            {rep.icon}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                              {rep.level}
                            </p>
                            <p className="text-sm font-semibold text-slate-800 leading-tight">
                              {rep.name}
                            </p>
                            {rep.district && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{rep.district}</p>
                            )}
                          </div>
                        </div>
                        {rep.website && (
                          <a
                            href={rep.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
                          >
                            <span className="mt-2 mb-2 flex items-center justify-center gap-1 text-xs opacity-60 leading-relaxed">
                              Precise Lookup <ExternalLink className="h-3.5 w-3.5" />
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                </motion.div>
              )}

              {searchState === "idle" && (
                <div className="bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500 mb-1">
                    Your representatives
                  </p>
                  <p className="text-xs text-slate-400 max-w-50 mx-auto">
                    from City Council to Congress
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════ NYC DISTRICTS ════ */}
        {activeTab === "nyc" && (
          <motion.div
            key="nyc"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {renderSvgMap("nyc")}

            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-4xl border border-slate-200 p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Search Districts
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <input
                    type="text"
                    value={exploreSearch}
                    onChange={(e) => setExploreSearch(e.target.value)}
                    placeholder="Rep name, district #, or zip…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-(--accent-soft) transition-shadow placeholder:text-slate-300"
                  />
                </div>
                {exploreSearch.trim() && (
                  <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                    {filteredDistricts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2 text-center">No matches</p>
                    ) : (
                      filteredDistricts.slice(0, 8).map((d) => (
                        <button
                          key={d.id}
                          onClick={() => { setSelectedId(d.id); setExploreSearch(""); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{d.rep}</p>
                            <p className="text-[11px] text-slate-400">District {d.id} · {d.name}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {exploreDistrict ? (
                  <motion.div
                    key={exploreDistrict.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-white rounded-4xl border border-slate-200 p-8 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-(--accent-soft)/20 flex items-center justify-center text-(--accent) font-bold text-2xl">
                        {exploreDistrict.id}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest">
                          District
                        </span>
                        <button
                          onClick={() => setSelectedId(null)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{exploreDistrict.rep}</h2>
                    <p className="text-slate-500 text-sm font-medium mb-6">{exploreDistrict.name}</p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>Official Council Member</span>
                      </div>
                      {(exploreDistrict.zip_codes?.length ?? 0) > 0 && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-slate-400 leading-relaxed">
                            {exploreDistrict.zip_codes?.slice(0, 8).join(", ")}
                            {(exploreDistrict.zip_codes?.length ?? 0) > 8 && " …"}
                          </span>
                        </div>
                      )}
                    </div>

                    {exploreDistrict.issues?.length > 0 && (
                      <div className="border-t border-slate-100 pt-5 mb-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                          Focus Areas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {exploreDistrict.issues.map((issue) => (
                            <span key={issue} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <a
                      href={`https://council.nyc.gov/district-${exploreDistrict.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-(--accent) hover:text-white transition-all"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Official District Page
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-slate-100/50 rounded-4xl border-2 border-dashed border-slate-200 p-12 text-center h-100 flex flex-col items-center justify-center"
                  >
                    <MapPin className="h-10 w-10 text-slate-300 mb-4" />
                    <h3 className="text-slate-900 font-bold mb-2">No District Selected</h3>
                    <p className="text-sm text-slate-400 max-w-50">
                      Select a shape on the map or search by rep, district number, or zip code.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ════ NYS EXPLORER ════ */}
        {activeTab === "nys" && (
          <motion.div
            key="nys"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-175 relative flex flex-col group">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <MapIcon className="h-4 w-4 text-(--accent)" />
                  Interactive Boundary Map — New York State
                </div>
                <div className="flex items-center gap-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setNysQuery(nysInput.trim() ? encodeURIComponent(nysInput.trim()) : "");
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={nysInput}
                        onChange={(e) => setNysInput(e.target.value)}
                        placeholder="Address or zip…"
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-(--accent-soft) w-44 transition-shadow"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-(--accent) text-white text-xs font-bold hover:bg-(--accent-hover) transition-colors"
                    >
                      Locate
                    </button>
                    {nysQuery && (
                      <button
                        type="button"
                        onClick={() => { setNysQuery(""); setNysInput(""); }}
                        className="px-2 py-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </form>
                  <button
                    onClick={() => window.open(iframeSrc, "_blank")}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-(--accent) transition-colors px-2 py-1.5 rounded-xl hover:bg-slate-100"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand
                  </button>
                </div>
              </div>

              <iframe
                key={iframeSrc}
                src={iframeSrc}
                className="w-full flex-1 border-none bg-slate-100"
                title="NYS Districts ArcGIS Map"
                allow="geolocation"
                loading="lazy"
              />

              {!nysQuery && (
                <div className="absolute bottom-6 left-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md shadow-lg border border-slate-200/50 text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                    💡 Type an address or zip in the toolbar above to zoom in.
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center">
              Powered by{" "}
              <a href="https://nysboe.maps.arcgis.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                NYS Board of Elections ArcGIS
              </a>
              {" "}· Shows state legislative, congressional, and county boundaries across New York State.
            </p>
          </motion.div>
        )}

        {/* ════ RESOURCES ════ */}
        {activeTab === "resources" && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Info className="h-5 w-5 text-(--accent)" />
                  Civic Map Resources
                </h3>
                <p className="text-slate-500 mt-1 text-sm">
                  Authoritative GIS tools, district finders, and boundary data for NYC and New York State.
                </p>
              </div>
              <a
                href="https://opdgig.dos.ny.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-fit py-3 px-5 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-(--accent) hover:text-white transition-all border border-slate-200"
              >
                NYS Open Data Portal <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {RESOURCES.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-widest ${TAG_COLORS[r.tag] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {r.tag}
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-(--accent) transition-colors">
                      <MapIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-0.5">{r.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-400 mb-3">{r.org}</p>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">{r.useCase}</p>
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-(--accent) hover:text-white transition-all"
                  >
                    Explore Map <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </motion.div>
              ))}
            </div>

            {/* Civic Events -- coming soon */}
            <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col sm:flex-row items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                  Coming Soon
                </div>
                <h4 className="font-bold text-slate-700 mb-1">Civic Events Map</h4>
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                  Pins for public hearings, town halls, and community board meetings pulled from calendar
                  sources — filterable by date, district, and topic.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}