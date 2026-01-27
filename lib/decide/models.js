// PATH: /lib/decide/models.js
// LINES: ~80
const MODELS = [
  { slug: "t5", label: "T5", aliases: ["t5", "t 5"] },
  { slug: "t5_evo", label: "T5 EVO", aliases: ["t5_evo", "t5 evo", "t5-evo", "t5evo"] },
  { slug: "t5l", label: "T5L", aliases: ["t5l", "t5 l", "t5-l"] },
  { slug: "t5_evo_hev", label: "T5 EVO HEV", aliases: ["t5_evo_hev", "t5 evo hev", "t5-evo-hev", "t5 hev"] },
  { slug: "foton_v9", label: "FOTON V9", aliases: ["foton_v9", "foton v9", "v9"] },
  { slug: "s50_ev", label: "S50 EV", aliases: ["s50_ev", "s50 ev", "s50ev", "s50-e"] }
];

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export function extractModelMentions(text) {
  const q = norm(text);
  const mentions = new Set();

  for (const m of MODELS) {
    for (const a of m.aliases) {
      const alias = norm(a);

      if (alias === "v9") {
        if (q.includes("v9") && q.includes("foton")) mentions.add(m.slug);
        continue;
      }

      if (q.includes(alias)) {
        mentions.add(m.slug);
        break;
      }
    }
  }

  return Array.from(mentions);
}
