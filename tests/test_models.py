import pytest
import httpx
import os


@pytest.mark.api
class TestModels:
    """Test cases for models API endpoint."""

    async def test_get_models_missing_folder(self, client: httpx.AsyncClient):
        """Test models endpoint fails without folder parameter."""
        response = await client.get("/api/models")
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "folder path is required" in data["error"].lower()

    async def test_get_models_with_valid_folder(self, client: httpx.AsyncClient, test_folder: str):
        """Test models endpoint with valid folder."""
        response = await client.get(f"/api/models?folder={test_folder}")
        
        # This might succeed or fail depending on whether opencode CLI is available
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify response structure
            assert "models" in data
            assert "folder" in data
            assert isinstance(data["models"], list)
            assert data["folder"] == test_folder
            
            # Verify each model is a string
            for model in data["models"]:
                assert isinstance(model, str)
                assert len(model.strip()) > 0
        else:
            # Expected failure if opencode CLI is not available
            data = response.json()
            assert "error" in data
            assert "failed to fetch models" in data["error"].lower()

    async def test_get_models_nonexistent_folder(self, client: httpx.AsyncClient):
        """Test models endpoint with nonexistent folder."""
        nonexistent_folder = "/this/path/does/not/exist"
        
        response = await client.get(f"/api/models?folder={nonexistent_folder}")
        
        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert "failed to fetch models" in data["error"].lower()

    async def test_get_models_empty_folder_param(self, client: httpx.AsyncClient):
        """Test models endpoint with empty folder parameter."""
        response = await client.get("/api/models?folder=")
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "folder path is required" in data["error"].lower()

    async def test_get_models_folder_without_permissions(self, client: httpx.AsyncClient):
        """Test models endpoint with folder that might not have permissions."""
        restricted_folder = "/root"  # Might not be accessible
        
        response = await client.get(f"/api/models?folder={restricted_folder}")
        
        # Should return 500 due to permission issues or opencode CLI failure
        assert response.status_code == 500
        data = response.json()
        assert "error" in data

    async def test_get_models_with_special_characters_in_path(self, client: httpx.AsyncClient, server_manager):
        """Test models endpoint with special characters in folder path."""
        # Create a folder with spaces and special characters
        special_folder = server_manager.get_test_folder_path("folder with spaces & chars")
        
        response = await client.get(f"/api/models?folder={special_folder}")
        
        # Should handle special characters properly
        assert response.status_code in [200, 500]
        
        data = response.json()
        if response.status_code == 200:
            assert data["folder"] == special_folder
        else:
            assert "error" in data

    async def test_get_models_url_encoding(self, client: httpx.AsyncClient, server_manager):
        """Test models endpoint with URL-encoded folder path."""
        import urllib.parse
        
        test_folder = server_manager.get_test_folder_path("url_test")
        encoded_folder = urllib.parse.quote(test_folder)
        
        response = await client.get(f"/api/models?folder={encoded_folder}")
        
        # Should handle URL encoding
        assert response.status_code in [200, 500]
        data = response.json()
        
        if response.status_code == 200:
            # The decoded folder path should match
            assert data["folder"] == test_folder or data["folder"] == encoded_folder

    async def test_get_models_very_long_path(self, client: httpx.AsyncClient):
        """Test models endpoint with very long folder path."""
        long_path = "/tmp/" + "a" * 1000
        
        response = await client.get(f"/api/models?folder={long_path}")
        
        # Should handle long paths gracefully
        assert response.status_code == 500
        data = response.json()
        assert "error" in data

    async def test_get_models_multiple_folder_params(self, client: httpx.AsyncClient, test_folder: str):
        """Test models endpoint with multiple folder parameters."""
        # URL with multiple folder parameters - should use the first one
        response = await client.get(f"/api/models?folder={test_folder}&folder=/another/path")
        
        assert response.status_code in [200, 500]
        data = response.json()
        
        if response.status_code == 200:
            # Should use the first folder parameter
            assert data["folder"] == test_folder

    async def test_get_models_concurrent_requests(self, client: httpx.AsyncClient, test_folder: str):
        """Test concurrent requests to models endpoint."""
        import asyncio
        
        async def make_request():
            return await client.get(f"/api/models?folder={test_folder}")
        
        # Make multiple concurrent requests
        tasks = [make_request() for _ in range(3)]
        responses = await asyncio.gather(*tasks)
        
        # All requests should have the same status code
        status_codes = [r.status_code for r in responses]
        assert len(set(status_codes)) == 1  # All should be the same
        
        # All should be either 200 or 500
        assert status_codes[0] in [200, 500]

    async def test_get_models_timeout_handling(self, client: httpx.AsyncClient, test_folder: str):
        """Test that models endpoint handles timeouts properly."""
        # The endpoint has a 10-second timeout for the opencode command
        # We can't easily test the timeout, but we can verify the endpoint responds
        response = await client.get(f"/api/models?folder={test_folder}")
        
        # Should complete within reasonable time and not hang
        assert response.status_code in [200, 500]

    async def test_get_models_response_format(self, client: httpx.AsyncClient, test_folder: str):
        """Test that models response has correct format."""
        response = await client.get(f"/api/models?folder={test_folder}")
        
        assert response.status_code in [200, 500]
        data = response.json()
        
        if response.status_code == 200:
            # Verify successful response structure
            assert isinstance(data, dict)
            assert set(data.keys()) == {"models", "folder"}
            
            # Verify models array
            assert isinstance(data["models"], list)
            for model in data["models"]:
                assert isinstance(model, str)
                assert len(model.strip()) > 0
            
            # Verify folder
            assert isinstance(data["folder"], str)
            assert data["folder"] == test_folder
        else:
            # Verify error response structure
            assert isinstance(data, dict)
            assert "error" in data
            assert isinstance(data["error"], str)

    async def test_get_models_case_sensitivity(self, client: httpx.AsyncClient, test_folder: str):
        """Test models endpoint parameter case sensitivity."""
        # Test with different case for parameter name
        response_upper = await client.get(f"/api/models?FOLDER={test_folder}")
        response_mixed = await client.get(f"/api/models?Folder={test_folder}")
        
        # Parameter names should be case sensitive (folder vs FOLDER)
        # These should fail because the parameter name is case sensitive
        assert response_upper.status_code == 400
        assert response_mixed.status_code == 400
        
        # Verify error messages
        data_upper = response_upper.json()
        data_mixed = response_mixed.json()
        assert "error" in data_upper
        assert "error" in data_mixed

    async def test_get_models_with_query_injection(self, client: httpx.AsyncClient):
        """Test models endpoint with potential command injection in folder path."""
        # Test various injection attempts
        injection_attempts = [
            "/tmp; rm -rf /",
            "/tmp && echo 'injected'",
            "/tmp | cat /etc/passwd",
            "/tmp`whoami`",
            "/tmp$(whoami)",
        ]
        
        for injection_path in injection_attempts:
            response = await client.get(f"/api/models?folder={injection_path}")
            
            # Should handle injection attempts safely
            assert response.status_code == 500
            data = response.json()
            assert "error" in data
            # Should not execute the injected commands

    async def test_get_models_relative_path(self, client: httpx.AsyncClient):
        """Test models endpoint with relative paths."""
        relative_paths = [
            ".",
            "..",
            "./test",
            "../test",
            "~/test",
        ]
        
        for rel_path in relative_paths:
            response = await client.get(f"/api/models?folder={rel_path}")
            
            # Should handle relative paths (might succeed or fail depending on implementation)
            assert response.status_code in [200, 500]
            data = response.json()
            
            if response.status_code == 200:
                assert "models" in data
                assert "folder" in data
            else:
                assert "error" in data