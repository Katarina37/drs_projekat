# flight-service/run.py

import eventlet
eventlet.monkey_patch()

import os
from app import create_app, socketio
from app.utils.scheduler import start_flight_scheduler

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('FLIGHT_PORT', 5002))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

    # Pokretanje scheduler-a za automatsku promenu statusa letova
    start_flight_scheduler(app, socketio, interval=30)

    print(f'[FLIGHT-SERVICE] Starting on port {port}...')
    # Koristi eventlet za WebSocket podršku
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)

    
