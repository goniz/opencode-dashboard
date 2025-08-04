# Test Subprocess Cleanup Plan

**Status**: ⏳ Not Started  
**Created**: 2025-01-27  
**Last Updated**: 2025-01-27

## Overview

This plan ensures proper cleanup of `npm run dev` subprocesses spawned during pytest test execution. Currently, the test infrastructure in `tests/conftest.py` uses basic subprocess management that can leave orphaned Node.js processes when tests are interrupted, killed, or crash unexpectedly.

## Progress Tracking

- [ ] **Phase 1**: Enhanced Test Server Manager *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 2**: Pytest Signal Handling & Cleanup *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 3**: Process Monitoring & Health Checks *(3/3 tasks)* ⏳ *Not Started*
- [ ] **Phase 4**: CI/CD Integration & Testing *(4/4 tasks)* ⏳ *Not Started*

---

## Current Issues Identified

### Critical Problems
1. **Orphaned npm processes** - `npm run dev` processes can survive pytest termination
2. **No pytest signal handling** - No cleanup when pytest receives SIGTERM/SIGINT
3. **Basic process cleanup** - Only uses `terminate()` and `kill()` without verification
4. **No process monitoring** - Long-running test sessions don't monitor server health
5. **Resource leaks** - Failed cleanup can leave ports occupied and temp files

### Current Test Infrastructure Limitations
- `TestServerManager.stop_server()` uses basic timeout-based cleanup
- No process group management for npm and its child processes
- No verification that server actually stopped
- No cleanup retry logic or error recovery
- Session-scoped fixture means server runs for entire test session

### Impact on Development
- **Developer workflow** - Orphaned processes can block subsequent test runs
- **CI/CD reliability** - Failed cleanup can cause build failures
- **Resource consumption** - Multiple orphaned processes consume system resources
- **Port conflicts** - Orphaned servers can occupy ports needed for new tests

---

## Phase 1: Enhanced Test Server Manager
**Status**: ⏳ Not Started  
**Goal**: Improve the TestServerManager class with robust process management

### Tasks
- [ ] **1.1** Enhance process lifecycle management
  ```python
  # tests/conftest.py - Enhanced TestServerManager
  class TestServerManager:
      def __init__(self):
          self.process = None
          self.port = None
          self.base_url = None
          self.temp_dir = None
          self.process_group_id = None  # NEW: Track process group
          self.cleanup_handlers = []    # NEW: Cleanup handler registry
          self.is_shutting_down = False # NEW: Shutdown state
          
      def start_server(self) -> str:
          # Use process groups for better cleanup
          self.process = subprocess.Popen(
              ["npm", "run", "dev"],
              env=env,
              stdout=subprocess.PIPE,
              stderr=subprocess.PIPE,
              text=True,
              preexec_fn=os.setsid,  # Create new process group
              start_new_session=True  # Ensure process group isolation
          )
          self.process_group_id = os.getpgid(self.process.pid)
  ```

- [ ] **1.2** Implement robust server shutdown
  ```python
  async def stop_server(self, timeout: int = 15, force_timeout: int = 5) -> bool:
      """Enhanced server shutdown with verification and retry logic."""
      if not self.process or self.is_shutting_down:
          return True
          
      self.is_shutting_down = True
      
      try:
          # 1. Graceful shutdown - send SIGTERM to process group
          if self.process_group_id:
              os.killpg(self.process_group_id, signal.SIGTERM)
          else:
              self.process.terminate()
          
          # 2. Wait for graceful shutdown
          try:
              self.process.wait(timeout=timeout)
              return await self._verify_cleanup()
          except subprocess.TimeoutExpired:
              pass
          
          # 3. Force shutdown - send SIGKILL to process group
          if self.process_group_id:
              os.killpg(self.process_group_id, signal.SIGKILL)
          else:
              self.process.kill()
              
          self.process.wait(timeout=force_timeout)
          return await self._verify_cleanup()
          
      except Exception as e:
          print(f"Error during server shutdown: {e}")
          return False
      finally:
          self.is_shutting_down = False
  ```

