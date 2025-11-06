from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

active_connections: List[WebSocket] = []


@router.websocket('/ws/events')
async def websocket_events(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)


async def notify_all_clients(event_data: dict):
    disconnected = []
    for ws in active_connections:
        try:
            await ws.send_json(event_data)
        except Exception:
            disconnected.append(ws)

    for ws in disconnected:
        active_connections.remove(ws)
