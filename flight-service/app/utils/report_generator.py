# flight-service/app/utils/report_generator.py

from datetime import datetime
from typing import List
from io import BytesIO
from multiprocessing import Process
import os

# Napomena: Za generisanje PDF-a koristimo reportlab
# pip install reportlab


def generate_flights_report_async(flights_data: List[dict], report_type: str, 
                                   admin_email: str, admin_name: str):
    """
    Asinhrono generiše PDF izvještaj i šalje ga na email.
    
    Args:
        flights_data: Lista letova kao rečnici
        report_type: Tip izvještaja (upcoming, in_progress, finished)
        admin_email: Email administratora
        admin_name: Ime administratora
    """
    process = Process(
        target=_generate_and_send_report,
        args=(flights_data, report_type, admin_email, admin_name)
    )
    process.start()


def _generate_and_send_report(flights_data: List[dict], report_type: str,
                               admin_email: str, admin_name: str):
    """
    Interna funkcija za generisanje PDF-a i slanje emaila.
    Izvršava se u zasebnom procesu.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.units import inch
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30
        )
        
        # Mapiranje tipova na naslove
        type_titles = {
            'upcoming': 'Predstojeci letovi',
            'in_progress': 'Letovi u toku',
            'finished': 'Završeni i otkazani letovi'
        }
        
        # Naslov
        title = Paragraph(f"Izvještaj: {type_titles.get(report_type, report_type)}", title_style)
        elements.append(title)
        
        # Datum generisanja
        date_para = Paragraph(f"Generisano: {datetime.now().strftime('%d.%m.%Y %H:%M')}", styles['Normal'])
        elements.append(date_para)
        elements.append(Spacer(1, 20))
        
        if not flights_data:
            elements.append(Paragraph("Nema letova za prikaz.", styles['Normal']))
        else:
            # Tabela sa podacima
            table_data = [['Naziv', 'Avio kompanija', 'Polazak', 'Dolazak', 'Vreme', 'Cena', 'Status']]
            
            for flight in flights_data:
                airline = flight.get('avio_kompanija', {})
                table_data.append([
                    flight.get('naziv', '-')[:20],
                    airline.get('naziv', '-')[:15] if airline else '-',
                    flight.get('aerodrom_polaska', '-')[:15],
                    flight.get('aerodrom_dolaska', '-')[:15],
                    flight.get('vreme_polaska', '-')[:16] if flight.get('vreme_polaska') else '-',
                    f"{flight.get('cena_karte', 0):.2f} EUR",
                    flight.get('status', '-')
                ])
            
            table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1*inch, 1*inch, 1.2*inch, 0.8*inch, 0.8*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(table)
            
            # Statistika
            elements.append(Spacer(1, 30))
            elements.append(Paragraph(f"Ukupno letova: {len(flights_data)}", styles['Normal']))
            
            total_price = sum(float(f.get('cena_karte', 0)) for f in flights_data)
            elements.append(Paragraph(f"Ukupna vrednost karata: {total_price:.2f} EUR", styles['Normal']))
        
        doc.build(elements)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        # Slanje emaila sa PDF-om
        # Napomena: Ovo koristi email funkcije koje treba implementirati
        _send_report_email(admin_email, admin_name, report_type, pdf_content)
        
        print(f'[REPORT] Izvještaj {report_type} uspešno generisan i poslat na {admin_email}')
        
    except ImportError:
        print('[REPORT] reportlab nije instaliran. PDF izvještaj nije generisan.')
    except Exception as e:
        print(f'[REPORT] Greška pri generisanju izvještaja: {str(e)}')


def _send_report_email(to_email: str, name: str, report_type: str, pdf_content: bytes):
    """
    Šalje email sa PDF izvještajem.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.application import MIMEApplication
    
    try:
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        smtp_user = os.getenv('SMTP_USER', 'avioletovi5@gmail.com')
        smtp_password = os.getenv('SMTP_PASSWORD', 'hsrq jvfz fpfl jibq')
        
        if not smtp_user or not smtp_password:
            print(f'[REPORT] SMTP nije konfigurisan. Email nije poslat.')
            return
        
        type_titles = {
            'upcoming': 'Predstojeci letovi',
            'in_progress': 'Letovi u toku',
            'finished': 'Završeni i otkazani letovi'
        }
        
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = f'Izvještaj: {type_titles.get(report_type, report_type)}'
        
        body = f"""
        <html>
        <body>
            <h2>Poštovani/a {name},</h2>
            <p>U prilogu se nalazi izvještaj koji ste zatražili.</p>
            <p><strong>Tip izvještaja:</strong> {type_titles.get(report_type, report_type)}</p>
            <br>
            <p>Srdačan pozdrav,</p>
            <p>Tim Avio Letovi</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Dodavanje PDF-a
        attachment_name = f"izvjestaj_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        part = MIMEApplication(pdf_content, Name=attachment_name)
        part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
        msg.attach(part)
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
    except Exception as e:
        print(f'[REPORT] Greška pri slanju emaila: {str(e)}')