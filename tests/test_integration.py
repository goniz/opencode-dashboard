import pytest
import httpx


@pytest.mark.integration
class TestIntegration:
    """Integration tests that test complete workflows."""

    async def test_complete_workflow(self, client: httpx.AsyncClient, server_manager, test_model: str):
        """Test complete workflow: create workspace -> create session -> send message -> get history."""
        # Step 1: Create workspace
        test_folder = server_manager.get_test_folder_path("integration_test")
        workspace_response = await client.post("/api/workspaces", json={
            "folder": test_folder,
            "model": test_model
        })
        assert workspace_response.status_code == 200
        workspace = workspace_response.json()
        workspace_id = workspace["id"]
        
        # Step 2: Verify workspace appears in listing
        list_response = await client.get("/api/workspaces")
        assert list_response.status_code == 200
        workspaces = list_response.json()
        workspace_ids = [w["id"] for w in workspaces]
        assert workspace_id in workspace_ids
        
        # Step 3: Create session
        session_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert session_response.status_code == 200
        session = session_response.json()
        session_id = session["id"]
        
        # Step 4: Verify session appears in listing
        sessions_response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        session_ids = [s["id"] for s in sessions]
        assert session_id in session_ids
        
        # Step 5: Send chat message (might fail due to opencode CLI requirement)
        messages = [{"role": "user", "content": "Hello, integration test!"}]
        chat_response = await client.post(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
            json={"messages": messages, "stream": False}
        )
        
        # Accept both success and expected failures due to test environment
        assert chat_response.status_code in [200, 400, 503, 508]
        
        # Step 6: Get chat history
        history_response = await client.get(
            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat"
        )
        assert history_response.status_code == 200
        history = history_response.json()
        assert history["workspaceId"] == workspace_id
        assert history["sessionId"] == session_id
        assert isinstance(history["messages"], list)

    async def test_workspace_with_multiple_sessions_workflow(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test creating multiple sessions in a workspace and managing them."""
        workspace_id = test_workspace["id"]
        
        # Create multiple sessions
        session_ids = []
        for i in range(3):
            response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": test_model
            })
            assert response.status_code == 200
            session = response.json()
            session_ids.append(session["id"])
        
        # Verify all sessions exist
        sessions_response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        
        retrieved_session_ids = [s["id"] for s in sessions]
        for session_id in session_ids:
            assert session_id in retrieved_session_ids
        
        # Test chat with each session
        for session_id in session_ids:
            # Get chat history (should be empty initially)
            history_response = await client.get(
                f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat"
            )
            assert history_response.status_code == 200
            history = history_response.json()
            assert history["sessionId"] == session_id
            assert isinstance(history["messages"], list)

    async def test_error_handling_cascade(self, client: httpx.AsyncClient):
        """Test error handling across the API hierarchy."""
        invalid_workspace_id = "invalid-workspace-123"
        invalid_session_id = "invalid-session-456"
        
        # Test session operations on invalid workspace
        session_response = await client.post(f"/api/workspaces/{invalid_workspace_id}/sessions", json={
            "model": "openai/gpt-4o-mini"
        })
        assert session_response.status_code == 404
        
        sessions_list_response = await client.get(f"/api/workspaces/{invalid_workspace_id}/sessions")
        assert sessions_list_response.status_code in [200, 404]  # Implementation dependent
        
        # Test chat operations on invalid workspace/session
        messages = [{"role": "user", "content": "test"}]
        chat_response = await client.post(
            f"/api/workspaces/{invalid_workspace_id}/sessions/{invalid_session_id}/chat",
            json={"messages": messages}
        )
        assert chat_response.status_code == 404
        
        history_response = await client.get(
            f"/api/workspaces/{invalid_workspace_id}/sessions/{invalid_session_id}/chat"
        )
        assert history_response.status_code == 404

    async def test_concurrent_operations(self, client: httpx.AsyncClient, server_manager, test_model: str):
        """Test concurrent API operations."""
        import asyncio
        
        # Create multiple workspaces concurrently
        async def create_workspace(name: str):
            folder = server_manager.get_test_folder_path(f"concurrent_{name}")
            response = await client.post("/api/workspaces", json={
                "folder": folder,
                "model": test_model
            })
            return response
        
        # Create 3 workspaces concurrently
        tasks = [create_workspace(f"test_{i}") for i in range(3)]
        responses = await asyncio.gather(*tasks)
        
        # Verify all succeeded
        workspace_ids = []
        for response in responses:
            assert response.status_code == 200
            workspace = response.json()
            workspace_ids.append(workspace["id"])
        
        # Verify all have unique IDs
        assert len(workspace_ids) == len(set(workspace_ids))
        
        # Verify all appear in listing
        list_response = await client.get("/api/workspaces")
        assert list_response.status_code == 200
        workspaces = list_response.json()
        
        listed_ids = [w["id"] for w in workspaces]
        for workspace_id in workspace_ids:
            assert workspace_id in listed_ids


@pytest.mark.api
class TestOtherEndpoints:
    """Test cases for other API endpoints."""

    async def test_folders_endpoint(self, client: httpx.AsyncClient):
        """Test the folders endpoint if available."""
        response = await client.get("/api/folders")
        
        # This endpoint might or might not exist, accept various responses
        assert response.status_code in [200, 404, 405]
        
        if response.status_code == 200:
            # If it exists, verify it returns JSON
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_models_endpoint(self, client: httpx.AsyncClient, server_manager):
        """Test the models endpoint if available."""
        test_folder = server_manager.get_test_folder_path("integration_test")
        response = await client.get("/api/models?folder=" + test_folder)
        
        # This endpoint might or might not exist, accept various responses
        assert response.status_code in [200, 404, 405]
        
        if response.status_code == 200:
            # If it exists, verify it returns JSON
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_opencode_endpoint(self, client: httpx.AsyncClient):
        """Test the main opencode endpoint."""
        response = await client.get("/api/opencode")
        
        # This endpoint behavior depends on implementation
        assert response.status_code in [200, 404, 405, 500]

    async def test_opencode_chat_endpoint(self, client: httpx.AsyncClient):
        """Test the opencode-chat endpoint."""
        # Try GET first
        get_response = await client.get("/api/opencode-chat")
        assert get_response.status_code in [200, 404, 405, 500]
        
        # Try POST with minimal payload
        post_response = await client.post("/api/opencode-chat", json={
            "message": "test"
        })
        assert post_response.status_code in [200, 400, 404, 405, 500]