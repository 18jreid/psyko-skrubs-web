/**
 * One-time script to build lib/itemImages.json from the ByMykel CSGO-API.
 * No rate limits — images hosted on GitHub/Steam CDN directly.
 * Run: node scripts/fetch-item-images.mjs
 */

import { writeFileSync } from "fs";

const ITEMS = [
  // Legacy
  { id: "ms_1",     marketName: "AK-47 | Redline" },
  { id: "ms_2",     marketName: "M4A4 | Asiimov" },
  { id: "ms_3",     marketName: "AWP | Asiimov" },
  { id: "ms_4",     marketName: "Glock-18 | Fade" },
  { id: "ms_5",     marketName: "MP5-SD | Lab Rats" },
  { id: "r_1",      marketName: "AK-47 | Vulcan" },
  { id: "r_2",      marketName: "M4A1-S | Cyrex" },
  { id: "r_3",      marketName: "AWP | Asiimov" },
  { id: "r_4",      marketName: "USP-S | Orion" },
  { id: "c_1",      marketName: "AK-47 | Fire Serpent" },
  { id: "c_2",      marketName: "M4A4 | Howl" },
  { id: "c_3",      marketName: "★ Karambit | Doppler" },
  { id: "cv_1",     marketName: "AWP | Dragon Lore" },
  { id: "cv_2",     marketName: "★ Butterfly Knife | Fade" },
  { id: "rs_1",     marketName: "★ Karambit | Crimson Web" },
  { id: "rs_2",     marketName: "★ Karambit | Case Hardened" },
  // Chroma Case
  { id: "chr_ms_1", marketName: "Glock-18 | Catacombs" },
  { id: "chr_ms_2", marketName: "MP9 | Deadly Poison" },
  { id: "chr_ms_3", marketName: "SCAR-20 | Grotto" },
  { id: "chr_ms_4", marketName: "M249 | System Lock" },
  { id: "chr_ms_5", marketName: "XM1014 | Quicksilver" },
  { id: "chr_r_1",  marketName: "Desert Eagle | Naga" },
  { id: "chr_r_2",  marketName: "Sawed-Off | Serenity" },
  { id: "chr_r_3",  marketName: "MAC-10 | Malachite" },
  { id: "chr_r_4",  marketName: "Dual Berettas | Urban Shock" },
  { id: "chr_c_1",  marketName: "M4A4 | 龍王 (Dragon King)" },
  { id: "chr_c_2",  marketName: "AK-47 | Cartel" },
  { id: "chr_c_3",  marketName: "P250 | Muertos" },
  { id: "chr_cv_1", marketName: "AWP | Man-o'-war" },
  { id: "chr_cv_2", marketName: "Galil AR | Chatterbox" },
  { id: "chr_rs_1", marketName: "★ Karambit | Doppler" },
  { id: "chr_rs_2", marketName: "★ Bayonet | Tiger Tooth" },
  // Revolution Case
  { id: "rev_ms_1", marketName: "MAG-7 | Insomnia" },
  { id: "rev_ms_2", marketName: "MP9 | Featherweight" },
  { id: "rev_ms_3", marketName: "SCAR-20 | Fragments" },
  { id: "rev_ms_4", marketName: "P250 | Re.built" },
  { id: "rev_ms_5", marketName: "MP5-SD | Liquidation" },
  { id: "rev_ms_6", marketName: "SG 553 | Cyberforce" },
  { id: "rev_ms_7", marketName: "Tec-9 | Rebel" },
  { id: "rev_r_1",  marketName: "M4A1-S | Emphorosaur-S" },
  { id: "rev_r_2",  marketName: "Glock-18 | Umbral Rabbit" },
  { id: "rev_r_3",  marketName: "MAC-10 | Sakkaku" },
  { id: "rev_r_4",  marketName: "R8 Revolver | Banana Cannon" },
  { id: "rev_r_5",  marketName: "P90 | Neoqueen" },
  { id: "rev_c_1",  marketName: "AWP | Duality" },
  { id: "rev_c_2",  marketName: "UMP-45 | Wild Child" },
  { id: "rev_c_3",  marketName: "P2000 | Wicked Sick" },
  { id: "rev_cv_1", marketName: "M4A4 | Temukau" },
  { id: "rev_cv_2", marketName: "AK-47 | Head Shot" },
  { id: "rev_rs_1", marketName: "★ Sport Gloves | Pandora's Box" },
  { id: "rev_rs_2", marketName: "★ Hand Wraps | Cobalt Skulls" },
  // Recoil Case
  { id: "rec_ms_1", marketName: "M4A4 | Cyber Security" },
  { id: "rec_ms_2", marketName: "P250 | Vino Primo" },
  { id: "rec_ms_3", marketName: "FAMAS | Decommissioned" },
  { id: "rec_ms_4", marketName: "UMP-45 | Roadblock" },
  { id: "rec_ms_5", marketName: "Desert Eagle | Blue Ply" },
  { id: "rec_ms_6", marketName: "PP-Bizon | Fuel Rod" },
  { id: "rec_ms_7", marketName: "Nova | Sobek's Bite" },
  { id: "rec_r_1",  marketName: "Glock-18 | Winterized" },
  { id: "rec_r_2",  marketName: "M249 | Downtown" },
  { id: "rec_r_3",  marketName: "MAC-10 | Monkeyflage" },
  { id: "rec_r_4",  marketName: "R8 Revolver | Crazy 8" },
  { id: "rec_r_5",  marketName: "M4A1-S | Nightmare" },
  { id: "rec_c_1",  marketName: "AK-47 | Ice Coaled" },
  { id: "rec_c_2",  marketName: "Sawed-Off | Kiss♥Love" },
  { id: "rec_c_3",  marketName: "P250 | Visions" },
  { id: "rec_cv_1", marketName: "USP-S | Printstream" },
  { id: "rec_cv_2", marketName: "AWP | Chromatic Aberration" },
  { id: "rec_rs_1", marketName: "★ Specialist Gloves | Marble Fade" },
  { id: "rec_rs_2", marketName: "★ Sport Gloves | Slingshot" },
  // Kilowatt Case
  { id: "kw_ms_1",  marketName: "Dual Berettas | Hideout" },
  { id: "kw_ms_2",  marketName: "MAC-10 | Light Box" },
  { id: "kw_ms_3",  marketName: "Nova | Dark Sigil" },
  { id: "kw_ms_4",  marketName: "SSG 08 | Dezastre" },
  { id: "kw_ms_5",  marketName: "Tec-9 | Slag" },
  { id: "kw_ms_6",  marketName: "UMP-45 | Motorized" },
  { id: "kw_ms_7",  marketName: "XM1014 | Irezumi" },
  { id: "kw_r_1",   marketName: "Glock-18 | Block-18" },
  { id: "kw_r_2",   marketName: "M4A4 | Etch Lord" },
  { id: "kw_r_3",   marketName: "Five-SeveN | Hybrid" },
  { id: "kw_r_4",   marketName: "MP7 | Just Smile" },
  { id: "kw_r_5",   marketName: "Sawed-Off | Analog Input" },
  { id: "kw_c_1",   marketName: "M4A1-S | Black Lotus" },
  { id: "kw_c_2",   marketName: "Zeus x27 | Olympus" },
  { id: "kw_c_3",   marketName: "USP-S | Jawbreaker" },
  { id: "kw_cv_1",  marketName: "AK-47 | Inheritance" },
  { id: "kw_cv_2",  marketName: "AWP | Chrome Cannon" },
  { id: "kw_rs_1",  marketName: "★ Kukri Knife | Fade" },
  { id: "kw_rs_2",  marketName: "★ Kukri Knife | Crimson Web" },
];

