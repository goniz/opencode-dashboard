"""
Test for OpenCode server instance leak detection on web app shutdown.

This test verifies that the web application properly cleans up OpenCode server
instances when shutting down, preventing process leaks that could accumulate
over time and consume system resources.
"""

import asyncio
import os
import psutil
import signal
import subprocess
import time
import httpx
import pytest
from typing import List, Set

pytestmark = [pytest.mark.serial, pytest.mark.skip(reason="Excluded from default test runs")]


class ProcessTracker:
    """Utility class to track OpenCode server processes."""
    
    def __init__(self):
        self.initial_processes: Set[int] = set()
        self.tracked_processes: Set[int] = set()
    
    def get_opencode_processes(self) -> List[psutil.Process]:
        """Get all currently running OpenCode server processes."""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                # Look for processes that are OpenCode servers
                cmdline = proc.info['cmdline'] or []
                if (any('opencode' in str(arg).lower() for arg in cmdline) and 
                    any('serve' in str(arg) for arg in cmdline)):
                    processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return processes
    
    def snapshot_initial_state(self):
        """Take a snapshot of OpenCode processes before test starts."""
        self.initial_processes = {proc.pid for proc in self.get_opencode_processes()}
        print(f"Initial OpenCode processes: {len(self.initial_processes)}")
    
    def track_new_processes(self):
        """Track any new OpenCode processes that have started."""
        current_processes = {proc.pid for proc in self.get_opencode_processes()}
        new_processes = current_processes - self.initial_processes
        self.tracked_processes.update(new_processes)
        print(f"New OpenCode processes detected: {len(new_processes)}")
        return new_processes
    
    def check_for_leaks(self) -> List[psutil.Process]:
        """Check if any tracked processes are still running (indicating a leak)."""
        leaked_processes = []
        for pid in self.tracked_processes:
            try:
                proc = psutil.Process(pid)
                if proc.is_running():
                    leaked_processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                # Process is gone, which is what we want
                continue
        return leaked_processes
    
    def force_cleanup_leaked_processes(self):
        """Force cleanup any leaked processes (for test cleanup)."""
        leaked = self.check_for_leaks()
        for proc in leaked:
            try:
                print(f"Force cleaning up leaked process {proc.pid}")
                proc.terminate()
                proc.wait(timeout=5)
            except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                try:
                    proc.kill()
                except psutil.NoSuchProcess:
                    pass


@pytest.fixture
def process_tracker():
    """Fixture that provides process tracking and cleanup."""
    tracker = ProcessTracker()
    tracker.snapshot_initial_state()
    
    yield tracker
    
    # Cleanup any leaked processes after test
    tracker.force_cleanup_leaked_processes()


