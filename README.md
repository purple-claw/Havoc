# HAVOC — Helping Algo Visualization Orchestrate Comprehension

> See your code come alive. Every variable, every branch, every swap — animated and explained.

## What is HAVOC?

HAVOC is a full-stack code execution visualizer. Paste any Python algorithm, and HAVOC traces it line-by-line, auto-detects the data structure, renders beautiful physics-driven animations, and generates AI-powered explanations — all at zero cost.

**Key highlights:**
- **12 visualization adapters** — arrays, graphs, trees, heaps, matrices, hash maps, linked lists, stacks, queues, sets, strings, and a generic fallback
- **AST-level tracing** — every assignment, branch, loop, and function call captured
- **10 000+ line support** with streaming, chunked processing, and 10+ minute animations
- **AI explanations** — free-tier Groq / HuggingFace APIs with rule-based fallback; complexity analysis, analogies, learning paths
- **Secure sandbox** — AST security validation, restricted builtins, per-IP rate limiting
- **Zero deployment cost** — Vercel (frontend), Render.com (backend), free AI APIs

## Architecture

```
                          ┌─────────────────────┐
                          │     User Code        │
                          └─────────┬───────────┘
                                    │
                 ┌──────────────────▼──────────────────┐
                 │          Calcharo (Python 3.8+)      │
                 │  AST Parser → Tracer → ExecutionStep │
                 └──────────────────┬──────────────────┘
                                    │
          ┌─────────────────────────▼──────────────────────────┐
          │               Adapter Registry (auto-detect)       │
          │  Array│Graph│String│Stack│Queue│LinkedList│Tree│    │
          │  Heap│Matrix│HashMap│Set│Generic                   │
          └─────────────────────────┬──────────────────────────┘
                                    │
              ┌─────────────────────▼─────────────────────┐
              │         FastAPI Backend (/api)             │
              │  Execute • Snippets • Share • Explain      │
              │  Rate-Limit • Security Headers • Sandbox   │
              └─────────────────────┬─────────────────────┘
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │          Phrolva (React 18 + TypeScript + Vite)     │
         │  AnimatedArray│Graph│Tree│Heap│Matrix│HashMap│…     │
         │  CodeEditor • VariableInspector • ExplanationPanel  │
         │  Spring Physics • D3.js Force Graphs • Zustand      │
         └─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Tracing | Python 3.8+ AST | Zero-dependency, line-level control |
| Backend | FastAPI + Uvicorn | Async, fast, auto-docs |
| Frontend | React 18 + TypeScript + Vite | Hot reload, tree-shaking |
| Animation | @react-spring/web + D3.js | Physics-based springs + force-directed graphs |
| State | Zustand | Lightweight, hook-based |
| Styling | styled-components | Scoped, themeable |
| AI | Groq (llama-3.3-70b) / HuggingFace Inference | Free tier, rule-based fallback |
| Deploy | Vercel + Render.com | $0 total |

## Quick Start

```bash
# Clone
git clone https://github.com/purple-claw/Havoc.git
cd Havoc

# Backend
pip install -r requirements.txt

# Frontend
cd phrolva && npm install && cd ..
```

### CLI

```bash
# Trace and visualize a file
python havoc.py run my_algo.py

# Trace, explain, and open browser
python havoc.py run my_algo.py --explain --open

# Start the API server
python havoc.py serve

# Browse pre-built examples
python havoc.py gallery

# List all adapters
python havoc.py adapters

# Get AI explanation only
python havoc.py explain sorting.py
```

### Web App

```bash
# Terminal 1 — API
python havoc.py serve

# Terminal 2 — Frontend
cd phrolva && npm run dev
```

Open `http://localhost:5173` → paste code → click **Run**.

## Pages

