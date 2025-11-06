from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

active_connections: List[WebSocket] = []


@router.websocket('/ws/events')
async def websocket_events(websocket: WebSocket):
    client_host = websocket.client.host if websocket.client else 'unknown'
    client_port = websocket.client.port if websocket.client else 'unknown'
    print(f'🔌 Попытка подключения WebSocket от {client_host}:{client_port}')
    print(f'   Headers: {dict(websocket.headers)}')
    
    try:
        # Принимаем WebSocket соединение
        await websocket.accept()
        active_connections.append(websocket)
        print(f'✅ WebSocket подключен успешно. Всего подключений: {len(active_connections)}')
        print(f'   Клиент: {client_host}:{client_port}')
        print(f'   URL: {websocket.url}')
    except Exception as e:
        print(f'❌ Ошибка принятия WebSocket соединения: {e}')
        import traceback
        traceback.print_exc()
        return
    
    try:
        while True:
            data = await websocket.receive_text()
            print(f'📨 Получено сообщение от клиента: {data[:100]}...')
            try:
                import json
                message = json.loads(data)
                print(f'📨 Парсинг успешен: {message}')
                # Обрабатываем ping/pong для поддержания соединения
                if message.get('type') == 'ping':
                    await websocket.send_json({'type': 'pong'})
                    print(f'✅ Отправлен pong клиенту')
            except (json.JSONDecodeError, KeyError) as e:
                print(f'⚠️ Некорректное сообщение (игнорируется): {e}')
                # Игнорируем некорректные сообщения
                pass
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
        print(f'⚠️ WebSocket отключен. Осталось подключений: {len(active_connections)}')
    except Exception as e:
        print(f'❌ Ошибка WebSocket: {e}')
        import traceback
        traceback.print_exc()
        if websocket in active_connections:
            active_connections.remove(websocket)


async def notify_all_clients(event_data: dict):
    if not active_connections:
        print('Нет активных WebSocket подключений для отправки события')
        return
    
    print(f'Отправка события через WebSocket {len(active_connections)} клиентам:', event_data.get('type', 'unknown'))
    disconnected = []
    for ws in active_connections:
        try:
            await ws.send_json(event_data)
            print(f'Событие отправлено клиенту успешно')
        except Exception as e:
            print(f'Ошибка отправки события клиенту: {e}')
            disconnected.append(ws)

    for ws in disconnected:
        if ws in active_connections:
            active_connections.remove(ws)
            print(f'Отключенный клиент удален. Осталось подключений: {len(active_connections)}')
