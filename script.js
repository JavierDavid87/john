/* ========== SETTINGS ========== */
const ROLES = ["Student", "Web Developer", "Creative Thinker", "Future Professional"];
const BUCKET = "portfolio";
const cfg = window.SUPABASE_CONFIG || {};
const ready = cfg.url && !cfg.url.includes("YOUR_");
const sb = ready ? supabase.createClient(cfg.url, cfg.key) : null;
// Edit tools show only when the page is opened with ?edit  (e.g. yoursite.com/?edit)
const EDIT = new URLSearchParams(location.search).has("edit");

/* ========== HELPERS ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2200); }
$("#yr").textContent = new Date().getFullYear();
const pub = (path, dl) => sb.storage.from(BUCKET).getPublicUrl(path, dl ? { download: dl } : undefined).data.publicUrl;

/* ========== TYPING TEXT ANIMATION ========== */
(function typing() {
  let r = 0, c = 0, del = false; const el = $("#typed");
  (function tick() {
    const w = ROLES[r]; el.textContent = w.slice(0, del ? --c : ++c);
    let d = del ? 50 : 110;
    if (!del && c === w.length) { del = true; d = 1400; }
    else if (del && c === 0) { del = false; r = (r + 1) % ROLES.length; d = 400; }
    setTimeout(tick, d);
  })();
})();

/* ========== SCROLL REVEAL + MENU ========== */
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("show")), { threshold: .12 });
$$(".reveal").forEach(el => io.observe(el));
$("#menuBtn").onclick = () => $("#menu").classList.toggle("open");
$$("#menu a").forEach(a => a.onclick = () => $("#menu").classList.remove("open"));

/* ========== EDIT MODE ========== */
if (EDIT) { document.body.classList.add("admin"); $$("[data-key]").forEach(el => el.contentEditable = true); }

/* ========== TABS + RENDER ========== */
let current = "quiz";
$$(".tab").forEach(t => t.onclick = () => {
  $$(".tab").forEach(x => x.classList.remove("active")); t.classList.add("active"); current = t.dataset.cat; render();
});
const size = b => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const icon = n => ({ pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗", ppt: "📙", pptx: "📙", zip: "🗜️", txt: "📄", mp4: "🎬", mp3: "🎵" }[n.split(".").pop().toLowerCase()] || "📁");

async function render() {
  const grid = $("#grid"), empty = $("#empty"); grid.innerHTML = "";
  if (!ready) { empty.style.display = "block"; empty.textContent = "⚙️ Setup needed: open config.js and add your Supabase URL and key."; return; }
  const { data, error } = await sb.from("files").select("*").eq("cat", current).order("created_at", { ascending: false });
  if (error) { empty.style.display = "block"; empty.textContent = "Could not load files: " + error.message; return; }
  empty.textContent = "Nothing here yet."; empty.style.display = data.length ? "none" : "block";
  data.forEach((f, i) => {
    const url = pub(f.path), isImg = (f.type || "").startsWith("image/");
    const card = document.createElement("div"); card.className = "card"; card.style.animationDelay = i * .06 + "s";
    card.innerHTML = `<div class="thumb">${isImg ? `<img src="${url}" loading="lazy" alt="">` : icon(f.name)}</div>
      <div class="meta"><div class="name"></div><small>${size(f.size || 0)} · ${new Date(f.created_at).toLocaleDateString()}</small>
      <div class="row"><a href="${pub(f.path, f.name)}">Download</a><button class="del">Delete</button></div></div>`;
    $(".name", card).textContent = f.name;
    $(".thumb", card).onclick = () => isImg ? openLB(url) : window.open(url, "_blank");
    $(".del", card).onclick = async () => {
      if (!confirm("Delete this file?")) return;
      await sb.storage.from(BUCKET).remove([f.path]); await sb.from("files").delete().eq("id", f.id); render(); toast("Deleted");
    };
    grid.appendChild(card);
  });
}

/* ========== UPLOAD (multiple, saved online) ========== */
async function saveFiles(files) {
  if (!EDIT || !ready) return;
  const list = [...files]; if (!list.length) return;
  let ok = 0;
  for (const f of list) {
    toast(`Uploading ${ok + 1}/${list.length}…`);
    const path = `${current}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || "application/octet-stream" });
    if (up.error) { toast("Error: " + up.error.message); continue; }
    await sb.from("files").insert({ cat: current, name: f.name, type: f.type, size: f.size, path }); ok++;
  }
  render(); toast(ok + " file(s) uploaded ✔");
}
$("#fileInput").onchange = e => { saveFiles(e.target.files); e.target.value = ""; };
const dz = $("#dropzone");
["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
dz.addEventListener("drop", e => saveFiles(e.dataTransfer.files));

/* ========== LIGHTBOX ========== */
function openLB(src) { $("#lbImg").src = src; $("#lightbox").classList.add("on"); }
$("#lightbox").onclick = () => $("#lightbox").classList.remove("on");

/* ========== TEXT + PROFILE PHOTO (shared online) ========== */
async function loadSettings() {
  if (!ready) return;
  const { data } = await sb.from("settings").select("*"); if (!data) return;
  data.forEach(s => {
    if (s.key === "avatar") $("#avatarImg").src = pub(s.value);
    else { const el = $(`[data-key="${s.key}"]`); if (el) el.textContent = s.value; }
  });
}
$$("[data-key]").forEach(el => el.addEventListener("blur", async () => {
  if (!EDIT || !ready) return;
  await sb.from("settings").upsert({ key: el.dataset.key, value: el.textContent.trim() }); toast("Saved ✔");
}));
$("#avatarInput").onchange = async e => {
  const f = e.target.files[0]; if (!f || !EDIT || !ready) return;
  const path = `avatar/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
  const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type });
  if (up.error) return toast("Error: " + up.error.message);
  await sb.from("settings").upsert({ key: "avatar", value: path }); $("#avatarImg").src = pub(path); toast("Photo updated ✔");
};

render(); loadSettings();
