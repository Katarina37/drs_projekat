# flight-service/app/tasks/booking_processor.py

import time
from multiprocessing import Process
import requests
import os

from app import create_app, db
from app.models import Ticket, Flight, FlightStatus


def process_booking_async(flight_id: int, user_id: int, price: float, server_url: str):
    app = create_app()
    with app.app_context():
        try:
            print(f"[BOOKING] Počinje obrada kupovine za user {user_id}, flight {flight_id}")
            time.sleep(5)
            
            flight = Flight.query.get(flight_id)
            if not flight or flight.status != FlightStatus.ODOBREN:
                _notify_booking_failed(user_id, 'Let više nije dostupan', server_url)
                return
            
            if flight.slobodna_mesta <= 0:
                _notify_booking_failed(user_id, 'Nema više slobodnih mesta', server_url)
                return
            
            deduct_success = _deduct_user_balance(user_id, price, server_url)
            if not deduct_success:
                _notify_booking_failed(user_id, 'Greška pri transakciji', server_url)
                return
            
            #kreiranje karte
            ticket = Ticket(
                flight_id=flight_id,
                user_id=user_id,
                cena=price
            )
            db.session.add(ticket)
            db.session.commit()
            
            #notifikacija o uspjesnoj kupovini
            _notify_booking_success(user_id, ticket.to_dict(), server_url)
            print(f"[BOOKING] Uspešno procesirana kupovina ticket {ticket.id}")
            
        except Exception as e:
            print(f"[BOOKING] Greška pri obradi kupovine: {str(e)}")
            _notify_booking_failed(user_id, f'Greška: {str(e)}', server_url)


def _deduct_user_balance(user_id: int, amount: float, server_url: str) -> bool:
    try:
        response = requests.post(
            f'{server_url}/api/internal/deduct-balance',
            json={'user_id': user_id, 'amount': amount},
            headers={'X-Internal-Key': os.getenv('INTERNAL_API_KEY', 'internal-secret')}
        )
        return response.status_code == 200
    except Exception as e:
        print(f"[BOOKING] Greška pri skidanju sredstava: {str(e)}")
        return False


def _notify_booking_success(user_id: int, ticket_data: dict, server_url: str):
    try:
        response = requests.post(
            f'{server_url}/api/internal/notify/booking-success',
            json={
                'user_id': user_id,
                'ticket': ticket_data
            },
            headers={'X-Internal-Key': os.getenv('INTERNAL_API_KEY', 'internal-secret')}
        )
        if response.status_code != 200:
            print(f"[BOOKING] Greška pri slanju notifikacije: {response.status_code}")
    except Exception as e:
        print(f"[BOOKING] Greška pri notifikaciji: {str(e)}")


def _notify_booking_failed(user_id: int, reason: str, server_url: str):
    try:
        response = requests.post(
            f'{server_url}/api/internal/notify/booking-failed',
            json={
                'user_id': user_id,
                'reason': reason
            },
            headers={'X-Internal-Key': os.getenv('INTERNAL_API_KEY', 'internal-secret')}
        )
        if response.status_code != 200:
            print(f"[BOOKING] Greška pri slanju notifikacije o grešci: {response.status_code}")
    except Exception as e:
        print(f"[BOOKING] Greška pri notifikaciji greške: {str(e)}")


def start_booking_process(flight_id: int, user_id: int, price: float, server_url: str) -> Process:
    process = Process(
        target=process_booking_async,
        args=(flight_id, user_id, price, server_url)
    )
    process.start()
    return process