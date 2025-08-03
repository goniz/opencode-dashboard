import pytest
import httpx
import os
import tempfile
import shutil


@pytest.mark.api
class TestFolders:
    """Test cases for folders API endpoint."""

    async def test_get_folders_default_path(self, client: httpx.AsyncClient):
        """Test getting folders from default path (current working directory)."""
        response = await client.get("/api/folders")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "currentPath" in data
        assert "folders" in data
        assert isinstance(data["folders"], list)
        assert isinstance(data["currentPath"], str)
        
        # Verify folder structure
        for folder in data["folders"]:
            assert "name" in folder
            assert "path" in folder
            assert isinstance(folder["name"], str)
            assert isinstance(folder["path"], str)
            assert not folder["name"].startswith(".")  # No hidden folders

    async def test_get_folders_specific_path(self, client: httpx.AsyncClient, server_manager):
        """Test getting folders from a specific path."""
        # Create a test directory structure
        test_dir = server_manager.get_test_folder_path("folders_test")
        
        # Create some subdirectories
        subdir1 = os.path.join(test_dir, "subdir1")
        subdir2 = os.path.join(test_dir, "subdir2")
        hidden_dir = os.path.join(test_dir, ".hidden")
        os.makedirs(subdir1, exist_ok=True)
        os.makedirs(subdir2, exist_ok=True)
        os.makedirs(hidden_dir, exist_ok=True)
        
        # Create a file (should be ignored)
        with open(os.path.join(test_dir, "file.txt"), "w") as f:
            f.write("test file")
        
        response = await client.get(f"/api/folders?path={test_dir}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currentPath"] == test_dir
        assert isinstance(data["folders"], list)
        
        # Should contain our subdirectories but not hidden ones or files
        folder_names = [f["name"] for f in data["folders"]]
        assert "subdir1" in folder_names
        assert "subdir2" in folder_names
        assert ".hidden" not in folder_names
        assert "file.txt" not in folder_names
        
        # Verify folders are sorted alphabetically
        assert folder_names == sorted(folder_names)

    async def test_get_folders_nonexistent_path(self, client: httpx.AsyncClient):
        """Test getting folders from a nonexistent path."""
        nonexistent_path = "/this/path/does/not/exist"
        
        response = await client.get(f"/api/folders?path={nonexistent_path}")
        
        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert "Failed to read directory" in data["error"]

    async def test_get_folders_permission_denied(self, client: httpx.AsyncClient):
        """Test getting folders from a path with restricted permissions."""
        # Try to access a system directory that might have restricted access
        restricted_path = "/root"  # This might not exist or be accessible
        
        response = await client.get(f"/api/folders?path={restricted_path}")
        
        # Should either return 500 (permission denied) or 200 with empty folders
        assert response.status_code in [200, 500]
        
        if response.status_code == 500:
            data = response.json()
            assert "error" in data
        else:
            data = response.json()
            assert "folders" in data
            assert isinstance(data["folders"], list)

    async def test_get_folders_empty_directory(self, client: httpx.AsyncClient, server_manager):
        """Test getting folders from an empty directory."""
        empty_dir = server_manager.get_test_folder_path("empty_test")
        
        # Remove any files that might have been created by the fixture
        for item in os.listdir(empty_dir):
            item_path = os.path.join(empty_dir, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        
        response = await client.get(f"/api/folders?path={empty_dir}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currentPath"] == empty_dir
        assert data["folders"] == []

    async def test_get_folders_with_special_characters(self, client: httpx.AsyncClient, server_manager):
        """Test getting folders with special characters in names."""
        test_dir = server_manager.get_test_folder_path("special_chars_test")
        
        # Create directories with special characters
        special_dirs = [
            "folder with spaces",
            "folder-with-dashes",
            "folder_with_underscores",
            "folder.with.dots",
            "folder123",
        ]
        
        for dir_name in special_dirs:
            os.makedirs(os.path.join(test_dir, dir_name), exist_ok=True)
        
        response = await client.get(f"/api/folders?path={test_dir}")
        
        assert response.status_code == 200
        data = response.json()
        
        folder_names = [f["name"] for f in data["folders"]]
        
        # All special directories should be included
        for dir_name in special_dirs:
            assert dir_name in folder_names

    async def test_get_folders_path_traversal_security(self, client: httpx.AsyncClient):
        """Test that path traversal attempts are handled safely."""
        # Try various path traversal attempts
        malicious_paths = [
            "../../../etc",
            "..\\..\\..\\windows",
            "/etc/passwd",
            "../../../../",
        ]
        
        for malicious_path in malicious_paths:
            response = await client.get(f"/api/folders?path={malicious_path}")
            
            # Should either return an error or handle it safely
            # We don't want to expose sensitive system directories
            assert response.status_code in [200, 500]
            
            if response.status_code == 200:
                data = response.json()
                # If it succeeds, make sure it's not exposing sensitive paths
                current_path = data.get("currentPath", "")
                assert not any(sensitive in current_path.lower() for sensitive in [
                    "etc", "passwd", "windows", "system32"
                ])

    async def test_get_folders_url_encoding(self, client: httpx.AsyncClient, server_manager):
        """Test getting folders with URL-encoded paths."""
        test_dir = server_manager.get_test_folder_path("url_encoding_test")
        
        # Create a directory with spaces
        spaced_dir = os.path.join(test_dir, "folder with spaces")
        os.makedirs(spaced_dir, exist_ok=True)
        
        # Test with URL-encoded path
        import urllib.parse
        encoded_path = urllib.parse.quote(test_dir)
        
        response = await client.get(f"/api/folders?path={encoded_path}")
        
        # Should handle URL encoding properly
        assert response.status_code in [200, 500]  # Depends on implementation

    async def test_get_folders_very_long_path(self, client: httpx.AsyncClient):
        """Test getting folders with very long path."""
        # Create a very long path string
        long_path = "/tmp/" + "a" * 1000
        
        response = await client.get(f"/api/folders?path={long_path}")
        
        # Should handle long paths gracefully
        assert response.status_code in [200, 500]
        
        if response.status_code == 500:
            data = response.json()
            assert "error" in data

    async def test_get_folders_concurrent_requests(self, client: httpx.AsyncClient, server_manager):
        """Test concurrent requests to folders endpoint."""
        import asyncio
        
        test_dir = server_manager.get_test_folder_path("concurrent_test")
        
        # Make multiple concurrent requests
        async def make_request():
            return await client.get(f"/api/folders?path={test_dir}")
        
        tasks = [make_request() for _ in range(5)]
        responses = await asyncio.gather(*tasks)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert "currentPath" in data
            assert "folders" in data

    async def test_get_folders_response_format(self, client: httpx.AsyncClient, server_manager):
        """Test that folders response has correct format and types."""
        test_dir = server_manager.get_test_folder_path("format_test")
        
        # Create a test subdirectory
        subdir = os.path.join(test_dir, "testdir")
        os.makedirs(subdir, exist_ok=True)
        
        response = await client.get(f"/api/folders?path={test_dir}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify top-level structure
        assert isinstance(data, dict)
        assert set(data.keys()) == {"currentPath", "folders"}
        
        # Verify currentPath
        assert isinstance(data["currentPath"], str)
        assert data["currentPath"] == test_dir
        
        # Verify folders array
        assert isinstance(data["folders"], list)
        
        # Verify each folder object
        for folder in data["folders"]:
            assert isinstance(folder, dict)
            assert set(folder.keys()) == {"name", "path"}
            assert isinstance(folder["name"], str)
            assert isinstance(folder["path"], str)
            assert len(folder["name"]) > 0
            assert len(folder["path"]) > 0
            assert folder["path"].endswith(folder["name"])