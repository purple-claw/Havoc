# Visualization Adapters - Where execution steps become pretty animations
# Because raw data is boring, we need sparkles and colors

from .base import VisualizationAdapter, AnimationCommand, CommandType
from .array_adapter import ArrayAdapter
from .graph_adapter import GraphAdapter
from .string_adapter import StringAdapter

__all__ = [
    'VisualizationAdapter',  # The parent class
    'AnimationCommand',      # What we generate
    'CommandType',          # Types of animations
    'ArrayAdapter',         # For sorting and array stuff
    'GraphAdapter',         # For graph algorithms
    'StringAdapter',        # For string manipulations
]
