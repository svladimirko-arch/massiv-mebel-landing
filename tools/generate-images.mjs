import { pathToFileURL } from "node:url";
import fs from "node:fs";
const m = await import(pathToFileURL("C:/Users/svlad/OneDrive/Документы/Мебель/tools/qwen-cdp.mjs").href);

const OUT = "C:/Users/svlad/OneDrive/Документы/Мебель/assets/img";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const images = [
  {
    file: "hero-kitchen.jpg",
    prompt: `Generate an image: wide cinematic interior photograph of a luxurious custom kitchen made of solid aged oak and dark walnut, large central island with thick wooden countertop, floor-to-ceiling wooden cabinetry, warm brass handles, cream plaster walls, soft morning sunlight streaming through tall windows, dramatic shadows, rich natural wood grain, elegant minimal decor, ceramic vase, high ceilings. Palette: deep walnut brown, honey oak, warm beige, matte black, brass. Photorealistic high-end architectural interior photography, 16:9 wide composition with the main kitchen on the right half and darker empty space on the left for text overlay, no people, no text, no logos.`,
  },
  {
    file: "about-workshop.jpg",
    prompt: `Generate an image: photorealistic interior of a premium custom furniture workshop, master carpenter in his 40s in dark work apron standing beside a large solid oak wooden slab on workbench, hand plane and chisels neatly arranged, wood shavings on the floor, warm industrial pendant lights, tall windows, dust in sunbeams, rich wood tones, walnut and oak planks stacked in background. Palette: deep walnut, honey oak, warm amber light, graphite metal, cream. Cinematic high-end documentary photography, vertical 4:5 composition, natural candid moment, no text, no logos.`,
  },
  {
    file: "portfolio-1.jpg",
    prompt: `Generate an image: photorealistic high-end interior photograph of a classic custom kitchen carved from solid oak, elegant framed cabinet doors, tall pantry, dark stone countertop, integrated ovens, copper pendant lights above a wooden breakfast island, warm cream walls, herringbone wooden floor, soft golden evening light. Palette: honey oak, antique bronze, cream, deep espresso wood. Editorial luxury home magazine photography, 4:3 composition, no people, no text, no logos.`,
  },
  {
    file: "portfolio-2.jpg",
    prompt: `Generate an image: photorealistic high-end interior photograph of a modern custom kitchen made of solid dark walnut, huge waterfall island in light stone, handleless cabinetry with visible wood grain, built-in appliances, matte black fixtures, floor-to-ceiling window with green garden view, warm ambient lighting, minimalist styling. Palette: dark walnut, charcoal, warm beige stone, soft green accents. Contemporary architectural digest photography, 4:3 composition, no people, no text, no logos.`,
  },
  {
    file: "portfolio-3.jpg",
    prompt: `Generate an image: photorealistic high-end interior photograph of a custom walk-in wardrobe and built-in closets made of solid light oak, open shelving with neatly folded linens, hanging rail with neutral clothes, fluted wood fronts, integrated warm LED strip lighting, large mirror, cream carpet, elegant brass details. Palette: light oak, ivory, warm taupe, brushed brass. Luxury interior design photography, 4:3 composition, no people, no text, no logos.`,
  },
  {
    file: "portfolio-4.jpg",
    prompt: `Generate an image: photorealistic high-end interior photograph of a custom living room featuring a floor-to-ceiling solid walnut bookshelf wall unit with integrated fireplace and concealed TV cabinet, deep cream linen sofa, oak coffee table, warm ambient lighting, large windows, soft shadows, refined minimal decor. Palette: dark walnut, cream, camel, matte black, warm gold. Editorial interior architecture photography, 4:3 composition, no people, no text, no logos.`,
  },
  {
    file: "portfolio-5.jpg",
    prompt: `Generate an image: photorealistic high-end interior photograph of a custom bedroom with a solid oak bed and handcrafted wooden furniture, tall fluted wood headboard, matching bedside tables, warm linen bedding, built-in oak wardrobe, soft morning light through sheer curtains, wooden parquet floor, calm elegant atmosphere. Palette: natural oak, oatmeal linen, soft greige, muted bronze. Luxury home magazine photography, 4:3 composition, no people, no text, no logos.`,
  },
];

const log = (s) => {
  const line = `[${new Date().toISOString()}] ${s}`;
  console.log(line);
  fs.appendFileSync("C:/Users/svlad/OneDrive/Документы/Мебель/tools/generate.log", line + "\n");
};

fs.appendFileSync("C:/Users/svlad/OneDrive/Документы/Мебель/tools/generate.log", "=== START ===\n");

for (const img of images) {
  const dest = `${OUT}/${img.file}`;
  if (fs.existsSync(dest) && fs.statSync(dest).size > 20000) {
    log(`SKIP ${img.file}`);
    continue;
  }
  let done = false;
  for (let attempt = 1; attempt <= 3 && !done; attempt++) {
    try {
      log(`START ${img.file} attempt ${attempt}`);
      await m.newChat();
      const age = await m.ev(`document.body.innerText.includes("Confirm your age")`);
      if (age) {
        log("age dialog, reloading");
        await m.ev(`location.reload()`);
        await sleep(6000);
      }
      await m.submitPrompt(img.prompt);
      const urls = await m.waitForImage(150000);
      log(`GOT ${img.file}: ${urls[urls.length - 1]}`);
      await m.download(urls[urls.length - 1], dest);
      log(`DONE ${img.file} ${fs.statSync(dest).size} bytes`);
      done = true;
    } catch (e) {
      log(`FAIL ${img.file} attempt ${attempt}: ${e.message}`);
      await sleep(4000);
    }
  }
  if (!done) log(`GIVE UP ${img.file}`);
  await sleep(1500);
}
log("=== ALL FINISHED ===");
process.exit(0);
