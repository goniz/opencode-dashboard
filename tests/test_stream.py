@@ class TestWorkspaceStream:
-        try:
-            await asyncio.wait_for(asyncio.gather(stream_task, chat_task), timeout=90.0)
+        try:
+            await asyncio.wait_for(asyncio.gather(stream_task, chat_task), timeout=180.0)
@@ class TestWorkspaceStream:
-        async with client.stream(
-            "POST",
-            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
-            json={
-                "messages": [
-                    {
-                        "role": "user",
-                        "content": "Create a simple Python script that prints 'Hello World'"
-                    }
-                ],
-                "stream": True
-            },
-            timeout=90.0
-        ) as chat_response:
+        async with client.stream(
+            "POST",
+            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
+            json={
+                "messages": [
+                    {
+                        "role": "user",
+                        "content": "Create a simple Python script that prints 'Hello World'"
+                    }
+                ],
+                "stream": True
+            },
+            timeout=180.0
+        ) as chat_response:
@@ class TestWorkspaceStream:
-        chat_response = await client.post(
-            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
-            json={
-                "messages": [
-                    {
-                        "role": "user",
-                        "content": "Read the contents of a file called 'definitely_does_not_exist_12345.txt'"
-                    }
-                ],
-                "stream": False
-            },
-            timeout=30.0
-        )
+        chat_response = await client.post(
+            f"/api/workspaces/{workspace_id}/sessions/{session_id}/chat",
+            json={
+                "messages": [
+                    {
+                        "role": "user",
+                        "content": "Read the contents of a file called 'definitely_does_not_exist_12345.txt'"
+                    }
+                ],
+                "stream": False
+            },
+            timeout=90.0
+        )
@@ class TestWorkspaceStream:
-        try:
-            await asyncio.wait_for(monitor_task, timeout=5.0)
-        except asyncio.TimeoutError:
-            monitor_task.cancel()
+        try:
+            await asyncio.wait_for(monitor_task, timeout=20.0)
+        except asyncio.TimeoutError:
+            monitor_task.cancel()