"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Sparkles, MapPin, Map as MapIcon, Layers, ChevronUp, ChevronDown, Mail, Phone, ExternalLink, Info, CheckCircle2, Plus, Minus } from "lucide-react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { type PolicyBriefing, getDistrictsMap, getDistricts, type District } from "@/lib/api";
import { type CivicProfile } from "@/lib/useProfile";
import { useTheme } from "next-themes";
import { MotionReveal } from "./MotionReveal";
import { POLICY_AREAS, getPolicyAreaMetadata } from "@/lib/policyMetadata";

import dynamic from "next/dynamic";

const LeafletMapWrapper = dynamic(() => import("./LeafletMapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex w-full items-center justify-center bg-slate-50 dark:bg-[#111827]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" />
        <p className="text-[11px] text-[var(--muted)]">Loading satellite view…</p>
      </div>
    </div>
  ),
});

const LOCATION_TO_BORO: Record<string, string> = {
  Manhattan: "Manhattan", Brooklyn: "Brooklyn", Queens: "Queens",
  Bronx: "Bronx", "Staten Island": "Staten Island",
};

export type LegislativeActivityMapProps = {
  isPersonalized: boolean;
  profile: CivicProfile | null;
  policies: PolicyBriefing[];
  selectedArea: string;
  setSelectedArea: (v: string) => void;
  selectedLocation: string;
  onSearch?: (query: string) => void;
  hasBriefing?: boolean;
  mapMode: "vector" | "satellite";
  setMapMode: (v: "vector" | "satellite") => void;
};

function matchesArea(policy: PolicyBriefing, areaId: string): boolean {
  if (areaId === "All") return true;
  const kws = getPolicyAreaMetadata(areaId).keywords;
  const hay = `${policy.title} ${(policy.topic_tags ?? []).join(" ")}`.toLowerCase();
  return !kws.length || kws.some((k) => hay.includes(k));
}

function profileScore(p: PolicyBriefing, profile: CivicProfile | null): number {
  if (!profile) return 0;
  let s = 0;
  const hay = `${p.title} ${(p.topic_tags ?? []).join(" ")}`.toLowerCase();
  if (profile.borough && hay.includes(profile.borough.toLowerCase())) s += 3;
  for (const issue of profile.issues ?? []) {
    const kws = getPolicyAreaMetadata(issue).keywords;
    if (kws.some((k) => hay.includes(k))) s += 2;
  }
  for (const demo of profile.demographics ?? []) { if (hay.includes(demo.toLowerCase())) s += 1; }
  const hkws: Record<string, string[]> = { rent: ["tenant", "rent", "landlord"], own: ["homeowner", "coop", "condo"], "public housing": ["nycha", "public housing"] };
  if ((hkws[profile.housing?.toLowerCase() ?? ""] ?? []).some((k) => hay.includes(k))) s += 2;
  return s;
}

