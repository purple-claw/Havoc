# HAVOC - Hypnotic Algorithm Visualization Of Code

> Because watching your code run is more fun than actually debugging it

## What is this?

HAVOC is a code execution visualizer that transforms boring Python code into mesmerizing animations. Feed it your bubble sort, watch bars dance. Give it a graph algorithm, see nodes light up like Christmas. It's basically a debugger, but prettier and less useful for actual debugging.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         USER CODE                              │
│                    "Look at my algorithm!"                     │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    CALCHARO ENGINE (Python)                    │
│                                                                │
│  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐ │
│  │ AST Parser   │ ───> │   Tracer     │ ──> │ State Cache  │ │
│  │              │      │              │     │              │ │
│  │ "What even  │      │ "Step by     │     │ "Remember    │ │
│  │  is this?"  │      │  step..."    │     │ everything"  │ │
│  └──────────────┘      └──────────────┘     └──────────────┘ │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    VISUALIZATION ADAPTERS                      │
│                                                                │
│  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐ │
│  │ArrayAdapter  │      │GraphAdapter  │     │StringAdapter │ │
│  │              │      │              │     │              │ │
│  │"Bars go brr"│      │"Nodes and    │     │"Letters      │ │
│  │              │      │ edges"       │     │ dance"       │ │
│  └──────────────┘      └──────────────┘     └──────────────┘ │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    PHROLVA ENGINE (React)                      │
│                                                                │
│  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐ │
│  │Spring Physics│      │   D3.js      │     │  Playback    │ │
│  │              │      │              │     │  Controls    │ │
│  │"Bouncy!"    │      │"Force-directed"│    │"Like YouTube"│ │
│  └──────────────┘      └──────────────┘     └──────────────┘ │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                        [Beautiful Animation]
```

## Tech Stack

Because we needed an excuse to use all the cool kids' toys:

- **Backend**: Python 3.8+ with AST manipulation (because eval() is for cowards)
- **Frontend**: React 18 + TypeScript (JavaScript with training wheels)
- **Animation**: D3.js + react-spring (physics engines for bars)
- **State**: Zustand (Redux was too mainstream)
- **Build**: Vite (Webpack is so 2019)

## Installation

```bash
# Clone this masterpiece
git clone https://github.com/purple-claw/Havoc.git
cd Havoc

# Install Python dependencies (there aren't many, we're minimalists)
pip install -r requirements.txt

# Install Node dependencies (warning: this downloads half the internet)
cd phrolva
npm install
```

## Usage

### Quick Start (For the Impatient)

```bash
# Run your code through the visualizer
python havoc.py your_algorithm.py

# Or pipe it like a Unix wizard
echo "arr = [3,1,2]; arr.sort()" | python havoc.py -
```

### Detailed Usage (For the Documentation Lovers)

```python
# input.py
def bubble_sort(arr):
    """The O(n²) classic that refuses to die"""
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                # The magical swap
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_nums = bubble_sort(numbers)
print(f"Sorted: {sorted_nums}")
```

Run it:
```bash
python havoc.py input.py
# Generates visualization.json
# Opens browser with animations
```

## API Reference

### Core Components

#### Calcharo Engine

```python
from calcharo import execute_and_trace

# The main function that does the heavy lifting
steps = execute_and_trace(code: str, config: TracerConfig) -> List[ExecutionStep]
```

Each `ExecutionStep` contains:
- `line_number`: Where the magic happens
- `variables_state`: Current state of all variables (yes, all of them)
- `call_stack`: How deep is your recursion?
- `heap_state`: Objects floating in memory

#### Visualization Adapters

```python
# Auto-detects what kind of visualization you need
adapter = ArrayAdapter()  # For lists and sorting
adapter = GraphAdapter()  # For graphs and trees
adapter = StringAdapter() # For text manipulation