- [ ] **1.3** Add cleanup verification and retry logic
  ```python
  async def _verify_cleanup(self) -> bool:
      """Verify that server and all child processes are actually stopped."""
      # Check if main process is dead
      if self.process and self.process.poll() is None:
          return False
      
      # Check if port is released
      if self.port and self._is_port_in_use(self.port):
          return False
      
      # Check for orphaned npm/node processes
      orphaned_processes = self._find_orphaned_processes()
      if orphaned_processes:
          print(f"Found {len(orphaned_processes)} orphaned processes")
          await self._cleanup_orphaned_processes(orphaned_processes)
      
      return True
  
  def _find_orphaned_processes(self) -> List[int]:
      """Find any npm/node processes that might be orphaned."""
      import psutil
      orphaned = []
      
      for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
          try:
              if proc.info['name'] in ['node', 'npm'] and self.port:
                  # Check if process is using our test port
                  for conn in proc.connections():
                      if conn.laddr.port == self.port:
                          orphaned.append(proc.info['pid'])
          except (psutil.NoSuchProcess, psutil.AccessDenied):
              pass
      
      return orphaned
  ```

- [ ] **1.4** Implement process health monitoring
  ```python
  def start_health_monitoring(self):
      """Start background health monitoring for long-running test sessions."""
      import threading
      
      def monitor_health():
          while not self.is_shutting_down and self.process:
              time.sleep(30)  # Check every 30 seconds
              
              if self.process.poll() is not None:
                  print("Test server process died unexpectedly")
                  self._handle_unexpected_death()
                  break
              
              # Check if server is still responding
              if not self._is_server_responsive():
                  print("Test server is not responding")
                  self._handle_unresponsive_server()
      
      self.health_monitor = threading.Thread(target=monitor_health, daemon=True)
      self.health_monitor.start()
  
  def _is_server_responsive(self) -> bool:
      """Check if server is still responding to requests."""
      try:
          with httpx.Client(timeout=5) as client:
              response = client.get(f"{self.base_url}/api/workspaces")
              return response.status_code in [200, 404]
      except:
          return False
  ```

---

## Phase 2: Pytest Signal Handling & Cleanup
**Status**: ⏳ Not Started  
**Goal**: Add global signal handlers and pytest integration for reliable cleanup

### Tasks
- [ ] **2.1** Create pytest cleanup plugin
  ```python
  # tests/pytest_cleanup_plugin.py
  import signal
  import atexit
  import pytest
  from typing import List, Callable
  
  class PytestCleanupManager:
      """Manages cleanup handlers for pytest test runs."""
      
      def __init__(self):
          self.cleanup_handlers: List[Callable] = []
          self.is_shutting_down = False
          self.original_handlers = {}
          
      def register_cleanup_handler(self, handler: Callable):
          """Register a cleanup handler to be called on shutdown."""
          self.cleanup_handlers.append(handler)
      
      def setup_signal_handlers(self):
          """Setup signal handlers for graceful cleanup."""
          signals_to_handle = [signal.SIGTERM, signal.SIGINT]
          
          for sig in signals_to_handle:
              self.original_handlers[sig] = signal.signal(sig, self._signal_handler)
          
          # Register atexit handler as fallback
          atexit.register(self._cleanup_all)
      
      def _signal_handler(self, signum, frame):
          """Handle shutdown signals."""
          print(f"Received signal {signum}, initiating test cleanup...")
          self._cleanup_all()
          
          # Call original handler if it exists
          if signum in self.original_handlers:
              original = self.original_handlers[signum]
              if callable(original):
                  original(signum, frame)
  
  # Global cleanup manager instance
  cleanup_manager = PytestCleanupManager()
  ```

- [ ] **2.2** Integrate with pytest hooks
  ```python
  # tests/conftest.py - Add pytest hooks
  def pytest_configure(config):
      """Called after command line options have been parsed."""
      from .pytest_cleanup_plugin import cleanup_manager
      cleanup_manager.setup_signal_handlers()
  
  def pytest_sessionstart(session):
      """Called after the Session object has been created."""
      print("Test session starting - cleanup handlers active")
  
  def pytest_sessionfinish(session, exitstatus):
      """Called after whole test run finished."""
      print("Test session finishing - running cleanup handlers")
      from .pytest_cleanup_plugin import cleanup_manager
      cleanup_manager._cleanup_all()
  
  def pytest_keyboard_interrupt(excinfo):
      """Called when KeyboardInterrupt is raised."""
      print("Keyboard interrupt detected - running emergency cleanup")
      from .pytest_cleanup_plugin import cleanup_manager
      cleanup_manager._cleanup_all()
  ```

