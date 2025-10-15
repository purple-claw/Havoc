# Custom exceptions because Python's built-in ones are too boring
# Also, we need to blame users properly when things go wrong

from typing import Optional, Any, Dict
import traceback


class TracerError(Exception):
    # The mother of all our custom errors
    # When you need to know EXACTLY where things went wrong
    
    def __init__(self, 
                 message: str, 
                 line_number: Optional[int] = None,
                 column_number: Optional[int] = None,
                 source_code: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.line_number = line_number
        self.column_number = column_number
        self.source_code = source_code
        self.details = details or {}
        self.traceback = traceback.format_exc()  # Full stack trace for the masochists
        
        super().__init__(self._format_message())
    
    def _format_message(self) -> str:
        # Make the error message pretty... or at least readable
        parts = [self.message]
        
        if self.line_number is not None:
            parts.append(f"Line {self.line_number}")
            if self.column_number is not None:
                parts[-1] += f":{self.column_number}"  # Extra precision for the pedantic
        
        if self.source_code:
            # Show them the code that broke everything
            parts.append(f"Code: {self.source_code[:100]}...")
        
        if self.details:
            # Dump all the gory details
            detail_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            parts.append(f"Details: {detail_str}")
        
        return " | ".join(parts)  # Pipe-separated because why not
    
    def to_dict(self) -> Dict[str, Any]:
        # For when you need to serialize your failures
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "line_number": self.line_number,
            "column_number": self.column_number,
            "source_code": self.source_code,
            "details": self.details,
            "traceback": self.traceback
        }


class ParseError(TracerError):
    # When your code doesn't even make sense to Python
    
    def __init__(self, message: str, **kwargs):
        super().__init__(f"Parse Error: {message}", **kwargs)


class ExecutionError(TracerError):
    # When your code makes sense but still fails spectacularly
    
    def __init__(self, message: str, **kwargs):
        super().__init__(f"Execution Error: {message}", **kwargs)


class ValidationError(TracerError):
    # For when users give us garbage input and expect magic
    
    def __init__(self, message: str, **kwargs):
        super().__init__(f"Validation Error: {message}", **kwargs)


class ResourceError(TracerError):
    # "I need more RAM!" - Every Python program ever
    
    def __init__(self, message: str, resource_type: str, **kwargs):
        kwargs['details'] = kwargs.get('details', {})
        kwargs['details']['resource_type'] = resource_type
        super().__init__(f"Resource Error: {message}", **kwargs)


class TimeoutError(TracerError):
    # Your code took too long. We got bored waiting.
    
    def __init__(self, message: str, timeout_seconds: float, **kwargs):
        kwargs['details'] = kwargs.get('details', {})
        kwargs['details']['timeout_seconds'] = timeout_seconds
        super().__init__(f"Timeout Error: {message}", **kwargs)