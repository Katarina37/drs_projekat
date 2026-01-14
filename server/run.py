# server/run.py

import eventlet
eventlet.monkey_patch()

import os
from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('AUTH_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f'[SERVER] Starting on port {port}...')
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)