- [ ] **2.3** Enhanced server manager fixture with cleanup registration
  ```python
  @pytest.fixture(scope="session")
  def server_manager() -> Generator[TestServerManager, None, None]:
      """Session-scoped fixture with enhanced cleanup."""
      from .pytest_cleanup_plugin import cleanup_manager
      
      manager = TestServerManager()
      
      # Register cleanup handler with pytest cleanup manager
      cleanup_manager.register_cleanup_handler(manager.stop_server)
      
      try:
          manager.start_server()
          manager.start_health_monitoring()
          yield manager
      except Exception as e:
          print(f"Server startup failed: {e}")
          # Ensure cleanup even if startup fails
          manager.stop_server()
          raise
      finally:
          # Final cleanup
          manager.stop_server()
  ```

- [ ] **2.4** Add emergency cleanup procedures
  ```python
  def emergency_cleanup():
      """Emergency cleanup for when normal cleanup fails."""
      import psutil
      import os
      
      print("Running emergency cleanup...")
      
      # Find and kill all npm/node processes started by tests
      for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
          try:
              if proc.info['name'] in ['node', 'npm']:
                  cmdline = ' '.join(proc.info['cmdline'] or [])
                  if 'npm run dev' in cmdline or 'next dev' in cmdline:
                      print(f"Killing orphaned process: {proc.info['pid']}")
                      proc.kill()
          except (psutil.NoSuchProcess, psutil.AccessDenied):
              pass
      
      # Clean up any test temp directories
      import tempfile
      import shutil
      temp_dir = tempfile.gettempdir()
      for item in os.listdir(temp_dir):
          if item.startswith('opencode_test_'):
              try:
                  shutil.rmtree(os.path.join(temp_dir, item))
              except:
                  pass
  ```

---

## Phase 3: Process Monitoring & Health Checks
**Status**: ⏳ Not Started  
**Goal**: Add comprehensive monitoring and health checks for test processes

### Tasks
- [ ] **3.1** Implement process tree monitoring
  ```python
  class ProcessTreeMonitor:
      """Monitor entire process tree for test server and its children."""
      
      def __init__(self, root_process: subprocess.Popen):
          self.root_process = root_process
          self.process_tree = {}
          self.monitoring = False
      
      def start_monitoring(self):
          """Start monitoring the process tree."""
          import threading
          self.monitoring = True
          self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
          self.monitor_thread.start()
      
      def _monitor_loop(self):
          """Main monitoring loop."""
          while self.monitoring:
              self._update_process_tree()
              self._check_process_health()
              time.sleep(10)  # Check every 10 seconds
      
      def _update_process_tree(self):
          """Update the current process tree."""
          import psutil
          try:
              root = psutil.Process(self.root_process.pid)
              self.process_tree = {
                  'root': root,
                  'children': root.children(recursive=True)
              }
          except psutil.NoSuchProcess:
              self.process_tree = {}
      
      def cleanup_process_tree(self) -> bool:
          """Clean up entire process tree."""
          success = True
          
          # Kill children first (reverse order)
          for child in reversed(self.process_tree.get('children', [])):
              try:
                  child.terminate()
                  child.wait(timeout=5)
              except:
                  try:
                      child.kill()
                  except:
                      success = False
          
          # Kill root process
          if 'root' in self.process_tree:
              try:
                  self.process_tree['root'].terminate()
                  self.process_tree['root'].wait(timeout=5)
              except:
                  try:
                      self.process_tree['root'].kill()
                  except:
                      success = False
          
          return success
  ```

- [ ] **3.2** Add resource usage monitoring
  ```python
  class ResourceMonitor:
      """Monitor resource usage of test processes."""
      
      def __init__(self):
          self.metrics = {
              'cpu_usage': [],
              'memory_usage': [],
              'open_files': [],
              'network_connections': []
          }
      
      def collect_metrics(self, process_tree: dict):
          """Collect resource usage metrics."""
          import psutil
          
          total_cpu = 0
          total_memory = 0
          total_files = 0
          total_connections = 0
          
          for proc in [process_tree.get('root')] + process_tree.get('children', []):
              if proc:
                  try:
                      total_cpu += proc.cpu_percent()
                      total_memory += proc.memory_info().rss
                      total_files += proc.num_fds() if hasattr(proc, 'num_fds') else 0
                      total_connections += len(proc.connections())
                  except:
                      pass
          
          self.metrics['cpu_usage'].append(total_cpu)
          self.metrics['memory_usage'].append(total_memory)
          self.metrics['open_files'].append(total_files)
          self.metrics['network_connections'].append(total_connections)
      
      def check_resource_limits(self) -> List[str]:
          """Check if resource usage exceeds limits."""
          warnings = []
          
          if self.metrics['memory_usage'] and self.metrics['memory_usage'][-1] > 1024 * 1024 * 1024:  # 1GB
              warnings.append("High memory usage detected")
          
          if self.metrics['open_files'] and self.metrics['open_files'][-1] > 1000:
              warnings.append("High number of open files detected")
          
          return warnings
  ```

