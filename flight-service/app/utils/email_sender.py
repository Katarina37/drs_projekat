import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading # PROMENJENO: Korišćenje niti umesto procesa za Render
from typing import List, Tuple
import os
import requests

MAX_RETRIES = 3
RETRY_DELAY = 5  # sekundi izmedju pokusaja


def send_flight_cancelled_emails(refunds: List[Tuple[int, float]], flight_data: dict):
    """
    Asinhrono salje email obavjestenja korisnicima ciji je let otkazan.

    Args:
        refunds: Lista (user_id, iznos_refunda)
        flight_data: Podaci o otkazanom letu
    """
    if not refunds:
        return

    # PROMENJENO: threading.Thread umesto Process za stabilniji rad na Renderu
    thread = threading.Thread(
        target=_send_cancellation_emails,
        args=(refunds, flight_data)
    )
    thread.start()


def _send_cancellation_emails(refunds: List[Tuple[int, float]], flight_data: dict):
    """Interna funkcija za slanje emailova u zasebnoj niti."""
    server_url = os.getenv('SERVER_URL', 'http://server:5001')
    internal_key = os.getenv('INTERNAL_API_KEY', 'internal-secret')
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    # PROMENJENO: Port 465 za SSL
    smtp_port = int(os.getenv('SMTP_PORT', 465))
    smtp_user = os.getenv('SMTP_USER', 'avioletovi5@gmail.com')
    # PROMENJENO: Automatsko uklanjanje razmaka iz lozinke
    smtp_password = os.getenv('SMTP_PASSWORD', '').replace(" ", "")

    naziv_leta = flight_data.get('naziv', 'Nepoznat let')
    aerodrom_polaska = flight_data.get('aerodrom_polaska', '-')
    aerodrom_dolaska = flight_data.get('aerodrom_dolaska', '-')

    for user_id, amount in refunds:
        try:
            # Dohvati podatke o korisniku sa servera
            response = requests.get(
                f'{server_url}/api/internal/user/{user_id}',
                headers={'X-Internal-Key': internal_key}
            )
            if response.status_code != 200:
                print(f'[EMAIL] Ne mogu dohvatiti korisnika {user_id}')
                continue

            user_data = response.json().get('data', {})
            user_email = user_data.get('email')
            user_name = user_data.get('ime', 'Korisnik')

            if not user_email:
                continue

            subject = f'Let {naziv_leta} je otkazan'
            body = f"""
            <html>
            <body>
                <h2>Postovani/a {user_name},</h2>
                <p>Sa zaljenjem Vas obavestavamo da je let koji ste rezervisali otkazan.</p>
                <p><strong>Detalji leta:</strong></p>
                <ul>
                    <li>Naziv leta: {naziv_leta}</li>
                    <li>Ruta: {aerodrom_polaska} &rarr; {aerodrom_dolaska}</li>
                </ul>
                <p>Iznos od <strong>{amount:.2f} EUR</strong> ce Vam biti vracen na racun u aplikaciji.</p>
                <p>Izvinjavamo se zbog eventualnih neugodnosti.</p>
                <br>
                <p>Srdacan pozdrav,</p>
                <p>Tim Avio Letovi</p>
            </body>
            </html>
            """

            if not smtp_user or not smtp_password:
                print(f'[EMAIL] SMTP nije konfigurisan. Email za {user_email} nije poslat.')
                continue

            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = user_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))

            sent = False
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    # PROMENJENO: SMTP_SSL za direktnu enkripciju na portu 465
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                    print(f'[EMAIL] Obavjestenje o otkazivanju poslato korisniku {user_email}')
                    sent = True
                    break
                except Exception as smtp_err:
                    print(f'[EMAIL] Pokusaj {attempt}/{MAX_RETRIES} neuspesan za {user_email}: {str(smtp_err)}')
                    if attempt < MAX_RETRIES:
                        time.sleep(RETRY_DELAY * attempt)

            if not sent:
                print(f'[EMAIL] Svi pokusaji neuspesni za {user_email}')

        except Exception as e:
            print(f'[EMAIL] Greska pri slanju emaila korisniku {user_id}: {str(e)}')