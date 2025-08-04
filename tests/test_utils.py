"""
Test utilities for OpenCode Dashboard tests.
Contains helper functions for common test operations like SSE parsing.
"""

import json
from typing import List, Dict, Any, Optional


def parse_sse_chunk(chunk: str) -> List[Dict[str, Any]]:
    """
    Parse a Server-Sent Events (SSE) chunk and return list of data objects.
    
    SSE format:
    data: {"key": "value"}
    
    Args:
        chunk: Raw SSE chunk text that may contain multiple lines
        
    Returns:
        List of parsed JSON objects from data lines
        
    Example:
        >>> chunk = 'data: {"type": "update", "value": 123}\\n\\n'
        >>> parse_sse_chunk(chunk)
        [{"type": "update", "value": 123}]
    """
    data_objects = []
    
    if not chunk or not chunk.strip():
        return data_objects
    
    lines = chunk.strip().split('\n')
    for line in lines:
        if line.startswith('data: '):
            try:
                # Remove 'data: ' prefix (6 characters)
                json_data = line[6:]
                if json_data.strip():  # Only parse non-empty data
                    parsed_data = json.loads(json_data)
                    data_objects.append(parsed_data)
            except json.JSONDecodeError:
                # Skip invalid JSON lines - this is common in SSE streams
                # where some lines might be comments or malformed
                continue
    
    return data_objects


def extract_sse_data_by_type(chunk: str, event_type: str) -> List[Dict[str, Any]]:
    """
    Parse SSE chunk and return only data objects of a specific type.
    
    Args:
        chunk: Raw SSE chunk text
        event_type: The event type to filter for (e.g., "workspace_update")
        
    Returns:
        List of parsed JSON objects that match the specified type
        
    Example:
        >>> chunk = 'data: {"type": "workspace_update", "data": []}\\n'
        >>> extract_sse_data_by_type(chunk, "workspace_update")
        [{"type": "workspace_update", "data": []}]
    """
    all_data = parse_sse_chunk(chunk)
    return [data for data in all_data if data.get("type") == event_type]


def find_first_sse_data(chunk: str, event_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Parse SSE chunk and return the first data object, optionally filtered by type.
    
    Args:
        chunk: Raw SSE chunk text
        event_type: Optional event type to filter for
        
    Returns:
        First matching data object or None if not found
        
    Example:
        >>> chunk = 'data: {"type": "heartbeat"}\\ndata: {"type": "update"}\\n'
        >>> find_first_sse_data(chunk, "update")
        {"type": "update"}
    """
    if event_type:
        filtered_data = extract_sse_data_by_type(chunk, event_type)
        return filtered_data[0] if filtered_data else None
    else:
        all_data = parse_sse_chunk(chunk)
        return all_data[0] if all_data else None


def collect_sse_data_from_chunks(chunks: List[str]) -> List[Dict[str, Any]]:
    """
    Parse multiple SSE chunks and return all data objects.
    
    Args:
        chunks: List of raw SSE chunk texts
        
    Returns:
        List of all parsed JSON objects from all chunks
        
    Example:
        >>> chunks = ['data: {"id": 1}\\n', 'data: {"id": 2}\\n']
        >>> collect_sse_data_from_chunks(chunks)
        [{"id": 1}, {"id": 2}]
    """
    all_data = []
    for chunk in chunks:
        all_data.extend(parse_sse_chunk(chunk))
    return all_data


def parse_opencode_streaming_chunk(chunk: str) -> Dict[str, Any]:
    """
    Parse OpenCode-specific streaming chunks that may contain tool call deltas.
    
    OpenCode streaming format includes choices with deltas that may contain tool_calls.
    
    Args:
        chunk: Raw SSE chunk from OpenCode streaming response
        
    Returns:
        Dictionary with parsed streaming data including tool_calls and content deltas
        
    Example:
        >>> chunk = 'data: {"choices": [{"delta": {"tool_calls": [...]}}]}\\n'
        >>> result = parse_opencode_streaming_chunk(chunk)
        >>> result["tool_call_deltas"]  # List of tool call deltas
    """
    result = {
        "tool_call_deltas": [],
        "content_deltas": [],
        "raw_data": []
    }
    
    sse_data = parse_sse_chunk(chunk)
    result["raw_data"] = sse_data
    
    for data in sse_data:
        # Extract tool call deltas from OpenCode streaming format
        if "choices" in data:
            for choice in data["choices"]:
                if "delta" in choice:
                    delta = choice["delta"]
                    
                    # Collect tool call deltas
                    if "tool_calls" in delta:
                        result["tool_call_deltas"].extend(delta["tool_calls"])
                    
                    # Collect content deltas
                    if "content" in delta and delta["content"]:
                        result["content_deltas"].append(delta["content"])
    
    return result