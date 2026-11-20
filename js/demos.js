// Demos for every project. All data comes from the real projects (see /tools for how it was exported).
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const nick = (t) => short(t.split(/[:?]/)[0], 32);
const getJSON = (p) => fetch(p).then((r) => r.json());

// ---------------------------------------------------------------- tiny markdown with [n] citations
function inline(t) {
  return esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(\d{1,2})\]/g, '<button class="cite" data-n="$1">$1</button>');
}
function md(text) {
  const lines = (text || "").replace(/\r/g, "").split("\n");
  let html = "", list = null;
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const l of lines) {
    const h = l.match(/^#{1,4}\s+(.*)/);
    const li = l.match(/^\s*([-*•]|\d+\.)\s+(.*)/);
    if (!l.trim()) { close(); continue; }
    if (h) { close(); html += `<h4>${inline(h[1])}</h4>`; continue; }
    if (li) {
      const kind = /\d/.test(li[1]) ? "ol" : "ul";
      if (list !== kind) { close(); html += `<${kind}>`; list = kind; }
      html += `<li>${inline(li[2])}</li>`;
      continue;
    }
    close();
    html += `<p>${inline(l)}</p>`;
  }
  close();
  return `<div class="md">${html}</div>`;
}

// answer + sources panel with clickable citations
function answerView(el, mainHtml, sources, cited) {
  el.innerHTML = `<div class="pt-grid"><div class="main">${mainHtml}</div><aside class="sources"></aside></div>`;
  const side = $(".sources", el);
  let active = null;
  const draw = () => {
    side.innerHTML = `<div class="kicker" style="margin-bottom:8px">Sources · ${cited.length} of ${sources.length} cited</div>` +
      sources.map((s) => `<div class="src ${active === s.n ? "on" : ""} ${cited.includes(s.n) ? "" : "dim"}" data-n="${s.n}">
        <b>[${s.n}] ${esc(short(s.title, 70))}</b>
        <small>${s.year} · ${esc(short(s.section, 36))} · p. ${s.page}${s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noopener">PDF ↗</a>` : ""}</small>
        <p>${esc(active === s.n ? s.text : short(s.text, 150))}</p></div>`).join("");
    el.querySelectorAll(".cite").forEach((b) => b.classList.toggle("on", +b.dataset.n === active));
    if (active) side.querySelector(`.src[data-n="${active}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  el.addEventListener("click", (e) => {
    const t = e.target.closest(".cite, .src");
    if (!t || e.target.tagName === "A") return;
    const n = +t.dataset.n;
    active = active === n ? null : n;
    draw();
  });
  draw();
}

