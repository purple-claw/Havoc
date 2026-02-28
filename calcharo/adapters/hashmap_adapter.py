# HashMap Adapter - Dictionary/Hash Table operations with collision visualization
# Watch keys hash, buckets fill, collisions resolve, and tables resize

from typing import List, Dict, Any, Optional
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class HashMapAdapter(VisualizationAdapter):
    """Visualizes dictionary/hash map operations.
    Supports: insert, delete, lookup, collision handling, rehashing.
    Shows bucket layout with chaining or open addressing visualization.
    """

    def __init__(self, dict_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_dict_name = dict_variable_name
        self.dict_history: List[Dict[Any, Any]] = []
        self.bucket_count = 8  # Default visualization bucket count

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        dict_keywords = [
            'hash', 'map', 'dict', 'table', 'cache', 'memo',
            'counter', 'freq', 'count', 'lookup', 'index_map',
        ]
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, dict) and len(var_value) > 0:
                    # Dicts with primitive keys are likely hash maps
                    keys = list(var_value.keys())
                    if keys and isinstance(keys[0], (str, int, float, bool)):
                        # Exclude graph adjacency lists (dict of lists)
                        values = list(var_value.values())
                        if not all(isinstance(v, (list, set)) for v in values):
                            if self.tracked_dict_name is None:
                                self.tracked_dict_name = var_name
                            return True
                        if any(kw in var_name.lower() for kw in dict_keywords):
                            if self.tracked_dict_name is None:
                                self.tracked_dict_name = var_name
                            return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_dict = None

        for step in execution_steps:
            if self.tracked_dict_name and self.tracked_dict_name not in step.variables_state:
                continue

            current_dict = step.variables_state.get(self.tracked_dict_name)
            if not isinstance(current_dict, dict):
                continue

            if previous_dict is not None:
                mutations = self._detect_dict_changes(previous_dict, current_dict)
                for mutation in mutations:
                    if mutation['op'] == 'insert':
                        bucket = self._hash_to_bucket(mutation['key'])
                        # Key hashes -> lands in bucket with animation
                        hash_cmd = AnimationCommand(
                            command_type=CommandType.CREATE,
                            target_ids=[str(mutation['key'])],
                            values={
                                'key': mutation['key'],
                                'value': mutation['value'],
                                'bucket': bucket,
                                'animation': 'hash_insert',
                                'hash_value': hash(mutation['key']) if self._is_hashable(mutation['key']) else 0,
                            },
                            duration_ms=500,
                            metadata={
                                'physics': 'spring_drop_to_bucket',
                                'tension': 200,
                                'friction': 14,
                                'bucket_count': self.bucket_count,
                            }
                        )
                        self.animation_sequence.append(hash_cmd)

                    elif mutation['op'] == 'update':
                        bucket = self._hash_to_bucket(mutation['key'])
                        update_cmd = AnimationCommand(
                            command_type=CommandType.SET_VALUE,
                            target_ids=[str(mutation['key'])],
                            values={
                                'key': mutation['key'],
                                'old_value': mutation['old_value'],
                                'new_value': mutation['new_value'],
                                'bucket': bucket,
                                'animation': 'value_flash',
                            },
                            duration_ms=400,
                            metadata={'physics': 'gentle_pop'}
                        )
                        self.animation_sequence.append(update_cmd)

                    elif mutation['op'] == 'delete':
                        bucket = self._hash_to_bucket(mutation['key'])
                        delete_cmd = AnimationCommand(
                            command_type=CommandType.DELETE,
                            target_ids=[str(mutation['key'])],
                            values={
                                'key': mutation['key'],
                                'value': mutation['value'],
                                'bucket': bucket,
                                'animation': 'hash_remove',
                            },
                            duration_ms=400,
                            metadata={'physics': 'fade_shrink'}
                        )
                        self.animation_sequence.append(delete_cmd)

                    elif mutation['op'] == 'lookup':
                        bucket = self._hash_to_bucket(mutation['key'])
                        lookup_cmd = AnimationCommand(
                            command_type=CommandType.HIGHLIGHT,
                            target_ids=[str(mutation['key'])],
                            values={
                                'key': mutation['key'],
                                'bucket': bucket,
                                'animation': 'hash_lookup',
                                'color': '#FFD700',
                            },
                            duration_ms=350,
                            metadata={'physics': 'pulse_glow'}
                        )
                        self.animation_sequence.append(lookup_cmd)

                # Check for resize/rehash (significant size increase)
                if len(current_dict) > len(previous_dict) * 1.5 and len(previous_dict) > 4:
                    rehash_cmd = AnimationCommand(
                        command_type=CommandType.CLEAR,
                        values={
                            'animation': 'rehash',
                            'old_size': len(previous_dict),
                            'new_size': len(current_dict),
                        },
                        duration_ms=800,
                        metadata={'physics': 'expand_all_buckets'}
                    )
                    self.animation_sequence.append(rehash_cmd)

            previous_dict = dict(current_dict) if current_dict else {}
            self.dict_history.append(dict(current_dict) if current_dict else {})

        self.optimize_animations()
        return self.animation_sequence

    def _detect_dict_changes(self, old: Dict, new: Dict) -> List[Dict[str, Any]]:
        ops = []
        old_keys = set(old.keys())
        new_keys = set(new.keys())

        # New keys = insertions
        for key in new_keys - old_keys:
            ops.append({'op': 'insert', 'key': key, 'value': new[key]})

        # Deleted keys
        for key in old_keys - new_keys:
            ops.append({'op': 'delete', 'key': key, 'value': old[key]})

        # Updated values
        for key in old_keys & new_keys:
            if old[key] != new[key]:
                ops.append({'op': 'update', 'key': key, 'old_value': old[key], 'new_value': new[key]})

        return ops

    def _hash_to_bucket(self, key: Any) -> int:
        """Compute which visual bucket a key belongs to."""
        if self._is_hashable(key):
            return hash(key) % self.bucket_count
        return 0

    def _is_hashable(self, obj: Any) -> bool:
        try:
            hash(obj)
            return True
        except TypeError:
            return False