- [ ] **3.3** Create test health dashboard
  ```python
  def create_health_report(server_manager: TestServerManager) -> dict:
      """Create a health report for the test infrastructure."""
      import psutil
      
      report = {
          'timestamp': time.time(),
          'server_status': 'unknown',
          'process_health': {},
          'resource_usage': {},
          'cleanup_status': {},
          'warnings': []
      }
      
      # Check server responsiveness
      if server_manager._is_server_responsive():
          report['server_status'] = 'healthy'
      else:
          report['server_status'] = 'unhealthy'
          report['warnings'].append('Server not responding')
      
      # Check process health
      if server_manager.process:
          try:
              proc = psutil.Process(server_manager.process.pid)
              report['process_health'] = {
                  'pid': proc.pid,
                  'status': proc.status(),
                  'cpu_percent': proc.cpu_percent(),
                  'memory_mb': proc.memory_info().rss / 1024 / 1024,
                  'num_threads': proc.num_threads(),
                  'create_time': proc.create_time()
              }
          except:
              report['warnings'].append('Cannot access process information')
      
      return report
  
  # Add health check endpoint for debugging
  @pytest.fixture
  def health_check(server_manager):
      """Fixture to provide health checking capabilities."""
      def check():
          return create_health_report(server_manager)
      return check
  ```

---

## Phase 4: CI/CD Integration & Testing
**Status**: ⏳ Not Started  
**Goal**: Ensure robust operation in CI/CD environments and comprehensive testing

### Tasks
- [ ] **4.1** CI/CD environment adaptations
  ```python
  # tests/ci_config.py
  import os
  
  class CIConfig:
      """Configuration for CI/CD environments."""
      
      @staticmethod
      def is_ci_environment() -> bool:
          """Detect if running in CI/CD environment."""
          ci_indicators = [
              'CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS',
              'TRAVIS', 'CIRCLECI', 'JENKINS_URL', 'BUILDKITE'
          ]
          return any(os.getenv(indicator) for indicator in ci_indicators)
      
      @staticmethod
      def get_ci_timeouts() -> dict:
          """Get appropriate timeouts for CI environment."""
          if CIConfig.is_ci_environment():
              return {
                  'server_startup': 120,    # Longer startup time in CI
                  'graceful_shutdown': 30,  # More time for cleanup
                  'force_shutdown': 10,     # More time before force kill
                  'health_check_interval': 60  # Less frequent checks
              }
          else:
              return {
                  'server_startup': 60,
                  'graceful_shutdown': 15,
                  'force_shutdown': 5,
                  'health_check_interval': 30
              }
  
  # Enhanced TestServerManager with CI awareness
  class TestServerManager:
      def __init__(self):
          # ... existing init ...
          self.config = CIConfig.get_ci_timeouts()
          self.is_ci = CIConfig.is_ci_environment()
      
      def start_server(self) -> str:
          timeout = self.config['server_startup']
          # Use CI-appropriate timeout for server startup
          self._wait_for_server(timeout=timeout)
  ```

