import { config } from "dotenv";
import { resolve, join } from "path";
import { writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });
import { fetchCityCouncil, fetchAssembly, fetchSenate, fetchHouse, fetchUSSenate } from "../src/lib/scrapers";

async function main() {
    console.log("Fetching politicians...");
    const labels = ["City Council", "State Assembly", "State Senate", "US House", "US Senate"];
    const settled = await Promise.allSettled([
        fetchCityCouncil(),
        fetchAssembly(),
        fetchSenate(),
        fetchHouse(),
        fetchUSSenate(),
    ]);

    const all = settled.flatMap((r, i) => {
        if (r.status === "fulfilled") {
            console.log(`✓ ${labels[i]}: ${r.value.length}`);
            return r.value;
        }
        console.warn(`✗ ${labels[i]} failed:`, (r.reason as Error)?.message);
        return [];
    });

    // deduplicate
    const seen = new Set<string>();
    const deduped = all.filter(p => {
        const key = p.name.toLowerCase().replace(/[^a-z]/g, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const outPath = join(process.cwd(), "public", "data", "politicians.json");
    writeFileSync(outPath, JSON.stringify({ politicians: deduped, fetched_at: new Date().toISOString() }));
    console.log(`✓ Wrote ${deduped.length} politicians to public/data/politicians.json`);
}

main().catch(e => { console.error(e); process.exit(1); });