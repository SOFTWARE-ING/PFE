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
    
    # Configuration SMTP (à mettre dans .env plus tard)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "shield@signature-officielle.com")
    
    @classmethod
    def send_2fa_code(cls, to_email: str, code: str, user_name: str) -> Tuple[bool, str]:
        """
        Envoie un code 2FA par email.
        
        Retourne (succès, message).
        """
        subject = "<b>🛡️ SHIELD — Code de Vérification Sécurisé</b>"

        body = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1423 100%); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            
            <!-- Container principal -->
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                
                <!-- Logo et en-tête -->
                <tr>
                    <td style="text-align: center; padding-bottom: 40px;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #0066ff 100%); 
                                    width: 64px; height: 64px; border-radius: 18px; margin-bottom: 20px;
                                    box-shadow: 0 8px 32px rgba(0, 102, 255, 0.4);
                                    display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 32px; line-height: 64px;">🛡️</span>
                        </div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px;
                                background: linear-gradient(135deg, #00d4ff, #0066ff);
                                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                                text-transform: uppercase;">S.H.I.E.L.D</h1>
                        <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 500; letter-spacing: 3px; 
                                color: #5a6a8a; text-transform: uppercase;">
                            Signature Numérique • Authentification Officielle
                        </p>
                    </td>
                </tr>
                
                <!-- Carte principale -->
                <tr>
                    <td style="background: linear-gradient(135deg, rgba(20, 25, 45, 0.95), rgba(25, 30, 50, 0.98));
                            border: 1px solid rgba(0, 212, 255, 0.15);
                            border-radius: 24px; padding: 48px 40px;
                            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4), 
                                        0 0 0 1px rgba(0, 212, 255, 0.1) inset;
                            backdrop-filter: blur(20px);">
                        
                        <!-- Icône de sécurité -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="text-align: center; padding-bottom: 32px;">
                                    <div style="display: inline-block; width: 72px; height: 72px; 
                                                background: radial-gradient(circle at 30% 30%, rgba(0, 212, 255, 0.2), rgba(0, 102, 255, 0.1));
                                                border-radius: 50%; line-height: 72px;
                                                border: 2px solid rgba(0, 212, 255, 0.3);
                                                box-shadow: 0 0 40px rgba(0, 102, 255, 0.2);">
                                        <span style="font-size: 36px;">🔒</span>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Titre -->
                            <tr>
                                <td style="text-align: center; padding-bottom: 12px;">
                                    <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;
                                            letter-spacing: -0.5px;">
                                        Vérification d'Identité
                                    </h2>
                                </td>
                            </tr>
                            
                            <!-- Salutation -->
                            <tr>
                                <td style="text-align: center; padding-bottom: 36px;">
                                    <p style="margin: 0; font-size: 15px; color: #8899bb; line-height: 24px;">
                                        Bonjour <strong style="color: #00d4ff; font-weight: 600;">{user_name}</strong>,<br>
                                        une tentative de connexion à votre compte SHIELD a été détectée.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Bloc code -->
                            <tr>
                                <td style="text-align: center; padding-bottom: 24px;">
                                    <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; 
                                            letter-spacing: 2px; color: #5a6a8a; text-transform: uppercase;">
                                        Code de Vérification Unique
                                    </p>
                                    <div style="display: inline-block; 
                                                background: linear-gradient(135deg, rgba(0, 20, 40, 0.9), rgba(0, 15, 30, 0.95));
                                                border: 1px solid rgba(0, 212, 255, 0.3);
                                                border-radius: 16px; padding: 28px 48px;
                                                box-shadow: 0 8px 32px rgba(0, 102, 255, 0.2);
                                                position: relative;
                                                overflow: hidden;">
                                        <!-- Effet glow -->
                                        <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
                                                    width: 200px; height: 4px;
                                                    background: linear-gradient(90deg, transparent, #00d4ff, transparent);
                                                    box-shadow: 0 0 20px #0066ff;"></div>
                                        
                                        <span style="font-size: 44px; font-weight: 900; letter-spacing: 14px; 
                                                    color: #ffffff; text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
                                                    font-family: 'Courier New', monospace;
                                                    background: linear-gradient(180deg, #ffffff 0%, #00d4ff 100%);
                                                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                                            {code}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Chronomètre -->
                            <tr>
                                <td style="text-align: center; padding-bottom: 32px;">
                                    <div style="display: inline-flex; align-items: center; gap: 8px;
                                                background: rgba(255, 59, 48, 0.1);
                                                border: 1px solid rgba(255, 59, 48, 0.2);
                                                border-radius: 50px; padding: 10px 20px;">
                                        <span style="font-size: 16px;">⏳</span>
                                        <span style="font-size: 13px; font-weight: 600; color: #ff3b30;">
                                            Expire dans 5 minutes
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Séparateur décoratif -->
                            <tr>
                                <td style="text-align: center; padding-bottom: 24px;">
                                    <div style="display: inline-block; width: 60px; height: 2px;
                                                background: linear-gradient(90deg, transparent, #00d4ff, transparent);
                                                opacity: 0.5;"></div>
                                </td>
                            </tr>
                            
                            <!-- Infos de sécurité -->
                            <tr>
                                <td style="text-align: center;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; margin: 0 auto;">
                                        <tr>
                                            <!-- IP -->
                                            <td style="text-align: center; padding: 12px;">
                                                <span style="font-size: 11px; color: #5a6a8a; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">
                                                    🔐 Connexion Sécurisée
                                                </span>
                                            </td>
                                            <!-- Chiffrement -->
                                            <td style="text-align: center; padding: 12px;">
                                                <span style="font-size: 11px; color: #5a6a8a; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">
                                                    ⚡ Chiffré AES-256
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                        </table>
                        
                    </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                    <td style="text-align: center; padding-top: 32px;">
                        <!-- Ligne décorative -->
                        <div style="width: 40px; height: 1px; background: linear-gradient(90deg, transparent, #0066ff, transparent);
                                    margin: 0 auto 24px auto;"></div>
                        
                        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; letter-spacing: 2px;
                                color: #3a4a6a; text-transform: uppercase;">
                            SHIELD © 2026 — Tous Droits Réservés
                        </p>
                        <p style="margin: 0 0 16px 0; font-size: 11px; color: #3a4a6a; line-height: 20px;">
                            Système de Signature Numérique et d'Authentification<br>
                            des Documents Officiels de la République
                        </p>
                        <p style="margin: 0; font-size: 11px; color: #2a3a5a; font-weight: 500;">
                            🔒 Cet email a été envoyé automatiquement par le système SHIELD.<br>
                            Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
                        </p>
                        
                        <!-- Badge sécurité -->
                        <div style="margin-top: 24px; display: inline-block;
                                    background: rgba(0, 212, 255, 0.05);
                                    border: 1px solid rgba(0, 212, 255, 0.1);
                                    border-radius: 50px; padding: 8px 20px;">
                            <table cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-right: 8px;">
                                        <span style="font-size: 14px;">🛡️</span>
                                    </td>
                                    <td>
                                        <span style="font-size: 10px; font-weight: 700; letter-spacing: 1px; 
                                                    color: #00d4ff; text-transform: uppercase;">
                                            Communications Sécurisées
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
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
            code_match = re.search(r'>(\d{6})<', html_body)
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