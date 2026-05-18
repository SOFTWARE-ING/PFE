"""
email_service.py - Service minimal d'envoi d'emails
===================================================
Utilise SMTP pour envoyer des emails (configurable via .env).
"""

import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Tuple
import os


class EmailService:
    """Service d'envoi d'emails (2FA, notifications)."""

    # Configuration SMTP
    SMTP_HOST = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("MAIL_PORT", "587"))
    SMTP_USER = os.getenv("MAIL_USERNAME", "")
    SMTP_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    FROM_EMAIL = os.getenv("MAIL_FROM", "shield@signature-officielle.com")

    @classmethod
    def send_2fa_code(cls, to_email: str, code: str, user_name: str) -> Tuple[bool, str]:
        """
        Envoie un code 2FA par email.

        Retourne (succès, message).
        """

        subject = "SHIELD — Code de Vérification"

        body = f"""
        <!DOCTYPE html>
        <html lang="fr">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code de Vérification SHIELD</title>
        </head>

        <body style="
            margin:0;
            padding:0;
            background:#f5f5f5;
            font-family:Arial, Helvetica, sans-serif;
        ">

            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
                <tr>
                    <td align="center">

                        <!-- Main Card -->
                        <table width="100%" cellpadding="0" cellspacing="0"
                            style="
                                max-width:520px;
                                background:#ffffff;
                                border-radius:14px;
                                border:1px solid #d9e2c8;
                                overflow:hidden;
                                box-shadow:0 2px 10px rgba(0,0,0,0.04);
                            ">

                            <!-- Header -->
                            <tr>
                                <td style="
                                    padding:28px 30px 20px 30px;
                                    text-align:center;
                                    border-bottom:1px solid #e8eedc;
                                ">

                                    <div style="
                                        font-size:32px;
                                        margin-bottom:10px;
                                    ">
                                        
                                    </div>

                                    <h1 style="
                                        margin:0;
                                        color:#2e3e14;
                                        font-size:24px;
                                        font-weight:700;
                                        letter-spacing:1px;
                                    ">
                                        SHIELD
                                    </h1>

                                </td>
                            </tr>

                            <!-- Content -->
                            <tr>
                                <td style="
                                    padding:38px 30px;
                                    text-align:center;
                                ">

                                    <p style="
                                        margin:0 0 14px 0;
                                        color:#435a1a;
                                        font-size:16px;
                                    ">
                                        Bonjour <strong>{user_name}</strong>
                                    </p>

                                    <p style="
                                        margin:0 0 30px 0;
                                        color:#5f6f42;
                                        font-size:15px;
                                        line-height:24px;
                                    ">
                                        Utilisez ce code pour confirmer votre connexion sécurisée.
                                    </p>

                                    <!-- Verification Code -->
                                    <div style="
                                        background:#fafcf7;
                                        border:2px solid #6d912b;
                                        border-radius:12px;
                                        padding:22px;
                                        margin-bottom:24px;
                                    ">

                                        <div style="
                                            font-size:40px;
                                            font-weight:700;
                                            letter-spacing:10px;
                                            color:#2e3e14;
                                            font-family:Courier New, monospace;
                                        ">
                                            {code}
                                        </div>

                                    </div>

                                    <p style="
                                        margin:0;
                                        color:#8a6b16;
                                        font-size:14px;
                                        font-weight:600;
                                    ">
                                        ⏳ Ce code expire dans 5 minutes
                                    </p>

                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="
                                    padding:20px;
                                    text-align:center;
                                    border-top:1px solid #eef2e6;
                                    background:#fcfcfa;
                                ">

                                    <p style="
                                        margin:0;
                                        color:#7a8862;
                                        font-size:12px;
                                        line-height:20px;
                                    ">
                                        Si vous n'êtes pas à l'origine de cette demande,<br>
                                        vous pouvez ignorer cet email.
                                    </p>

                                </td>
                            </tr>

                        </table>

                    </td>
                </tr>
            </table>

        </body>
        </html>
        """

        return cls._send_email(to_email, subject, body)

    @classmethod
    def _send_email(cls, to_email: str, subject: str, html_body: str) -> Tuple[bool, str]:
        """Méthode interne d'envoi SMTP."""

        # Si pas de config SMTP, on simule (mode développement)
        if not cls.SMTP_USER or not cls.SMTP_PASSWORD:
            print(f"\n📧 [SIMULATION] Email envoyé à {to_email}")
            print(f"   Sujet: {subject}")

            # Extrait le code du HTML (simplifié)
            import re
            code_match = re.search(r'>(\d{{6}})<', html_body)

            if code_match:
                print(f"   Code: {code_match.group(1)}")

            return True, "Email simulé (mode développement)"

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = cls.FROM_EMAIL
            msg["To"] = to_email

            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT) as server:
                server.starttls()
                server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
                server.send_message(msg)

            return True, "Email envoyé avec succès"

        except Exception as e:
            return False, f"Erreur d'envoi: {str(e)}"

    @staticmethod
    def generate_code() -> str:
        """Génère un code à 6 chiffres."""
        return ''.join(secrets.choice("0123456789") for _ in range(6))