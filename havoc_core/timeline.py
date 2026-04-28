from __future__ import annotations

from bisect import bisect_left, bisect_right
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence

from .errors import TimelineError
from .trace import TraceChunk, TraceEvent


@dataclass(frozen=True, slots=True)
class TimelineStats:
    event_count: int
    duration_ms: int
    start_time: Optional[int]
    end_time: Optional[int]


class TimelineEngine:
    def __init__(self, run_id: str) -> None:
        if not run_id:
            raise TimelineError("run_id must be non-empty")
        self._run_id = run_id
        self._events: List[TraceEvent] = []
        self._times: List[int] = []
        self._event_index: Dict[str, int] = {}
        self._next_seq = 0
        self._last_time: Optional[int] = None

    @property
    def run_id(self) -> str:
        return self._run_id

    def append_chunk(self, chunk: TraceChunk) -> None:
        if chunk.run_id != self._run_id:
            raise TimelineError("chunk.run_id does not match timeline")
        chunk.validate()
        if chunk.seq != self._next_seq:
            raise TimelineError(
                f"chunk.seq {chunk.seq} does not match expected {self._next_seq}"
            )

        for event in chunk.events:
            if event.id in self._event_index:
                raise TimelineError(f"duplicate event.id: {event.id}")
            if self._last_time is not None and event.t < self._last_time:
                raise TimelineError("events must be non-decreasing by t")
            self._event_index[event.id] = len(self._events)
            self._events.append(event)
            self._times.append(event.t)
            self._last_time = event.t

        self._next_seq += 1

    def extend(self, chunks: Iterable[TraceChunk]) -> None:
        for chunk in chunks:
            self.append_chunk(chunk)

    def events(self) -> Sequence[TraceEvent]:
        return tuple(self._events)

    def times(self) -> Sequence[int]:
        return tuple(self._times)

    def event_at(self, index: int) -> TraceEvent:
        if index < 0 or index >= len(self._events):
            raise TimelineError("index out of bounds")
        return self._events[index]

    def index_of(self, event_id: str) -> int:
        if event_id not in self._event_index:
            raise TimelineError("event_id not found")
        return self._event_index[event_id]

    def stats(self) -> TimelineStats:
        if not self._events:
            return TimelineStats(event_count=0, duration_ms=0, start_time=None, end_time=None)
        start = self._times[0]
        end = self._times[-1]
        return TimelineStats(
            event_count=len(self._events),
            duration_ms=max(0, end - start),
            start_time=start,
            end_time=end,
        )

    def __len__(self) -> int:
        return len(self._events)


class TimelineCursor:
    def __init__(self, engine: TimelineEngine) -> None:
        self._engine = engine
        self._index = -1

    @property
    def index(self) -> int:
        return self._index

    @property
    def current(self) -> Optional[TraceEvent]:
        if self._index < 0:
            return None
        return self._engine.event_at(self._index)

    def reset(self) -> None:
        self._index = -1

    def seek_index(self, index: int) -> TraceEvent:
        if index < 0 or index >= len(self._engine):
            raise TimelineError("index out of bounds")
        self._index = index
        return self._engine.event_at(self._index)

    def seek_time(self, t: int, mode: str = "nearest") -> Optional[TraceEvent]:
        if t < 0:
            raise TimelineError("t must be >= 0")
        times = self._engine.times()
        if not times:
            return None

        if mode == "floor":
            idx = bisect_right(times, t) - 1
        elif mode == "ceil":
            idx = bisect_left(times, t)
        elif mode == "nearest":
            right = bisect_left(times, t)
            left = right - 1
            if right >= len(times):
                idx = left
            elif left < 0:
                idx = right
            else:
                left_dt = abs(t - times[left])
                right_dt = abs(times[right] - t)
                idx = left if left_dt <= right_dt else right
        else:
            raise TimelineError("mode must be one of: floor, ceil, nearest")

        if idx < 0 or idx >= len(times):
            return None
        self._index = idx
        return self._engine.event_at(self._index)

    def step_forward(self) -> Optional[TraceEvent]:
        if self._index + 1 >= len(self._engine):
            return None
        self._index += 1
        return self._engine.event_at(self._index)

    def step_back(self) -> Optional[TraceEvent]:
        if self._index - 1 < 0:
            return None
        self._index -= 1
        return self._engine.event_at(self._index)