// ---------------------------------------------------------------- 1. PaperTrail
async function paperTrail() {
  const d = await getJSON("data/papertrail.json");
  const tabs = $("#pt-tabs"), body = $("#pt-body");
  const views = {
    "Ask": () => {
      const qs = Object.keys(d.ask);
      body.innerHTML = `<div class="chips">${qs.map((q, i) => `<button class="chip" data-i="${i}">${esc(q)}</button>`).join("")}</div><div class="out"></div>`;
      const show = (i) => {
        body.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", +c.dataset.i === i));
        const r = d.ask[qs[i]];
        answerView($(".out", body), md(r.answer) + `<p class="note">${r.sources.length} passages after reranking · ${r.trace.candidates} candidates considered · invalid citations removed: ${r.invalid_citations}</p>`, r.sources, r.cited);
      };
      body.querySelectorAll(".chip").forEach((c) => (c.onclick = () => show(+c.dataset.i)));
      show(0);
    },
    "Compare papers": () => {
      const r = d.compare;
      const table = `<p class="note" style="margin:0 0 10px">FLARE vs Self-RAG vs Corrective RAG on: when to retrieve, how retrieval quality is checked, training, results</p>
        <div class="scroll-x"><table class="cmp"><thead><tr><th></th>${r.papers.map((p) => `<th>${esc(nick(p.title))}<br><small>${p.year}</small></th>`).join("")}</tr></thead>
        <tbody>${r.rows.map((row) => `<tr><th>${esc(row.aspect)}</th>${r.papers.map((p) => `<td>${inline(row.cells[p.id] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <div class="md" style="margin-top:12px"><p>${inline(r.summary)}</p></div>`;
      answerView(body, table, r.sources, r.cited);
    },
    "Research gaps": () => {
      const r = d.gaps;
      answerView(body, `<p class="note" style="margin:0 0 10px">Topic: “${esc(r.topic)}”: limitations the papers admit, turned into open problems</p>` + md(r.answer), r.sources, r.cited);
    },
    "Pipeline": () => {
      const names = { bm25: "BM25 keywords", vector: "Vector embeddings", hybrid: "Hybrid (RRF)", hybrid_rerank: "Hybrid + rerank" };
      const count = {};
      Object.values(d.pipeline.modes).forEach((hs) => hs.forEach((h) => (count[h.id] = (count[h.id] || 0) + 1)));
      body.innerHTML = `<p class="note" style="margin:0 0 12px">Query: “${esc(d.pipeline.query)}”: top 5 from each stage. Highlighted = found by only one method.</p>
        <div class="pipe">${Object.entries(d.pipeline.modes).map(([m, hs]) => `<div class="col"><div>${names[m]}</div>${hs.map((h, i) =>
          `<div class="hit ${count[h.id] === 1 ? "only" : ""}"><b>${i + 1}. ${esc(nick(h.title))}</b><small>${esc(short(h.section, 28))} · p. ${h.page}</small>${esc(short(h.text, 110))}</div>`).join("")}</div>`).join("")}</div>`;
    },
    "Benchmark": () => {
      const b = d.benchmark, best = Math.max(...b.map((r) => r["recall@1"]));
      body.innerHTML = `<p style="margin:0 0 14px">${b[0].n} questions; a hit = the <b>exact</b> source passage is retrieved. Recall@1 (dark) and Recall@10 (light):</p>
        <div class="bars">${b.map((r) => `<div class="bar ${r["recall@1"] === best ? "best" : ""}"><span class="label">${esc(r.name)}</span>
          <div class="track"><div class="fill alt" style="width:${r["recall@10"] * 100}%"></div><div class="fill" style="width:${r["recall@1"] * 100}%"></div></div>
          <span class="num">${r["recall@1"].toFixed(3)}</span></div>`).join("")}</div>
        <p class="note">Honest findings: the cross-encoder reranker is the biggest win; hybrid alone did not beat BM25 on these keyword-rich questions; query rewriting didn't help, so it is off by default.
        Answers: an LLM judge found ${d.answers.supported}/${d.answers.claims} claims (${(d.answers.faithfulness * 100).toFixed(1)}%) supported by their citation, on ${d.answers.n} questions.</p>`;
    },
  };
  const names = Object.keys(views);
  tabs.innerHTML = names.map((n, i) => `<button data-i="${i}">${n}</button>`).join("");
  const open = (i) => { tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i)); views[names[i]](); };
  tabs.querySelectorAll("button").forEach((b) => (b.onclick = () => open(+b.dataset.i)));
  open(0);
}

// ---------------------------------------------------------------- 2. Small beats big
async function lora() {
  const d = await getJSON("data/lora_examples.json");
  const el = $("#lora-body");
  const models = [["lora", "Qwen 0.5B + LoRA (mine)"], ["api", "OpenAI GPT-OSS-120B"], ["base", "Qwen 0.5B, no training"]];
  el.innerHTML = `<div class="msgs">${d.examples.map((e, i) => `<div class="msg" data-i="${i}">${esc(e.text)}</div>`).join("")}</div>
    <div class="out"></div>
    <div class="two"><table class="simple"><thead><tr><th>Model (860 test messages)</th><th>Macro F1</th><th>Speed</th><th>Cost / 1M msgs</th></tr></thead>
      <tbody>${d.results.map((r) => `<tr><td>${r.name.includes("mine") ? "<b>" + esc(r.name) + "</b>" : esc(r.name)}</td><td>${r.f1}</td><td>${r.ms} ms</td><td>${r.cost}</td></tr>`).join("")}</tbody></table>
      <p class="note" style="margin:0">LoRA trained 8.8M of 503M parameters (1.75%) for one epoch on 11,916 messages, on an RTX 3050 laptop GPU. Neither model is perfect: the examples include messages where my model is wrong and the big one is right.</p></div>`;
  const show = (i) => {
    el.querySelectorAll(".msg").forEach((m) => m.classList.toggle("on", +m.dataset.i === i));
    const e = d.examples[i];
    $(".out", el).innerHTML = `<div class="gold">Human label: <b>${e.label ? "offensive" : "not offensive"}</b></div><div class="verdicts">${models.map(([k, name]) => {
      const p = e[k], ok = (p >= 0.5) === !!e.label;
      return `<div class="verdict"><span>${name}</span><div class="track"><div class="fill" style="width:${p * 100}%"></div></div>
        <span class="tag ${ok ? "ok" : "no"}">${ok ? "✓ correct" : "✗ wrong"} · ${(p * 100).toFixed(0)}%</span></div>`;
    }).join("")}</div><p class="note">Bar = the model's probability that the message is offensive (threshold 50%).</p>`;
  };
  el.querySelectorAll(".msg").forEach((m) => (m.onclick = () => show(+m.dataset.i)));
  show(0);
}

