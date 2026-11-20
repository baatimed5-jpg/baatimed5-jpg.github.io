"""Run the real PaperTrail pipeline once and record its outputs for the static portfolio demo.
Run from the 6-research-rag folder:  .venv/Scripts/python ../0-portfolio-site/tools/record_papertrail.py
"""
import json, sys
from pathlib import Path
sys.path.insert(0, "src")
from index import Index
import rag
from retrieve import MODES, retrieve

OUT = Path("../0-portfolio-site/data/papertrail.json")
idx = Index.load()
data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
data["library"] = [{"id": p["id"], "title": p["title"], "year": p["year"], "cited_by": len(p.get("cited_by", []))}
                   for p in sorted(idx.papers.values(), key=lambda p: p["year"])]
data["chunks"] = len(idx.chunks)

def slim(r):
    r = dict(r)
    for s in r.get("sources", []):
        s.pop("chunk_id", None)
    return r

QS = ["How does Self-RAG decide when to retrieve?",
      "What is the difference between RAG-Sequence and RAG-Token?",
      "How does HyDE retrieve without relevance labels?",
      "Why do language models struggle with information in the middle of long contexts?"]
data.setdefault("ask", {})
for q in QS:
    if q not in data["ask"]:
        print("ask:", q, flush=True)
        data["ask"][q] = slim(rag.ask(idx, q))
        OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
if "compare" not in data:
    print("compare", flush=True)
    data["compare"] = slim(rag.compare(idx, ["2305.06983", "2310.11511", "2401.15884"],
                                       "when to retrieve, how retrieval quality is checked, training, results"))
    OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
if "gaps" not in data:
    print("gaps", flush=True)
    data["gaps"] = {"topic": "evaluating RAG systems", **slim(rag.gaps(idx, "evaluating RAG systems"))}
    OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
q = "How is the retriever trained jointly with the generator?"
data["pipeline"] = {"query": q, "modes": {m: [{"title": h["title"], "section": h["section"], "page": h["page"],
                    "text": h["text"][:220], "id": h["chunk_id"]} for h in retrieve(idx, q, mode=m, top_k=5)[0]] for m in MODES}}
data["benchmark"] = json.loads(Path("reports/results_retrieval.json").read_text())
data["answers"] = {k: v for k, v in json.loads(Path("reports/results_answers.json").read_text()).items() if k != "rows"}
OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("saved", OUT.stat().st_size // 1024, "KB")
