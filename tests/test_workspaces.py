import pytest
import httpx


@pytest.mark.api
class TestWorkspaces:
    """Test cases for workspace API endpoints."""

    async def test_create_workspace_success(self, client: httpx.AsyncClient, test_folder: str, test_model: str):
        """Test successful workspace creation."""
        response = await client.post("/api/workspaces", json={
            "folder": test_folder,
            "model": test_model
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "folder" in data
        assert "model" in data
        assert "port" in data
        assert "status" in data
        assert "sessions" in data
        
        # Verify values
        assert data["folder"] == test_folder
        assert data["model"] == test_model
        assert isinstance(data["sessions"], list)
        assert data["sessions"] == []  # New workspace should have no sessions

    async def test_create_workspace_missing_folder(self, client: httpx.AsyncClient, test_model: str):
        """Test workspace creation fails without folder."""
        response = await client.post("/api/workspaces", json={
            "model": test_model
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "folder" in data["error"].lower()

    async def test_create_workspace_missing_model(self, client: httpx.AsyncClient, test_folder: str):
        """Test workspace creation fails without model."""
        response = await client.post("/api/workspaces", json={
            "folder": test_folder
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "model" in data["error"].lower()

    async def test_create_workspace_empty_payload(self, client: httpx.AsyncClient):
        """Test workspace creation fails with empty payload."""
        response = await client.post("/api/workspaces", json={})
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    async def test_create_workspace_invalid_json(self, client: httpx.AsyncClient):
        """Test workspace creation fails with invalid JSON."""
        response = await client.post("/api/workspaces", content="invalid json", 
                                   headers={"content-type": "application/json"})
        
        assert response.status_code == 400

    async def test_list_workspaces_empty(self, client: httpx.AsyncClient):
        """Test listing workspaces when none exist."""
        response = await client.get("/api/workspaces")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_workspaces_with_workspace(self, client: httpx.AsyncClient, test_workspace):
        """Test listing workspaces when one exists."""
        response = await client.get("/api/workspaces")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Find our test workspace
        workspace_found = False
        for workspace in data:
            if workspace["id"] == test_workspace["id"]:
                workspace_found = True
                # Verify structure
                assert "id" in workspace
                assert "folder" in workspace
                assert "model" in workspace
                assert "port" in workspace
                assert "status" in workspace
                assert "sessions" in workspace
                break
        
        assert workspace_found, "Test workspace not found in list"

    async def test_create_multiple_workspaces(self, client: httpx.AsyncClient, server_manager, test_model: str):
        """Test creating multiple workspaces."""
        # Create first workspace
        folder1 = server_manager.get_test_folder_path("project1")
        response1 = await client.post("/api/workspaces", json={
            "folder": folder1,
            "model": test_model
        })
        assert response1.status_code == 200
        workspace1 = response1.json()
        
        # Create second workspace
        folder2 = server_manager.get_test_folder_path("project2")
        response2 = await client.post("/api/workspaces", json={
            "folder": folder2,
            "model": test_model
        })
        assert response2.status_code == 200
        workspace2 = response2.json()
        
        # Verify they have different IDs
        assert workspace1["id"] != workspace2["id"]
        assert workspace1["folder"] != workspace2["folder"]
        
        # Verify both appear in listing
        response = await client.get("/api/workspaces")
        assert response.status_code == 200
        workspaces = response.json()
        
        workspace_ids = [w["id"] for w in workspaces]
        assert workspace1["id"] in workspace_ids
        assert workspace2["id"] in workspace_ids

    async def test_workspace_properties(self, test_workspace):
        """Test that workspace has expected properties and types."""
        assert isinstance(test_workspace["id"], str)
        assert len(test_workspace["id"]) > 0
        assert isinstance(test_workspace["folder"], str)
        assert isinstance(test_workspace["model"], str)
        assert isinstance(test_workspace["port"], int)
        assert test_workspace["port"] > 0
        assert isinstance(test_workspace["status"], str)
        assert isinstance(test_workspace["sessions"], list)