#!/usr/bin/env python3
"""
HAVOC CLI — Hypnotic Algorithm Visualization Of Code

The command-line interface for HAVOC. Because real programmers use terminals.

Usage:
    python havoc.py run <file.py>                    # Trace and generate visualization
    python havoc.py run <file.py> --open             # Trace + open in browser  
    python havoc.py run <file.py> --output out.json  # Save visualization to file
    python havoc.py run <file.py> --adapter array    # Force specific adapter
    python havoc.py serve                            # Start the API server
    python havoc.py gallery                          # List pre-built examples
    python havoc.py gallery <id> --run               # Run a gallery example
    python havoc.py adapters                         # List available adapters
    python havoc.py explain <file.py>                # Get AI explanation only
"""

import argparse
import json
import sys
import os
import time
import webbrowser
from pathlib import Path
from typing import Optional

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

from calcharo.core.tracer import ExecutionTracer
from calcharo.core.config import TracerConfig, TracingMode, ConfigPresets
from calcharo.core.errors import TracerError
from calcharo.adapters.registry import AdapterRegistry, auto_detect_adapter, ADAPTER_PRIORITY


# ANSI colors for terminal output — because plain text is boring
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'

    @staticmethod
    def supports_color() -> bool:
        """Check if the terminal supports colors."""
        if os.getenv('NO_COLOR'):
            return False
        if os.getenv('FORCE_COLOR'):
            return True
        if sys.platform == 'win32':
            return os.getenv('TERM') is not None or os.getenv('WT_SESSION') is not None
        return hasattr(sys.stdout, 'isatty') and sys.stdout.isatty()


def c(text: str, color: str) -> str:
    """Colorize text if terminal supports it."""
    if Colors.supports_color():
        return f"{color}{text}{Colors.RESET}"
    return text


BANNER = r"""
  H A V O C
  Hypnotic Algorithm Visualization Of Code
"""


def print_banner():
    """Print the HAVOC banner."""
    if Colors.supports_color():
        print(c(BANNER, Colors.CYAN))
    else:
        print(BANNER)


