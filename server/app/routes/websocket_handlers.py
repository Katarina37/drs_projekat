# server/app/routes/websocket_handlers.py

from flask_socketio import join_room, leave_room


def register_handlers(socketio):
    """
    Registruje WebSocket event handlere.
    """

    @socketio.on('connect', namespace='/admin')
    def admin_connect():
        print('[WS] Admin connected')

    @socketio.on('disconnect', namespace='/admin')
    def admin_disconnect():
        print('[WS] Admin disconnected')

    @socketio.on('connect', namespace='/manager')
    def manager_connect():
        print('[WS] Manager connected')

    @socketio.on('disconnect', namespace='/manager')
    def manager_disconnect():
        print('[WS] Manager disconnected')

    @socketio.on('connect', namespace='/flights')
    def flights_connect():
        print('[WS] User connected to flights')

    @socketio.on('disconnect', namespace='/flights')
    def flights_disconnect():
        print('[WS] User disconnected from flights')

    @socketio.on('connect', namespace='/user')
    def user_connect():
        print('[WS] User connected for personal notifications')

    @socketio.on('disconnect', namespace='/user')
    def user_disconnect():
        print('[WS] User disconnected from personal notifications')

    @socketio.on('join_room', namespace='/user')
    def join_user_room(data):
        user_id = data.get('user_id')
        if user_id:
            room = f'user_{user_id}'
            join_room(room)
            print(f'[WS] User {user_id} joined room {room}')

    @socketio.on('leave_room', namespace='/user')
    def leave_user_room(data):
        user_id = data.get('user_id')
        if user_id:
            room = f'user_{user_id}'
            leave_room(room)
            print(f'[WS] User {user_id} left room {room}')

    @socketio.on('subscribe_flight', namespace='/flights')
    def subscribe_flight(data):
        flight_id = data.get('flight_id')
        if flight_id:
            room = f'flight_{flight_id}'
            join_room(room)
            print(f'[WS] User subscribed to flight {flight_id}')

    @socketio.on('unsubscribe_flight', namespace='/flights')
    def unsubscribe_flight(data):
        flight_id = data.get('flight_id')
        if flight_id:
            room = f'flight_{flight_id}'
            leave_room(room)
            print(f'[WS] User unsubscribed from flight {flight_id}')
