from __future__ import annotations


class HavocCoreError(Exception):
    pass


class TraceSchemaError(HavocCoreError):
    pass


class TimelineError(HavocCoreError):
    pass