def cmd_run(args):
    """Execute code and generate visualization."""
    # Read the source file
    file_path = Path(args.file)
    if not file_path.exists():
        print(c(f"Error: File '{file_path}' not found", Colors.RED))
        sys.exit(1)

    if not file_path.suffix == '.py':
        print(c(f"Warning: '{file_path}' doesn't look like a Python file", Colors.YELLOW))

    code = file_path.read_text(encoding='utf-8')
    lines = code.split('\n')
    print(c(f"📁 Loaded {file_path.name} ({len(lines)} lines)", Colors.BLUE))

    # Configure tracer
    if len(lines) <= 500:
        config = ConfigPresets.debug() if args.verbose else ConfigPresets.production()
    elif len(lines) <= 5000:
        config = ConfigPresets.production()
    else:
        config = ConfigPresets.performance()

    if args.max_steps:
        config = TracerConfig(
            mode=config.mode,
            max_steps=args.max_steps,
            max_execution_time=config.max_execution_time,
            max_memory_mb=config.max_memory_mb,
        )

    # Trace execution
    print(c("⚡ Tracing execution...", Colors.YELLOW))
    start = time.time()

    try:
        tracer = ExecutionTracer(config)
        steps = tracer.trace(code)
        trace_time = time.time() - start
        print(c(f"✓ Traced {len(steps)} steps in {trace_time:.2f}s", Colors.GREEN))
    except TracerError as e:
        print(c(f"✗ Tracing failed: {e}", Colors.RED))
        sys.exit(1)

    # Detect adapter
    if args.adapter:
        registry = AdapterRegistry()
        adapter = registry.get_adapter(args.adapter)
        if not adapter:
            print(c(f"Warning: Adapter '{args.adapter}' not found, auto-detecting", Colors.YELLOW))
            adapter = auto_detect_adapter(code)
    else:
        adapter = auto_detect_adapter(code)

    adapter_name = adapter.__class__.__name__
    print(c(f"🎨 Using adapter: {adapter_name}", Colors.CYAN))

    # Generate animations
    print(c("🎬 Generating animations...", Colors.YELLOW))
    anim_start = time.time()
    commands = adapter.generate_commands(steps, code)
    anim_time = time.time() - anim_start
    print(c(f"✓ Generated {len(commands)} animation commands in {anim_time:.2f}s", Colors.GREEN))

    # Build output
    total_duration = sum(cmd.duration for cmd in commands)
    output = {
        'havoc_version': '2.0.0',
        'source_file': str(file_path),
        'source_code': code,
        'metadata': {
            'total_steps': len(steps),
            'total_commands': len(commands),
            'adapter': adapter_name,
            'trace_time_ms': round(trace_time * 1000, 2),
            'animation_time_ms': round(anim_time * 1000, 2),
            'estimated_duration_ms': total_duration,
            'estimated_duration_str': _format_duration(total_duration),
        },
        'execution': [
            {
                'line': s.line,
                'step_type': s.step_type.value if hasattr(s.step_type, 'value') else str(s.step_type),
                'variables': dict(s.variables) if s.variables else {},
            }
            for s in steps
        ],
        'animations': [
            {
                'type': cmd.command_type.value if hasattr(cmd.command_type, 'value') else str(cmd.command_type),
                'target': cmd.target,
                'value': cmd.value,
                'duration': cmd.duration,
                'metadata': cmd.metadata or {},
            }
            for cmd in commands
        ],
        'visualizer_config': {
            'component': _adapter_to_component(adapter_name),
            'theme': 'dark',
        },
    }

    # Save output
    output_path = Path(args.output) if args.output else file_path.with_suffix('.havoc.json')
    output_path.write_text(json.dumps(output, indent=2, default=str), encoding='utf-8')
    print(c(f"💾 Saved visualization to {output_path}", Colors.GREEN))

    # Summary
    print()
    print(c("═══ HAVOC Summary ═══", Colors.BOLD))
    print(f"  Source:     {file_path.name} ({len(lines)} lines)")
    print(f"  Adapter:    {adapter_name}")
    print(f"  Steps:      {len(steps):,}")
    print(f"  Animations: {len(commands):,}")
    print(f"  Duration:   {_format_duration(total_duration)}")
    print(f"  Output:     {output_path}")
    print()

    # Open in browser
    if args.open:
        _open_in_browser(output_path)

    # Show AI explanation
    if args.explain:
        _print_explanation(code, adapter_name)


def cmd_serve(args):
    """Start the HAVOC API server."""
    print_banner()
    print(c("Starting HAVOC API server...", Colors.CYAN))
    print(c(f"  Host: {args.host}", Colors.DIM))
    print(c(f"  Port: {args.port}", Colors.DIM))
    print(c(f"  Docs: http://{args.host}:{args.port}/api/docs", Colors.BLUE))
    print()

    try:
        import uvicorn
        uvicorn.run(
            "api.main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="info",
        )
    except ImportError:
        print(c("Error: uvicorn not installed. Run: pip install uvicorn[standard]", Colors.RED))
        sys.exit(1)