// ---------------------------------------------------------------- 3. AegisMCP
async function aegis() {
  const d = await getJSON("data/aegis.json");
  const el = $("#aegis-body");
  const profiles = [["no_security", "No security"], ["security_rules", "Rules only"], ["security_transformer", "Fine-tuned DeBERTa"], ["security_combined", "Combined (deployed)"]];
  let prof = "security_rules", sel = 0;
  el.innerHTML = `<div class="profiles">${profiles.map(([k, n]) => `<button data-k="${k}">${n}</button>`).join("")}</div>
    <div class="astat"></div><div class="agrid"></div><div class="attack"></div>
    <div class="two">
      <div><div class="kicker" style="margin-bottom:6px">Injection detectors (held-out test set, n=221)</div>
        <table class="simple"><thead><tr><th>Detector</th><th>F1</th><th>Recall</th><th>Latency</th></tr></thead>
        <tbody>${d.detectors.map((x) => `<tr><td>${x.name}</td><td>${x.f1.toFixed(3)}</td><td>${(x.recall * 100).toFixed(1)}%</td><td>${x.ms} ms</td></tr>`).join("")}</tbody></table></div>
      <div><div class="kicker" style="margin-bottom:6px">Context optimizer (69 real tool calls)</div>
        <div class="bars">
          <div class="bar"><span class="label">Raw tool results</span><div class="track"><div class="fill alt" style="width:100%"></div></div><span class="num">${(d.tokens.before / 1000).toFixed(0)}k</span></div>
          <div class="bar"><span class="label">Rule-based pruning</span><div class="track"><div class="fill" style="width:${(d.tokens.rule / d.tokens.before) * 100}%"></div></div><span class="num">${(d.tokens.rule / 1000).toFixed(1)}k</span></div>
          <div class="bar best"><span class="label">Learned pruning</span><div class="track"><div class="fill" style="width:${(d.tokens.learned / d.tokens.before) * 100}%"></div></div><span class="num">${(d.tokens.learned / 1000).toFixed(1)}k</span></div>
        </div><p class="note">Tokens sent to the agent: −${(d.tokens.saving_learned * 100).toFixed(0)}% with the learned optimizer; anything pruned can be fetched back.</p></div>
    </div>`;
  const draw = () => {
    el.querySelectorAll(".profiles button").forEach((b) => b.classList.toggle("on", b.dataset.k === prof));
    const blocked = d.attacks.filter((a) => a.blocked[prof]).length;
    const s = d.summary[prof];
    $(".astat", el).innerHTML = `<div><b>${blocked}/${d.attacks.length}</b>attacks blocked</div><div><b>${(s.attack_block_rate * 100).toFixed(1)}%</b>block rate</div><div><b>${(s.false_positive_rate * 100).toFixed(1)}%</b>false positives on normal data</div>`;
    $(".agrid", el).innerHTML = d.attacks.map((a, i) => `<button class="cell ${a.blocked[prof] ? "blocked" : "passed"} ${i === sel ? "sel" : ""}" data-i="${i}" title="${esc(a.technique)}"></button>`).join("");
    const a = d.attacks[sel];
    $(".attack", el).innerHTML = `<span class="tag ${a.blocked[prof] ? "ok" : "no"}" style="font:600 12px var(--mono);padding:3px 8px;border-radius:3px">${a.blocked[prof] ? "BLOCKED" : "GOT THROUGH"}</span>
      <span class="kicker" style="margin-left:8px">${esc(a.id)} · ${esc(a.technique)}</span><q>${esc(a.text)}</q><small style="color:var(--muted)">Attacker goal: ${esc(a.goal)}</small>`;
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".profiles button"), c = e.target.closest(".cell");
    if (b) prof = b.dataset.k;
    if (c) sel = +c.dataset.i;
    if (b || c) draw();
  });
  draw();
}

