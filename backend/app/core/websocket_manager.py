import json
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Maps conversation_id -> list of socket metadata dicts: {"socket": WebSocket, "client_type": "customer" | "agent"}
        self.active_connections: Dict[str, List[Dict[str, Any]]] = {}
        # Global dashboard agent connections for real-time inbox event notifications
        self.global_dashboard_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, conversation_id: str, client_type: str = "customer"):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append({
            "socket": websocket,
            "client_type": client_type
        })
        logger.info(f"WebSocket connected to {conversation_id} as {client_type}")

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id] = [
                conn for conn in self.active_connections[conversation_id]
                if conn["socket"] != websocket
            ]
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
        if websocket in self.global_dashboard_connections:
            self.global_dashboard_connections.remove(websocket)
        logger.info(f"WebSocket disconnected from {conversation_id}")

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        if websocket not in self.global_dashboard_connections:
            self.global_dashboard_connections.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        if websocket in self.global_dashboard_connections:
            self.global_dashboard_connections.remove(websocket)

    async def broadcast_to_conversation(self, conversation_id: str, message: dict, is_internal: bool = False):
        """
        Broadcasts message to conversation participants.
        If is_internal=True, message is delivered ONLY to support agents (hidden from customer).
        """
        if conversation_id in self.active_connections:
            data = json.dumps(message)
            for conn in list(self.active_connections[conversation_id]):
                # If message is internal, never send to customer sockets
                if is_internal and conn.get("client_type") == "customer":
                    continue
                try:
                    await conn["socket"].send_text(data)
                except Exception:
                    pass

    async def broadcast_global(self, event: dict):
        """Broadcasts global inbox event (e.g. conversation assignment, unread count change) to all agent dashboards."""
        data = json.dumps(event)
        for sock in list(self.global_dashboard_connections):
            try:
                await sock.send_text(data)
            except Exception:
                pass


from typing import Any
ws_manager = ConnectionManager()
