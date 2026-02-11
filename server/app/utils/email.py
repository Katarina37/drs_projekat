import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional
import os
import threading 

MAX_RETRIES = 3
RETRY_DELAY = 5  # sekundi izmedju pokusaja

def send_email_async(to_email: str, subject: str, body: str, attachment: Optional[bytes] = None, attachment_name: Optional[str] = None):
    """
    Asinhrono slanje emaila korišćenjem niti (Threading).
    """
    print(f"[DEBUG] Pokrećem nit za slanje emaila na: {to_email}")
    t = threading.Thread(target=_send_email, args=(to_email, subject, body, attachment, attachment_name))
    t.daemon = False  # Da se nit ne prekida pre vremena
    t.start()

def _send_email(to_email: str, subject: str, body: str, attachment: Optional[bytes] = None, attachment_name: Optional[str] = None):
    """
    Interna funkcija za slanje emaila.
    Izvršava se u zasebnoj niti.
    """
    try:
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 465))
        smtp_user = os.getenv('SMTP_USER', '')
        # Čišćenje lozinke od razmaka
        smtp_password = os.getenv('SMTP_PASSWORD', '').replace(" ", "")
        from_email = os.getenv('SMTP_FROM', smtp_user)
        
        if not smtp_user or not smtp_password:
            print(f"[EMAIL] ERROR: SMTP podaci nisu ucitani (USER ili PASS fale).")
            return
        
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))
        
        if attachment and attachment_name:
            part = MIMEApplication(attachment, Name=attachment_name)
            part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
            msg.attach(part)
        
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"[EMAIL] Pokušaj slanja {attempt}/{MAX_RETRIES} na {to_email} preko porta {smtp_port}...")
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)

                print(f"[EMAIL] USPEH: Email uspešno poslat na {to_email}")
                return
            except Exception as e:
                print(f"[EMAIL] POKUŠAJ NEUSPEŠAN: {str(e)}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY * attempt)

        print(f"[EMAIL] FINALNI FAIL: Svi pokušaji neuspešni za {to_email}")

    except Exception as e:
        print(f"[EMAIL] KRITIČNA GREŠKA u _send_email: {str(e)}")


def send_role_change_email(to_email: str, ime: str, nova_uloga: str):
    # DODATO: Debug print da vidimo da li je funkcija uopšte pozvana
    print(f"[DEBUG] send_role_change_email pozvana za: {to_email}, Ime: {ime}, Uloga: {nova_uloga}")
    
    try:
        subject = "Promena uloge na platformi Avio Letovi"
        body = f"""
        <html>
        <body>
            <h2>Poštovani/a {ime},</h2>
            <p>Obaveštavamo Vas da je Vaša uloga na platformi Avio Letovi promenjena.</p>
            <p><strong>Nova uloga:</strong> {nova_uloga}</p>
            <p>Sada imate pristup novim funkcionalnostima u skladu sa Vašom novom ulogom.</p>
            <br>
            <p>Srdačan pozdrav,</p>
            <p>Tim Avio Letovi</p>
        </body>
        </html>
        """
        send_email_async(to_email, subject, body)
    except Exception as e:
        print(f"[DEBUG] Greška unutar send_role_change_email: {str(e)}")


def send_flight_cancelled_email(to_email: str, ime: str, naziv_leta: str, aerodrom_polaska: str, aerodrom_dolaska: str):
    print(f"[DEBUG] send_flight_cancelled_email pozvana za: {to_email}")
    subject = f"Let {naziv_leta} je otkazan"
    body = f"""
    <html>
    <body>
        <h2>Poštovani/a {ime},</h2>
        <p>Sa žaljenjem Vas obaveštavamo da je let koji ste rezervisali otkazan.</p>
        <p><strong>Detalji leta:</strong></p>
        <ul>
            <li>Naziv leta: {naziv_leta}</li>
            <li>Ruta: {aerodrom_polaska} → {aerodrom_dolaska}</li>
        </ul>
        <p>Iznos karte će Vam biti vraćen na račun u aplikaciji.</p>
        <p>Izvinjavamo se zbog eventualnih neugodnosti.</p>
        <br>
        <p>Srdačan pozdrav,</p>
        <p>Tim Avio Letovi</p>
    </body>
    </html>
    """
    send_email_async(to_email, subject, body)


def send_report_email(to_email: str, ime: str, report_type: str, pdf_content: bytes):
    print(f"[DEBUG] send_report_email pozvana za: {to_email}")
    subject = f"Izvještaj: {report_type}"
    body = f"""
    <html>
    <body>
        <h2>Poštovani/a {ime},</h2>
        <p>U prilogu se nalazi izvještaj koji ste zatražili.</p>
        <p><strong>Tip izvještaja:</strong> {report_type}</p>
        <br>
        <p>Srdačan pozdrav,</p>
        <p>Tim Avio Letovi</p>
    </body>
    </html>
    """
    attachment_name = f"izvjestaj_{report_type.lower().replace(' ', '_')}.pdf"
    send_email_async(to_email, subject, body, pdf_content, attachment_name)