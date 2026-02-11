import threading
import time
from datetime import datetime

def _check_flight_statuses(app, socketio):
    from app import db
    from app.models import Flight, FlightStatus
    
    # Kreiramo potpuno novu izolovanu sesiju samo za ovaj krug provere
    session = db.create_scoped_session()

    try:
        now = datetime.utcnow()
        
        # Koristimo 'session' eksplicitno umesto 'Flight.query' ili 'db.session'
        # 1. ODOBREN -> U_TOKU / ZAVRSEN
        started_flights = session.query(Flight).filter(
            Flight.status == FlightStatus.ODOBREN,
            Flight.vreme_polaska <= now
        ).all()

        for flight in started_flights:
            if now < flight.vreme_dolaska:
                flight.status = FlightStatus.U_TOKU
            else:
                flight.status = FlightStatus.ZAVRSEN
            
            if socketio:
                socketio.emit('flight_status_changed', {'flight': flight.to_dict()}, namespace='/flights')

        # 2. U_TOKU -> ZAVRSEN
        in_progress = session.query(Flight).filter(Flight.status == FlightStatus.U_TOKU).all()

        for flight in in_progress:
            if flight.vreme_dolaska <= now:
                flight.status = FlightStatus.ZAVRSEN
                if socketio:
                    socketio.emit('flight_status_changed', {'flight': flight.to_dict()}, namespace='/flights')

        session.commit()
        print(f"[SCHEDULER] Statusi ažurirani u {now}")

    except Exception as e:
        session.rollback()
        print(f'[SCHEDULER] Kritična greška: {str(e)}')
    finally:
        session.remove()  # Gasi sesiju i vraća konekciju u pool
def start_flight_scheduler(app, socketio, interval=30):
    def run():
        print(f'[SCHEDULER] Pokrenut - interval {interval}s')
        while True:
            time.sleep(interval)
            _check_flight_statuses(app, socketio)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    print('[SCHEDULER] Thread za praćenje statusa letova pokrenut')