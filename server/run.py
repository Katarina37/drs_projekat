# server/run.py

import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('AUTH_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f'[SERVER] Starting on port {port}...')
    app.run(host='0.0.0.0', port=port, debug=debug)