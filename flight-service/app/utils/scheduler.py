# flight-service/app/utils/scheduler.py

import threading
import time
from datetime import datetime


def _check_flight_statuses(app, socketio):
    """
    Periodično proverava i ažurira statuse letova.
    Pokreće se u zasebnom thread-u.
    """
    from app import db
    from app.models import Flight, FlightStatus

    with app.app_context():
        try:
            now = datetime.utcnow()

            # ODOBREN -> U_TOKU (let je počeo)
            started_flights = Flight.query.filter(
                Flight.status == FlightStatus.ODOBREN,
                Flight.vreme_polaska <= now
            ).all()

            for flight in started_flights:
                if now < flight.vreme_dolaska:
                    flight.status = FlightStatus.U_TOKU
                    print(f'[SCHEDULER] Let {flight.naziv} (ID:{flight.id}) -> U_TOKU')
                    if socketio:
                        socketio.emit('flight_status_changed', {
                            'flight': flight.to_dict()
                        }, namespace='/flights')
                else:
                    # Let je vec prosao i polazak i dolazak
                    flight.status = FlightStatus.ZAVRSEN
                    print(f'[SCHEDULER] Let {flight.naziv} (ID:{flight.id}) -> ZAVRSEN')
                    if socketio:
                        socketio.emit('flight_status_changed', {
                            'flight': flight.to_dict()
                        }, namespace='/flights')

            # U_TOKU -> ZAVRSEN (let se završio)
            finished_flights = Flight.query.filter(
                Flight.status == FlightStatus.U_TOKU
            ).all()

            for flight in finished_flights:
                if flight.vreme_dolaska <= now:
                    flight.status = FlightStatus.ZAVRSEN
                    print(f'[SCHEDULER] Let {flight.naziv} (ID:{flight.id}) -> ZAVRSEN')
                    if socketio:
                        socketio.emit('flight_status_changed', {
                            'flight': flight.to_dict()
                        }, namespace='/flights')

            db.session.commit()

        except Exception as e:
            print(f'[SCHEDULER] Greška: {str(e)}')
            db.session.rollback()


def start_flight_scheduler(app, socketio, interval=30):
    """
    Pokreće periodičan scheduler za proveru statusa letova.

    Args:
        app: Flask aplikacija
        socketio: SocketIO instanca
        interval: Interval u sekundama između provera (default 30s)
    """
    def run():
        print(f'[SCHEDULER] Pokrenut - interval {interval}s')
        while True:
            time.sleep(interval)
            _check_flight_statuses(app, socketio)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    print('[SCHEDULER] Thread za praćenje statusa letova pokrenut')