export function LegislativeActivityMap({
  isPersonalized, profile, policies,
  selectedArea, setSelectedArea, selectedLocation, onSearch,
  hasBriefing = false,
  mapMode, setMapMode,
}: LegislativeActivityMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<number | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const geoJsonRef = useRef<any>(null);

  const [districts, setDistricts] = useState<District[]>([]);
  const [vectorPos, setVectorPos] = useState({ coordinates: [-73.94, 40.712] as [number, number], zoom: 1 });

  useEffect(() => { getDistrictsMap().then(setGeoData); }, []);
  useEffect(() => { getDistricts().then(setDistricts).catch(console.error); }, []);

  const activeArea = POLICY_AREAS.find((a) => a.id === selectedArea) ?? POLICY_AREAS[0];
  const baseColor = activeArea.color;

  const filteredDistrictIds = useMemo<Set<number> | null>(() => {
    const bFilter = LOCATION_TO_BORO[selectedLocation];
    if (!bFilter || !geoData?.features) return null;
    const ids = new Set<number>();
    geoData.features.forEach((f: any) => {
      if (f.properties.boro_name === bFilter) ids.add(parseInt(f.properties.coun_dist));
    });
    return ids;
  }, [selectedLocation, geoData]);

  const districtActivity = useMemo(() => {
    const raw: Record<number, number> = {};
    policies.forEach((p) => {
      if (!matchesArea(p, selectedArea)) return;
      const w = isPersonalized ? 1 + profileScore(p, profile) * 0.4 : 1;
      (p.districts ?? []).forEach((d) => { raw[d] = (raw[d] ?? 0) + w * 2; });
    });
    const out: Record<number, number> = {};
    for (let i = 1; i <= 51; i++) {
      const seed = i * (selectedArea === "All" ? 7 : selectedArea.length + 3);
      const baseline = (Math.sin(seed) + 1) / 5;
      const inFilter = !filteredDistrictIds || filteredDistrictIds.has(i);
      const dim = inFilter ? 1 : 0.12;
      out[i] = ((raw[i] ?? 0) > 0 ? Math.min(1, 0.45 + (raw[i] ?? 0) * 0.08) : 0.08 + baseline) * dim;
    }
    return out;
  }, [policies, selectedArea, isPersonalized, profile, filteredDistrictIds]);

  const getColor = (val: number) => {
    if (val < 0.12) return isDark ? "rgba(30,41,59,0.4)" : "rgba(226,232,240,0.35)";
    if (val < 0.35) return `${baseColor}28`;
    if (val < 0.60) return `${baseColor}58`;
    if (val < 0.80) return `${baseColor}90`;
    return baseColor;
  };

  useEffect(() => {
    const layer = geoJsonRef.current;
    if (!layer) return;
    layer.eachLayer((sub: any) => {
      const id = parseInt(sub.feature?.properties?.coun_dist);
      const sel = selectedDistrictId === id;
      sub.setStyle({
        fillColor: getColor(districtActivity[id] ?? 0),
        fillOpacity: sel ? 0.95 : 0.78,
        weight: sel ? 2.5 : 0.6,
        color: sel ? baseColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
        opacity: 1,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrictId, districtActivity, baseColor, isDark]);

  useEffect(() => {
    if (selectedDistrictId && filteredDistrictIds && !filteredDistrictIds.has(selectedDistrictId)) {
      setSelectedDistrictId(null);
    }
  }, [filteredDistrictIds, selectedDistrictId]);

  // When a district is clicked, update selected district state locally
  const handleDistrictClick = (districtId: number, feature: any) => {
    setSelectedDistrictId((prev) => prev === districtId ? null : districtId);
  };

  const profileAreaIds = useMemo(() => {
    if (!isPersonalized || !profile?.issues?.length) return new Set<string>();
    return new Set(
      POLICY_AREAS.filter((a) =>
        profile.issues.some((issue) => {
          const kws = getPolicyAreaMetadata(a.id).keywords;
          return issue === a.id || kws.some((k: string) => issue.toLowerCase().includes(k));
        }),
      ).map((a) => a.id),
    );
  }, [isPersonalized, profile]);

  const activeBoroughLabel = LOCATION_TO_BORO[selectedLocation] ?? null;

  // Selected district label for map overlay
  const selectedFeature = useMemo(() => {
    if (!selectedDistrictId || !geoData?.features) return null;
    return geoData.features.find((f: any) => parseInt(f.properties.coun_dist) === selectedDistrictId);
  }, [selectedDistrictId, geoData]);

  const selectedDistrictObj = useMemo(() => {
    return districts.find((d) => d.id === selectedDistrictId);
  }, [districts, selectedDistrictId]);

  const districtPolicies = useMemo(() => {
    if (!selectedDistrictId) return [];
    return policies.filter((p) => {
      const matchesD = (p.districts ?? []).includes(selectedDistrictId);
      const matchesA = matchesArea(p, selectedArea);
      return matchesD && matchesA;
    });
  }, [policies, selectedDistrictId, selectedArea]);

  const tileLightUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const tileDarkUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileUrl = isDark ? tileDarkUrl : tileLightUrl;

  const showBottomPanel = Boolean(selectedDistrictId);

  return (
    <MotionReveal>
      <section className="space-y-4">
        {/* ── Map container (always full-width) ── */}
        <div className="relative rounded-[1.5rem] overflow-hidden border border-[var(--border)] shadow-md bg-white dark:bg-[var(--surface-card)] flex flex-col glass-card" style={{ minHeight: 420 }}>
          {/* Top-left badge */}
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-bold uppercase tracking-wider shadow-sm pointer-events-none">
            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: baseColor }} />
            <span className="text-[var(--muted)]" style={{ fontFamily: "var(--font-display)" }}>{activeBoroughLabel ? `${activeBoroughLabel} · ` : "All NYC · "}</span>
            <span style={{ color: baseColor }}>{activeArea.label}</span>
          </div>

          {/* Selected district overlay */}
          {selectedDistrictId && selectedFeature && (
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm border pointer-events-none"
              style={{ background: `${baseColor}15`, borderColor: `${baseColor}40` }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: baseColor }} />
              <span className="text-[10px] font-bold" style={{ color: baseColor }}>
                {selectedFeature.properties?.name ?? `District ${selectedDistrictId}`}
              </span>
              <span className="text-[9px] text-[var(--muted)]">· {selectedFeature.properties?.boro_name}</span>
            </div>
          )}

          {!geoData ? (
            <div className="h-[420px] flex items-center justify-center bg-slate-50 dark:bg-[var(--surface-elevated)] flex-1">
              <div className="flex flex-col items-center gap-3">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" />
                <p className="text-[11px] text-[var(--muted)]">Loading map…</p>
              </div>
            </div>
          ) : mapMode === "vector" ? (
            /* ── Vector / SVG map ─────────────────────────────────────────── */
            <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden" style={{ height: 420 }}>
              <div className="absolute bottom-3 right-3 z-[1000] flex flex-col shadow-md rounded-lg overflow-hidden border border-[var(--border)] bg-white/95 dark:bg-[var(--surface-elevated)]/95 backdrop-blur-md">
                <button type="button" onClick={() => setVectorPos(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))} className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--surface-card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors border-b border-[var(--border)]" aria-label="Zoom in">
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => setVectorPos(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))} className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--surface-card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" aria-label="Zoom out">
                  <Minus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 40000, center: [-73.94, 40.712] }}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup
                  center={vectorPos.coordinates}
                  zoom={vectorPos.zoom}
                  minZoom={1}
                  maxZoom={8}
                  translateExtent={[[0, 0], [800, 600]]}
                  onMoveEnd={setVectorPos}
                  // Explicitly allow trackpad pinch (wheel with ctrlKey) and standard touch/mouse events
                  filterZoomEvent={(e: any) => {
                    if (e.type === "wheel") return true;
                    return !e.button;
                  }}
                >
                  <Geographies geography={geoData}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const id = parseInt(geo.properties.coun_dist);
                        const activity = districtActivity[id] ?? 0;
                        const isSelected = selectedDistrictId === id;
                        const isHovered = hoveredDistrictId === id;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={() => setHoveredDistrictId(id)}
                            onMouseLeave={() => setHoveredDistrictId(null)}
                            onClick={() => handleDistrictClick(id, geo)}
                            style={{
                              default: {
                                fill: getColor(activity),
                                stroke: isSelected ? baseColor : "rgba(255,255,255,0.8)",
                                strokeWidth: isSelected ? 1.5 : 0.4,
                                outline: "none",
                                transition: "all 150ms ease",
                              },
                              hover: {
                                fill: isSelected ? getColor(activity) : `${baseColor}90`,
                                stroke: baseColor,
                                strokeWidth: 1.5,
                                outline: "none",
                                cursor: "pointer",
                              },
                              pressed: { fill: baseColor, outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>
          ) : (
            /* ── Leaflet / satellite map ──────────────────────────────────── */
            <div className="flex-1 relative w-full h-[420px]">
              <LeafletMapWrapper
                isDark={isDark}
                tileUrl={tileUrl}
                geoData={geoData}
                districtActivity={districtActivity}
                selectedDistrictId={selectedDistrictId}
                getColor={getColor}
                baseColor={baseColor}
                handleDistrictClick={handleDistrictClick}
              />
            </div>
          )}

          {/* Activity legend */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] shadow-sm pointer-events-none">
            <span>Low</span>
            <div className="flex h-1.5 w-14 rounded-full overflow-hidden">
              <div className="h-full flex-1" style={{ background: `${baseColor}28` }} />
              <div className="h-full flex-1" style={{ background: `${baseColor}58` }} />
              <div className="h-full flex-1" style={{ background: `${baseColor}90` }} />
              <div className="h-full flex-1" style={{ background: baseColor }} />
            </div>
            <span>High activity</span>
          </div>

          {/* Click hint */}
          {!selectedDistrictId && (
            <div className="absolute bottom-3 right-3 z-[1000] px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-medium text-[var(--muted)] shadow-sm pointer-events-none">
              Click a district to inspect details & policies changed
            </div>
          )}
        </div>

        {/* ── Bottom Panel: District Intel (appears below the map) ── */}
        {showBottomPanel && selectedFeature && (
          <div className="bg-white/80 dark:bg-[var(--surface-card)]/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg">

            {/* Header row with close */}
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  {selectedFeature.properties?.boro_name || "NYC"}
                </span>
                <h3 className="font-limelight text-base font-black text-[rgba(20,31,45,0.92)] dark:text-white truncate">
                  {selectedFeature.properties?.name || `District ${selectedDistrictId}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDistrictId(null)}
                className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0"
                aria-label="Close panel"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            {/* Compact content layout */}
            <div className="flex flex-col gap-3">

              {/* Top row: Profile & Metric */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


                {/* Col 1: Councilmember Profile */}
                <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-elevated)] shadow-sm flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 shadow-md flex items-center justify-center text-xs font-black text-white shrink-0 ring-2 ring-white dark:ring-slate-700">
                      {selectedDistrictObj?.rep ? selectedDistrictObj.rep.slice(0, 2).toUpperCase() : "CM"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">District Representative</p>
                      <p className="font-limelight text-sm font-black text-slate-800 dark:text-white truncate leading-tight">
                        {selectedDistrictObj?.rep || "Council Member"}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-[var(--muted)] font-medium truncate mt-0.5">
                        {selectedDistrictObj?.office || "City Council"}
                      </p>
                    </div>
                  </div>

                  {selectedDistrictObj?.political_stance && selectedDistrictObj.political_stance !== "N/A" && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 self-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">
                        Stance: {selectedDistrictObj.political_stance}
                      </span>
                    </div>
                  )}

                  {/* Direct Action Contacts */}
                  {selectedDistrictObj && (selectedDistrictObj.email || selectedDistrictObj.phone || selectedDistrictObj.website) && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      {selectedDistrictObj.phone && (
                        <a
                          href={`tel:${selectedDistrictObj.phone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors text-[10px] font-bold text-slate-600 dark:text-slate-300"
                          title={`Call ${selectedDistrictObj.rep}`}
                        >
                          <Phone className="h-3 w-3" /> Call
                        </a>
                      )}
                      {selectedDistrictObj.email && (
                        <a
                          href={`mailto:${selectedDistrictObj.email}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors text-[10px] font-bold text-slate-600 dark:text-slate-300"
                          title={`Email ${selectedDistrictObj.rep}`}
                        >
                          <Mail className="h-3 w-3" /> Email
                        </a>
                      )}
                      {selectedDistrictObj.website && selectedDistrictObj.website !== "N/A" && (
                        <a
                          href={selectedDistrictObj.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors text-[10px] font-bold text-slate-600 dark:text-slate-300"
                          title="Website"
                        >
                          <ExternalLink className="h-3 w-3" /> Web
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Col 2: Activity Metric + CTA */}
                <div className="flex flex-col gap-3">
                  <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" style={{ color: baseColor }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activity Metric</span>
                      </div>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        {districtPolicies.length} Active
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Recent policy changes regarding <strong style={{ color: baseColor }}>{activeArea.label}</strong>
                    </p>
                    {/* Glowing activity visual track */}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1 relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          background: baseColor,
                          width: `${Math.min(100, Math.max(10, districtPolicies.length * 15))}%`,
                          boxShadow: `0 0 8px ${baseColor}`
                        }}
                      />
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => {
                      const name = selectedFeature.properties?.name ?? `Council District ${selectedDistrictId}`;
                      const borough = selectedFeature.properties?.boro_name ?? "";
                      const areaStr = selectedArea !== "All" ? ` ${activeArea.label}` : "";
                      onSearch?.(`${name} ${borough}${areaStr}`.trim());
                    }}
                    className="w-full py-3 rounded-2xl text-white font-extrabold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${baseColor}, ${baseColor}dd)`,
                      boxShadow: `0 4px 12px -2px ${baseColor}50`
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    Get Briefing
                  </button>
                </div>

                {/* Col 3: Recent Policy Changes */}
                <div className="flex flex-col min-h-0 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Policy Changes</h4>
                  <div className="overflow-y-auto pr-1 space-y-2 scrollbar-none max-h-[200px]">
                    {districtPolicies.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                        <CheckCircle2 className="h-5 w-5 text-slate-300 dark:text-slate-700 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400">No recent activity recorded in this category.</p>
                      </div>
                    ) : (
                      districtPolicies.map((policy, idx) => (
                        <div
                          key={policy.id || idx}
                          className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-card)] hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col gap-1"
                        >
                          <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                            {policy.title}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-300 font-bold uppercase tracking-wide">
                              {policy.source_type || "Legislation"}
                            </span>
                            {policy.id && (
                              <a
                                href={`/representatives#${policy.id}`}
                                className="text-[9px] font-bold inline-flex items-center gap-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                              >
                                Details <ExternalLink className="h-2 w-2" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </section>
    </MotionReveal>
  );
}
