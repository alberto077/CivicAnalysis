"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  Plus,
  Minus,
  MapPin,
  FileText,
  TrendingUp,
  X,
} from "lucide-react";
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
    <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-[#111827]">
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
  for (const demo of profile.demographics ?? []) {
    if (hay.includes(demo.toLowerCase())) s += 1;
  }
  return s;
}


const SRC_COLORS: Record<string, string> = {
  Legislation: "#3b82f6",
  Transcript: "#8b5cf6",
  Resolution: "#10b981",
  Notice: "#f59e0b",
  Report: "#ec4899",
  Rule: "#ef4444",
  Hearing: "#0ea5e9",
};
function srcColor(t: string) { return SRC_COLORS[t] ?? "#64748b"; }


function DistrictPopout({
  districtId,
  feature,
  districtObj,
  districtPolicies,
  activeArea,
  baseColor,
  onClose,
  onSearch,
}: {
  districtId: number;
  feature: any;
  districtObj: District | undefined;
  districtPolicies: PolicyBriefing[];
  activeArea: { label: string; color: string; id: string };
  baseColor: string;
  onClose: () => void;
  onSearch?: (q: string) => void;
}) {
  const boroughName = feature.properties?.boro_name ?? "";
  const districtName = feature.properties?.name ?? `District ${districtId}`;

  // group policies by source type for the summary bar
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    districtPolicies.forEach((p) => {
      const t = p.source_type || "Other";
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [districtPolicies]);

  const totalPolicies = districtPolicies.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* popout header */}
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: `2px solid ${baseColor}30` }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest"
              style={{ background: `${baseColor}15`, color: baseColor }}
            >
              <MapPin className="h-2 w-2" />
              {boroughName}
            </span>
          </div>
          <h3 className="font-limelight text-sm font-bold text-slate-800 dark:text-white truncate leading-tight">
            {districtName}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          aria-label="Close district panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* mini representative card */}
        {districtObj && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-elevated)] p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 ring-2 ring-white dark:ring-slate-700"
                style={{ background: `linear-gradient(135deg, ${baseColor}cc, ${baseColor})` }}
              >
                {districtObj.rep ? districtObj.rep.slice(0, 2).toUpperCase() : "CM"}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                  Council Member
                </p>
                <p className="font-limelight text-[13px] font-bold text-slate-800 dark:text-white truncate leading-tight">
                  {districtObj.rep || "Council Member"}
                </p>
                {districtObj.political_stance && districtObj.political_stance !== "N/A" && (
                  <p className="text-[9px] text-slate-500 font-medium mt-0.5">
                    {districtObj.political_stance}
                  </p>
                )}
              </div>
            </div>
            {/* contact info */}
            {(districtObj.phone || districtObj.email || districtObj.website) && (
              <div className="flex gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                {districtObj.phone && (
                  <a href={`tel:${districtObj.phone}`}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Phone className="h-2.5 w-2.5" /> Call
                  </a>
                )}
                {districtObj.email && (
                  <a href={`mailto:${districtObj.email}`}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Mail className="h-2.5 w-2.5" /> Email
                  </a>
                )}
                {districtObj.website && districtObj.website !== "N/A" && (
                  <a href={districtObj.website} target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ExternalLink className="h-2.5 w-2.5" /> Web
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* activity summary */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 shrink-0" style={{ color: baseColor }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Recent Activity
              </span>
            </div>
            <span className="text-[11px] font-black" style={{ color: baseColor }}>
              {totalPolicies} record{totalPolicies !== 1 ? "s" : ""}
            </span>
          </div>

          {/* activity bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(8, totalPolicies * 12))}%`,
                background: baseColor,
                boxShadow: `0 0 6px ${baseColor}80`,
              }}
            />
          </div>

          {/* type breakdown pills */}
          {typeCounts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {typeCounts.slice(0, 4).map(([type, count]) => (
                <span
                  key={type}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border"
                  style={{
                    color: srcColor(type),
                    background: `${srcColor(type)}12`,
                    borderColor: `${srcColor(type)}30`,
                  }}
                >
                  {type} · {count}
                </span>
              ))}
            </div>
          )}

          {activeArea.id !== "All" && (
            <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              Filtered to <span className="font-semibold" style={{ color: baseColor }}>{activeArea.label}</span>
            </p>
          )}
        </div>

        {/* policy records */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Policy Records
            </span>
          </div>

          {totalPolicies === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-5 w-5 text-slate-300 dark:text-slate-700 mb-1.5" />
              <p className="text-[10px] font-semibold text-slate-400 text-center">
                No recent activity in this category.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {districtPolicies.map((policy, idx) => {
                const color = srcColor(policy.source_type);
                return (
                  <div
                    key={policy.id || idx}
                    className="group relative rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-card)] p-2.5 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="absolute left-0 inset-y-2 w-[2.5px] rounded-full" style={{ background: color }} />
                    <div className="pl-2.5">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug mb-1.5">
                        {policy.title}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border"
                          style={{ color, background: `${color}12`, borderColor: `${color}30` }}
                        >
                          {policy.source_type || "Record"}
                        </span>
                        {policy.published_date && (
                          <span className="text-[8px] text-slate-400 tabular-nums">
                            {new Date(policy.published_date).toLocaleDateString(undefined, {
                              month: "short", day: "numeric"
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPolicies > 0 && onSearch && (
          <div className="pt-1 pb-2">
            <p className="text-[10px] text-slate-400 text-center">
              ↓ Full briefing updates below
            </p>
          </div>
        )}
      </div>
    </div>
  );
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
  const [vectorPos, setVectorPos] = useState({
    coordinates: [-73.94, 40.712] as [number, number],
    zoom: 1,
  });

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
  }, [selectedDistrictId, districtActivity, baseColor, isDark]);

  useEffect(() => {
    if (selectedDistrictId && filteredDistrictIds && !filteredDistrictIds.has(selectedDistrictId)) {
      setSelectedDistrictId(null);
    }
  }, [filteredDistrictIds, selectedDistrictId]);

  const handleDistrictClick = (districtId: number) => {
    setSelectedDistrictId((prev) => prev === districtId ? null : districtId);
  };

  const activeBoroughLabel = LOCATION_TO_BORO[selectedLocation] ?? null;

  const selectedFeature = useMemo(() => {
    if (!selectedDistrictId || !geoData?.features) return null;
    return geoData.features.find((f: any) => parseInt(f.properties.coun_dist) === selectedDistrictId);
  }, [selectedDistrictId, geoData]);

  const selectedDistrictObj = useMemo(() =>
    districts.find((d) => d.id === selectedDistrictId),
    [districts, selectedDistrictId]
  );

  const districtPolicies = useMemo(() => {
    if (!selectedDistrictId) return [];
    return policies.filter((p) => {
      const matchesD = (p.districts ?? []).includes(selectedDistrictId);
      const matchesA = matchesArea(p, selectedArea);
      return matchesD && matchesA;
    });
  }, [policies, selectedDistrictId, selectedArea]);

  const tileDarkUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileLightUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const tileUrl = isDark ? tileDarkUrl : tileLightUrl;

  const MAP_HEIGHT = 520;

  return (
    <MotionReveal>
      <section className="space-y-0">
        {/* map container */}
        <div
          className="relative flex rounded-[1.5rem] overflow-hidden border border-[var(--border)] shadow-md bg-white dark:bg-[var(--surface-card)]"
          style={{ minHeight: MAP_HEIGHT }}
        >
          {/* map */}
          <div
            className="relative flex-1 min-w-0 transition-all duration-300"
            style={{ minHeight: MAP_HEIGHT }}
          >
            {/* top-left badge */}
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-bold uppercase tracking-wider shadow-sm pointer-events-none">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: baseColor }} />
              <span className="text-[var(--muted)]">
                {activeBoroughLabel ? `${activeBoroughLabel} · ` : "All NYC · "}
              </span>
              <span style={{ color: baseColor }}>{activeArea.label}</span>
            </div>

            {!geoData ? (
              <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-[var(--surface-elevated)]" style={{ minHeight: MAP_HEIGHT }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" />
                  <p className="text-[11px] text-[var(--muted)]">Loading map…</p>
                </div>
              </div>
            ) : mapMode === "vector" ? (
              <div className="w-full relative flex items-center justify-center overflow-hidden" style={{ height: MAP_HEIGHT }}>
                {/* zoom controls */}
                <div className="absolute bottom-3 right-3 z-[1000] flex flex-col shadow-md rounded-lg overflow-hidden border border-[var(--border)] bg-white/95 dark:bg-[var(--surface-elevated)]/95 backdrop-blur-md">
                  <button type="button" onClick={() => setVectorPos(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--surface-card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors border-b border-[var(--border)]" aria-label="Zoom in">
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <button type="button" onClick={() => setVectorPos(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--surface-card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" aria-label="Zoom out">
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
                    minZoom={1} maxZoom={8}
                    translateExtent={[[0, 0], [800, 600]]}
                    onMoveEnd={setVectorPos}
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
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onMouseEnter={() => setHoveredDistrictId(id)}
                              onMouseLeave={() => setHoveredDistrictId(null)}
                              onClick={() => handleDistrictClick(id)}
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
              <div className="relative w-full" style={{ height: MAP_HEIGHT }}>
                <LeafletMapWrapper
                  isDark={isDark}
                  tileUrl={tileUrl}
                  geoData={geoData}
                  districtActivity={districtActivity}
                  selectedDistrictId={selectedDistrictId}
                  getColor={getColor}
                  baseColor={baseColor}
                  handleDistrictClick={handleDistrictClick}
                  ref={geoJsonRef}
                />
              </div>
            )}

            {/* legend */}
            <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] shadow-sm pointer-events-none">
              <span>Low</span>
              <div className="flex h-1.5 w-14 rounded-full overflow-hidden">
                <div className="h-full flex-1" style={{ background: `${baseColor}28` }} />
                <div className="h-full flex-1" style={{ background: `${baseColor}58` }} />
                <div className="h-full flex-1" style={{ background: `${baseColor}90` }} />
                <div className="h-full flex-1" style={{ background: baseColor }} />
              </div>
              <span>High</span>
            </div>

            {/* click hint when nothing selected */}
            {!selectedDistrictId && (
              <div className="absolute bottom-3 right-3 z-[1000] px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-medium text-[var(--muted)] shadow-sm pointer-events-none">
                Click a district to inspect
              </div>
            )}
          </div>

          {/* side popout panel */}
          {selectedDistrictId && selectedFeature && (
            <div
              className="shrink-0 border-l border-[var(--border)] bg-white/98 dark:bg-[var(--surface-card)]/98 overflow-hidden"
              style={{
                width: 260,
                height: MAP_HEIGHT,
                animation: "slideInRight 0.22s ease-out",
              }}
            >
              <DistrictPopout
                districtId={selectedDistrictId}
                feature={selectedFeature}
                districtObj={selectedDistrictObj}
                districtPolicies={districtPolicies}
                activeArea={activeArea}
                baseColor={baseColor}
                onClose={() => setSelectedDistrictId(null)}
                onSearch={onSearch}
              />
            </div>
          )}
        </div>

        <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(20px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </section>
    </MotionReveal>
  );
}