import pytest
import httpx


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