| Route | Description |
|-------|-------------|
| `/#/` | Landing page with features overview |
| `/#/playground` | Code editor + live visualizer + explanations |
| `/#/gallery` | 20+ pre-built algorithm examples |
| `/#/share/:id` | View a shared visualization |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/execute` | Full pipeline: trace → adapt → animate → explain |
| POST | `/api/execute/quick` | Fast preview (limited steps) |
| GET | `/api/snippets/gallery` | List all pre-built examples |
| GET | `/api/snippets/gallery/:id` | Get a specific snippet |
| POST | `/api/share` | Create a content-addressed share link |
| GET | `/api/share/:id` | Retrieve shared code |
| GET | `/api/adapters` | List all available adapters |
| GET | `/health` | Health check |

## Supported Data Structures & Algorithms

### Built-in Gallery (20+ examples)
Bubble Sort, Quick Sort, Merge Sort, Insertion Sort, Selection Sort, Binary Search, BFS, DFS, Dijkstra, Stack Operations, Queue Operations, BST Operations, Fibonacci DP, Knapsack, Linked List, HashMap Frequency, Two Sum, Set Operations, Heap Sort, Matrix Spiral

### Auto-Detected Adapters

| Adapter | Detects | Visualization |
|---------|---------|---------------|
| ArrayAdapter | Lists, sorting | Bar chart with spring swaps |
| GraphAdapter | Adjacency lists/matrices | Force-directed node graph |
| StringAdapter | String manipulation | Character tiles with highlighting |
| StackAdapter | LIFO patterns | Vertical stack with drop-in physics |
| QueueAdapter | FIFO / deque patterns | Horizontal queue with slide animation |
| LinkedListAdapter | Node-pointer structures | Chained boxes with arrows |
| TreeAdapter | Nested dict trees, BST, AVL | SVG tree with glow effects |
| HeapAdapter | Heap arrays, heapq usage | Dual view: tree + array |
| MatrixAdapter | 2D lists, DP tables, grids | Heatmap grid with cell highlighting |
| HashMapAdapter | Dict operations | Bucket visualization with hash function |
| SetAdapter | Set operations | Bubble/Venn-style display |
| GenericAdapter | Anything else | Variable timeline + control flow dashboard |

## Project Structure

```
Havoc/
├── calcharo/                  # Python tracing engine
│   ├── core/
│   │   ├── tracer.py          # AST-based execution tracer (696 lines)
│   │   ├── models.py          # Immutable data models
│   │   ├── config.py          # TracerConfig + presets
│   │   └── errors.py          # Exception hierarchy
│   └── adapters/
│       ├── base.py            # VisualizationAdapter ABC
│       ├── registry.py        # AdapterRegistry + auto-detect
│       ├── array_adapter.py
│       ├── graph_adapter.py
│       ├── string_adapter.py
│       ├── stack_adapter.py
│       ├── queue_adapter.py
│       ├── linkedlist_adapter.py
│       ├── tree_adapter.py
│       ├── heap_adapter.py
│       ├── matrix_adapter.py
│       ├── hashmap_adapter.py
│       ├── set_adapter.py
│       └── generic_adapter.py
├── api/                       # FastAPI backend
│   ├── main.py                # App entry, CORS, middleware
│   ├── routes/
│   │   ├── execute.py         # /api/execute endpoints
│   │   ├── snippets.py        # /api/snippets gallery
│   │   └── share.py           # /api/share links
│   ├── services/
│   │   ├── executor.py        # ExecutionService orchestrator
│   │   ├── explainer.py       # AIExplainer (Groq/HF/rule-based)
│   │   └── sandbox.py         # SandboxManager + AST security
│   └── middleware/
│       ├── rate_limiter.py    # Token-bucket per-IP rate limiter
│       └── security.py        # CSP, HSTS, X-Frame-Options
├── phrolva/                   # React frontend
│   ├── src/
│   │   ├── App.tsx            # Hash-based router
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── PlaygroundPage.tsx
│   │   │   ├── GalleryPage.tsx
│   │   │   └── SharedViewPage.tsx
│   │   ├── components/
│   │   │   ├── AnimationOrchestrator.tsx  # Routes to correct visualizer
│   │   │   ├── AnimatedArray.tsx
│   │   │   ├── AnimatedGraph.tsx
│   │   │   ├── AnimatedString.tsx
│   │   │   ├── AnimatedStack.tsx
│   │   │   ├── AnimatedQueue.tsx
│   │   │   ├── AnimatedLinkedList.tsx
│   │   │   ├── AnimatedTree.tsx
│   │   │   ├── AnimatedHeap.tsx
│   │   │   ├── AnimatedMatrix.tsx
│   │   │   ├── AnimatedHashMap.tsx
│   │   │   ├── AnimatedSet.tsx
│   │   │   ├── AnimatedGeneric.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── ExplanationPanel.tsx
│   │   │   ├── VariableInspector.tsx
│   │   │   ├── PlaybackControls.tsx
│   │   │   └── CodeDisplay.tsx
│   │   ├── services/api.ts
│   │   ├── stores/animationStore.ts
│   │   ├── styles/GlobalStyles.ts
│   │   └── types/animation.types.ts
│   └── package.json
├── tests/
│   ├── test_calcharo.py       # Core tracer tests
│   ├── test_adapters.py       # Original adapter tests
│   ├── test_new_adapters.py   # pytest tests for all 12 adapters
│   ├── test_api.py            # FastAPI endpoint tests
│   └── test_phrolva.py        # Frontend test harness
├── havoc.py                   # CLI entry point
├── requirements.txt
├── Dockerfile
├── render.yaml                # Render.com deployment
├── vercel.json                # Vercel deployment
└── .github/workflows/ci.yml   # GitHub Actions CI
```

## Deployment

### Frontend (Vercel — free)
1. Connect your GitHub repo to Vercel
2. Set root directory to `phrolva`
3. Framework: Vite
4. Add env var: `VITE_API_URL=https://your-backend.onrender.com`
5. Deploy

### Backend (Render.com — free)
1. Connect your GitHub repo to Render
2. Blueprint will auto-detect `render.yaml`
3. Set env vars in dashboard: `GROQ_API_KEY`, `HF_TOKEN` (optional, for AI)
4. Deploy

### Docker
```bash
docker build -t havoc-api .
docker run -p 8000:8000 havoc-api
```

## Testing

```bash
# All tests
pytest tests/ -v

# Backend only
pytest tests/test_api.py tests/test_new_adapters.py -v

# With coverage
pytest tests/ --cov=calcharo --cov=api --cov-report=term-missing
```

## Performance

| Operation | Capacity |
|-----------|----------|
| Code tracing | ~1 000 steps/sec |
| Animation generation | ~10 000 commands/sec |
| Frontend rendering | 60 fps |
| Max code size | 10 000+ lines |
| Max animation length | 10+ minutes |
| Max steps | 100 000 (configurable) |

## License

MIT

---

*Built by [Purple-Claw](https://github.com/purple-claw)*
