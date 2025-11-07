from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

active_connections: WebSocket = []


@router.websocket('/ws/events')
async def websocket_events(websocket: WebSocket):
    try:
        await websocket.accept()
        active_connections.append(websocket)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                import json
                message = json.loads(data)
                if message.get('type') == 'ping':
                    await websocket.send_json({'type': 'pong'})
            except (json.JSONDecodeError, KeyError) as e:
                pass
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception as e:
        import traceback
        traceback.print_exc()
        if websocket in active_connections:
            active_connections.remove(websocket)


async def notify_all_clients(event_data: dict):
    if not active_connections:
        return
    
    disconnected = []
    for ws in active_connections:
        try:
            await ws.send_json(event_data)
        except Exception as e:
            disconnected.append(ws)

    for ws in disconnected:
        if ws in active_connections:
            active_connections.remove(ws)
