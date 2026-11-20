# Portfolio: Mohamed Baati

Live site: **https://baatimed5-jpg.github.io**

A one-page portfolio where every project has a demo built from its real outputs:

| Project | Demo |
|---|---|
| [PaperTrail](https://github.com/baatimed5-jpg/research-paper-rag) | Recorded answers from the real RAG system, with clickable citations, a paper comparison, research gaps, the retrieval pipeline and the benchmark |
| [Small model beats big](https://github.com/baatimed5-jpg/small-model-beats-big) | Real test-set predictions of the LoRA model vs GPT-OSS-120B (wins and losses) |
| [AegisMCP](https://github.com/baatimed5-jpg/aegis-mcp) | Attack lab: the 120 evaluation attacks, blocked or not, per security profile |
| [Spam classifier](https://github.com/baatimed5-jpg/spam-classifier) | **Live**: the trained TF-IDF + Linear SVM model exported to JSON and run in the browser, with per-word explanations |
| Kompass (internship at Steros, private code) | Screenshots of the running ASP.NET Core app on a separate demo database with made-up data, plus architecture |
| [ClinicApp](https://github.com/baatimed5-jpg/clinic-app) | Screenshots of the running ASP.NET Core app (sample data) |
| [Library Management System](https://github.com/baatimed5-jpg/library-management-system) | Features and architecture |

Plain HTML/CSS/JS, no build step. `tools/` holds the scripts that exported the demo data from each project
(`export_spam.py` checks that the browser version gives exactly the same scores as scikit-learn).
