# Execute route — THE endpoint. Feed it code, get back a full visualization.
# This is the beating heart of HAVOC's API.

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import traceback

from api.services.executor import ExecutionService, get_execution_service
from api.services.explainer import AIExplainer

router = APIRouter()


class ExecuteRequest(BaseModel):
    """What the user sends us — their precious code and preferences."""
    code: str = Field(..., min_length=1, max_length=500_000, description="Python code to visualize")
    config: Optional[Dict[str, Any]] = Field(default=None, description="Tracer config overrides")
    adapter_hint: Optional[str] = Field(default=None, description="Force a specific adapter (e.g., 'ArrayAdapter')")
    generate_explanations: bool = Field(default=True, description="Generate AI explanations for each step")
    max_steps: int = Field(default=100_000, ge=100, le=10_000_000, description="Max execution steps")
    speed_preset: str = Field(default="normal", description="Animation speed: slow, normal, fast, blazing")


class ExecuteResponse(BaseModel):
    """The full visualization payload — everything the frontend needs."""
    success: bool
    metadata: Dict[str, Any]
    execution: Dict[str, Any]
    animations: Dict[str, Any]
    visualizer_config: Dict[str, Any]
    explanations: Optional[Dict[str, Any]] = None
    performance: Dict[str, Any]
    error: Optional[str] = None
    warnings: Optional[List[str]] = None


@router.post("/execute", response_model=ExecuteResponse)
async def execute_code(request: ExecuteRequest):
    """Execute Python code and generate visualization data.

    This is the main pipeline:
    1. Parse and validate the code
    2. Trace execution step by step via Calcharo
    3. Auto-detect the best visualization adapter
    4. Generate animation commands with physics metadata
    5. (Optional) Generate AI explanations
    6. Return everything wrapped in a neat JSON package

    Supports code up to 10k+ lines and generates 10min+ animations.
    """
    start_time = time.time()

    try:
        if not request.code.strip():
            raise HTTPException(status_code=400, detail="Empty code provided. Give us something to work with!")

        # Execute through the service
        service = get_execution_service()
        result = await service.execute_async(
            code=request.code,
            max_steps=request.max_steps,
            adapter_hint=request.adapter_hint,
            speed_preset=request.speed_preset,
        )

        if not result.success:
            elapsed = time.time() - start_time
            return ExecuteResponse(
                success=False,
                metadata={'error_type': result.error_type},
                execution={'total_steps': 0, 'steps': []},
                animations={'total_commands': 0, 'commands': [], 'duration_ms': 0},
                visualizer_config={'component': 'AnimatedGeneric'},
                performance={'total_time_ms': round(elapsed * 1000, 2)},
                error=result.error,
                warnings=result.warnings,
            )

        # Generate AI explanations if requested
        explanations = None
        if request.generate_explanations:
            try:
                explainer = AIExplainer()
                explanations = explainer.explain(
                    code=request.code,
                    execution_steps=result.execution_steps,
                    adapter_name=result.adapter_used,
                )
            except Exception as e:
                explanations = {
                    'overview': f'AI explanations temporarily unavailable: {e}',
                    'step_explanations': [],
                    'key_concepts': [],
                }

        elapsed = time.time() - start_time

        return ExecuteResponse(
            success=True,
            metadata=result.metadata,
            execution={
                'total_steps': len(result.execution_steps),
                'steps': result.execution_steps[:5000],  # Cap for response size
                'truncated': len(result.execution_steps) > 5000,
            },
            animations={
                'total_commands': len(result.animation_commands),
                'commands': result.animation_commands,
                'duration_ms': result.metadata.get('estimated_duration_ms', 0),
                'adapter': result.adapter_used,
            },
            visualizer_config=result.metadata.get('visualizer_config', {}),
            explanations=explanations,
            performance={
                'total_time_ms': round(elapsed * 1000, 2),
                'trace_time_ms': result.metadata.get('execution_time_ms', 0),
                'animation_time_ms': result.metadata.get('generation_time_ms', 0),
                'steps_per_second': round(
                    len(result.execution_steps) / max(elapsed, 0.001), 1
                ),
            },
            warnings=result.warnings,
        )

    except HTTPException:
        raise
    except Exception as e:
        elapsed = time.time() - start_time
        return ExecuteResponse(
            success=False,
            metadata={'error': True},
            execution={'total_steps': 0, 'steps': []},
            animations={'total_commands': 0, 'commands': [], 'duration_ms': 0},
            visualizer_config={'component': 'AnimatedGeneric'},
            performance={'total_time_ms': round(elapsed * 1000, 2)},
            error=f"{type(e).__name__}: {str(e)}",
        )


@router.post("/execute/quick")
async def quick_execute(request: ExecuteRequest):
    """Quick execution — minimal tracing, no AI, fast response.
    Good for previewing what will happen before committing to a full trace.
    """
    service = get_execution_service()
    result = await service.execute_async(
        code=request.code,
        max_steps=min(request.max_steps, 1000),
        adapter_hint=request.adapter_hint,
        speed_preset='fast',
    )
    return {
        "success": result.success,
        "adapter": result.adapter_used,
        "total_steps": len(result.execution_steps),
        "total_commands": len(result.animation_commands),
        "error": result.error,
    }
