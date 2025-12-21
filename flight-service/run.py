# flight-service/run.py

import os
from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('FLIGHT_PORT', 5002))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f'[FLIGHT-SERVICE] Starting on port {port}...')
    # Koristi eventlet za WebSocket podršku
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)