const CASES = [
  { id: "psyko_case_v1",       name: "Chroma Case" },
  { id: "psyko_restricted_v1", name: "Revolution Case" },
  { id: "psyko_classified_v1", name: "Recoil Case" },
  { id: "psyko_elite_v1",      name: "Kilowatt Case" },
];

console.log("Fetching skin and case data from ByMykel CSGO-API...");
const [skinsData, cratesData] = await Promise.all([
  fetch("https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json").then(r => r.json()),
  fetch("https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json").then(r => r.json()),
]);
console.log(`Loaded ${skinsData.length} skins, ${cratesData.length} crates.`);

// Build lookup: base name (no wear) → image
const skinByName = {};
for (const skin of skinsData) {
  if (skin.name && skin.image) {
    skinByName[skin.name.toLowerCase()] = skin.image;
  }
}

const imageMap = {};

// Match skins
let found = 0, missing = 0;
for (const item of ITEMS) {
  const key = item.marketName.toLowerCase();
  const url = skinByName[key];
  if (url) {
    imageMap[item.id] = url;
    found++;
    console.log(`  ✓ ${item.id}: ${item.marketName}`);
  } else {
    imageMap[item.id] = null;
    missing++;
    console.log(`  ✗ ${item.id}: ${item.marketName}`);
  }
}

// Match cases
for (const c of CASES) {
  const crate = cratesData.find(cr => cr.name === c.name);
  if (crate?.image) {
    imageMap[c.id] = crate.image;
    found++;
    console.log(`  ✓ ${c.id}: ${c.name}`);
  } else {
    imageMap[c.id] = null;
    missing++;
    console.log(`  ✗ ${c.id}: ${c.name}`);
  }
}

console.log(`\n${found}/${ITEMS.length + CASES.length} images resolved.`);
if (missing > 0) console.log(`${missing} missing — check names above.`);

writeFileSync(
  new URL("../lib/itemImages.json", import.meta.url).pathname,
  JSON.stringify(imageMap, null, 2)
);
console.log("Written to lib/itemImages.json");
