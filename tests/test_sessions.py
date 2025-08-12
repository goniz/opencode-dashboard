import pytest
import httpx


@pytest.mark.api
class TestSessions:
    """Test cases for session API endpoints."""

    async def test_create_session_success(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test successful session creation."""
        workspace_id = test_workspace["id"]
        
        response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "workspaceId" in data
        assert "model" in data
        assert "port" in data
        assert "createdAt" in data
        assert "lastActivity" in data
        assert "status" in data
        
        # Verify values
        assert data["workspaceId"] == workspace_id
        assert data["model"] == test_model
        assert isinstance(data["port"], int)

    async def test_create_session_missing_model(self, client: httpx.AsyncClient, test_workspace):
        """Test session creation fails without model."""
        workspace_id = test_workspace["id"]
        
        response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={})
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "model" in data["error"].lower()

    async def test_create_session_invalid_workspace(self, client: httpx.AsyncClient, test_model: str):
        """Test session creation fails with invalid workspace ID."""
        invalid_workspace_id = "nonexistent-workspace-id"
        
        response = await client.post(f"/api/workspaces/{invalid_workspace_id}/sessions", json={
            "model": test_model
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "not found" in data["error"].lower()

    async def test_list_sessions_empty(self, client: httpx.AsyncClient, test_workspace):
        """Test listing sessions when none exist."""
        workspace_id = test_workspace["id"]
        
        response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    async def test_list_sessions_with_session(self, client: httpx.AsyncClient, test_session):
        """Test listing sessions when one exists."""
        workspace_id = test_session["workspaceId"]
        
        response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Find our test session
        session_found = False
        for session in data:
            if session["id"] == test_session["id"]:
                session_found = True
                # Verify structure
                assert "id" in session
                assert "workspaceId" in session
                assert "model" in session
                assert "createdAt" in session
                assert "lastActivity" in session
                assert "status" in session
                break
        
        assert session_found, "Test session not found in list"

    async def test_list_sessions_invalid_workspace(self, client: httpx.AsyncClient):
        """Test listing sessions for invalid workspace."""
        invalid_workspace_id = "nonexistent-workspace-id"
        
        response = await client.get(f"/api/workspaces/{invalid_workspace_id}/sessions")
        
        # This might return 404 or empty list depending on implementation
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    async def test_create_multiple_sessions(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test creating multiple sessions in the same workspace."""
        workspace_id = test_workspace["id"]
        
        # Create first session
        response1 = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert response1.status_code == 200
        session1 = response1.json()
        
        # Create second session
        response2 = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        assert response2.status_code == 200
        session2 = response2.json()
        
        # Verify they have different IDs
        assert session1["id"] != session2["id"]
        assert session1["workspaceId"] == session2["workspaceId"] == workspace_id
        
        # Verify both appear in listing
        response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert response.status_code == 200
        sessions = response.json()
        
        session_ids = [s["id"] for s in sessions]
        assert session1["id"] in session_ids
        assert session2["id"] in session_ids

    async def test_session_different_models(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test creating sessions with different models."""
        workspace_id = test_workspace["id"]
        
        models_to_test = [
            test_model,  # Use the test model fixture as primary test
            "openai/gpt-4o-mini",
            "openai/gpt-4o"
        ]
        
        session_ids = []
        
        for model in models_to_test:
            response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": model
            })
            
            # Some models might not be available, so we allow both success and error
            if response.status_code == 200:
                session_data = response.json()
                assert session_data["model"] == model
                session_ids.append(session_data["id"])
            else:
                # Model might not be available, which is acceptable
                assert response.status_code in [400, 404, 500]
        
        # Verify unique session IDs
        assert len(session_ids) == len(set(session_ids))

    async def test_session_properties(self, test_session):
        """Test that session has expected properties and types."""
        assert isinstance(test_session["id"], str)
        assert len(test_session["id"]) > 0
        assert isinstance(test_session["workspaceId"], str)
        assert isinstance(test_session["model"], str)
        assert isinstance(test_session["port"], int)
        assert test_session["port"] > 0
        assert isinstance(test_session["createdAt"], str)
        assert isinstance(test_session["lastActivity"], str)
        assert isinstance(test_session["status"], str)