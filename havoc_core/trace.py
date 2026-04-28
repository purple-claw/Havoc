from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Iterable, Optional, Tuple

from .errors import TraceSchemaError


class TraceEventKind(str, Enum):
    LINE = "line"
    CALL = "call"
    RETURN = "return"
    VAR = "var"
    HEAP = "heap"
    EXCEPTION = "exception"
    BREAKPOINT = "breakpoint"
    OUTPUT = "output"
    CUSTOM = "custom"


class HeapOp(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


@dataclass(frozen=True, slots=True)
class SourceLocation:
    file_id: str
    line: int
    column: Optional[int] = None
    function: Optional[str] = None

    def validate(self) -> None:
        if not self.file_id:
            raise TraceSchemaError("source.file_id must be non-empty")
        if self.line <= 0:
            raise TraceSchemaError("source.line must be >= 1")
        if self.column is not None and self.column < 0:
            raise TraceSchemaError("source.column must be >= 0")


@dataclass(frozen=True, slots=True)
class TraceEvent:
    id: str
    t: int
    kind: TraceEventKind
    source: SourceLocation
    frame_id: Optional[str] = None
    payload: Dict[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        if not self.id:
            raise TraceSchemaError("event.id must be non-empty")
        if self.t < 0:
            raise TraceSchemaError("event.t must be >= 0")
        self.source.validate()


@dataclass(frozen=True, slots=True)
class HeapObjectDelta:
    object_id: str
    type_name: str
    fields: Dict[str, Any]
    op: HeapOp

    def validate(self) -> None:
        if not self.object_id:
            raise TraceSchemaError("heap.object_id must be non-empty")
        if not self.type_name:
            raise TraceSchemaError("heap.type_name must be non-empty")


@dataclass(frozen=True, slots=True)
class TraceChunk:
    run_id: str
    seq: int
    events: Tuple[TraceEvent, ...]
    objects: Tuple[HeapObjectDelta, ...] = field(default_factory=tuple)
    end: bool = False

    def __init__(
        self,
        run_id: str,
        seq: int,
        events: Iterable[TraceEvent],
        objects: Optional[Iterable[HeapObjectDelta]] = None,
        end: bool = False,
    ) -> None:
        object.__setattr__(self, "run_id", run_id)
        object.__setattr__(self, "seq", seq)
        object.__setattr__(self, "events", tuple(events))
        object.__setattr__(self, "objects", tuple(objects or ()))
        object.__setattr__(self, "end", end)

    def validate(self) -> None:
        if not self.run_id:
            raise TraceSchemaError("chunk.run_id must be non-empty")
        if self.seq < 0:
            raise TraceSchemaError("chunk.seq must be >= 0")

        seen_ids = set()
        last_time: Optional[int] = None
        for event in self.events:
            event.validate()
            if event.id in seen_ids:
                raise TraceSchemaError(f"duplicate event.id in chunk: {event.id}")
            seen_ids.add(event.id)
            if last_time is not None and event.t < last_time:
                raise TraceSchemaError("chunk.events must be non-decreasing by t")
            last_time = event.t

        for obj in self.objects:
            obj.validate()
