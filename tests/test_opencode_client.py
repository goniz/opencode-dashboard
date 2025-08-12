import pytest
import httpx
import json
import asyncio
import os
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any, List
from .test_utils import parse_opencode_streaming_chunk


@pytest.mark.api
class TestOpenCodeClient:
    """Test cases for OpenCode client integration and tool call parsing."""

    async def test_opencode_client_session_creation(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test creating a session through OpenCode client and verifying tool call parsing."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        
        assert response.status_code == 200
        session_data = response.json()
        session_id = session_data["id"]
        
        # Verify session structure
        assert "id" in session_data
        assert "model" in session_data
        assert session_data["model"] == test_model

    @pytest.mark.skip(reason="Flaky test due to model variability in tool call generation")
    async def test_opencode_chat_with_tool_calls(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test sending a message that triggers tool calls and verify parsing."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
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
                        "content": "List the files in the current directory and tell me what you find"
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
        
        # Look for tool calls in the parts
        tool_calls_found = False
        tool_results_found = False
        
        for part in parts:
            assert "type" in part
            
            # Check for tool parts (tool calls and results)
            if part["type"] == "tool":
                tool_calls_found = True
                assert "tool" in part
                assert "callID" in part
                assert "state" in part
                
                # Verify tool state structure
                state = part["state"]
                assert "status" in state
                assert "input" in state
                
                # If completed, should have output
                if state["status"] == "completed":
                    tool_results_found = True
                    assert "output" in state
        
        # We should have found at least one tool call for a directory listing request
        assert tool_calls_found, "No tool calls found in response"
        assert tool_results_found, "No tool results found in response"

    @pytest.mark.skip(reason="Flaky test due to model variability in tool call generation")
    async def test_opencode_streaming_with_tool_calls(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test streaming chat with tool calls and verify parsing."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a streaming message that should trigger tool calls
        async with client.stream(
            "POST",
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Check if there are any Python files in the current directory"
                    }
                ],
                "stream": True
            },
            timeout=180.0
        ) as response:
            assert response.status_code == 200
            
            chunks = []
            tool_call_chunks = []
            tool_result_chunks = []
            
            async for chunk in response.aiter_text():
                if chunk.strip():
                    chunks.append(chunk)
                    
                    # Parse streaming chunks
                    streaming_data = parse_opencode_streaming_chunk(chunk)
                    tool_call_chunks.extend(streaming_data["tool_call_deltas"])
                    
                    # Check for content that might be tool results
                    for content in streaming_data["content_deltas"]:
                        if "tool_call_id" in str(content):
                            tool_result_chunks.append(content)
            
            assert len(chunks) > 0, "No streaming chunks received"
            
            # Verify we received some tool-related content
            # Note: The exact structure depends on the OpenCode SDK streaming format
            # We're mainly testing that the parsing doesn't break and we get valid JSON

    async def test_opencode_error_handling(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test error handling in OpenCode client operations."""
        workspace_id = test_workspace["id"]
        
        # Test with invalid session ID
        invalid_session_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/invalid-session-id/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Test message"
                    }
                ],
                "stream": False
            }
        )
        
        # Should handle the error gracefully
        assert invalid_session_response.status_code in [400, 404, 500]
        
        # Test with malformed request
        malformed_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions",
            json={
                "invalid_field": "invalid_value"
            }
        )
        
        # Should handle malformed requests
        assert malformed_response.status_code in [400, 422, 500]

    @pytest.mark.skip(reason="Flaky test due to model variability in tool call generation")
    async def test_tool_call_argument_parsing(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test that tool call arguments are properly parsed and validated."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should trigger specific tool calls with complex arguments
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Create a new file called 'test.py' with some Python code that prints hello world"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        
        # Verify response structure and tool call parsing
        assert "message" in chat_data
        message = chat_data["message"]
        assert "parts" in message
        parts = message["parts"]
        
        tool_calls_with_complex_args = []
        
        for part in parts:
            if part["type"] == "tool" and "tool" in part:
                tool_name = part["tool"]
                
                # Verify tool call structure
                assert "callID" in part
                assert "state" in part
                
                state = part["state"]
                if "input" in state:
                    args = state["input"]
                    tool_calls_with_complex_args.append({
                        "name": tool_name,
                        "args": args
                    })
                    
                    # Verify arguments are properly structured
                    assert isinstance(args, dict), f"Arguments should be a dict, got {type(args)}"
                    
                    # For file creation tools, verify expected argument structure
                    if tool_name in ["write", "create_file", "write_file", "edit"]:
                        # Should have file path and content arguments
                        assert any(key in args for key in ["filePath", "path", "file_path", "filename"]), \
                            f"No file path in arguments: {args}"
                        assert any(key in args for key in ["content", "contents", "data"]), \
                            f"No content in arguments: {args}"
                    # For other tools, just verify they have some arguments
                    elif args:
                        assert isinstance(args, dict), f"Tool arguments should be a dict: {args}"
        
        # We should have found at least one tool call (may not be file creation)
        if len(tool_calls_with_complex_args) == 0:
            # If no complex args found, at least verify we have some tool calls
            all_tool_calls = []
            for part in parts:
                if part["type"] == "tool":
                    all_tool_calls.append(part)
            assert len(all_tool_calls) > 0, "No tool calls found at all"
        else:
            assert len(tool_calls_with_complex_args) > 0, "No tool calls with complex arguments found"

    @pytest.mark.skip(reason="Flaky test due to model variability in tool call generation")
    async def test_concurrent_opencode_sessions(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test multiple concurrent OpenCode sessions and tool call parsing."""
        workspace_id = test_workspace["id"]
        
        async def create_session_and_chat():
            # Create a session
            session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": test_model
            })
            assert session_response.status_code == 200
            session_data = session_response.json()
            session_id = session_data["id"]
            
            # Send a message
            chat_response = await client.post(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": "What files are in the current directory?"
                        }
                    ],
                    "stream": False
                },
                timeout=180.0
            )
            
            assert chat_response.status_code == 200
            return chat_response.json()
        
        # Create multiple concurrent sessions
        tasks = [create_session_and_chat() for _ in range(3)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all sessions succeeded
        successful_results = []
        for result in results:
            if isinstance(result, Exception):
                pytest.fail(f"Concurrent session failed: {result}")
            else:
                successful_results.append(result)
        
        assert len(successful_results) == 3
        
        # Verify each result has proper structure
        for result in successful_results:
            assert "message" in result
            message = result["message"]
            assert "parts" in message
            assert len(message["parts"]) > 0

    @pytest.mark.skip(reason="Flaky test due to model variability in tool call generation")
    async def test_tool_call_result_parsing(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test that tool call results are properly parsed and structured."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should trigger tool calls and results
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "List all files in the current directory and show me the content of any README file"
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
        
        tool_call_ids = set()
        tool_result_ids = set()
        
        for part in parts:
            # Collect tool call IDs and results
            if part["type"] == "tool":
                assert "callID" in part
                call_id = part["callID"]
                tool_call_ids.add(call_id)
                
                # Check if tool has completed with results
                if "state" in part and part["state"].get("status") == "completed":
                    tool_result_ids.add(call_id)
                    assert "output" in part["state"], "Completed tool should have output"
                    assert part["state"]["output"], "Tool result output should not be empty"
        
        # Verify that we found tool calls and results
        if tool_call_ids:
            assert len(tool_result_ids) > 0, "No tool results found despite tool calls"

    @pytest.mark.skip(reason="Flaky test due to model variability in tool call generation")
    async def test_opencode_session_persistence(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test that OpenCode sessions maintain state across multiple messages."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send first message
        first_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Create a file called 'session_test.txt' with the content 'Hello from session'"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        assert first_response.status_code == 200
        
        # Send second message that references the first
        second_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Now read the content of the file you just created"
                    }
                ],
                "stream": False
            },
            timeout=180.0
        )
        
        assert second_response.status_code == 200
        second_data = second_response.json()
        
        # Verify the session maintained context
        assert "message" in second_data
        message = second_data["message"]
        assert "parts" in message
        parts = message["parts"]
        
        # Should have multiple parts from the interaction
        assert len(parts) > 1, "Session should have multiple interaction parts"
        
        # Look for evidence that the second message understood the context
        found_file_reference = False
        for part in parts:
            if part["type"] == "text" and "text" in part:
                content = str(part["text"]).lower()
                if "session_test.txt" in content or "hello from session" in content:
                    found_file_reference = True
                    break
            elif part["type"] == "tool" and "state" in part and "output" in part["state"]:
                output = str(part["state"]["output"]).lower()
                if "session_test.txt" in output or "hello from session" in output:
                    found_file_reference = True
                    break
        
        # The assistant should reference the file created in the first message
        assert found_file_reference, "Session did not maintain context between messages"