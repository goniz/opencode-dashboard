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
    import socket
    import time
    
    # Use worker-specific port ranges to minimize conflicts
    worker_id = os.environ.get("WORKER_ID", "master")
    base_port = 8000
    
    if worker_id != "master":
        try:
            # Use worker id to determine port range (gw0, gw1, gw2, etc.)
            worker_num = int(worker_id.replace("gw", ""))
            base_port = 8000 + (worker_num * 1000)  # gw0: 8000, gw1: 9000, gw2: 10000, etc.
        except ValueError:
            base_port = 8000
    
    print(f"Using base port range {base_port} for worker {worker_id}")
    
    for attempt in range(10):  # Try more times
        try:
            # Try portpicker first if available
            import portpicker
            port = portpicker.pick_unused_port()
            
            # Verify the port is actually available by binding to it
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('localhost', port))
                return port
        except (ImportError, OSError):
            # Fallback to manual port selection with worker offset
            port = base_port + (attempt * 10)  # Spread out attempts
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    s.bind(('localhost', port))
                    # Verify we can bind again (to catch race conditions)
                    s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    try:
                        s2.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                        s2.bind(('localhost', port))
                        s2.close()
                    except OSError:
                        continue  # Port might be taken, try next
                    return port
            except OSError:
                if attempt == 9:  # Last attempt
                    print(f"Could not find free port after 10 attempts for worker {worker_id}")
                    raise RuntimeError(f"Could not find free port for worker {worker_id}")
                time.sleep(0.1)  # Small delay before retry
                continue
    
    raise RuntimeError("Could not find a free port")


class TestServerManager:
    """Manages the Next.js server lifecycle for tests."""
    
    def __init__(self):
        self.process = None
        self.port = None
        self.base_url = None
        self.temp_dir = None
        
    def start_production_server(self, worker_id: str = "master") -> str:
        """Start the Next.js production server and return the base URL."""
        print(f"Worker {worker_id}: Starting production server setup...")
        
        # Find a truly free port with verification
        self.port = find_free_port()
        self.base_url = f"http://localhost:{self.port}"
        
        # Create a temporary directory for test workspace folders
        self.temp_dir = tempfile.mkdtemp(prefix=f"opencode_test_{worker_id}_")
        
        # Set environment variables for the production server with isolation
        env = os.environ.copy()
        env["PORT"] = str(self.port)
        env["NODE_ENV"] = "production"
        
        # Add worker-specific environment variables for isolation
        env["WORKER_ID"] = worker_id
        env["TEST_TEMP_DIR"] = self.temp_dir
        env["NEXT_PUBLIC_WORKER_ID"] = worker_id
        env["TMPDIR"] = self.temp_dir
        
        # Use a unique hostname for each worker to avoid conflicts
        env["HOSTNAME"] = f"localhost-{worker_id}"
        
        print(f"Worker {worker_id}: Starting production test server on port {self.port}...")
        print(f"Worker {worker_id}: Using temp directory: {self.temp_dir}")
        
        # Get the project root directory (parent of tests directory)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Start the Next.js production server
        self.process = subprocess.Popen(
            ["npm", "start"],
            env=env,
            cwd=project_root,  # Ensure we run from the project root
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            # Prevent zombie processes
            preexec_fn=os.setsid if hasattr(os, 'setsid') else None
        )
        
        # Wait for server to be ready with longer timeout
        print(f"Worker {worker_id}: Waiting for production server to be ready...")
        self._wait_for_production_server(worker_id)
        
        return self.base_url
    
    
    
    def _wait_for_production_server(self, worker_id: str = "master", timeout: int = 60):
        """Wait for the production server to be ready to accept requests."""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check if process is still running
            if self.process.poll() is not None:
                stdout, stderr = self.process.communicate()
                print(f"Production server process for worker {worker_id} exited. STDOUT: {stdout}")
                print(f"Production server process for worker {worker_id} exited. STDERR: {stderr}")
                raise RuntimeError(f"Production server process for worker {worker_id} exited unexpectedly")
            
            try:
                with httpx.Client() as client:
                    # Test basic health check
                    response = client.get(f"{self.base_url}", timeout=10)
                    print(f"Worker {worker_id}: Basic health check returned {response.status_code}")
                    
                    # Test API endpoint to ensure server is ready
                    api_response = client.get(f"{self.base_url}/api/workspaces", timeout=10)
                    print(f"Worker {worker_id}: API endpoint returned {api_response.status_code}")
                    
                    # Production servers should respond quickly and consistently
                    if api_response.status_code in [200, 404]:
                        print(f"Production server for worker {worker_id} is ready at {self.base_url}")
                        return
                    
            except (httpx.RequestError, httpx.TimeoutException) as e:
                print(f"Worker {worker_id}: Production server not ready yet ({str(e)}), waiting...")
                pass
            
            time.sleep(1)
        
        # If we get here, server didn't start properly
        if self.process:
            try:
                stdout, stderr = self.process.communicate(timeout=5)
                print(f"Production server startup failed for worker {worker_id}.")
                print(f"STDOUT: {stdout[:500]}...")
                print(f"STDERR: {stderr[:500]}...")
            except subprocess.TimeoutExpired:
                print(f"Production server process for worker {worker_id} is still running but not responding")
        raise TimeoutError(f"Production server for worker {worker_id} failed to start within {timeout} seconds")
    

    def stop_server(self):
        """Stop the Next.js server and cleanup."""
        if self.process:
            print("Stopping test server...")
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                print("Force killing test server...")
                self.process.kill()
                self.process.wait()
            except Exception as e:
                print(f"Error stopping server: {e}")
            finally:
                self.process = None
        
        # Cleanup temp directory with retries
        if self.temp_dir and os.path.exists(self.temp_dir):
            for attempt in range(3):  # Try up to 3 times
                try:
                    shutil.rmtree(self.temp_dir)
                    break
                except OSError as e:
                    if attempt == 2:  # Last attempt
                        print(f"Warning: Could not cleanup temp dir {self.temp_dir}: {e}")
                    else:
                        time.sleep(1)  # Wait before retry
        
        # Clean up master port file
        master_port_file = "/tmp/opencode_master_port"
        if os.path.exists(master_port_file):
            try:
                os.remove(master_port_file)
            except OSError:
                pass
    
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


