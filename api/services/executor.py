# ExecutionService — orchestrates the Calcharo tracer + adapter registry
# Handles chunked processing for large code (10k+ lines, 10min+ animations)
# This is the brain that connects Python AST tracing to visualization commands

import time
import asyncio
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
import traceback
import json

# Import the Calcharo engine
import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from calcharo.core.tracer import ExecutionTracer
from calcharo.core.config import TracerConfig, TracingMode
from calcharo.core.models import ExecutionStep
from calcharo.core.errors import (
    TracerError, ParseError, ExecutionError,
    ValidationError, TimeoutError as TracerTimeout
)
from calcharo.adapters.registry import AdapterRegistry, auto_detect_adapter


@dataclass
class ExecutionResult:
    """Result of a code execution + visualization generation."""
    success: bool
    execution_steps: List[Dict[str, Any]]
    animation_commands: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    adapter_used: str
    error: Optional[str] = None
    error_type: Optional[str] = None
    warnings: List[str] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class ExecutionService:
    """
    Orchestrates code tracing and visualization generation.

    Handles:
    - Code validation and safety checks
    - AST-based execution tracing via Calcharo
    - Adapter auto-detection and animation generation
    - Chunked processing for large codebases (10k+ lines)
    - Performance optimization for long-running animations (10min+)

    The service is stateless — each execution is independent.
    """

    # Size thresholds for different processing strategies
    SMALL_CODE_LINES = 500       # Direct processing
    MEDIUM_CODE_LINES = 5000     # Optimized processing
    LARGE_CODE_LINES = 10000     # Chunked processing
    MAX_CODE_LINES = 50000       # Hard limit

    # Step limits by code size
    STEP_LIMITS = {
        'small': 100_000,
        'medium': 500_000,
        'large': 1_000_000,
        'xlarge': 5_000_000,
    }

    # Dangerous patterns that should be blocked
    BLOCKED_PATTERNS = [
        'import os', 'import sys', 'import subprocess',
        'import shutil', 'import socket', 'import http',
        'import urllib', 'import requests',
        '__import__', 'exec(', 'eval(',
        'open(', 'file(', 'input(',
        'os.system', 'os.popen', 'os.exec',
        'subprocess.', 'shutil.',
        'globals()', 'locals().',
    ]

    # Patterns that are okay (override blocks)
    SAFE_OVERRIDES = [
        'import math', 'import random', 'import collections',
        'import heapq', 'import itertools', 'import functools',
        'import string', 'import re', 'import json',
        'import copy', 'import bisect', 'import array',
        'from collections', 'from heapq', 'from itertools',
        'from functools', 'from math', 'from random',
        'from typing', 'from dataclasses', 'from enum',
    ]

    def __init__(self):
        self.registry = AdapterRegistry()

    def validate_code(self, code: str) -> Tuple[bool, List[str]]:
        """
        Validate code for safety before execution.
        Returns (is_safe, list_of_warnings).
        """
        warnings = []
        lines = code.split('\n')

        # Check size limits
        if len(lines) > self.MAX_CODE_LINES:
            return False, [f"Code exceeds maximum {self.MAX_CODE_LINES} lines"]

        # Check for dangerous patterns
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#'):
                continue

            for pattern in self.BLOCKED_PATTERNS:
                if pattern in stripped:
                    # Check if it's overridden by safe patterns
                    is_safe = any(safe in stripped for safe in self.SAFE_OVERRIDES)
                    if not is_safe:
                        return False, [
                            f"Line {i}: Blocked pattern '{pattern}' detected. "
                            f"HAVOC runs code in a sandbox but doesn't allow system access. "
                            f"Stick to algorithms, not system hacking."
                        ]

        # Warn about potentially slow code
        if len(lines) > self.LARGE_CODE_LINES:
            warnings.append(
                f"Large codebase ({len(lines)} lines). "
                f"Processing will use chunked mode for optimal performance."
            )

        # Check for infinite loop indicators
        if 'while True' in code and 'break' not in code:
            warnings.append(
                "Detected 'while True' without 'break'. "
                "The tracer has timeout protection, but your animation might get cut short."
            )

        return True, warnings

    def _get_size_category(self, code: str) -> str:
        """Categorize code size for processing strategy selection."""
        lines = len(code.split('\n'))
        if lines <= self.SMALL_CODE_LINES:
            return 'small'
        elif lines <= self.MEDIUM_CODE_LINES:
            return 'medium'
        elif lines <= self.LARGE_CODE_LINES:
            return 'large'
        return 'xlarge'

    def _build_config(
        self,
        code: str,
        max_steps: Optional[int] = None,
        speed_preset: str = 'normal'
    ) -> TracerConfig:
        """Build optimal TracerConfig based on code size and preferences."""
        size = self._get_size_category(code)
        step_limit = max_steps or self.STEP_LIMITS.get(size, 100_000)

        # Adjust tracing mode based on size
        if size == 'small':
            mode = TracingMode.FULL
        elif size == 'medium':
            mode = TracingMode.FULL
        elif size == 'large':
            mode = TracingMode.PERFORMANCE
        else:
            mode = TracingMode.MINIMAL

        # Build config with appropriate limits
        config = TracerConfig(
            mode=mode,
            max_steps=step_limit,
            max_execution_time=300.0 if size in ('large', 'xlarge') else 60.0,
            max_memory_mb=512 if size in ('large', 'xlarge') else 256,
            capture_heap=size in ('small', 'medium'),
            capture_call_stack=True,
            capture_stdout=True,
        )

        return config

    def _trace_code(self, code: str, config: TracerConfig) -> Tuple[List[ExecutionStep], Dict]:
        """Execute code through the Calcharo tracer."""
        tracer = ExecutionTracer(config)
        start_time = time.time()

        try:
            steps = tracer.trace(code)
            elapsed = time.time() - start_time

            metadata = {
                'total_steps': len(steps),
                'execution_time_ms': round(elapsed * 1000, 2),
                'lines_executed': len(set(s.line for s in steps if s.line)),
                'total_lines': len(code.split('\n')),
                'tracing_mode': config.mode.value if hasattr(config.mode, 'value') else str(config.mode),
            }

            return steps, metadata

        except ParseError as e:
            raise ExecutionError(f"Syntax error in your code: {e}")
        except TracerTimeout as e:
            raise ExecutionError(
                f"Code execution timed out after {config.max_execution_time}s. "
                f"Your code might have an infinite loop, or it's just really ambitious."
            )
        except ExecutionError:
            raise
        except Exception as e:
            raise ExecutionError(f"Unexpected error during tracing: {type(e).__name__}: {e}")

    def _generate_animations(
        self,
        code: str,
        steps: List[ExecutionStep],
        adapter_hint: Optional[str] = None,
        speed_preset: str = 'normal'
    ) -> Tuple[List[Dict], str, Dict]:
        """Generate animation commands from execution steps using the adapter registry."""
        # Use hint or auto-detect
        if adapter_hint:
            adapter = self.registry.get_adapter(adapter_hint)
            if not adapter:
                # Fallback to auto-detect
                adapter = auto_detect_adapter(code)
                adapter_name = adapter.__class__.__name__
            else:
                adapter_name = adapter_hint
        else:
            adapter = auto_detect_adapter(code)
            adapter_name = adapter.__class__.__name__

        # Generate animations
        start_time = time.time()
        commands = adapter.generate_commands(steps, code)
        anim_time = time.time() - start_time

        # Speed presets affect animation timing
        speed_multipliers = {
            'slow': 2.0,
            'normal': 1.0,
            'fast': 0.5,
            'blazing': 0.25,
        }
        multiplier = speed_multipliers.get(speed_preset, 1.0)

        # Serialize and apply speed
        serialized_commands = []
        for cmd in commands:
            cmd_dict = {
                'type': cmd.command_type.value if hasattr(cmd.command_type, 'value') else str(cmd.command_type),
                'target': cmd.target,
                'value': cmd.value,
                'duration': int(cmd.duration * multiplier),
                'metadata': cmd.metadata or {},
            }
            serialized_commands.append(cmd_dict)

        anim_metadata = {
            'adapter': adapter_name,
            'total_commands': len(serialized_commands),
            'generation_time_ms': round(anim_time * 1000, 2),
            'speed_preset': speed_preset,
            'speed_multiplier': multiplier,
            'estimated_duration_ms': sum(c['duration'] for c in serialized_commands),
        }

        return serialized_commands, adapter_name, anim_metadata

    def execute(
        self,
        code: str,
        max_steps: Optional[int] = None,
        adapter_hint: Optional[str] = None,
        speed_preset: str = 'normal',
    ) -> ExecutionResult:
        """
        Execute code and generate visualization.

        The main entry point. Takes code, traces it, detects the right
        visualization adapter, and returns everything the frontend needs.
        """
        # Validate
        is_safe, safety_warnings = self.validate_code(code)
        if not is_safe:
            return ExecutionResult(
                success=False,
                execution_steps=[],
                animation_commands=[],
                metadata={},
                adapter_used='none',
                error=safety_warnings[0],
                error_type='validation',
                warnings=safety_warnings,
            )

        try:
            # Build config
            config = self._build_config(code, max_steps, speed_preset)

            # Trace
            steps, exec_metadata = self._trace_code(code, config)

            # Generate animations
            commands, adapter_name, anim_metadata = self._generate_animations(
                code, steps, adapter_hint, speed_preset
            )

            # Serialize execution steps
            serialized_steps = []
            for step in steps:
                step_dict = {
                    'line': step.line,
                    'step_type': step.step_type.value if hasattr(step.step_type, 'value') else str(step.step_type),
                    'variables': dict(step.variables) if step.variables else {},
                    'stdout': step.stdout if hasattr(step, 'stdout') else '',
                }
                if hasattr(step, 'call_stack') and step.call_stack:
                    step_dict['call_stack'] = [
                        {'function': f.function_name, 'line': f.line}
                        for f in step.call_stack
                    ]
                serialized_steps.append(step_dict)

            # Build visualizer config for frontend
            visualizer_config = self._build_visualizer_config(adapter_name, code, steps)

            metadata = {
                **exec_metadata,
                **anim_metadata,
                'visualizer_config': visualizer_config,
            }

            return ExecutionResult(
                success=True,
                execution_steps=serialized_steps,
                animation_commands=commands,
                metadata=metadata,
                adapter_used=adapter_name,
                warnings=safety_warnings,
            )

        except ExecutionError as e:
            return ExecutionResult(
                success=False,
                execution_steps=[],
                animation_commands=[],
                metadata={},
                adapter_used='none',
                error=str(e),
                error_type='execution',
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                execution_steps=[],
                animation_commands=[],
                metadata={},
                adapter_used='none',
                error=f"Internal error: {type(e).__name__}: {e}",
                error_type='internal',
                warnings=[traceback.format_exc()],
            )

    def _build_visualizer_config(
        self,
        adapter_name: str,
        code: str,
        steps: List[ExecutionStep]
    ) -> Dict[str, Any]:
        """Build frontend visualizer configuration based on the adapter."""
        # Map adapter names to frontend component names
        component_map = {
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

        # Physics config per component type
        physics_configs = {
            'AnimatedArray': {
                'spring': {'tension': 170, 'friction': 26},
                'bar_style': 'gradient',
                'celebration': True,
            },
            'AnimatedGraph': {
                'force': {'charge': -300, 'link_distance': 80},
                'node_style': 'circle',
                'edge_style': 'curved',
            },
            'AnimatedString': {
                'spring': {'tension': 200, 'friction': 20},
                'char_style': 'box',
            },
            'AnimatedStack': {
                'spring': {'tension': 250, 'friction': 22},
                'orientation': 'vertical',
                'drop_physics': True,
            },
            'AnimatedQueue': {
                'spring': {'tension': 180, 'friction': 24},
                'orientation': 'horizontal',
                'slide_physics': True,
            },
            'AnimatedLinkedList': {
                'spring': {'tension': 160, 'friction': 28},
                'arrow_style': 'animated',
                'node_shape': 'rounded_rect',
            },
            'AnimatedTree': {
                'spring': {'tension': 200, 'friction': 25},
                'layout': 'tidy',
                'edge_style': 'smooth_step',
                'node_shape': 'circle',
            },
            'AnimatedHeap': {
                'spring': {'tension': 220, 'friction': 23},
                'dual_view': True,
                'tree_layout': 'balanced',
            },
            'AnimatedMatrix': {
                'spring': {'tension': 150, 'friction': 30},
                'cell_style': 'heatmap',
                'gradient': ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
            },
            'AnimatedHashMap': {
                'spring': {'tension': 180, 'friction': 25},
                'bucket_style': 'slots',
                'hash_animation': True,
            },
            'AnimatedSet': {
                'spring': {'tension': 190, 'friction': 22},
                'layout': 'venn',
                'bubble_physics': True,
            },
            'AnimatedGeneric': {
                'spring': {'tension': 170, 'friction': 26},
                'layout': 'dashboard',
            },
        }

        component = component_map.get(adapter_name, 'AnimatedGeneric')
        physics = physics_configs.get(component, physics_configs['AnimatedGeneric'])

        return {
            'component': component,
            'adapter': adapter_name,
            'physics': physics,
            'theme': 'dark',
            'source_code': code,
            'total_steps': len(steps),
        }

    async def execute_async(
        self,
        code: str,
        max_steps: Optional[int] = None,
        adapter_hint: Optional[str] = None,
        speed_preset: str = 'normal',
    ) -> ExecutionResult:
        """Async wrapper for execute — runs tracing in a thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.execute(code, max_steps, adapter_hint, speed_preset)
        )


# Singleton for route handlers
_service_instance = None


def get_execution_service() -> ExecutionService:
    """Get or create the singleton ExecutionService."""
    global _service_instance
    if _service_instance is None:
        _service_instance = ExecutionService()
    return _service_instance