def cmd_gallery(args):
    """List or run gallery examples."""
    from api.routes.snippets import GALLERY_SNIPPETS

    if args.snippet_id:
        # Find and optionally run a specific snippet
        snippet = None
        for s in GALLERY_SNIPPETS:
            if s['id'] == args.snippet_id or s['title'].lower() == args.snippet_id.lower():
                snippet = s
                break

        if not snippet:
            print(c(f"Snippet '{args.snippet_id}' not found", Colors.RED))
            print("Available snippets:")
            for s in GALLERY_SNIPPETS:
                print(f"  {s['id']}: {s['title']}")
            sys.exit(1)

        print(c(f"\n═══ {snippet['title']} ═══", Colors.BOLD))
        print(c(snippet['description'], Colors.DIM))
        print(c(f"Tags: {', '.join(snippet['tags'])}", Colors.CYAN))
        print()
        print(snippet['code'])
        print()

        if args.run:
            # Save to temp file and run through havoc
            temp_file = Path(f"_havoc_gallery_{snippet['id']}.py")
            temp_file.write_text(snippet['code'], encoding='utf-8')
            print(c(f"Running {snippet['title']}...", Colors.YELLOW))

            # Reuse run command
            run_args = argparse.Namespace(
                file=str(temp_file),
                output=None,
                adapter=None,
                max_steps=None,
                verbose=False,
                open=args.open_browser,
                explain=False,
            )
            cmd_run(run_args)
            temp_file.unlink()  # Clean up
    else:
        # List all gallery snippets
        print_banner()
        print(c("Algorithm Gallery", Colors.BOLD))
        print(c("Pre-built examples ready to visualize\n", Colors.DIM))

        # Group by category
        categories = {}
        for s in GALLERY_SNIPPETS:
            cat = s['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(s)

        for cat, snippets in categories.items():
            print(c(f"\n  {cat.upper().replace('_', ' ')}", Colors.CYAN))
            for s in snippets:
                tags = c(f" [{', '.join(s['tags'][:3])}]", Colors.DIM)
                print(f"    {c(s['id'], Colors.GREEN)}: {s['title']}{tags}")

        print(c(f"\nTotal: {len(GALLERY_SNIPPETS)} examples", Colors.DIM))
        print(c("Run: python havoc.py gallery <id> --run", Colors.DIM))


def cmd_adapters(args):
    """List all available visualization adapters."""
    print_banner()
    print(c("Available Visualization Adapters", Colors.BOLD))
    print(c("Listed in auto-detection priority order\n", Colors.DIM))

    for i, (name, cls) in enumerate(ADAPTER_PRIORITY, 1):
        doc = cls.__doc__ or 'No description'
        first_line = doc.strip().split('\n')[0]
        print(f"  {c(str(i).rjust(2), Colors.DIM)}. {c(name, Colors.GREEN)}")
        print(f"      {c(first_line, Colors.DIM)}")

    print(c(f"\nTotal: {len(ADAPTER_PRIORITY)} adapters", Colors.DIM))


def cmd_explain(args):
    """Generate AI explanation for a code file."""
    file_path = Path(args.file)
    if not file_path.exists():
        print(c(f"Error: File '{file_path}' not found", Colors.RED))
        sys.exit(1)

    code = file_path.read_text(encoding='utf-8')
    print(c(f"📁 Analyzing {file_path.name}...\n", Colors.BLUE))
    _print_explanation(code, None)


def _print_explanation(code: str, adapter_name: Optional[str]):
    """Print AI explanation to terminal."""
    from api.services.explainer import AIExplainer

    explainer = AIExplainer()
    result = explainer.explain(code, adapter_name=adapter_name)

    if result.get('algorithm_name'):
        print(c(f"Algorithm: {result['algorithm_name']}", Colors.BOLD))
    if result.get('time_complexity'):
        print(c(f"Time: {result['time_complexity']}  |  Space: {result.get('space_complexity', '?')}", Colors.CYAN))

    print()
    print(c("Overview:", Colors.BOLD))
    print(f"  {result.get('overview', 'N/A')}")

    if result.get('key_concepts'):
        print()
        print(c("Key Concepts:", Colors.BOLD))
        for concept in result['key_concepts']:
            print(f"  • {concept}")

    if result.get('step_explanations'):
        print()
        print(c("Step-by-Step:", Colors.BOLD))
        for exp in result['step_explanations'][:10]:  # Limit output
            lines = f"L{exp['step_range'][0]}-{exp['step_range'][1]}"
            print(f"  {c(lines, Colors.DIM)} {c(exp['title'], Colors.YELLOW)}: {exp['detail']}")

    if result.get('learning_path'):
        print()
        print(c("Learning Path:", Colors.BOLD))
        for step in result['learning_path']:
            print(f"  → {step}")

    if result.get('fun_fact'):
        print()
        print(c("Fun Fact:", Colors.BOLD))
        print(f"  {result['fun_fact']}")


def _format_duration(ms: int) -> str:
    """Format milliseconds to human readable."""
    if ms < 1000:
        return f"{ms}ms"
    elif ms < 60_000:
        return f"{ms / 1000:.1f}s"
    elif ms < 3_600_000:
        mins = ms // 60_000
        secs = (ms % 60_000) // 1000
        return f"{mins}m {secs}s"
    hours = ms // 3_600_000
    mins = (ms % 3_600_000) // 60_000
    return f"{hours}h {mins}m"


def _adapter_to_component(adapter_name: str) -> str:
    """Map adapter name to frontend component."""
    mapping = {
        'ArrayAdapter': 'AnimatedArray',
        'GraphAdapter': 'AnimatedGraph',
        'StringAdapter': 'AnimatedString',
        'StackAdapter': 'AnimatedStack',
        'QueueAdapter': 'AnimatedQueue',
        'LinkedListAdapter': 'AnimatedLinkedList',
        'TreeAdapter': 'AnimatedTree',
        'HeapAdapter': 'AnimatedHeap',
        'MatrixAdapter': 'AnimatedMatrix',
        'HashMapAdapter': 'AnimatedHashMap',
        'SetAdapter': 'AnimatedSet',
        'GenericAdapter': 'AnimatedGeneric',
    }
    return mapping.get(adapter_name, 'AnimatedGeneric')


def _open_in_browser(output_path: Path):
    """Open the visualization in a browser."""
    # Copy visualization to phrolva public dir if it exists
    phrolva_public = PROJECT_ROOT / 'phrolva' / 'public'
    if phrolva_public.exists():
        import shutil
        dest = phrolva_public / 'visualization.json'
        shutil.copy2(output_path, dest)
        print(c("Copied visualization to phrolva/public/visualization.json", Colors.DIM))
        print(c("Start the frontend: cd phrolva && npm run dev", Colors.CYAN))
        print(c("Then visit: http://localhost:5173", Colors.BLUE))
    else:
        # Open the JSON file directly
        webbrowser.open(str(output_path.resolve()))


def main():
    parser = argparse.ArgumentParser(
        prog='havoc',
        description='HAVOC — Hypnotic Algorithm Visualization Of Code',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python havoc.py run sort.py                        # Trace and visualize
  python havoc.py run sort.py --open                 # Trace and open in browser
  python havoc.py run sort.py --adapter ArrayAdapter  # Force array visualization
  python havoc.py serve                              # Start API server
  python havoc.py gallery                            # Browse examples
  python havoc.py gallery gallery_bubble_sort --run  # Run an example
  python havoc.py explain sort.py                    # Get AI explanation
  python havoc.py adapters                           # List adapters
        """
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Run command
    run_parser = subparsers.add_parser('run', help='Trace and visualize a Python file')
    run_parser.add_argument('file', help='Python file to visualize')
    run_parser.add_argument('-o', '--output', help='Output JSON file path')
    run_parser.add_argument('-a', '--adapter', help='Force specific adapter')
    run_parser.add_argument('--max-steps', type=int, help='Maximum execution steps')
    run_parser.add_argument('--verbose', action='store_true', help='Debug-level tracing')
    run_parser.add_argument('--open', action='store_true', help='Open in browser after tracing')
    run_parser.add_argument('--explain', action='store_true', help='Show AI explanation')
    run_parser.set_defaults(func=cmd_run)

    # Serve command
    serve_parser = subparsers.add_parser('serve', help='Start the HAVOC API server')
    serve_parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    serve_parser.add_argument('--port', type=int, default=8000, help='Port to listen on')
    serve_parser.add_argument('--reload', action='store_true', help='Enable auto-reload')
    serve_parser.set_defaults(func=cmd_serve)

    # Gallery command
    gallery_parser = subparsers.add_parser('gallery', help='Browse pre-built algorithm examples')
    gallery_parser.add_argument('snippet_id', nargs='?', help='Gallery snippet ID to view')
    gallery_parser.add_argument('--run', action='store_true', help='Run the snippet through HAVOC')
    gallery_parser.add_argument('--open', dest='open_browser', action='store_true', help='Open in browser')
    gallery_parser.set_defaults(func=cmd_gallery)

    # Adapters command
    adapters_parser = subparsers.add_parser('adapters', help='List visualization adapters')
    adapters_parser.set_defaults(func=cmd_adapters)

    # Explain command
    explain_parser = subparsers.add_parser('explain', help='Generate AI explanation for code')
    explain_parser.add_argument('file', help='Python file to explain')
    explain_parser.set_defaults(func=cmd_explain)

    args = parser.parse_args()

    if not args.command:
        print_banner()
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == '__main__':
    main()