animations = adapter.generate_animations(execution_steps)
```

#### Animation Commands

The universal language of "make things move":

```typescript
interface AnimationCommand {
  type: CommandType;        // SWAP, HIGHLIGHT, COMPARE, etc.
  indices?: number[];        // Which elements to animate
  duration: number;          // How long to torture the viewer
  values?: Record<string, any>; // Additional chaos
}
```

## Project Structure

```
havoc/
├── calcharo/              # The Python brain
│   ├── core/             
│   │   ├── tracer.py     # Where we play God with code execution
│   │   ├── models.py     # Data structures (boring but necessary)
│   │   └── config.py     # Knobs and switches
│   └── adapters/         
│       ├── array_adapter.py  # Makes arrays dance
│       ├── graph_adapter.py  # Graph theory made visual
│       └── string_adapter.py # Character choreography
├── phrolva/               # The React beauty
│   ├── src/
│   │   ├── components/   # UI components that actually work
│   │   ├── stores/       # State management (Zustand FTW)
│   │   └── types/        # TypeScript's safety blanket
│   └── package.json      # Where dependencies go to multiply
└── tests/                 # Proof that it works (sometimes)
```

## Performance

- **Execution Tracing**: ~1000 steps/second (Python isn't slow, you are)
- **Animation Generation**: ~10,000 commands/second (bars go brr)
- **Frontend Rendering**: 60fps (smooth as butter)
- **Memory Usage**: < 500MB for 1M steps (we're not Chrome)
- **Supported Code Size**: Up to 10,000 lines (why though?)

## Limitations

Because honesty is the best policy:

- Only supports Python (other languages are overrated)
- Single-threaded execution (parallelism is hard)
- No async/await support (promises are lies)
- Can't handle infinite loops (we tried)
- No real-time collaboration (you have friends?)

## Contributing

We accept PRs that:
1. Don't break existing tests
2. Include new tests
3. Have comments more sarcastic than the existing ones
4. Actually improve something

We reject PRs that:
1. Add blockchain
2. Rewrite everything in Rust
3. Remove sarcastic comments
4. Use tabs instead of spaces

## Roadmap

- [x] Stage 1: Basic execution tracing (done)
- [x] Stage 2: Visualization adapters (done)
- [x] Stage 3: React frontend (done)
- [ ] Stage 4: API integration (coming soon™)
- [ ] Stage 5: Performance optimization (eventually)
- [ ] Stage 6: AI explanations (when GPT-5 arrives)
- [ ] Stage 7: Quantum computing support (just kidding)

## FAQ

**Q: Why is it called HAVOC?**  
A: Hypnotic Algorithm Visualization Of Code. Also, it causes havoc in your browser.

**Q: Does it support my favorite algorithm?**  
A: If it's written in Python and doesn't use obscure libraries, probably.

**Q: Can I use this in production?**  
A: You can use anything in production if you're brave enough.

**Q: Is it fast?**  
A: Faster than print debugging, slower than not debugging at all.

**Q: Does it work on Windows?**  
A: In theory. We developed it on Linux because we're those people.

## Benchmarks

| Operation | Time | Memory | Sarcasm Level |
|-----------|------|--------|---------------|
| Trace 100 lines | 0.1s | 10MB | Low |
| Trace 1000 lines | 1s | 50MB | Medium |
| Trace bubble sort | 0.5s | 20MB | High |
| Trace quicksort | 0.3s | 15MB | Optimal |
| Trace your spaghetti | ∞ | OOM | Maximum |

## License

MIT - Do whatever you want, we're not your parents.

## Acknowledgments

- Coffee, for making this possible
- Stack Overflow, for the ctrl+c ctrl+v
- The Python AST module, for being surprisingly well documented
- React, for existing
- You, for reading this far

## Support

Found a bug? Open an issue.  
Want a feature? Open a PR.  
Need help? Read the code.  
Still confused? Join the club.

---

*Built with love by Purple-Claw*
