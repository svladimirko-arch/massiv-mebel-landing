// Управление десктоп-приложением Qwen (Electron, chat.qwen.ai) через CDP.
// Порт отладки: запустить Qwen.exe --remote-debugging-port=9223
// Использование из mcp__node_repl__js:
//   const { pathToFileURL } = await import("node:url");
//   const { newChat, submitPrompt, waitForImage, ev, download } =
//     await import(pathToFileURL("<абсолютный путь>/qwen-cdp.mjs").href);
// Каждый вызов node_repl — новое ядро: импортировать модуль заново каждый раз.
// Цикл генерации = ДВА вызова (лимит вызова 120с, генерация 40–100с):
//   вызов А: await newChat(); await submitPrompt("Generate an image: ...");
//   вызов Б: const urls = await waitForImage(100000); await download(...);

import net from "node:net";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";

const PORT = 9223;

function connectWs(host, port, path) {
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    const sock = net.connect({ host, port });
    let buf = Buffer.alloc(0), done = false;
    const listeners = [];
    sock.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!done) {
        const i = buf.indexOf("\r\n\r\n");
        if (i === -1) return;
        buf = buf.subarray(i + 4);
        done = true;
        resolve(api);
      }
      while (true) {
        const f = parse(buf);
        if (!f) break;
        buf = buf.subarray(f.consumed);
        if (f.opcode === 0x1 || f.opcode === 0x0) {
          api._fr.push(f.payload);
          if (f.fin) {
            const s = Buffer.concat(api._fr).toString("utf8");
            api._fr = [];
            listeners.forEach((fn) => fn(s));
          }
        } else if (f.opcode === 0x8) sock.end();
        else if (f.opcode === 0x9) send(0xa, f.payload);
      }
    });
    sock.on("error", reject);
    function parse(b) {
      if (b.length < 2) return null;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, m = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (m) off += 4;
      if (b.length < off + len) return null;
      return { fin, opcode: op, payload: b.subarray(off, off + len), consumed: off + len };
    }
    function send(op, p) {
      const mask = crypto.randomBytes(4);
      let h;
      if (p.length < 126) { h = Buffer.alloc(2); h[1] = 0x80 | p.length; }
      else if (p.length < 65536) { h = Buffer.alloc(4); h[1] = 0x80 | 126; h.writeUInt16BE(p.length, 2); }
      else { h = Buffer.alloc(10); h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(p.length), 2); }
      h[0] = 0x80 | op;
      const mp = Buffer.from(p);
      for (let i = 0; i < mp.length; i++) mp[i] ^= mask[i % 4];
      sock.write(Buffer.concat([h, mask, mp]));
    }
    const api = {
      _fr: [],
      send: (s) => send(0x1, Buffer.from(s, "utf8")),
      onMessage: (fn) => listeners.push(fn),
      close: () => sock.end(),
    };
    sock.write(`GET ${path} HTTP/1.1\r\nHost: ${host}:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  });
}

async function getWs() {
  const targets = await new Promise((res, rej) =>
    http.get(`http://127.0.0.1:${PORT}/json`, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej)
  );
  const wv = targets.find((t) => t.type === "webview" || (t.type === "page" && t.url.includes("chat.qwen.ai")));
  if (!wv) throw new Error("Qwen webview not found; is Qwen running with --remote-debugging-port=" + PORT + "?");
  return connectWs("127.0.0.1", PORT, `/devtools/page/${wv.id}`);
}

const ws = await getWs();
let mid = 0;
const pend = new Map();
ws.onMessage((raw) => {
  const m = JSON.parse(raw);
  if (m.id && pend.has(m.id)) {
    pend.get(m.id)(m);
    pend.delete(m.id);
  }
});

export function ev(expr) {
  return new Promise((res, rej) => {
    const id = ++mid;
    pend.set(id, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result?.result?.value ?? m.result)));
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true, awaitPromise: true } }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function newChat() {
  await ev(`(async () => {
    const btn = [...document.querySelectorAll("button, div")].find(e => e.offsetParent !== null && e.childElementCount < 4 && e.textContent.trim() === "New Chat");
    if (btn) { btn.click(); await new Promise(r => setTimeout(r, 800)); }
    if (!document.querySelector("textarea")) location.href = "https://chat.qwen.ai/";
  })()`);
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const ok = await ev(`!!document.querySelector("textarea") && location.pathname === "/"`);
    if (ok) return true;
  }
  throw new Error("new chat page did not load");
}

// Fire-and-forget: промис внутри страницы НЕ await-ить (контекст рушится при
// SPA-навигации — evaluate зависает навсегда). Метод сам дожимает клик Send,
// если первый не сработал (textarea всё ещё с текстом на корневом URL).
export async function submitPrompt(prompt) {
  await ev(`(() => {
    const run = (async () => {
      const ta = document.querySelector("textarea");
      if (!ta) return;
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      set.call(ta, ${JSON.stringify(prompt)});
      ta.dispatchEvent(new Event("input", {bubbles: true}));
      await new Promise(r => setTimeout(r, 400));
      const find = () => [...document.querySelectorAll("button")].filter(e => e.offsetParent !== null)
        .find(b => (b.getAttribute("aria-label") || "").toLowerCase() === "send");
      let b = find();
      if (b && !b.disabled) b.click();
      // страховка: до 4 попыток дожать клик, если текст остался и мы ещё на корне
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 2500));
        const t = document.querySelector("textarea");
        if (!(location.pathname === "/" && t && t.value)) return;
        b = find();
        if (b && !b.disabled) b.click();
      }
    })();
    return "submitted";
  })()`);
}

export async function waitForImage(timeoutMs = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await sleep(4000);
    const urls = await ev(`JSON.stringify([...document.querySelectorAll("img")].map(i => i.src).filter(s => s.includes("cdn.qwenlm.ai/output")).slice(-4))`);
    const list = JSON.parse(urls);
    if (list.length) return list;
    const failed = await ev(`document.body.innerText.includes("failed to generate") || document.body.innerText.includes("Failed")`);
    if (failed) throw new Error("generation failed");
  }
  throw new Error("timeout waiting for image");
}

export function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.headers.location) {
        file.close(); fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(dest)));
    }).on("error", (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
  });
}
