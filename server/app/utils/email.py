import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional
import os
import threading # PROMENJENO: Korišćenje niti umesto procesa

MAX_RETRIES = 3
RETRY_DELAY = 5  # sekundi izmedju pokusaja


def send_email_async(to_email: str, subject: str, body: str, attachment: Optional[bytes] = None, attachment_name: Optional[str] = None):
    """
    Asinhrono slanje emaila korišćenjem niti (Threading).
    """
    # PROMENJENO: Thread deli resurse sa glavnom aplikacijom, što sprečava timeout na Renderu
    t = threading.Thread(target=_send_email, args=(to_email, subject, body, attachment, attachment_name))
    t.start()


def _send_email(to_email: str, subject: str, body: str, attachment: Optional[bytes] = None, attachment_name: Optional[str] = None):
    """
    Interna funkcija za slanje emaila.
    Izvršava se u zasebnoj niti.
    """
    try:
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        # PROMENJENO: Port 465 i čišćenje lozinke
        smtp_port = int(os.getenv('SMTP_PORT', 465))
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '').replace(" ", "")
        from_email = os.getenv('SMTP_FROM', smtp_user)
        
        if not smtp_user or not smtp_password:
            print(f"[EMAIL] SMTP nije konfigurisan. Email za {to_email} nije poslat.")
            return
        
        # Kreiranje poruke
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Dodavanje tela poruke
        msg.attach(MIMEText(body, 'html'))
        
        # Dodavanje attachmenta ako postoji
        if attachment and attachment_name:
            part = MIMEApplication(attachment, Name=attachment_name)
            part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
            msg.attach(part)
        
        # Slanje emaila sa retry mehanizmom
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # PROMENJENO: SMTP_SSL umesto običnog SMTP sa starttls()
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)

                print(f"[EMAIL] Uspešno poslat email na {to_email}")
                return
            except Exception as e:
                print(f"[EMAIL] Pokušaj {attempt}/{MAX_RETRIES} neuspešan za {to_email}: {str(e)}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY * attempt)

        print(f"[EMAIL] Svi pokušaji neuspešni za {to_email}")

    except Exception as e:
        print(f"[EMAIL] Greška pri slanju emaila: {str(e)}")


def send_role_change_email(to_email: str, ime: str, nova_uloga: str):
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


def send_flight_cancelled_email(to_email: str, ime: str, naziv_leta: str, aerodrom_polaska: str, aerodrom_dolaska: str):
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