- [ ] **4.2** Add comprehensive test suite for cleanup functionality
  ```python
  # tests/test_cleanup_infrastructure.py
  import pytest
  import signal
  import subprocess
  import time
  
  class TestCleanupInfrastructure:
      """Test the cleanup infrastructure itself."""
      
      def test_server_manager_graceful_shutdown(self):
          """Test that server manager shuts down gracefully."""
          manager = TestServerManager()
          manager.start_server()
          
          # Verify server is running
          assert manager._is_server_responsive()
          
          # Test graceful shutdown
          success = manager.stop_server()
          assert success
          
          # Verify cleanup
          assert not manager._is_port_in_use(manager.port)
          assert manager.process.poll() is not None
      
      def test_server_manager_force_shutdown(self):
          """Test force shutdown when graceful fails."""
          manager = TestServerManager()
          manager.start_server()
          
          # Simulate unresponsive process by blocking SIGTERM
          original_handler = signal.signal(signal.SIGTERM, signal.SIG_IGN)
          
          try:
              success = manager.stop_server(timeout=1, force_timeout=2)
              assert success
          finally:
              signal.signal(signal.SIGTERM, original_handler)
      
      def test_orphaned_process_detection(self):
          """Test detection and cleanup of orphaned processes."""
          manager = TestServerManager()
          manager.start_server()
          
          # Simulate orphaned process by killing parent but not child
          # ... test implementation ...
          
          orphaned = manager._find_orphaned_processes()
          assert len(orphaned) > 0
          
          # Test cleanup
          manager._cleanup_orphaned_processes(orphaned)
          
          # Verify cleanup
          remaining = manager._find_orphaned_processes()
          assert len(remaining) == 0
      
      @pytest.mark.slow
      def test_long_running_health_monitoring(self):
          """Test health monitoring over extended period."""
          manager = TestServerManager()
          manager.start_server()
          manager.start_health_monitoring()
          
          # Let it run for a while
          time.sleep(60)
          
          # Verify server is still healthy
          assert manager._is_server_responsive()
          
          manager.stop_server()
  ```

- [ ] **4.3** Create cleanup validation tools
  ```python
  # tests/cleanup_validator.py
  class CleanupValidator:
      """Validate that cleanup was successful."""
      
      @staticmethod
      def validate_no_orphaned_processes() -> List[str]:
          """Check for any orphaned npm/node processes."""
          import psutil
          orphaned = []
          
          for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
              try:
                  if proc.info['name'] in ['node', 'npm']:
                      cmdline = ' '.join(proc.info['cmdline'] or [])
                      if any(keyword in cmdline for keyword in ['next dev', 'npm run dev']):
                          orphaned.append(f"PID {proc.info['pid']}: {cmdline}")
              except:
                  pass
          
          return orphaned
      
      @staticmethod
      def validate_no_temp_directories() -> List[str]:
          """Check for leftover temporary directories."""
          import tempfile
          import os
          
          temp_dir = tempfile.gettempdir()
          leftover = []
          
          for item in os.listdir(temp_dir):
              if item.startswith('opencode_test_'):
                  leftover.append(os.path.join(temp_dir, item))
          
          return leftover
      
      @staticmethod
      def validate_ports_released(ports: List[int]) -> List[int]:
          """Check that specified ports are no longer in use."""
          import socket
          occupied = []
          
          for port in ports:
              sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
              try:
                  result = sock.connect_ex(('localhost', port))
                  if result == 0:  # Port is occupied
                      occupied.append(port)
              finally:
                  sock.close()
          
          return occupied
  
  # Add validation to test teardown
  def pytest_runtest_teardown(item, nextitem):
      """Validate cleanup after each test."""
      if nextitem is None:  # Last test
          validator = CleanupValidator()
          
          orphaned = validator.validate_no_orphaned_processes()
          if orphaned:
              print(f"Warning: Found orphaned processes: {orphaned}")
          
          temp_dirs = validator.validate_no_temp_directories()
          if temp_dirs:
              print(f"Warning: Found leftover temp directories: {temp_dirs}")
  ```

- [ ] **4.4** Documentation and developer tools
  ```python
  # tests/cleanup_tools.py - Developer utilities
  def cleanup_development_environment():
      """Clean up development environment manually."""
      print("Cleaning up development environment...")
      
      validator = CleanupValidator()
      
      # Clean up orphaned processes
      orphaned = validator.validate_no_orphaned_processes()
      if orphaned:
          print(f"Cleaning up {len(orphaned)} orphaned processes...")
          emergency_cleanup()
      
      # Clean up temp directories
      temp_dirs = validator.validate_no_temp_directories()
      if temp_dirs:
          print(f"Cleaning up {len(temp_dirs)} temp directories...")
          for temp_dir in temp_dirs:
              shutil.rmtree(temp_dir, ignore_errors=True)
      
      print("Development environment cleanup complete!")
  
  if __name__ == "__main__":
      # Allow running as script: python tests/cleanup_tools.py
      cleanup_development_environment()
  ```

