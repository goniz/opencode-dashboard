"""
Test for the process health check endpoint.

This test verifies that the health check endpoint provides proper status
information about the cleanup system and workspace processes.
"""

import httpx
import pytest


async def test_health_endpoint_basic(client: httpx.AsyncClient):
    """Test that the health endpoint returns proper status information."""
    
    response = await client.get("/api/health/processes")
    
    assert response.status_code == 200
    
    data = response.json()
    
    # Check that all required fields are present
    assert "timestamp" in data
    assert "overall" in data
    assert "cleanup" in data
    assert "configuration" in data
    assert "workspaces" in data
    
    # Check overall status structure
    overall = data["overall"]
    assert "status" in overall
    assert "totalWorkspaces" in overall
    assert "healthyProcesses" in overall
    assert "orphanedProcesses" in overall
    assert "statusCounts" in overall
    
    # Check cleanup status structure
    cleanup = data["cleanup"]
    assert "shutdownManagerInitialized" in cleanup
    assert "processCleanupInitialized" in cleanup
    assert "signalHandlersInitialized" in cleanup
    assert "exceptionHandlersInitialized" in cleanup
    assert "isShuttingDown" in cleanup
    
    # Verify that cleanup handlers are properly initialized
    assert cleanup["shutdownManagerInitialized"] is True
    assert cleanup["processCleanupInitialized"] is True
    assert cleanup["signalHandlersInitialized"] is True
    assert cleanup["exceptionHandlersInitialized"] is True
    assert cleanup["isShuttingDown"] is False
    
    # Check configuration structure
    config = data["configuration"]
    assert "enableProcessMonitoring" in config
    assert "workspaceCleanupTimeout" in config
    assert "workspaceRetryAttempts" in config
    assert "enableVerboseLogging" in config
    
    # Check workspaces array
    assert isinstance(data["workspaces"], list)
    
    print("✅ Health endpoint test passed - cleanup system is properly initialized")


async def test_health_endpoint_with_workspace(client: httpx.AsyncClient, test_model: str):
    """Test health endpoint when workspaces are running."""
    
    import tempfile
    import os
    
    # Create a temporary workspace
    with tempfile.TemporaryDirectory() as temp_dir:
        test_folder = os.path.join(temp_dir, "health_test")
        os.makedirs(test_folder, exist_ok=True)
        
        # Create a simple test file
        with open(os.path.join(test_folder, "README.md"), "w") as f:
            f.write("# Health Test Project\nTesting health endpoint with workspace.")
        
        try:
            # Create workspace
            response = await client.post("/api/workspaces", json={
                "folder": test_folder,
                "model": test_model
            })
            
            if response.status_code != 200:
                pytest.skip(f"Could not create workspace for health test: {response.status_code}")
            
            workspace_data = response.json()
            workspace_id = workspace_data["id"]
            
            # Wait a moment for workspace to start
            import asyncio
            await asyncio.sleep(3)
            
            # Check health endpoint
            health_response = await client.get("/api/health/processes")
            assert health_response.status_code == 200
            
            health_data = health_response.json()
            
            # Should have at least one workspace
            assert health_data["overall"]["totalWorkspaces"] >= 1
            
            # Find our workspace in the list
            workspace_found = False
            for workspace in health_data["workspaces"]:
                if workspace["id"] == workspace_id:
                    workspace_found = True
                    assert workspace["folder"] == test_folder
                    assert workspace["model"] == test_model
                    assert "status" in workspace
                    assert "sessionCount" in workspace
                    assert "hasProcess" in workspace
                    break
            
            assert workspace_found, f"Workspace {workspace_id} not found in health data"
            
            print(f"✅ Health endpoint with workspace test passed - found workspace {workspace_id}")
            
        finally:
            # Clean up workspace
            try:
                await client.delete(f"/api/workspaces?id={workspace_id}")
            except:
                pass  # Cleanup attempt, ignore errors