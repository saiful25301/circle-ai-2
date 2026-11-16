import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps conversation_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast_to_conversation(self, conversation_id: str, message: dict):
        if conversation_id in self.active_connections:
            data = json.dumps(message)
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    pass


ws_manager = ConnectionManager()
