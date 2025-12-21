# flight-service/app/routes/websocket_handlers.py

from flask_socketio import join_room, leave_room, emit


def register_handlers(socketio):
    """
    Registruje WebSocket event handlere.
    
    Args:
        socketio: SocketIO instanca
    """
    
    @socketio.on('connect', namespace='/admin')
    def admin_connect():
        """Handler za konekciju admin namespace-a."""
        print('[WS] Admin connected')
    
    @socketio.on('disconnect', namespace='/admin')
    def admin_disconnect():
        """Handler za diskonekciju admin namespace-a."""
        print('[WS] Admin disconnected')
    
    @socketio.on('connect', namespace='/manager')
    def manager_connect():
        """Handler za konekciju manager namespace-a."""
        print('[WS] Manager connected')
    
    @socketio.on('disconnect', namespace='/manager')
    def manager_disconnect():
        """Handler za diskonekciju manager namespace-a."""
        print('[WS] Manager disconnected')
    
    @socketio.on('connect', namespace='/flights')
    def flights_connect():
        """Handler za konekciju flights namespace-a (za sve korisnike)."""
        print('[WS] User connected to flights')
    
    @socketio.on('disconnect', namespace='/flights')
    def flights_disconnect():
        """Handler za diskonekciju flights namespace-a."""
        print('[WS] User disconnected from flights')
    
    @socketio.on('connect', namespace='/user')
    def user_connect():
        """Handler za konekciju user namespace-a (personalizovane notifikacije)."""
        print('[WS] User connected for personal notifications')
    
    @socketio.on('disconnect', namespace='/user')
    def user_disconnect():
        """Handler za diskonekciju user namespace-a."""
        print('[WS] User disconnected from personal notifications')
    
    @socketio.on('join_room', namespace='/user')
    def join_user_room(data):
        """
        Korisnik se pridružuje svojoj sobi za personalizovane notifikacije.
        
        Args:
            data: dict sa 'user_id'
        """
        user_id = data.get('user_id')
        if user_id:
            room = f'user_{user_id}'
            join_room(room)
            print(f'[WS] User {user_id} joined room {room}')
    
    @socketio.on('leave_room', namespace='/user')
    def leave_user_room(data):
        """
        Korisnik napušta svoju sobu.
        
        Args:
            data: dict sa 'user_id'
        """
        user_id = data.get('user_id')
        if user_id:
            room = f'user_{user_id}'
            leave_room(room)
            print(f'[WS] User {user_id} left room {room}')
    
    @socketio.on('subscribe_flight', namespace='/flights')
    def subscribe_flight(data):
        """
        Pretplata na ažuriranja za određeni let.
        
        Args:
            data: dict sa 'flight_id'
        """
        flight_id = data.get('flight_id')
        if flight_id:
            room = f'flight_{flight_id}'
            join_room(room)
            print(f'[WS] User subscribed to flight {flight_id}')
    
    @socketio.on('unsubscribe_flight', namespace='/flights')
    def unsubscribe_flight(data):
        """
        Otkazivanje pretplate na ažuriranja za određeni let.
        
        Args:
            data: dict sa 'flight_id'
        """
        flight_id = data.get('flight_id')
        if flight_id:
            room = f'flight_{flight_id}'
            leave_room(room)
            print(f'[WS] User unsubscribed from flight {flight_id}')