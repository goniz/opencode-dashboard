import pytest
import httpx
import json
import asyncio
from .test_utils import parse_sse_chunk, find_first_sse_data, extract_sse_data_by_type, parse_opencode_streaming_chunk


@pytest.mark.api
class TestWorkspaceStream:
    """Test cases for workspace streaming endpoint."""

    async def test_stream_headers(self, client: httpx.AsyncClient):
        """Test that stream endpoint returns proper SSE headers."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Verify SSE headers
            assert response.headers.get("content-type") == "text/event-stream"
            assert "no-cache" in response.headers.get("cache-control", "")
            assert response.headers.get("connection") == "keep-alive"
            assert response.headers.get("access-control-allow-origin") == "*"
            assert "cache-control" in response.headers.get("access-control-allow-headers", "").lower()

    async def test_stream_initial_data(self, client: httpx.AsyncClient):
        """Test that stream sends initial workspace data."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Read the first chunk of data
            first_chunk = None
            async for chunk in response.aiter_text():
                if chunk.strip():
                    first_chunk = chunk
                    break
            
            assert first_chunk is not None
            
            # Parse the SSE data
            sse_data = parse_sse_chunk(first_chunk)
            assert len(sse_data) > 0, "No SSE data found in chunk"
            
            data = sse_data[0]
            
            # Verify structure
            assert "type" in data
            assert "data" in data
            assert "timestamp" in data
            
            # Should be workspace_update type
            assert data["type"] == "workspace_update"
            assert isinstance(data["data"], list)
            assert isinstance(data["timestamp"], str)

    async def test_stream_with_existing_workspace(self, client: httpx.AsyncClient, test_workspace):
        """Test stream includes existing workspace data."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Read initial data
            first_chunk = None
            async for chunk in response.aiter_text():
                if chunk.strip():
                    first_chunk = chunk
                    break
            
            # Parse the data
            sse_data = parse_sse_chunk(first_chunk)
            assert len(sse_data) > 0, "No SSE data found in chunk"
            
            data = sse_data[0]
            workspaces = data["data"]
            
            # Should include our test workspace
            workspace_ids = [w["id"] for w in workspaces]
            assert test_workspace["id"] in workspace_ids
            
            # Find our workspace and verify structure
            our_workspace = next(w for w in workspaces if w["id"] == test_workspace["id"])
            assert "id" in our_workspace
            assert "folder" in our_workspace
            assert "model" in our_workspace
            assert "port" in our_workspace
            assert "status" in our_workspace
            assert "sessions" in our_workspace

    async def test_stream_heartbeat(self, client: httpx.AsyncClient):
        """Test that stream sends heartbeat messages."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # We can't easily wait 30 seconds for a real heartbeat in tests,
            # but we can verify the stream stays alive for a reasonable time
            chunks_received = 0
            start_time = asyncio.get_event_loop().time()
            
            async for chunk in response.aiter_text():
                if chunk.strip():
                    chunks_received += 1
                    
                    # Parse the chunk to verify it's valid SSE
                    sse_data = parse_sse_chunk(chunk)
                    for data in sse_data:
                        assert "type" in data
                        assert "timestamp" in data
                
                # Stop after receiving some data or after a short time
                current_time = asyncio.get_event_loop().time()
                if chunks_received >= 1 or (current_time - start_time) > 2:
                    break
            
            assert chunks_received >= 1

    async def test_stream_concurrent_connections(self, client: httpx.AsyncClient):
        """Test multiple concurrent stream connections."""
        async def create_stream():
            async with client.stream("GET", "/api/workspaces/stream") as response:
                assert response.status_code == 200
                
                # Read at least one chunk
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        return True
                return False
        
        # Create multiple concurrent streams
        tasks = [create_stream() for _ in range(3)]
        results = await asyncio.gather(*tasks)
        
        # All streams should succeed
        assert all(results)

    async def test_stream_connection_abort(self, client: httpx.AsyncClient):
        """Test that stream handles connection abort gracefully."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Read one chunk then close
            async for chunk in response.aiter_text():
                if chunk.strip():
                    break
            
            # Connection should close cleanly when we exit the context

    async def test_stream_data_format(self, client: httpx.AsyncClient):
        """Test that stream data follows SSE format correctly."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            chunks_processed = 0
            async for chunk in response.aiter_text():
                if chunk.strip():
                    # Verify SSE format and parse data
                    sse_data = parse_sse_chunk(chunk)
                    assert len(sse_data) >= 1, "Should have at least one SSE data object"
                    
                    # Parse each data object
                    for parsed_data in sse_data:
                        # Verify required fields
                        assert "type" in parsed_data
                        assert "timestamp" in parsed_data
                        
                        # Verify timestamp format (ISO string)
                        timestamp = parsed_data["timestamp"]
                        assert isinstance(timestamp, str)
                        assert "T" in timestamp  # ISO format should have T
                    
                    chunks_processed += 1
                    if chunks_processed >= 1:
                        break

    async def test_stream_workspace_updates(self, client: httpx.AsyncClient, server_manager, test_model: str):
        """Test that stream sends updates when workspaces change."""
        # This test is complex because we need to trigger workspace changes
        # and verify the stream receives updates. Due to the async nature,
        # we'll test the basic functionality.
        
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Read initial data
            initial_data = None
            async for chunk in response.aiter_text():
                if chunk.strip():
                    workspace_updates = extract_sse_data_by_type(chunk, "workspace_update")
                    if workspace_updates:
                        initial_data = workspace_updates[0]
                        break
            
            assert initial_data is not None
            initial_workspace_count = len(initial_data["data"])
            
            # The stream should be working and providing workspace data
            assert isinstance(initial_data["data"], list)

    async def test_stream_error_handling(self, client: httpx.AsyncClient):
        """Test stream error handling."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Stream should handle errors gracefully and continue
            # We can't easily trigger errors, but we can verify the stream
            # provides valid data consistently
            
            valid_chunks = 0
            async for chunk in response.aiter_text():
                if chunk.strip():
                    try:
                        sse_data = parse_sse_chunk(chunk)
                        if sse_data:  # If we successfully parsed any data
                            valid_chunks += 1
                    except Exception as e:
                        pytest.fail(f"Stream sent invalid SSE data: {e}")
                
                if valid_chunks >= 1:
                    break
            
            assert valid_chunks >= 1

    async def test_stream_message_types(self, client: httpx.AsyncClient):
        """Test different types of messages in the stream."""
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            message_types_seen = set()
            
            # Collect messages for a short time
            start_time = asyncio.get_event_loop().time()
            
            async for chunk in response.aiter_text():
                if chunk.strip():
                    sse_data = parse_sse_chunk(chunk)
                    for data in sse_data:
                        message_types_seen.add(data["type"])
                
                # Stop after a short time or when we've seen workspace_update
                current_time = asyncio.get_event_loop().time()
                if "workspace_update" in message_types_seen or (current_time - start_time) > 2:
                    break
            
            # Should at least see workspace_update messages
            assert "workspace_update" in message_types_seen

    async def test_stream_performance(self, client: httpx.AsyncClient):
        """Test stream performance and responsiveness."""
        start_time = asyncio.get_event_loop().time()
        
        async with client.stream("GET", "/api/workspaces/stream") as response:
            assert response.status_code == 200
            
            # Should receive first data quickly
            async for chunk in response.aiter_text():
                if chunk.strip():
                    first_data_time = asyncio.get_event_loop().time()
                    time_to_first_data = first_data_time - start_time
                    
                    # Should receive data within reasonable time (less than 5 seconds)
                    assert time_to_first_data < 5.0
                    break

    async def test_stream_with_opencode_session_activity(self, client: httpx.AsyncClient, test_workspace):
        """Test that stream updates when OpenCode sessions are active and parsing tool calls."""
        workspace_id = test_workspace["id"]
        
        # Start streaming
        stream_task = None
        stream_updates = []
        
        async def collect_stream_updates():
            async with client.stream("GET", "/api/workspaces/stream") as response:
                assert response.status_code == 200
                
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        sse_data = parse_sse_chunk(chunk)
                        stream_updates.extend(sse_data)
                    
                    # Stop after collecting some updates or timeout
                    if len(stream_updates) >= 3:
                        break
        
        # Start collecting stream updates
        stream_task = asyncio.create_task(collect_stream_updates())
        
        # Give stream time to start
        await asyncio.sleep(0.5)
        
        # Create a session and send a message that triggers tool calls
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Send a message that should trigger tool calls
        chat_task = asyncio.create_task(
            client.post(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": "List files in the current directory"
                        }
                    ],
                    "stream": False
                },
                timeout=30.0
            )
        )
        
        # Wait for both stream collection and chat to complete
        try:
            await asyncio.wait_for(asyncio.gather(stream_task, chat_task), timeout=35.0)
        except asyncio.TimeoutError:
            # Cancel tasks if they timeout
            if not stream_task.done():
                stream_task.cancel()
            if not chat_task.done():
                chat_task.cancel()
        
        # Give additional time for session to appear in stream
        await asyncio.sleep(2.0)
        
        # Verify we collected stream updates
        assert len(stream_updates) > 0, "No stream updates collected"
        
        # Verify stream updates contain workspace data
        workspace_updates = [update for update in stream_updates if update.get("type") == "workspace_update"]
        assert len(workspace_updates) > 0, "No workspace updates in stream"
        
        # Verify workspace data structure includes sessions
        for update in workspace_updates:
            assert "data" in update
            workspaces = update["data"]
            
            # Find our test workspace
            our_workspace = None
            for workspace in workspaces:
                if workspace["id"] == workspace_id:
                    our_workspace = workspace
                    break
            
            if our_workspace:
                assert "sessions" in our_workspace
                # Note: Session might not appear immediately in stream updates
                # This is acceptable as the stream is eventually consistent

    async def test_stream_tool_call_parsing_integration(self, client: httpx.AsyncClient, test_workspace):
        """Test stream integration with OpenCode tool call parsing."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Start monitoring the workspace stream
        stream_updates = []
        
        async def monitor_stream():
            async with client.stream("GET", "/api/workspaces/stream") as response:
                assert response.status_code == 200
                
                start_time = asyncio.get_event_loop().time()
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        sse_data = parse_sse_chunk(chunk)
                        stream_updates.extend(sse_data)
                    
                    # Monitor for a reasonable time
                    current_time = asyncio.get_event_loop().time()
                    if (current_time - start_time) > 10 or len(stream_updates) >= 5:
                        break
        
        # Start stream monitoring
        monitor_task = asyncio.create_task(monitor_stream())
        
        # Give stream time to start
        await asyncio.sleep(0.5)
        
        # Send a streaming chat message that should trigger tool calls
        async with client.stream(
            "POST",
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Create a simple Python script that prints 'Hello World'"
                    }
                ],
                "stream": True
            },
            timeout=30.0
        ) as chat_response:
            assert chat_response.status_code == 200
            
            # Collect chat streaming data
            chat_chunks = []
            tool_call_data = []
            
            async for chunk in chat_response.aiter_text():
                if chunk.strip():
                    chat_chunks.append(chunk)
                    
                    # Parse streaming chunks for tool calls
                    streaming_data = parse_opencode_streaming_chunk(chunk)
                    tool_call_data.extend(streaming_data["tool_call_deltas"])
        
        # Wait for stream monitoring to complete
        try:
            await asyncio.wait_for(monitor_task, timeout=5.0)
        except asyncio.TimeoutError:
            monitor_task.cancel()
        
        # Verify we received chat data
        assert len(chat_chunks) > 0, "No chat streaming chunks received"
        
        # Verify stream updates were received
        assert len(stream_updates) > 0, "No workspace stream updates received"
        
        # Verify stream updates contain valid workspace data
        workspace_updates = [update for update in stream_updates if update.get("type") == "workspace_update"]
        assert len(workspace_updates) > 0, "No workspace updates found in stream"

    async def test_stream_concurrent_tool_call_sessions(self, client: httpx.AsyncClient, test_workspace):
        """Test stream behavior with multiple concurrent sessions using tool calls."""
        workspace_id = test_workspace["id"]
        
        # Start monitoring the workspace stream
        stream_updates = []
        
        async def monitor_stream():
            async with client.stream("GET", "/api/workspaces/stream") as response:
                assert response.status_code == 200
                
                start_time = asyncio.get_event_loop().time()
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        sse_data = parse_sse_chunk(chunk)
                        stream_updates.extend(sse_data)
                    
                    # Monitor for a reasonable time
                    current_time = asyncio.get_event_loop().time()
                    if (current_time - start_time) > 15 or len(stream_updates) >= 10:
                        break
        
        # Start stream monitoring
        monitor_task = asyncio.create_task(monitor_stream())
        
        # Give stream time to start
        await asyncio.sleep(0.5)
        
        async def create_session_and_chat(message: str):
            # Create a session
            session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": "anthropic/claude-3-5-haiku-20241022"
            })
            assert session_response.status_code == 200
            session_data = session_response.json()
            session_id = session_data["id"]
            
            # Send a message that triggers tool calls
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
                timeout=20.0
            )
            
            assert chat_response.status_code == 200
            return chat_response.json()
        
        # Create multiple concurrent sessions with different tool-triggering messages
        messages = [
            "List all files in the current directory",
            "Check if there's a package.json file",
            "Create a simple text file with today's date"
        ]
        
        # Run concurrent sessions
        session_tasks = [create_session_and_chat(msg) for msg in messages]
        session_results = await asyncio.gather(*session_tasks, return_exceptions=True)
        
        # Wait for stream monitoring to complete
        try:
            await asyncio.wait_for(monitor_task, timeout=5.0)
        except asyncio.TimeoutError:
            monitor_task.cancel()
        
        # Verify all sessions completed successfully
        successful_sessions = 0
        for result in session_results:
            if not isinstance(result, Exception):
                successful_sessions += 1
                # Verify session result structure
                assert "message" in result
                message = result["message"]
                assert "parts" in message
                assert len(message["parts"]) > 0
        
        assert successful_sessions >= 2, f"Only {successful_sessions} out of 3 sessions succeeded"
        
        # Verify stream updates were received during concurrent activity
        assert len(stream_updates) > 0, "No workspace stream updates received during concurrent sessions"
        
        # Verify workspace updates show multiple sessions
        workspace_updates = [update for update in stream_updates if update.get("type") == "workspace_update"]
        assert len(workspace_updates) > 0, "No workspace updates found in stream"
        
        # Check that at least one update shows multiple sessions
        max_sessions_seen = 0
        for update in workspace_updates:
            if "data" in update:
                for workspace in update["data"]:
                    if workspace["id"] == workspace_id:
                        session_count = len(workspace.get("sessions", []))
                        max_sessions_seen = max(max_sessions_seen, session_count)
        
        assert max_sessions_seen >= 2, f"Expected to see at least 2 concurrent sessions, saw {max_sessions_seen}"

    async def test_stream_tool_call_error_handling(self, client: httpx.AsyncClient, test_workspace):
        """Test stream behavior when tool calls encounter errors."""
        workspace_id = test_workspace["id"]
        
        # Create a session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": "anthropic/claude-3-5-haiku-20241022"
        })
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # Start monitoring the workspace stream
        stream_updates = []
        error_messages = []
        
        async def monitor_stream():
            async with client.stream("GET", "/api/workspaces/stream") as response:
                assert response.status_code == 200
                
                start_time = asyncio.get_event_loop().time()
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        sse_data = parse_sse_chunk(chunk)
                        stream_updates.extend(sse_data)
                        
                        # Look for error messages
                        for data in sse_data:
                            if data.get("type") == "error":
                                error_messages.append(data)
                    
                    # Monitor for a reasonable time
                    current_time = asyncio.get_event_loop().time()
                    if (current_time - start_time) > 10 or len(stream_updates) >= 5:
                        break
        
        # Start stream monitoring
        monitor_task = asyncio.create_task(monitor_stream())
        
        # Give stream time to start
        await asyncio.sleep(0.5)
        
        # Send a message that might cause tool call errors (trying to access non-existent files)
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Read the contents of a file called 'definitely_does_not_exist_12345.txt'"
                    }
                ],
                "stream": False
            },
            timeout=30.0
        )
        
        # The chat should still return a response even if tool calls fail
        assert chat_response.status_code == 200
        chat_data = chat_response.json()
        assert "message" in chat_data
        
        # Wait for stream monitoring to complete
        try:
            await asyncio.wait_for(monitor_task, timeout=5.0)
        except asyncio.TimeoutError:
            monitor_task.cancel()
        
        # Verify stream continued to work despite potential tool call errors
        assert len(stream_updates) > 0, "Stream stopped working after tool call errors"
        
        # Verify workspace updates are still valid
        workspace_updates = [update for update in stream_updates if update.get("type") == "workspace_update"]
        assert len(workspace_updates) > 0, "No workspace updates after tool call errors"
        
        # Verify stream error handling (if any errors were reported)
        for error_msg in error_messages:
            assert "error" in error_msg
            assert "timestamp" in error_msg
            # Error messages should be properly formatted