async def test_opencode_server_leak_on_shutdown(client: httpx.AsyncClient, process_tracker: ProcessTracker, test_model: str):
    """
    Test that OpenCode server instances are properly cleaned up when workspaces are stopped.
    
    This test:
    1. Creates multiple workspaces (which spawn OpenCode server processes)
    2. Tracks the OpenCode server processes that get created
    3. Stops the workspaces
    4. Verifies that all OpenCode server processes are properly terminated
    5. Ensures no process leaks remain
    """
    
    # Step 1: Create multiple workspaces to spawn OpenCode servers
    workspace_ids = []
    test_folders = []
    
    try:
        # Create 3 test workspaces to increase chance of detecting leaks
        for i in range(3):
            # Create a unique test folder for each workspace
            test_folder = f"/tmp/opencode_leak_test_{i}_{int(time.time())}"
            os.makedirs(test_folder, exist_ok=True)
            
            # Create a simple test file in the folder
            with open(os.path.join(test_folder, "README.md"), "w") as f:
                f.write(f"# Test Project {i}\nThis is test project {i} for leak detection.")
            
            test_folders.append(test_folder)
            
            # Create workspace
            response = await client.post("/api/workspaces", json={
                "folder": test_folder,
                "model": test_model
            })
            
            assert response.status_code == 200, f"Failed to create workspace {i}: {response.text}"
            workspace_data = response.json()
            workspace_ids.append(workspace_data["id"])
            print(f"Created workspace {i}: {workspace_data['id']}")
        
        # Step 2: Wait for workspaces to fully start and track new processes
        await asyncio.sleep(5)  # Give time for OpenCode servers to start
        new_processes = process_tracker.track_new_processes()
        
        # Verify that we actually created some OpenCode processes
        assert len(new_processes) > 0, "No new OpenCode processes were detected after creating workspaces"
        print(f"Detected {len(new_processes)} new OpenCode server processes")
        
        # Step 3: Create sessions in each workspace to ensure they're fully active
        session_ids = []
        for workspace_id in workspace_ids:
            response = await client.post(f"/api/workspaces/{workspace_id}/sessions", json={
                "model": test_model
            })
            assert response.status_code == 200, f"Failed to create session for workspace {workspace_id}"
            session_data = response.json()
            session_ids.append((workspace_id, session_data["id"]))
            print(f"Created session {session_data['id']} in workspace {workspace_id}")
        
        # Step 4: Stop all workspaces
        print("Stopping all workspaces...")
        for workspace_id in workspace_ids:
            response = await client.delete(f"/api/workspaces?id={workspace_id}")
            # Note: The API might return 404 if workspace is already stopped, which is okay
            if response.status_code not in [200, 404]:
                print(f"Warning: Failed to stop workspace {workspace_id}: {response.status_code} - {response.text}")
        
        # Step 5: Wait for processes to be cleaned up
        print("Waiting for OpenCode server processes to be cleaned up...")
        await asyncio.sleep(10)  # Give time for graceful shutdown
        
        # Step 6: Check for leaked processes
        leaked_processes = process_tracker.check_for_leaks()
        
        # Step 7: Assert no leaks
        if leaked_processes:
            leak_info = []
            for proc in leaked_processes:
                try:
                    leak_info.append({
                        'pid': proc.pid,
                        'cmdline': proc.cmdline(),
                        'status': proc.status(),
                        'create_time': proc.create_time()
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            pytest.fail(
                f"OpenCode server process leak detected! {len(leaked_processes)} processes are still running:\n" +
                "\n".join([f"PID {info['pid']}: {' '.join(info['cmdline'])}" for info in leak_info])
            )
        
        print("✅ No OpenCode server process leaks detected - all processes properly cleaned up")
        
    finally:
        # Cleanup test folders
        for test_folder in test_folders:
            try:
                import shutil
                if os.path.exists(test_folder):
                    shutil.rmtree(test_folder)
            except Exception as e:
                print(f"Warning: Could not cleanup test folder {test_folder}: {e}")


async def test_opencode_server_leak_on_app_shutdown(base_url: str, process_tracker: ProcessTracker, test_model: str):
    """
    Test that OpenCode server instances are cleaned up when the entire web app shuts down.
    
    This test simulates a more realistic scenario where the web application itself
    is terminated and verifies that all OpenCode server processes are properly cleaned up.
    """
    
    # This test requires starting a separate instance of the web app
    # to test shutdown behavior without affecting the main test server
    
    # Step 1: Start a separate web app instance
    import tempfile
    import subprocess
    
    # Create a temporary directory for this test instance
    with tempfile.TemporaryDirectory() as temp_dir:
        # Find a free port for the test instance
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', 0))
            test_port = s.getsockname()[1]
        
        # Start the web app in a subprocess
        env = os.environ.copy()
        env["PORT"] = str(test_port)
        env["NODE_ENV"] = "production"
        env["TEST_TEMP_DIR"] = temp_dir
        
        print(f"Starting test web app instance on port {test_port}")
        app_process = subprocess.Popen(
            ["npm", "start"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Step 2: Wait for the app to start
            test_base_url = f"http://localhost:{test_port}"
            start_time = time.time()
            app_ready = False
            
            while time.time() - start_time < 30:  # 30 second timeout
                try:
                    async with httpx.AsyncClient() as test_client:
                        response = await test_client.get(f"{test_base_url}/api/workspaces", timeout=5)
                        if response.status_code in [200, 404]:
                            app_ready = True
                            break
                except (httpx.RequestError, httpx.TimeoutException):
                    pass
                await asyncio.sleep(1)
            
            if not app_ready:
                pytest.skip("Test web app instance failed to start within timeout")
            
            print("Test web app instance is ready")
            
            # Step 3: Create workspaces through the test instance
            async with httpx.AsyncClient(base_url=test_base_url, timeout=30.0) as test_client:
                workspace_ids = []
                
                for i in range(2):
                    test_folder = os.path.join(temp_dir, f"test_project_{i}")
                    os.makedirs(test_folder, exist_ok=True)
                    
                    with open(os.path.join(test_folder, "README.md"), "w") as f:
                        f.write(f"# Test Project {i}\nShutdown test project {i}.")
                    
                    response = await test_client.post("/api/workspaces", json={
                        "folder": test_folder,
                        "model": test_model
                    })
                    
                    if response.status_code == 200:
                        workspace_data = response.json()
                        workspace_ids.append(workspace_data["id"])
                        print(f"Created workspace {i} in test instance: {workspace_data['id']}")
                
                # Step 4: Wait for OpenCode servers to start and track them
                await asyncio.sleep(5)
                new_processes = process_tracker.track_new_processes()
                
                if len(new_processes) == 0:
                    pytest.skip("No OpenCode processes were created by test instance")
                
                print(f"Test instance created {len(new_processes)} OpenCode server processes")
            
            # Step 5: Terminate the web app process (simulating shutdown)
            print("Terminating test web app instance...")
            app_process.terminate()
            
            # Wait for graceful shutdown
            try:
                app_process.wait(timeout=15)
                print("Test web app instance terminated gracefully")
            except subprocess.TimeoutExpired:
                print("Test web app instance did not terminate gracefully, force killing...")
                app_process.kill()
                app_process.wait()
            
            # Step 6: Wait additional time for cleanup
            await asyncio.sleep(5)
            
            # Step 7: Check for leaked processes
            leaked_processes = process_tracker.check_for_leaks()
            
            # Step 8: Assert no leaks
            if leaked_processes:
                leak_info = []
                for proc in leaked_processes:
                    try:
                        leak_info.append({
                            'pid': proc.pid,
                            'cmdline': proc.cmdline(),
                            'status': proc.status()
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                
                pytest.fail(
                    f"OpenCode server process leak detected after app shutdown! " +
                    f"{len(leaked_processes)} processes are still running:\n" +
                    "\n".join([f"PID {info['pid']}: {' '.join(info['cmdline'])}" for info in leak_info])
                )
            
            print("✅ No OpenCode server process leaks detected after app shutdown")
            
        finally:
            # Ensure the test app process is cleaned up
            if app_process.poll() is None:
                try:
                    app_process.terminate()
                    app_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    app_process.kill()
                    app_process.wait()


async def test_opencode_server_cleanup_on_sigterm(process_tracker: ProcessTracker, test_model: str):
    """
    Test that OpenCode server instances are cleaned up when the web app receives SIGTERM.
    
    This test verifies that the process cleanup manager properly handles SIGTERM signals
    and ensures all OpenCode server processes are terminated.
    """
    
    # This test is similar to the app shutdown test but specifically tests SIGTERM handling
    import tempfile
    import subprocess
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Find a free port
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', 0))
            test_port = s.getsockname()[1]
        
        # Start the web app
        env = os.environ.copy()
        env["PORT"] = str(test_port)
        env["NODE_ENV"] = "production"
        env["TEST_TEMP_DIR"] = temp_dir
        
        print(f"Starting test web app for SIGTERM test on port {test_port}")
        app_process = subprocess.Popen(
            ["npm", "start"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            # Wait for app to start
            test_base_url = f"http://localhost:{test_port}"
            start_time = time.time()
            app_ready = False
            
            while time.time() - start_time < 30:
                try:
                    async with httpx.AsyncClient() as test_client:
                        response = await test_client.get(f"{test_base_url}/api/workspaces", timeout=5)
                        if response.status_code in [200, 404]:
                            app_ready = True
                            break
                except (httpx.RequestError, httpx.TimeoutException):
                    pass
                await asyncio.sleep(1)
            
            if not app_ready:
                pytest.skip("Test web app instance failed to start for SIGTERM test")
            
            # Create a workspace
            async with httpx.AsyncClient(base_url=test_base_url, timeout=30.0) as test_client:
                test_folder = os.path.join(temp_dir, "sigterm_test_project")
                os.makedirs(test_folder, exist_ok=True)
                
                with open(os.path.join(test_folder, "README.md"), "w") as f:
                    f.write("# SIGTERM Test Project\nTesting SIGTERM cleanup.")
                
                response = await test_client.post("/api/workspaces", json={
                    "folder": test_folder,
                    "model": test_model
                })
                
                if response.status_code != 200:
                    pytest.skip("Failed to create workspace for SIGTERM test")
                
                workspace_data = response.json()
                print(f"Created workspace for SIGTERM test: {workspace_data['id']}")
            
            # Track new processes
            await asyncio.sleep(5)
            new_processes = process_tracker.track_new_processes()
            
            if len(new_processes) == 0:
                pytest.skip("No OpenCode processes created for SIGTERM test")
            
            print(f"SIGTERM test created {len(new_processes)} OpenCode server processes")
            
            # Send SIGTERM to the web app process
            print("Sending SIGTERM to test web app...")
            app_process.send_signal(signal.SIGTERM)
            
            # Wait for graceful shutdown
            try:
                app_process.wait(timeout=20)  # Give more time for graceful shutdown
                print("Test web app handled SIGTERM gracefully")
            except subprocess.TimeoutExpired:
                print("Test web app did not respond to SIGTERM, force killing...")
                app_process.kill()
                app_process.wait()
            
            # Wait for cleanup
            await asyncio.sleep(5)
            
            # Check for leaks
            leaked_processes = process_tracker.check_for_leaks()
            
            if leaked_processes:
                leak_info = []
                for proc in leaked_processes:
                    try:
                        leak_info.append({
                            'pid': proc.pid,
                            'cmdline': proc.cmdline(),
                            'status': proc.status()
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                
                pytest.fail(
                    f"OpenCode server process leak detected after SIGTERM! " +
                    f"{len(leaked_processes)} processes are still running:\n" +
                    "\n".join([f"PID {info['pid']}: {' '.join(info['cmdline'])}" for info in leak_info])
                )
            
            print("✅ No OpenCode server process leaks detected after SIGTERM")
            
        finally:
            if app_process.poll() is None:
                try:
                    app_process.terminate()
                    app_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    app_process.kill()
                    app_process.wait()