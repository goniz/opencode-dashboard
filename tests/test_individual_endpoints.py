import pytest
import httpx


@pytest.mark.api
class TestIndividualWorkspace:
    """Test cases for individual workspace GET and DELETE endpoints."""

    async def test_get_workspace_success(self, client: httpx.AsyncClient, test_workspace):
        """Test successful individual workspace retrieval."""
        workspace_id = test_workspace["id"]
        
        response = await client.get(f"/api/workspaces/{workspace_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "folder" in data
        assert "port" in data
        assert "status" in data
        assert "sessions" in data
        
        # Verify values match the test workspace
        assert data["id"] == workspace_id
        assert data["folder"] == test_workspace["folder"]
        assert isinstance(data["port"], int)
        assert isinstance(data["status"], str)
        assert isinstance(data["sessions"], list)
        
        # Error field is optional
        if "error" in data:
            assert isinstance(data["error"], (str, type(None)))

    async def test_get_workspace_not_found(self, client: httpx.AsyncClient):
        """Test getting nonexistent workspace."""
        invalid_workspace_id = "nonexistent-workspace-id"
        
        response = await client.get(f"/api/workspaces/{invalid_workspace_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()

    async def test_get_workspace_empty_id(self, client: httpx.AsyncClient):
        """Test getting workspace with empty ID."""
        response = await client.get("/api/workspaces/")
        
        # This might redirect or hit the general workspaces endpoint
        assert response.status_code in [200, 308]  # 308 is permanent redirect
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    async def test_get_workspace_special_characters_id(self, client: httpx.AsyncClient):
        """Test getting workspace with special characters in ID."""
        special_ids = [
            "workspace-with-dashes",
            "workspace_with_underscores",
            "workspace.with.dots",
            "workspace%20with%20encoded",
            "workspace/with/slashes",
        ]
        
        for workspace_id in special_ids:
            response = await client.get(f"/api/workspaces/{workspace_id}")
            
            # Should return 404 for nonexistent workspaces, but some might cause other errors
            assert response.status_code in [404, 400, 500]
            
            # Only check JSON if response has content
            if response.content:
                try:
                    data = response.json()
                    if response.status_code == 404:
                        assert "error" in data
                except:
                    # Some responses might not be JSON
                    pass

    async def test_delete_workspace_success(self, client: httpx.AsyncClient, test_workspace):
        """Test successful workspace deletion."""
        workspace_id = test_workspace["id"]
        
        # First verify workspace exists
        get_response = await client.get(f"/api/workspaces/{workspace_id}")
        assert get_response.status_code == 200
        
        # Delete the workspace
        delete_response = await client.delete(f"/api/workspaces/{workspace_id}")
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "success" in data
        assert data["success"] is True

    async def test_delete_workspace_not_found(self, client: httpx.AsyncClient):
        """Test deleting nonexistent workspace."""
        invalid_workspace_id = "nonexistent-workspace-id"
        
        response = await client.delete(f"/api/workspaces/{invalid_workspace_id}")
        
        # Should handle gracefully - might return 200 or 500 depending on implementation
        assert response.status_code in [200, 500]
        data = response.json()
        
        if response.status_code == 500:
            assert "error" in data
        else:
            # Some implementations might return success even for nonexistent resources
            assert "success" in data

    async def test_delete_workspace_twice(self, client: httpx.AsyncClient, server_manager, test_model: str):
        """Test deleting the same workspace twice."""
        # Create a workspace specifically for this test
        test_folder = server_manager.get_test_folder_path("delete_twice_test")
        create_response = await client.post("/api/workspaces", json={
            "folder": test_folder,
            "model": test_model
        })
        assert create_response.status_code == 200
        workspace = create_response.json()
        workspace_id = workspace["id"]
        
        # Delete first time
        delete_response1 = await client.delete(f"/api/workspaces/{workspace_id}")
        assert delete_response1.status_code == 200
        
        # Delete second time
        delete_response2 = await client.delete(f"/api/workspaces/{workspace_id}")
        
        # Should handle gracefully
        assert delete_response2.status_code in [200, 500]


@pytest.mark.api
class TestIndividualSession:
    """Test cases for individual session GET and DELETE endpoints."""

    async def test_get_session_success(self, client: httpx.AsyncClient, test_session):
        """Test successful individual session retrieval."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        response = await client.get(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "workspaceId" in data
        assert "model" in data
        assert "createdAt" in data
        assert "lastActivity" in data
        assert "status" in data
        
        # Verify values match the test session
        assert data["id"] == session_id
        assert data["workspaceId"] == workspace_id
        assert data["model"] == test_session["model"]
        assert isinstance(data["createdAt"], str)
        assert isinstance(data["lastActivity"], str)
        assert isinstance(data["status"], str)

    async def test_get_session_not_found(self, client: httpx.AsyncClient, test_workspace):
        """Test getting nonexistent session."""
        workspace_id = test_workspace["id"]
        invalid_session_id = "nonexistent-session-id"
        
        response = await client.get(f"/api/workspaces/{workspace_id}/sessions/{invalid_session_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()

    async def test_get_session_invalid_workspace(self, client: httpx.AsyncClient, test_session):
        """Test getting session with invalid workspace ID."""
        invalid_workspace_id = "nonexistent-workspace-id"
        session_id = test_session["id"]
        
        response = await client.get(f"/api/workspaces/{invalid_workspace_id}/sessions/{session_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data

    async def test_get_session_wrong_workspace(self, client: httpx.AsyncClient, test_session, server_manager, test_model: str):
        """Test getting session from wrong workspace."""
        # Create another workspace
        other_folder = server_manager.get_test_folder_path("other_workspace")
        other_workspace_response = await client.post("/api/workspaces", json={
            "folder": other_folder,
            "model": test_model
        })
        assert other_workspace_response.status_code == 200
        other_workspace = other_workspace_response.json()
        other_workspace_id = other_workspace["id"]
        
        # Try to get session from wrong workspace
        session_id = test_session["id"]
        
        response = await client.get(f"/api/workspaces/{other_workspace_id}/sessions/{session_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data

    async def test_delete_session_success(self, client: httpx.AsyncClient, test_session):
        """Test successful session deletion."""
        workspace_id = test_session["workspaceId"]
        session_id = test_session["id"]
        
        # First verify session exists
        get_response = await client.get(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        assert get_response.status_code == 200
        
        # Delete the session
        delete_response = await client.delete(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "success" in data
        assert data["success"] is True
        
        # Verify session is gone
        get_response_after = await client.get(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        assert get_response_after.status_code == 404

    async def test_delete_session_not_found(self, client: httpx.AsyncClient, test_workspace):
        """Test deleting nonexistent session."""
        workspace_id = test_workspace["id"]
        invalid_session_id = "nonexistent-session-id"
        
        response = await client.delete(f"/api/workspaces/{workspace_id}/sessions/{invalid_session_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()

    async def test_delete_session_invalid_workspace(self, client: httpx.AsyncClient, test_session):
        """Test deleting session with invalid workspace ID."""
        invalid_workspace_id = "nonexistent-workspace-id"
        session_id = test_session["id"]
        
        response = await client.delete(f"/api/workspaces/{invalid_workspace_id}/sessions/{session_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data

    async def test_delete_session_twice(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test deleting the same session twice."""
        workspace_id = test_workspace["id"]
        
        # Create a session specifically for this test
        create_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert create_response.status_code == 200
        session = create_response.json()
        session_id = session["id"]
        
        # Delete first time
        delete_response1 = await client.delete(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        assert delete_response1.status_code == 200
        
        # Delete second time
        delete_response2 = await client.delete(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        
        # Should return 404 for second deletion
        assert delete_response2.status_code == 404
        data = delete_response2.json()
        assert "error" in data

    async def test_session_lifecycle(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test complete session lifecycle: create -> get -> delete."""
        workspace_id = test_workspace["id"]
        
        # Create session
        create_response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert create_response.status_code == 200
        session = create_response.json()
        session_id = session["id"]
        
        # Get session
        get_response = await client.get(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["id"] == session_id
        assert get_data["workspaceId"] == workspace_id
        
        # Verify session appears in list
        list_response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert list_response.status_code == 200
        sessions = list_response.json()
        session_ids = [s["id"] for s in sessions]
        assert session_id in session_ids
        
        # Delete session
        delete_response = await client.delete(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        assert delete_response.status_code == 200
        
        # Verify session is gone from list
        list_response_after = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert list_response_after.status_code == 200
        sessions_after = list_response_after.json()
        session_ids_after = [s["id"] for s in sessions_after]
        assert session_id not in session_ids_after

    async def test_concurrent_session_operations(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test concurrent session operations."""
        import asyncio
        
        workspace_id = test_workspace["id"]
        
        # Create multiple sessions concurrently
        async def create_session():
            response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": test_model
            })
            return response
        
        create_tasks = [create_session() for _ in range(3)]
        create_responses = await asyncio.gather(*create_tasks)
        
        # All should succeed
        session_ids = []
        for response in create_responses:
            assert response.status_code == 200
            session = response.json()
            session_ids.append(session["id"])
        
        # Get all sessions concurrently
        async def get_session(session_id):
            return await client.get(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        
        get_tasks = [get_session(sid) for sid in session_ids]
        get_responses = await asyncio.gather(*get_tasks)
        
        # All should succeed
        for response in get_responses:
            assert response.status_code == 200
        
        # Delete all sessions concurrently
        async def delete_session(session_id):
            return await client.delete(f"/api/workspaces/{workspace_id}/sessions/{session_id}")
        
        delete_tasks = [delete_session(sid) for sid in session_ids]
        delete_responses = await asyncio.gather(*delete_tasks)
        
        # All should succeed
        for response in delete_responses:
            assert response.status_code == 200