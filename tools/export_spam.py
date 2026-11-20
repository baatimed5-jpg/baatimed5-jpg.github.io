"""Export the trained TF-IDF + LinearSVC spam model to JSON so it runs in the browser."""
import json, math, re, sys
from pathlib import Path
import joblib

SRC = Path(sys.argv[1])          # spam_model.joblib
OUT = Path(sys.argv[2])          # data/spam_model.json
m = joblib.load(SRC)
tf, clf = m.named_steps["tfidf"], m.named_steps["clf"]
assert tf.sublinear_tf and tf.ngram_range == (1, 2) and tf.lowercase and tf.norm == "l2"
vocab = tf.vocabulary_
feats = [None] * len(vocab)
for w, i in vocab.items():
    feats[i] = w
coef = clf.coef_[0]
out = {"features": feats, "idf": [round(float(x), 4) for x in tf.idf_],
       "coef": [round(float(x), 4) for x in coef], "intercept": round(float(clf.intercept_[0]), 5),
       "token_pattern": tf.token_pattern}
OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")

# check: a pure-python copy of the JS logic gives the same decision values as sklearn
def js_like(text):
    toks = re.findall(r"(?u)\b\w\w+\b", text.lower())
    grams = toks + [f"{a} {b}" for a, b in zip(toks, toks[1:])]
    cnt = {}
    for g in grams:
        if g in vocab:
            cnt[vocab[g]] = cnt.get(vocab[g], 0) + 1
    w = {i: (1 + math.log(c)) * out["idf"][i] for i, c in cnt.items()}
    n = math.sqrt(sum(v * v for v in w.values())) or 1
    return sum(v / n * out["coef"][i] for i, v in w.items()) + out["intercept"]
tests = ["WINNER!! You have won a FREE prize, call 09061701461 now to claim", "Hey are we still meeting for lunch tomorrow?",
         "URGENT your mobile number has been awarded 2000 cash", "ok see you at home later", "Free entry in 2 a wkly comp to win FA Cup final tkts"]
for t in tests:
    print(f"{m.decision_function([t])[0]:+.4f}  {js_like(t):+.4f}  {t[:50]}")
print(len(feats), "features,", OUT.stat().st_size // 1024, "KB")