// ---------------------------------------------------------------- 4. Spam classifier (live, in the browser)
async function spam() {
  const m = await getJSON("data/spam_model.json");
  const index = new Map(m.features.map((f, i) => [f, i]));
  const el = $("#spam-body");
  const examples = ["WINNER!! You have been selected to receive a £900 prize. Call 09061701461 to claim now",
    "Hey, are we still meeting for lunch tomorrow? I can pick you up at 1",
    "URGENT! Your mobile number has been awarded 2000 cash. Text CLAIM to 85023",
    "Sorry I missed your call, I was in class. Call you back tonight"];
  el.innerHTML = `<div class="chips">${examples.map((e, i) => `<button class="chip" data-i="${i}">${esc(short(e, 48))}</button>`).join("")}</div>
    <textarea rows="3" placeholder="Type any SMS…"></textarea><div class="spam-out"></div>`;
  const ta = $("textarea", el), out = $(".spam-out", el);
  const run = () => {
    const text = ta.value;
    const toks = text.toLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) || [];
    const grams = toks.map((t, i) => [t, [i]]).concat(toks.slice(1).map((t, i) => [`${toks[i]} ${t}`, [i, i + 1]]));
    const counts = new Map();
    for (const [g, pos] of grams) if (index.has(g)) { const k = index.get(g); const c = counts.get(k) || { n: 0, pos }; c.n++; counts.set(k, c); }
    let norm = 0;
    const w = new Map();
    for (const [k, c] of counts) { const v = (1 + Math.log(c.n)) * m.idf[k]; w.set(k, v); norm += v * v; }
    norm = Math.sqrt(norm) || 1;
    let dec = m.intercept;
    const perTok = new Array(toks.length).fill(0);
    for (const [k, v] of w) {
      const contrib = (v / norm) * m.coef[k];
      dec += contrib;
      const pos = counts.get(k).pos;
      pos.forEach((p) => (perTok[p] += contrib / pos.length));
    }
    if (!text.trim()) { out.innerHTML = ""; return; }
    const score = 1 / (1 + Math.exp(-dec)), isSpam = dec > 0;
    const max = Math.max(0.05, ...perTok.map(Math.abs));
    let ti = 0, last = 0, highlighted = "";
    for (const mt of text.matchAll(/[\p{L}\p{N}_]{2,}/gu)) {   // walk the raw text so positions match the tokens
      highlighted += esc(text.slice(last, mt.index));
      const word = esc(mt[0]), c = perTok[ti++] || 0, a = Math.min(1, Math.abs(c) / max) * 0.55;
      highlighted += a < 0.06 ? word
        : `<mark style="background:${c > 0 ? `rgba(220,70,50,${a})` : `rgba(40,160,90,${a})`}" title="${c > 0 ? "+" : ""}${c.toFixed(3)}">${word}</mark>`;
      last = mt.index + mt[0].length;
    }
    highlighted += esc(text.slice(last));
    out.innerHTML = `<div class="big-verdict ${isSpam ? "spam" : "ham"}"><b>${isSpam ? "SPAM" : "NOT SPAM"}</b>score ${score.toFixed(2)}</div>
      <div class="why">${highlighted}<small>${counts.size} known features · SVM decision ${dec >= 0 ? "+" : ""}${dec.toFixed(3)} (positive = spam)</small></div>`;
  };
  ta.addEventListener("input", run);
  el.querySelectorAll(".chip").forEach((c) => (c.onclick = () => { ta.value = examples[+c.dataset.i]; run(); }));
  ta.value = examples[0];
  run();
}

// ---------------------------------------------------------------- 5. Screenshot galleries (Kompass, ClinicApp)
function gallery(id, label, shots) {
  const el = document.getElementById(id);
  el.innerHTML = `<div class="gallery"><div class="thumbs">${shots.map(([n], i) => `<button data-i="${i}">${n}</button>`).join("")}</div><div class="main"><img alt=""></div></div>`;
  const show = (i) => {
    el.querySelectorAll(".thumbs button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
    const img = $("img", el);
    img.src = "img/" + shots[i][1];
    img.alt = label + ": " + shots[i][0];
  };
  el.querySelectorAll(".thumbs button").forEach((b) => (b.onclick = () => show(+b.dataset.i)));
  show(0);
}

const guard = (f, id) => f().catch((e) => { const el = document.getElementById(id); if (el) el.innerHTML = `<p class="note">Demo failed to load: ${esc(e.message)}</p>`; });
guard(paperTrail, "pt-body");
guard(lora, "lora-body");
guard(aegis, "aegis-body");
guard(spam, "spam-body");
gallery("kompass-gallery", "Kompass", [["Service requests", "kompass-requests.png"], ["Interventions", "kompass-interventions.png"],
  ["Clients", "kompass-clients.png"], ["Equipment catalogue", "kompass-equipment.png"], ["Login", "kompass-login.png"]]);
gallery("clinic-body", "ClinicApp", [["Appointments", "clinic-real-appointments.png"], ["Patients", "clinic-real-patients.png"], ["Doctors", "clinic-real-doctors.png"],
  ["Medical records", "clinic-real-records.png"], ["New patient form", "clinic-real-newpatient.png"], ["Home", "clinic-real-home.png"], ["Class diagram", "clinic-class_diagram.png"]]);
