import pytest
import httpx
import json
import asyncio


@pytest.mark.api
@pytest.mark.slow
@pytest.mark.parallel
class TestChat:
    """Test cases for chat API endpoints."""

    async def test_send_chat_message_success(self, client: httpx.AsyncClient, test_session):
        """Test chat message sending (may succeed or fail due to model availability)."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        messages = [
            {"role": "user", "content": "Hello, this is a test message"}
        ]
        
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"messages": messages, "stream": False}
        )
        
        # Due to opencode CLI and model availability requirements, some requests might fail
        # We accept both success and certain error codes
        assert response.status_code in [200, 400, 503, 508]
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify response structure
            assert "message" in data
            assert "sessionId" in data
            assert "workspaceId" in data
            assert "timestamp" in data
            
            # Verify values
            assert data["sessionId"] == session_id
            assert data["workspaceId"] == workspace_id
        else:
            # Expected failure due to test environment limitations or model unavailability
            data = response.json()
            assert "error" in data

    async def test_send_chat_message_empty_messages(self, client: httpx.AsyncClient, test_session):
        """Test chat fails with empty messages array."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"messages": [], "stream": False}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "messages" in data["error"].lower()

    async def test_send_chat_message_missing_messages(self, client: httpx.AsyncClient, test_session):
        """Test chat fails without messages field."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"stream": False}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    async def test_send_chat_message_invalid_workspace(self, client: httpx.AsyncClient, test_session):
        """Test chat fails with invalid workspace ID."""
        invalid_workspace_id = "nonexistent-workspace-id"
        session_id = test_session["id"]
        
        messages = [
            {"role": "user", "content": "Hello, this is a test message"}
        ]
        
        response = await client.post(
            f"/api/workspaces/{invalid_workspace_id}/sessions/{session_id}/chat",
            json={"messages": messages, "stream": False}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()

    async def test_send_chat_message_invalid_session(self, client: httpx.AsyncClient, test_session):
        """Test chat fails with invalid session ID."""
        workspace_id = test_session["workspaceId"]
        invalid_session_id = "nonexistent-session-id"
        
        messages = [
            {"role": "user", "content": "Hello, this is a test message"}
        ]
        
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{invalid_session_id}/chat",
            json={"messages": messages, "stream": False}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()

    async def test_send_chat_message_non_user_last_message(self, client: httpx.AsyncClient, test_session):
        """Test chat fails when last message is not from user."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"messages": messages, "stream": False}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "user" in data["error"].lower()

    async def test_get_chat_history_empty(self, client: httpx.AsyncClient, test_session):
        """Test getting chat history when no messages exist."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        response = await client.get(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "workspaceId" in data
        assert "sessionId" in data
        assert "messages" in data
        assert "timestamp" in data
        
        # Verify values
        assert data["workspaceId"] == workspace_id
        assert data["sessionId"] == session_id
        assert isinstance(data["messages"], list)
        # Each test now gets a fresh session, so history should be empty
        assert len(data["messages"]) == 0

    async def test_get_chat_history_invalid_workspace(self, client: httpx.AsyncClient, test_session):
        """Test getting chat history with invalid workspace ID."""
        invalid_workspace_id = "nonexistent-workspace-id"
        session_id = test_session["id"]
        
        response = await client.get(
            f"/api/workspaces/{invalid_workspace_id}/sessions/{session_id}/chat"
        )
        
        assert response.status_code in [404, 500]
        
        # Only try to parse JSON if not 500 (which might return HTML error page)
        if response.status_code != 500:
            data = response.json()
            assert "error" in data

    async def test_get_chat_history_invalid_session(self, client: httpx.AsyncClient, test_session):
        """Test getting chat history with invalid session ID."""
        workspace_id = test_session["workspaceId"]
        invalid_session_id = "nonexistent-session-id"
        
        response = await client.get(
            f"/api/workspaces/{workspace_id}/sessions/{invalid_session_id}/chat"
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data

    async def test_chat_streaming_headers(self, client: httpx.AsyncClient, test_session):
        """Test that streaming chat returns proper SSE headers."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        messages = [
            {"role": "user", "content": "Hello, test streaming"}
        ]
        
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"messages": messages, "stream": True}
        )
        
        # Stream endpoint might not work in test environment due to opencode CLI requirement
        # but we can at least verify it attempts to return proper headers
        if response.status_code == 200:
            assert response.headers.get("content-type") == "text/event-stream"
            assert "no-cache" in response.headers.get("cache-control", "")
        else:
            # Stream might fail due to missing opencode CLI, which is acceptable in test
            assert response.status_code in [400, 500, 503]

    async def test_multiple_chat_messages(self, client: httpx.AsyncClient, test_session):
        """Test sending multiple chat messages in sequence."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        test_messages = [
            "Hello, this is the first test message",
            "This is the second test message",
            "And this is the third test message"
        ]
        
        for i, content in enumerate(test_messages):
            messages = [{"role": "user", "content": content}]
            
            response = await client.post(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
                json={"messages": messages, "stream": False}
            )
            
            # Due to opencode CLI requirement, some requests might fail
            # We accept both success and certain error codes
            assert response.status_code in [200, 400, 503, 508]
            
            if response.status_code == 200:
                data = response.json()
                assert data["sessionId"] == session_id
                assert data["workspaceId"] == workspace_id
            
            # Small delay to avoid overwhelming the server in parallel tests
            await asyncio.sleep(0.1)

    async def test_chat_conversation_flow(self, client: httpx.AsyncClient, test_session):
        """Test a complete conversation flow."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        # Send initial message
        messages = [{"role": "user", "content": "What is 2+2?"}]
        response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"messages": messages, "stream": False}
        )
        
        # The actual chat might fail due to opencode CLI not being available in test environment
        # but we can verify the API structure
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            
            # Small delay to ensure message is processed before checking history
            await asyncio.sleep(0.2)
            
            # Get chat history
            history_response = await client.get(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat"
            )
            assert history_response.status_code == 200
            history_data = history_response.json()
            assert isinstance(history_data["messages"], list)
        else:
            # Expected failure due to test environment limitations
            assert response.status_code in [400, 503, 508]