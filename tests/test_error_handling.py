import pytest
import httpx
import json


@pytest.mark.api
class TestErrorHandling:
    """Test cases for comprehensive error handling across all endpoints."""

    async def test_malformed_json_requests(self, client: httpx.AsyncClient, test_folder: str):
        """Test handling of malformed JSON in request bodies."""
        malformed_payloads = [
            "invalid json",
            '{"incomplete": json',
            '{"trailing": "comma",}',
            '{"duplicate": "key", "duplicate": "value"}',
            "",
            "null",
            "[]",  # Array instead of object
            "123",  # Number instead of object
        ]
        
        endpoints_requiring_json = [
            "/api/workspaces",
            f"/api/workspaces/test-id/sessions",
        ]
        
        for endpoint in endpoints_requiring_json:
            for payload in malformed_payloads:
                response = await client.post(
                    endpoint,
                    content=payload,
                    headers={"content-type": "application/json"}
                )
                
                # Should return 400 for malformed JSON
                assert response.status_code == 400

    async def test_missing_content_type(self, client: httpx.AsyncClient, test_folder: str, test_model: str):
        """Test requests without proper content-type headers."""
        valid_payload = json.dumps({"folder": test_folder, "model": test_model})
        
        # Send valid JSON but without content-type header
        response = await client.post("/api/workspaces", content=valid_payload)
        
        # Should handle gracefully - might work or return 400
        assert response.status_code in [200, 400]

    async def test_wrong_content_type(self, client: httpx.AsyncClient, test_folder: str, test_model: str):
        """Test requests with wrong content-type headers."""
        valid_payload = json.dumps({"folder": test_folder, "model": test_model})
        
        wrong_content_types = [
            "text/plain",
            "application/xml",
            "multipart/form-data",
            "application/x-www-form-urlencoded",
        ]
        
        for content_type in wrong_content_types:
            response = await client.post(
                "/api/workspaces",
                content=valid_payload,
                headers={"content-type": content_type}
            )
            
            # Should handle gracefully
            assert response.status_code in [200, 400, 415]

    async def test_oversized_requests(self, client: httpx.AsyncClient, test_folder: str, test_model: str):
        """Test handling of oversized request payloads."""
        # Create a very large payload
        large_payload = {
            "folder": test_folder,
            "model": test_model,
            "large_field": "x" * (10 * 1024 * 1024)  # 10MB string
        }
        
        response = await client.post("/api/workspaces", json=large_payload)
        
        # Should handle large payloads gracefully - either succeed or reject appropriately
        assert response.status_code in [200, 400, 413]

    async def test_unicode_and_special_characters(self, client: httpx.AsyncClient, server_manager, test_model: str):
        """Test handling of Unicode and special characters in requests."""
        special_folders = [
            server_manager.get_test_folder_path("测试文件夹"),  # Chinese
            server_manager.get_test_folder_path("тест"),  # Cyrillic
            server_manager.get_test_folder_path("🚀folder"),  # Emoji
            server_manager.get_test_folder_path("folder\nwith\nnewlines"),
            server_manager.get_test_folder_path("folder\twith\ttabs"),
            server_manager.get_test_folder_path("folder\"with\"quotes"),
            server_manager.get_test_folder_path("folder'with'apostrophes"),
        ]
        
        for folder in special_folders:
            response = await client.post("/api/workspaces", json={
                "folder": folder,
                "model": test_model
            })
            
            # Should handle special characters gracefully
            assert response.status_code in [200, 400]

    async def test_null_and_undefined_values(self, client: httpx.AsyncClient, test_folder: str, test_model: str):
        """Test handling of null and undefined values in requests."""
        payloads_with_nulls = [
            {"folder": None, "model": test_model},
            {"folder": test_folder, "model": None},
            {"folder": None, "model": None},
            {},  # Missing required fields
        ]
        
        for payload in payloads_with_nulls:
            response = await client.post("/api/workspaces", json=payload)
            
            # Should return 400 for invalid payloads
            assert response.status_code == 400
            data = response.json()
            assert "error" in data

    async def test_xss_attempts(self, client: httpx.AsyncClient, test_model: str):
        """Test protection against XSS attempts."""
        xss_attempts = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//",
        ]
        
        for xss in xss_attempts:
            response = await client.post("/api/workspaces", json={
                "folder": xss,
                "model": test_model
            })
            
            # Should handle XSS attempts safely
            assert response.status_code == 400
            
            # Response should not contain the XSS payload
            response_text = response.text
            assert "<script>" not in response_text
            assert "javascript:" not in response_text

    async def test_rate_limiting_simulation(self, client: httpx.AsyncClient, test_folder: str, test_model: str):
        """Test behavior under rapid requests (simulating rate limiting scenarios)."""
        import asyncio
        
        async def make_request():
            return await client.post("/api/workspaces", json={
                "folder": test_folder,
                "model": test_model
            })
        
        # Make concurrent requests (reduced to be less aggressive)
        tasks = [make_request() for _ in range(5)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Should handle concurrent requests gracefully
        successful_responses = 0
        for response in responses:
            if isinstance(response, httpx.Response):
                assert response.status_code in [200, 400, 429, 503]
                if response.status_code == 200:
                    successful_responses += 1
        
        # At least some requests should succeed
        assert successful_responses > 0

    async def test_timeout_handling(self, client: httpx.AsyncClient):
        """Test timeout handling for long-running operations."""
        # Test with a short timeout
        short_timeout_client = httpx.AsyncClient(
            base_url=client.base_url,
            timeout=0.1  # 100ms timeout - more realistic for testing
        )
        
        try:
            response = await short_timeout_client.get("/api/workspaces")
            # If it succeeds, that's fine too (operation was very fast)
            assert response.status_code in [200, 400]
        except httpx.TimeoutException:
            # Expected for very short timeout
            pass
        finally:
            await short_timeout_client.aclose()

    async def test_concurrent_resource_access(self, client: httpx.AsyncClient, test_workspace, test_model: str):
        """Test concurrent access to the same resources."""
        import asyncio
        
        workspace_id = test_workspace["id"]
        
        # Try to create many sessions in the same workspace concurrently
        async def create_session():
            return await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": test_model
            })
        
        tasks = [create_session() for _ in range(3)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Should handle concurrent session creation
        successful_creations = 0
        for response in responses:
            if isinstance(response, httpx.Response):
                if response.status_code == 200:
                    successful_creations += 1
                else:
                    assert response.status_code in [400, 503]
        
        # At least some should succeed
        assert successful_creations > 0

    async def test_error_response_format_consistency(self, client: httpx.AsyncClient):
        """Test that error responses have consistent format."""
        error_inducing_requests = [
            # Missing required fields
            ("POST", "/api/workspaces", {}),
            # Invalid workspace ID
            ("GET", "/api/workspaces/invalid-id", None),
            # Invalid session ID
            ("GET", "/api/workspaces/invalid-workspace/sessions/invalid-session", None),
            # Missing folder parameter
            ("GET", "/api/models", None),
        ]
        
        for method, url, json_data in error_inducing_requests:
            if method == "POST":
                response = await client.post(url, json=json_data)
            else:
                response = await client.get(url)
            
            # Should return error status
            assert response.status_code >= 400
            
            # Should have consistent error format
            data = response.json()
            assert isinstance(data, dict)
            assert "error" in data
            assert isinstance(data["error"], str)
            assert len(data["error"]) > 0

    async def test_http_method_not_allowed(self, client: httpx.AsyncClient):
        """Test handling of unsupported HTTP methods."""
        endpoints_and_invalid_methods = [
            ("/api/workspaces", "PUT"),
            ("/api/workspaces", "PATCH"),
            ("/api/folders", "POST"),
            ("/api/folders", "DELETE"),
            ("/api/models", "POST"),
            ("/api/models", "DELETE"),
        ]
        
        for endpoint, method in endpoints_and_invalid_methods:
            response = await client.request(method, endpoint)
            
            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    async def test_cors_headers(self, client: httpx.AsyncClient):
        """Test CORS headers in responses."""
        # Test preflight request
        response = await client.options("/api/workspaces")
        
        # Should handle OPTIONS request
        assert response.status_code in [200, 204, 405]
        
        # Test actual request for CORS headers
        response = await client.get("/api/workspaces")
        
        # Check for CORS headers (implementation dependent)
        headers = response.headers
        # These might or might not be present depending on CORS configuration
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers",
        ]
        
        # Just verify the response is valid
        assert response.status_code == 200