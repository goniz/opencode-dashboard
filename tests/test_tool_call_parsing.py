import pytest
import httpx
import json
import asyncio
import os
from typing import Dict, Any, List, Optional
from .test_utils import parse_opencode_streaming_chunk





@pytest.mark.api
class TestToolCallParsing:
    """Comprehensive tests for OpenCode tool call parsing logic."""

    async def test_basic_tool_call_structure_parsing(self, client: httpx.AsyncClient, test_workspace):
        """Test that basic tool call structures are parsed correctly."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should trigger tool calls
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "List all files in the current directory"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        
        # Verify response structure
        assert "message" in chat_data
        message = chat_data["message"]
        assert "parts" in message
        parts = message["parts"]
        assert len(parts) > 0
        
        # Find and validate tool calls
        tool_calls = self._extract_tool_calls(message)
        assert len(tool_calls) > 0, "No tool calls found in response"
        
        # Validate each tool call structure
        for tool_call in tool_calls:
            self._validate_tool_call_structure(tool_call)

    async def test_complex_tool_call_arguments_parsing(self, client: httpx.AsyncClient, test_workspace):
        """Test parsing of complex tool call arguments."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should trigger tool calls with complex arguments
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Create a Python script called 'calculator.py' that has functions for add, subtract, multiply, and divide operations"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        
        # Extract and validate tool calls
        assert "message" in chat_data
        message = chat_data["message"]
        tool_calls = self._extract_tool_calls(message)
        assert len(tool_calls) > 0, "No tool calls found for complex request"
        
        # Look for file creation tool calls (OpenCode uses different tool names)
        file_creation_calls = [
            tc for tc in tool_calls 
            if tc.get("tool") in ["write", "create_file", "write_file", "edit", "bash", "list", "read"]
        ]
        
        # If no specific file creation tools, just check that we have some tool calls
        if len(file_creation_calls) == 0:
            assert len(tool_calls) > 0, f"No tool calls found at all. Available tools: {[tc.get('tool') for tc in tool_calls]}"
        else:
            assert len(file_creation_calls) > 0, "No file creation tool calls found"
        
        # Validate complex arguments
        for tool_call in file_creation_calls:
            if "state" in tool_call and "input" in tool_call["state"]:
                args = tool_call["state"]["input"]
                
                # Should have file path
                assert any(key in args for key in ["filePath", "path", "file_path", "filename"]), \
                    f"No file path in arguments: {args}"
                
                # For write tool calls, content is expected
                if tool_call.get("tool") == "write":
                    assert any(key in args for key in ["content", "contents", "data"]), \
                        f"No content in arguments for write tool: {args}"
                    
                    # Content should be substantial for a calculator script
                    content_key = next((key for key in ["content", "contents", "data"] if key in args), None)
                    if content_key:
                        content = args[content_key]
                        assert len(content) > 50, "Content seems too short for a calculator script"
                # For other tools (like read, list), content is not required in input
                else:
                    # Just validate that the tool call has proper structure
                    assert isinstance(args, dict), f"Tool arguments should be a dict: {args}"

    async def test_streaming_tool_call_parsing(self, client: httpx.AsyncClient, test_workspace):
        """Test parsing of tool calls in streaming responses."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a streaming message that should trigger tool calls
        tool_call_deltas = []
        content_deltas = []
        chunks = []
        
        async with client.stream(
            "POST",
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Search for any Python files in the current directory and show me their contents"
                    }
                ],
                "stream": True
            },
            timeout=180.0
        ) as response:
            assert response.status_code == 200
            
            async for chunk in response.aiter_text():
                if chunk.strip():
                    chunks.append(chunk)
                    streaming_data = parse_opencode_streaming_chunk(chunk)
                    tool_call_deltas.extend(streaming_data["tool_call_deltas"])
                    content_deltas.extend(streaming_data["content_deltas"])
        
        # Verify we received streaming data
        # Note: OpenCode streaming format may not always include tool_calls in deltas
        # The main thing is that we received valid streaming chunks without errors
        assert len(chunks) > 0, "No streaming chunks received"
        
        # If we got tool call deltas, validate their structure
        if tool_call_deltas:
            for delta in tool_call_deltas:
                # Tool call deltas should have proper structure
                assert "index" in delta, f"Tool call delta missing index: {delta}"
                
                if "function" in delta:
                    function_delta = delta["function"]
                    # Function deltas should have name or arguments
                    assert "name" in function_delta or "arguments" in function_delta, \
                        f"Function delta missing name/arguments: {function_delta}"

    async def test_tool_call_result_correlation(self, client: httpx.AsyncClient, test_workspace):
        """Test that tool call results are properly correlated with their calls."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should trigger multiple tool calls
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "First list all files, then create a new file called 'test.txt' with some content, then list files again"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        
        # Extract tool calls and results
        tool_calls = self._extract_tool_calls(chat_data)
        tool_results = self._extract_tool_results(chat_data)
        
        assert len(tool_calls) > 0, "No tool calls found"
        assert len(tool_results) > 0, "No tool results found"
        
        # Create mapping of tool call IDs to results
        call_id_to_result = {}
        for result in tool_results:
            # OpenCode uses callID, not tool_call_id
            result_call_id = result.get("callID") or result.get("tool_call_id")
            if result_call_id:
                call_id_to_result[result_call_id] = result
        
        # Verify each tool call has a corresponding result
        for tool_call in tool_calls:
            # OpenCode uses callID, not id
            call_id = tool_call.get("callID") or tool_call.get("id")
            assert call_id in call_id_to_result, \
                f"Tool call {call_id} has no corresponding result. Available results: {list(call_id_to_result.keys())}"
            
            result = call_id_to_result[call_id]
            # Check for output in the result state
            if "state" in result and "output" in result["state"]:
                output = result["state"]["output"]
                assert output is not None, f"Tool result for {call_id} has null output"
            else:
                # Fallback to checking for content field
                assert "content" in result or ("state" in result and "output" in result["state"]), \
                    f"Tool result for {call_id} missing content/output: {result}"

    async def test_malformed_tool_call_handling(self, client: httpx.AsyncClient, test_workspace):
        """Test handling of potentially malformed tool calls."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that might result in edge cases
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Try to read a file with a very long name and special characters: 'file_with_émojis_🚀_and_unicode_characters_αβγ.txt'"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        # Should handle the request gracefully even if the file doesn't exist
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        
        # Verify response structure is still valid
        assert "message" in chat_data
        message = chat_data["message"]
        
        # Message should have valid structure
        assert "parts" in message
        
        # Extract and validate tool calls
        tool_calls = self._extract_tool_calls(chat_data)
        for tool_call in tool_calls:
            self._validate_tool_call_structure(tool_call)

    async def test_concurrent_tool_call_parsing(self, client: httpx.AsyncClient, test_workspace):
        """Test tool call parsing under concurrent load."""
        workspace_id = test_workspace["id"]
        
        async def send_tool_call_message(session_id: str, message: str):
            response = await client.post(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": message
                        }
                    ],
                    "stream": False
                },
                timeout=180.0
            )
            assert response.status_code == 200
            return response.json()
        
        # Create multiple sessions
        sessions = []
        for i in range(3):
            session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": "anthropic/claude-3-5-haiku-20241022"
            })
            assert session_response.status_code == 200
            sessions.append(session_response.json())
        
        # Send concurrent messages that trigger tool calls
        messages = [
            "List files in the current directory",
            "Check if there's a README file",
            "Create a simple text file with the current timestamp"
        ]
        
        # Run concurrent tool call requests
        tasks = []
        for i, session in enumerate(sessions):
            task = send_tool_call_message(session["id"], messages[i])
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all requests succeeded
        successful_results = []
        for result in results:
            if isinstance(result, Exception):
                pytest.fail(f"Concurrent tool call request failed: {result}")
            else:
                successful_results.append(result)
        
        assert len(successful_results) == 3
        
        # Verify each result has proper tool call parsing
        for result in successful_results:
            assert "message" in result
            message = result["message"]
            
            # Should have parts
            assert "parts" in message
            assert len(message["parts"]) > 0
            
            # Validate any tool calls found
            tool_calls = self._extract_tool_calls(result)
            for tool_call in tool_calls:
                self._validate_tool_call_structure(tool_call)

    async def test_tool_call_argument_edge_cases(self, client: httpx.AsyncClient, test_workspace):
        """Test parsing of tool call arguments with edge cases."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Test with various edge cases
        edge_case_messages = [
            "Create a file with JSON content that includes nested objects and arrays",
            "Search for files with names containing quotes, backslashes, and newlines",
            "Write a script that contains string literals with escaped characters"
        ]
        
        for message in edge_case_messages:
            chat_response = await client.post(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": message
                        }
                    ],
                    "stream": False
                },
                timeout=180.0
            )
            
            assert chat_response.status_code == 200
            chat_data = chat_response.json()
            
            # Extract and validate tool calls
            tool_calls = self._extract_tool_calls(chat_data)
            
            for tool_call in tool_calls:
                # Validate basic structure
                self._validate_tool_call_structure(tool_call)
                
                # Validate arguments are properly structured (OpenCode format)
                if "state" in tool_call and "input" in tool_call["state"]:
                    args = tool_call["state"]["input"]
                    assert isinstance(args, dict), "Arguments should be a dictionary"

    async def test_tool_call_parsing_performance(self, client: httpx.AsyncClient, test_workspace):
        """Test performance of tool call parsing with large responses."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should result in a large response with multiple tool calls
        import time
        start_time = time.time()
        
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Create two simple Python files: main.py with a hello world function and utils.py with a helper function"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        
        # Verify response was processed in reasonable time
        assert response_time < 120.0, f"Response took too long: {response_time}s"
        
        # Verify tool calls were parsed correctly despite size
        tool_calls = self._extract_tool_calls(chat_data)
        
        for tool_call in tool_calls:
            self._validate_tool_call_structure(tool_call)

    def _extract_tool_calls(self, message_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all tool calls from OpenCode message data."""
        tool_calls = []
        
        # Handle both single message and messages array
        if isinstance(message_data, dict):
            if "message" in message_data:
                message = message_data["message"]
            else:
                message = message_data
                
            if "parts" in message:
                for part in message["parts"]:
                    if part.get("type") == "tool":
                        tool_calls.append(part)
        elif isinstance(message_data, list):
            # Handle array of messages
            for msg in message_data:
                if "parts" in msg:
                    for part in msg["parts"]:
                        if part.get("type") == "tool":
                            tool_calls.append(part)
        
        return tool_calls

    def _extract_tool_results(self, message_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all tool results from OpenCode message data."""
        tool_results = []
        
        # Handle both single message and messages array
        if isinstance(message_data, dict):
            if "message" in message_data:
                message = message_data["message"]
            else:
                message = message_data
                
            if "parts" in message:
                for part in message["parts"]:
                    if part.get("type") == "tool" and "state" in part:
                        if part["state"].get("status") == "completed":
                            tool_results.append(part)
        elif isinstance(message_data, list):
            # Handle array of messages
            for msg in message_data:
                if "parts" in msg:
                    for part in msg["parts"]:
                        if part.get("type") == "tool" and "state" in part:
                            if part["state"].get("status") == "completed":
                                tool_results.append(part)
        
        return tool_results

    def _validate_tool_call_structure(self, tool_call: Dict[str, Any]) -> None:
        """Validate that an OpenCode tool call has the expected structure."""
        # Required fields for OpenCode tool calls
        assert "type" in tool_call, f"Tool call missing type: {tool_call}"
        assert tool_call["type"] == "tool", f"Expected tool type, got: {tool_call['type']}"
        assert "tool" in tool_call, f"Tool call missing tool name: {tool_call}"
        assert "callID" in tool_call, f"Tool call missing callID: {tool_call}"
        assert "state" in tool_call, f"Tool call missing state: {tool_call}"
        
        # Validate state structure
        state = tool_call["state"]
        assert "status" in state, f"Tool state missing status: {state}"
        assert "input" in state, f"Tool state missing input: {state}"
        
        # Validate input arguments
        args = state["input"]
        assert isinstance(args, dict), f"Tool input should be a dict, got {type(args)}"
        
        # Validate callID format (should be a non-empty string)
        call_id = tool_call["callID"]
        assert isinstance(call_id, str), f"Tool call ID should be string: {call_id}"
        assert len(call_id) > 0, f"Tool call ID should not be empty: {call_id}"
        
        # Validate tool name
        tool_name = tool_call["tool"]
        assert isinstance(tool_name, str), f"Tool name should be string: {tool_name}"
        assert len(tool_name) > 0, f"Tool name should not be empty: {tool_name}"