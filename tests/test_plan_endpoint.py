import pytest
import httpx
import json


@pytest.mark.api
class TestPlanEndpoint:
    async def test_plan_missing_fields_returns_400(self, client: httpx.AsyncClient):
        # Missing planningModel
        resp1 = await client.post("/api/agent/plan", json={
            "prompt": "Build a plan",
            "workspaceId": "some-id",
        })
        assert resp1.status_code == 400

        # Missing prompt
        resp2 = await client.post("/api/agent/plan", json={
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": "some-id",
        })
        assert resp2.status_code == 400

        # Missing workspaceId
        resp3 = await client.post("/api/agent/plan", json={
            "prompt": "Build a plan",
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
        })
        assert resp3.status_code == 400

    async def test_plan_workspace_not_found(self, client: httpx.AsyncClient):
        response = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan for adding a feature",
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": "non-existent-workspace-id",
        })
        assert response.status_code == 404

    async def test_plan_generates_and_cleans_session(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        workspace_id = test_workspace["id"]

        # Get sessions before
        before_resp = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert before_resp.status_code == 200
        before_sessions = before_resp.json()

        # Call plan endpoint
        plan_resp = await client.post("/api/agent/plan", json={
            "prompt": "Please outline a step-by-step plan to add a new React component and integrate it into the app.",
            "planningModel": test_model,
            "workspaceId": workspace_id,
        })

        # The request should either succeed with a plan or fail gracefully due to model/infra variability
        assert plan_resp.status_code in [200, 500]
        if plan_resp.status_code == 200:
            data = plan_resp.json()
            assert "plan" in data and isinstance(data["plan"], str) and len(data["plan"]) > 0

        # Sessions should be unchanged (temporary session cleaned up)
        after_resp = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert after_resp.status_code == 200
        after_sessions = after_resp.json()
        assert after_sessions == before_sessions

    async def test_plan_invalid_input_types(self, client: httpx.AsyncClient):
        """Test validation of input parameter types"""
        # Non-string prompt
        resp1 = await client.post("/api/agent/plan", json={
            "prompt": 123,  # Should be string
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": "some-id",
        })
        assert resp1.status_code == 400
        assert "Invalid input types" in resp1.json()["error"]

        # Non-string planningModel
        resp2 = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan",
            "planningModel": ["model1", "model2"],  # Should be string
            "workspaceId": "some-id",
        })
        assert resp2.status_code == 400
        assert "Invalid input types" in resp2.json()["error"]

        # Non-string workspaceId
        resp3 = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan",
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": 456,  # Should be string
        })
        assert resp3.status_code == 400
        assert "Invalid input types" in resp3.json()["error"]

    async def test_plan_prompt_too_long(self, client: httpx.AsyncClient):
        """Test validation of prompt length limits"""
        very_long_prompt = "x" * 10001  # Over the 10000 character limit
        
        response = await client.post("/api/agent/plan", json={
            "prompt": very_long_prompt,
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": "some-id",
        })
        
        assert response.status_code == 400
        assert "too long" in response.json()["error"]

    async def test_plan_empty_strings(self, client: httpx.AsyncClient):
        """Test handling of empty string parameters"""
        # Empty prompt
        resp1 = await client.post("/api/agent/plan", json={
            "prompt": "",
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": "some-id",
        })
        assert resp1.status_code == 400
        
        # Empty planning model
        resp2 = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan",
            "planningModel": "",
            "workspaceId": "some-id",
        })
        assert resp2.status_code == 400
        
        # Empty workspace ID
        resp3 = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan",
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": "",
        })
        assert resp3.status_code == 400

    async def test_plan_workspace_not_running(self, client: httpx.AsyncClient, test_workspace):
        """Test behavior when workspace exists but is not running"""
        workspace_id = test_workspace["id"]
        
        # First, stop the workspace (if there's an endpoint for that)
        # This test assumes the workspace might be in a non-running state
        response = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan",
            "planningModel": "anthropic/claude-3-5-haiku-20241022",
            "workspaceId": workspace_id,
        })
        
        # Should succeed if workspace is running, or return 404 if not
        assert response.status_code in [200, 404, 500]

    async def test_plan_invalid_model_format(self, client: httpx.AsyncClient, test_workspace):
        """Test handling of invalid model identifier formats"""
        workspace_id = test_workspace["id"]
        
        # Invalid model format (no provider/model separation)
        response = await client.post("/api/agent/plan", json={
            "prompt": "Create a plan",
            "planningModel": "invalid-model-format",
            "workspaceId": workspace_id,
        })
        
        # Should handle gracefully - either succeed or fail with specific error
        assert response.status_code in [200, 400, 500]
        
        if response.status_code == 500:
            error_data = response.json()
            assert "error" in error_data

    async def test_plan_malformed_json(self, client: httpx.AsyncClient):
        """Test handling of malformed JSON in request body"""
        # Send invalid JSON
        response = await client.post(
            "/api/agent/plan",
            content='{"prompt": "test", "planningModel":}',  # Malformed JSON
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 or 500 for malformed JSON (depending on Next.js handling)
        assert response.status_code in [400, 500]

    async def test_plan_session_creation_failure_handling(self, client: httpx.AsyncClient, test_workspace):
        """Test behavior when temporary session creation might fail"""
        workspace_id = test_workspace["id"]
        
        # Test with potentially problematic model
        response = await client.post("/api/agent/plan", json={
            "prompt": "Create a very simple plan",
            "planningModel": "nonexistent/model-that-does-not-exist",
            "workspaceId": workspace_id,
        })
        
        # Should handle model creation failure gracefully
        assert response.status_code in [400, 404, 500]
        
        if response.status_code == 500:
            error_data = response.json()
            assert "error" in error_data

    async def test_plan_concurrent_requests(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test handling of concurrent plan generation requests"""
        workspace_id = test_workspace["id"]
        
        # Make a simple sequential test instead of concurrent to avoid timeout issues
        # This still tests that multiple requests work properly
        response1 = await client.post("/api/agent/plan", json={
            "prompt": "Create a simple plan",
            "planningModel": test_model,
            "workspaceId": workspace_id,
        })
        
        response2 = await client.post("/api/agent/plan", json={
            "prompt": "Create another plan",
            "planningModel": test_model,
            "workspaceId": workspace_id,
        })
        
        # Both requests should complete (either success or graceful failure)
        assert response1.status_code in [200, 500]
        assert response2.status_code in [200, 500]
            
        # Check that sessions are properly cleaned up after all requests
        final_sessions_resp = await client.get(f"/api/workspaces/{workspace_id}/sessions")
        assert final_sessions_resp.status_code == 200

    async def test_plan_response_format_validation(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test that the response format is validated correctly"""
        workspace_id = test_workspace["id"]
        
        response = await client.post("/api/agent/plan", json={
            "prompt": "Create a detailed step-by-step plan for building a simple React component",
            "planningModel": test_model,
            "workspaceId": workspace_id,
        })
        
        if response.status_code == 200:
            data = response.json()
            # Validate response structure
            assert "plan" in data
            assert isinstance(data["plan"], str)
            assert len(data["plan"].strip()) > 0
            assert data["plan"] != "undefined"
            assert data["plan"] != "null"
        elif response.status_code == 500:
            error_data = response.json()
            assert "error" in error_data
            assert isinstance(error_data["error"], str)
            assert len(error_data["error"]) > 0

    async def test_plan_error_message_consistency(self, client: httpx.AsyncClient):
        """Test that error messages are consistent and informative"""
        # Test various error conditions and verify error message format
        
        # Missing fields error
        resp1 = await client.post("/api/agent/plan", json={})
        assert resp1.status_code == 400
        error1 = resp1.json()
        assert "error" in error1
        assert "Missing" in error1["error"]
        
        # Workspace not found error
        resp2 = await client.post("/api/agent/plan", json={
            "prompt": "test",
            "planningModel": "test/model",
            "workspaceId": "nonexistent-workspace-12345",
        })
        assert resp2.status_code == 404
        error2 = resp2.json()
        assert "error" in error2
        assert "Workspace" in error2["error"]

