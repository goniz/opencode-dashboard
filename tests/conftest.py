import asyncio
import os
import subprocess
import time
import httpx
import pytest
from typing import AsyncGenerator, Generator
import tempfile
import shutil


def find_free_port() -> int:
    """Find a free port to run the test server on."""
    import portpicker
    return portpicker.pick_unused_port()


class TestServerManager:
    """Manages the Next.js server lifecycle for tests."""
    
    def __init__(self):
        self.process = None
        self.port = None
        self.base_url = None
        self.temp_dir = None
        
    def start_server(self) -> str:
        """Start the Next.js server and return the base URL."""
        self.port = find_free_port()
        self.base_url = f"http://localhost:{self.port}"
        
        # Create a temporary directory for test workspace folders
        self.temp_dir = tempfile.mkdtemp(prefix="opencode_test_")
        
        # Set environment variables for the test server
        env = os.environ.copy()
        env["PORT"] = str(self.port)
        env["NODE_ENV"] = "test"
        
        # Start the Next.js server
        print(f"Starting test server on port {self.port}...")
        self.process = subprocess.Popen(
            ["npm", "run", "dev"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to be ready
        self._wait_for_server()
        
        return self.base_url
    
    def _wait_for_server(self, timeout: int = 60):
        """Wait for the server to be ready to accept requests."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                with httpx.Client() as client:
                    response = client.get(f"{self.base_url}/api/workspaces", timeout=5)
                    if response.status_code in [200, 404]:  # Server is responding
                        print(f"Server is ready at {self.base_url}")
                        return
            except (httpx.RequestError, httpx.TimeoutException):
                pass
            time.sleep(1)
        
        # If we get here, server didn't start properly
        if self.process:
            stdout, stderr = self.process.communicate(timeout=5)
            print(f"Server startup failed. STDOUT: {stdout}")
            print(f"Server startup failed. STDERR: {stderr}")
        raise TimeoutError(f"Server failed to start within {timeout} seconds")
    
    def stop_server(self):
        """Stop the Next.js server and cleanup."""
        if self.process:
            print("Stopping test server...")
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
            self.process = None
        
        # Cleanup temp directory
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def get_test_folder_path(self, folder_name: str = "test_project") -> str:
        """Get a path to a test folder within the temp directory."""
        if not self.temp_dir:
            raise RuntimeError("Server not started")
        
        folder_path = os.path.join(self.temp_dir, folder_name)
        os.makedirs(folder_path, exist_ok=True)
        
        # Create a simple test file
        with open(os.path.join(folder_path, "README.md"), "w") as f:
            f.write("# Test Project\nThis is a test project for API testing.")
        
        return folder_path


# Global server manager instance
_server_manager = None


@pytest.fixture(scope="session")
def server_manager() -> Generator[TestServerManager, None, None]:
    """Session-scoped fixture that manages the test server lifecycle."""
    global _server_manager
    _server_manager = TestServerManager()
    
    try:
        _server_manager.start_server()
        yield _server_manager
    finally:
        _server_manager.stop_server()


@pytest.fixture(scope="session")
def base_url(server_manager: TestServerManager) -> str:
    """Get the base URL of the test server."""
    return server_manager.base_url


@pytest.fixture
async def client(base_url: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client for making API requests."""
    async with httpx.AsyncClient(base_url=base_url, timeout=120.0) as client:
        yield client


@pytest.fixture
def test_folder(server_manager: TestServerManager) -> str:
    """Get a path to a test folder for workspace creation."""
    return server_manager.get_test_folder_path()


@pytest.fixture
def test_model() -> str:
    """Default model to use in tests."""
    return "anthropic/claude-3-5-haiku-20241022"


@pytest.fixture
async def test_workspace(client: httpx.AsyncClient, test_folder: str, test_model: str):
    """Create a test workspace and clean it up after the test."""
    # Create workspace
    response = await client.post("/api/workspaces", json={
        "folder": test_folder,
        "model": test_model
    })
    
    if response.status_code != 200:
        pytest.fail(f"Failed to create test workspace: {response.status_code} - {response.text}")
    
    workspace_data = response.json()
    workspace_id = workspace_data["id"]
    
    yield workspace_data
    
    # Cleanup: Stop the workspace to free resources
    try:
        # Make a DELETE request to stop the workspace
        await client.delete(f"/api/workspaces?id={workspace_id}")
    except Exception as e:
        print(f"Warning: Failed to cleanup workspace {workspace_id}: {e}")


@pytest.fixture
async def test_session(client: httpx.AsyncClient, test_workspace, test_model: str):
    """Create a test session within a workspace and clean it up after the test."""
    workspace_id = test_workspace["id"]
    
    # Create session
    response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
        "model": test_model
    })
    
    if response.status_code != 200:
        pytest.fail(f"Failed to create test session: {response.status_code} - {response.text}")
    
    session_data = response.json()
    session_id = session_data["id"]
    
    yield session_data
    
    # Cleanup: Try to delete the session (if endpoint exists)
    # Note: Based on the API analysis, there might not be a delete endpoint
    # so we'll just let the server cleanup when it shuts down