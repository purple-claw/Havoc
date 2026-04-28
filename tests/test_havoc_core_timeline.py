import pytest

from havoc_core import (
    SourceLocation,
    TraceChunk,
    TraceEvent,
    TraceEventKind,
    TraceSchemaError,
    TimelineCursor,
    TimelineEngine,
    TimelineError,
)


def _event(event_id: str, t: int) -> TraceEvent:
    return TraceEvent(
        id=event_id,
        t=t,
        kind=TraceEventKind.LINE,
        source=SourceLocation(file_id="main.py", line=1, column=0),
        payload={"line": 1},
    )


def test_trace_chunk_validation_rejects_out_of_order_time():
    chunk = TraceChunk(
        run_id="run-1",
        seq=0,
        events=[_event("e1", 10), _event("e2", 5)],
    )
    with pytest.raises(TraceSchemaError):
        chunk.validate()


def test_timeline_engine_append_and_seek():
    engine = TimelineEngine(run_id="run-1")
    chunk = TraceChunk(
        run_id="run-1",
        seq=0,
        events=[_event("e1", 0), _event("e2", 5), _event("e3", 10)],
    )
    engine.append_chunk(chunk)

    stats = engine.stats()
    assert stats.event_count == 3
    assert stats.duration_ms == 10
    assert stats.start_time == 0
    assert stats.end_time == 10

    cursor = TimelineCursor(engine)
    assert cursor.seek_time(6, mode="nearest").id == "e2"
    assert cursor.seek_time(6, mode="floor").id == "e2"
    assert cursor.seek_time(6, mode="ceil").id == "e3"

    assert cursor.step_back().id == "e2"
    assert cursor.step_forward().id == "e3"


def test_timeline_engine_rejects_seq_gap():
    engine = TimelineEngine(run_id="run-1")
    chunk = TraceChunk(
        run_id="run-1",
        seq=1,
        events=[_event("e1", 0)],
    )
    with pytest.raises(TimelineError):
        engine.append_chunk(chunk)


def test_timeline_engine_rejects_duplicate_event_id():
    engine = TimelineEngine(run_id="run-1")
    engine.append_chunk(
        TraceChunk(
            run_id="run-1",
            seq=0,
            events=[_event("e1", 0)],
        )
    )
    with pytest.raises(TimelineError):
        engine.append_chunk(
            TraceChunk(
                run_id="run-1",
                seq=1,
                events=[_event("e1", 1)],
            )
        )