---

## Integration with Existing Test Infrastructure

### Backward Compatibility
- Existing test fixtures (`server_manager`, `client`, `test_workspace`, etc.) remain unchanged
- New cleanup functionality is additive, not replacing existing logic
- Tests continue to work without modification
- Enhanced cleanup is opt-in via configuration

### Configuration Options
```python
# tests/test_config.py
TEST_CONFIG = {
    'cleanup': {
        'enable_enhanced_cleanup': os.getenv('ENABLE_ENHANCED_CLEANUP', 'true').lower() == 'true',
        'enable_process_monitoring': os.getenv('ENABLE_PROCESS_MONITORING', 'true').lower() == 'true',
        'enable_health_checks': os.getenv('ENABLE_HEALTH_CHECKS', 'false').lower() == 'true',
        'cleanup_timeout': int(os.getenv('CLEANUP_TIMEOUT', '15')),
        'monitoring_interval': int(os.getenv('MONITORING_INTERVAL', '30')),
    }
}
```

---

## Performance Impact

### Optimization Strategies
- **Lazy initialization** - Only start monitoring when needed
- **Efficient process checks** - Use psutil efficiently to minimize overhead
- **Configurable intervals** - Adjust monitoring frequency based on environment
- **Resource limits** - Set reasonable limits for resource usage

### Performance Metrics
- Cleanup handler initialization: < 50ms
- Process health check: < 100ms
- Full cleanup operation: < 10 seconds
- Memory overhead: < 10MB for monitoring infrastructure

---

## Security Considerations

### Process Security
- **Process ownership validation** - Only terminate processes owned by test runner
- **Signal handling security** - Prevent signal injection from external sources
- **Resource isolation** - Ensure test processes don't interfere with system processes
- **Temp directory security** - Secure temp directory creation and cleanup

### Implementation Security
```python
def secure_process_termination(process: subprocess.Popen) -> bool:
    """Securely terminate a process with ownership validation."""
    import psutil
    
    try:
        proc = psutil.Process(process.pid)
        
        # Validate process ownership
        if proc.username() != os.getlogin():
            raise PermissionError("Cannot terminate process not owned by current user")
        
        # Validate process is what we expect
        cmdline = ' '.join(proc.cmdline())
        if 'npm run dev' not in cmdline and 'next dev' not in cmdline:
            raise ValueError("Process does not match expected command")
        
        # Terminate securely
        proc.terminate()
        proc.wait(timeout=5)
        return True
        
    except Exception as e:
        print(f"Secure termination failed: {e}")
        return False
```

---

## Breaking Changes

⚠️ **This plan introduces minimal breaking changes:**
- New optional dependencies (psutil for process monitoring)
- Additional logging output during test runs
- Slightly longer test session startup/teardown times
- New environment variables for configuration
- Optional health check fixtures (additive)

## Benefits

✅ **Key Benefits:**
1. **Reliability** - No more orphaned npm processes after test runs
2. **Developer Experience** - Clean development environment between test runs
3. **CI/CD Stability** - Robust cleanup prevents build failures
4. **Resource Management** - Proper cleanup prevents resource leaks
5. **Debugging** - Health monitoring and reporting for test infrastructure
6. **Production Readiness** - Battle-tested process management patterns

---

## Usage Examples

### Basic Usage (No Changes Required)
```bash
# Existing test commands work unchanged
npm run test
npm run test:verbose
uv run pytest
```

### Enhanced Usage with New Features
```bash
# Enable enhanced cleanup and monitoring
ENABLE_ENHANCED_CLEANUP=true ENABLE_PROCESS_MONITORING=true npm run test

# Run with health checks enabled
ENABLE_HEALTH_CHECKS=true npm run test:verbose

# Manual cleanup after interrupted tests
python tests/cleanup_tools.py
```

### CI/CD Configuration
```yaml
# .github/workflows/test.yml
- name: Run tests with enhanced cleanup
  env:
    ENABLE_ENHANCED_CLEANUP: true
    ENABLE_PROCESS_MONITORING: true
    CLEANUP_TIMEOUT: 30
  run: npm run test
```

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Enhance process lifecycle management~~ ✅ *Completed 2025-01-27*

**Example of completed phase:**
- [x] **Phase 1**: Enhanced Test Server Manager *(4/4 tasks)* ✅ *Completed 2025-01-27*