def ensure_build_completed():
    """Ensure the Next.js application is built before starting any servers."""
    import threading
    import fcntl  # For file-based locking
    import shutil
    
    # Use a file-based lock that works across processes
    lock_file = "/tmp/opencode_build.lock"
    
    try:
        # Create lock file if it doesn't exist
        with open(lock_file, "w") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            
            # Check if build is already completed by looking for .next directory
            if not os.path.exists(".next"):
                print("Building Next.js application for testing...")
                
                # Clean any existing build artifacts to ensure clean build
                if os.path.exists(".next"):
                    shutil.rmtree(".next")
                
                build_process = subprocess.Popen(
                    ["npm", "run", "build"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = build_process.communicate(timeout=180)  # 3 minute timeout for build
                
                if build_process.returncode != 0:
                    print(f"Build failed. STDOUT: {stdout}")
                    print(f"Build failed. STDERR: {stderr}")
                    raise RuntimeError(f"Failed to build Next.js application: {stderr}")
                
                # Verify build artifacts exist
                if not os.path.exists(".next"):
                    raise RuntimeError("Build completed but .next directory not found")
                
                print("Next.js application built successfully")
            else:
                print("Using existing Next.js build")
            
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except (IOError, OSError) as e:
        print(f"File locking failed ({e}), falling back to simple build check")
        # Fallback to simple directory check if file locking fails
        if not os.path.exists(".next"):
            print("Building Next.js application for testing...")
            
            # Clean any existing build artifacts
            if os.path.exists(".next"):
                shutil.rmtree(".next")
            
            build_process = subprocess.Popen(
                ["npm", "run", "build"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = build_process.communicate(timeout=180)
            
            if build_process.returncode != 0:
                print(f"Build failed. STDOUT: {stdout}")
                print(f"Build failed. STDERR: {stderr}")
                raise RuntimeError(f"Failed to build Next.js application: {stderr}")
            
            if not os.path.exists(".next"):
                raise RuntimeError("Build completed but .next directory not found")
            
            print("Next.js application built successfully")


@pytest.fixture(scope="session")
def server_manager(request) -> Generator[TestServerManager, None, None]:
    """Session-scoped fixture that manages the test server lifecycle."""
    # Get worker ID for xdist parallel execution
    worker_input = getattr(request.config, "workerinput", {})
    worker_id = worker_input.get("workerid", "master")
    
    # Ensure build is completed before starting server
    ensure_build_completed()
    
    # Each worker gets its own production server instance
    print(f"Worker {worker_id}: Starting production server instance")
    worker_server_manager = TestServerManager()
    
    try:
        worker_server_manager.start_production_server(worker_id=worker_id)
        yield worker_server_manager
    finally:
        worker_server_manager.stop_server()


@pytest.fixture(scope="session")
def base_url(server_manager: TestServerManager) -> str:
    """Get the base URL of the test server."""
    return server_manager.base_url


@pytest.fixture
async def client(base_url: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client for making API requests."""
    async with httpx.AsyncClient(base_url=base_url, timeout=180.0) as client:
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
async def test_workspace(client: httpx.AsyncClient, server_manager: TestServerManager, test_model: str):
    """Create a unique test workspace for each test to enable parallel execution."""
    import uuid
    
    # Create unique test folder for this test
    unique_folder_name = f"test_project_{uuid.uuid4().hex[:8]}"
    test_folder = server_manager.get_test_folder_path(unique_folder_name)
    
    # Create workspace
    response = await client.post("/api/workspaces", json={
        "folder": test_folder,
        "model": test_model
    })
    
    if response.status_code != 200:
        pytest.fail(f"Failed to create test workspace: {response.status_code} - {response.text}")
    
    workspace_data = response.json()
    workspace_id = workspace_data["id"]
    
    # Wait for workspace to be fully running before proceeding
    max_wait_time = 30  # 30 seconds timeout
    wait_interval = 0.5  # Check every 500ms
    elapsed_time = 0
    
    while elapsed_time < max_wait_time:
        # Check workspace status
        status_response = await client.get("/api/workspaces")
        if status_response.status_code == 200:
            workspaces = status_response.json()
            workspace = next((ws for ws in workspaces if ws["id"] == workspace_id), None)
            if workspace and workspace["status"] == "running":
                print(f"Workspace {workspace_id} is now running")
                break
        
        await asyncio.sleep(wait_interval)
        elapsed_time += wait_interval
    else:
        pytest.fail(f"Workspace {workspace_id} did not reach 'running' status within {max_wait_time} seconds")
    
    yield workspace_data
    
    # Cleanup: Stop the workspace to free resources
    try:
        # Make a DELETE request to stop the workspace
        await client.delete(f"/api/workspaces?id={workspace_id}")
    except Exception as e:
        print(f"Warning: Failed to cleanup workspace {workspace_id}: {e}")


@pytest.fixture
async def test_session(client: httpx.AsyncClient, test_workspace, test_model: str):
    """Create a unique test session for each test to enable parallel execution."""
    workspace_id = test_workspace["id"]
    
    # Create session - each test gets its own session within its own workspace
    max_retries = 3
    retry_delay = 1.0  # 1 second between retries
    
    for attempt in range(max_retries):
        response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
            "model": test_model
        })
        
        if response.status_code == 200:
            break
        elif response.status_code == 404:
            # Workspace might not be ready yet, wait and retry
            if attempt < max_retries - 1:
                print(f"Workspace {workspace_id} not ready, retrying session creation (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(retry_delay)
                continue
        
        pytest.fail(f"Failed to create test session after {max_retries} attempts: {response.status_code} - {response.text}")
    
    session_data = response.json()
    session_id = session_data["id"]
    
    # Verify session was created successfully by checking it exists
    verify_response = await client.get(f"/api/workspaces/{workspace_id}/sessions")
    if verify_response.status_code == 200:
        sessions = verify_response.json()
        if not any(session["id"] == session_id for session in sessions):
            pytest.fail(f"Session {session_id} was not found after creation")
    
    yield session_data
    
    # Cleanup: Try to delete the session (if endpoint exists)
    # Note: Based on the API analysis, there might not be a delete endpoint
    # so we'll just let the server cleanup when it shuts down