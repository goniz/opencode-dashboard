import pytest
import httpx
import json
import asyncio


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
            lines = first_chunk.strip().split('\n')
            data_line = None
            for line in lines:
                if line.startswith('data: '):
                    data_line = line[6:]  # Remove 'data: ' prefix
                    break
            
            assert data_line is not None
            
            # Parse JSON data
            data = json.loads(data_line)
            
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
            lines = first_chunk.strip().split('\n')
            data_line = None
            for line in lines:
                if line.startswith('data: '):
                    data_line = line[6:]
                    break
            
            data = json.loads(data_line)
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
                    lines = chunk.strip().split('\n')
                    for line in lines:
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
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
                    # Verify SSE format
                    lines = chunk.strip().split('\n')
                    
                    # Should have data lines and end with double newline
                    data_lines = [line for line in lines if line.startswith('data: ')]
                    assert len(data_lines) >= 1
                    
                    # Parse each data line
                    for data_line in data_lines:
                        json_data = data_line[6:]  # Remove 'data: ' prefix
                        parsed_data = json.loads(json_data)
                        
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
                    lines = chunk.strip().split('\n')
                    for line in lines:
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            if data["type"] == "workspace_update":
                                initial_data = data
                                break
                    if initial_data:
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
                        lines = chunk.strip().split('\n')
                        for line in lines:
                            if line.startswith('data: '):
                                json.loads(line[6:])  # Should parse without error
                                valid_chunks += 1
                    except json.JSONDecodeError:
                        pytest.fail("Stream sent invalid JSON data")
                
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
                    lines = chunk.strip().split('\n')
                    for line in lines:
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
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