"""
email_service.py — Service d'envoi d'emails SHIELD v3
======================================================
CORRECTION : lecture des variables d'env avec double fallback
  SMTP_HOST  → fallback sur MAIL_SERVER
  SMTP_USER  → fallback sur MAIL_USERNAME
  SMTP_PASS  → fallback sur MAIL_PASSWORD

Cela garantit la compatibilité avec les deux conventions de nommage.
"""

import os
import re
import smtplib
import secrets
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple

logger = logging.getLogger(__name__)

# ── Configuration avec double fallback ───────────────────────────────────────
# Cherche d'abord SMTP_*, puis MAIL_* (ancienne convention)
SMTP_HOST     = os.getenv("SMTP_HOST")     or os.getenv("MAIL_SERVER",   "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT") or os.getenv("MAIL_PORT",     "587"))
SMTP_USER     = os.getenv("SMTP_USER")     or os.getenv("MAIL_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD") or os.getenv("MAIL_PASSWORD", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL")    or os.getenv("MAIL_FROM",     "shield@gouv.cm")
FRONTEND_URL  = os.getenv("FRONTEND_URL",  "http://localhost:5173")


def _send(to: str, subject: str, html_body: str) -> Tuple[bool, str]:
    """
    Envoi SMTP mutualisé.
    Si SMTP_USER est vide → mode développement :
      le code OTP est extrait du HTML et affiché clairement dans le terminal.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        # ── Mode développement : affichage console enrichi ───────────────
        logger.info(f"\n{'='*60}")
        logger.info(f"📧  EMAIL (mode dev) — À : {to}")
        logger.info(f"    Sujet : {subject}")

        # Extraire le code OTP s'il est présent (6 chiffres en gros)
        code_match = re.search(r'>\s*(\d{6})\s*<', html_body)
        if code_match:
            logger.info(f"    🔑  CODE OTP : {code_match.group(1)}")

        # Extraire un lien de reset s'il est présent
        link_match = re.search(r'href="(http[^"]+reset-password[^"]*)"', html_body)
        if link_match:
            logger.info(f"    🔗  LIEN RESET : {link_match.group(1)}")

        # Extraire un mot de passe temporaire s'il est présent
        pwd_match = re.search(r'<code[^>]*>([A-Za-z0-9_\-]{8,})<\/code>', html_body)
        if pwd_match:
            logger.info(f"    🔐  MDP TEMP : {pwd_match.group(1)}")

        logger.info(f"{'='*60}\n")
        # Aussi print() pour apparaître sans configuration du logging
        print(f"\n{'='*60}")
        print(f"📧  EMAIL (mode dev) — À : {to}")
        print(f"    Sujet : {subject}")
        if code_match:
            print(f"    🔑  CODE OTP : {code_match.group(1)}")
        if link_match:
            print(f"    🔗  LIEN RESET : {link_match.group(1)}")
        if pwd_match:
            print(f"    🔐  MDP TEMP : {pwd_match.group(1)}")
        print(f"{'='*60}\n")

        return True, "Email simulé (mode développement)"

    # ── Mode production : envoi SMTP réel ────────────────────────────────
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = FROM_EMAIL
        msg["To"]      = to
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to], msg.as_string())

        logger.info(f"Email envoyé à {to} — sujet : {subject}")
        return True, "Email envoyé avec succès"

    except Exception as e:
        logger.error(f"Erreur SMTP vers {to} : {e}")
        return False, f"Erreur d'envoi SMTP : {str(e)}"


class EmailService:

    # ── Code OTP 2FA ────────────────────────────────────────────────────────

    @staticmethod
    def generate_code(length: int = 6) -> str:
        """Génère un code numérique aléatoire (6 chiffres par défaut)."""
        return "".join(secrets.choice("0123456789") for _ in range(length))

    @classmethod
    def send_2fa_code(cls, to_email: str, code: str, user_name: str) -> Tuple[bool, str]:
        """Envoie le code OTP 2FA par email."""
        subject = "SHIELD — Code de Vérification"
        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Code de Vérification SHIELD</title></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #d9e2c8;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding:28px 30px 20px 30px;text-align:center;border-bottom:1px solid #e8eedc;">
                    <h1 style="margin:0;color:#2e3e14;font-size:24px;font-weight:700;letter-spacing:1px;">🛡️ SHIELD</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:38px 30px;text-align:center;">
                    <p style="margin:0 0 14px 0;color:#435a1a;font-size:16px;">Bonjour <strong>{user_name}</strong></p>
                    <p style="margin:0 0 30px 0;color:#5f6f42;font-size:15px;line-height:24px;">
                      Utilisez ce code pour confirmer votre connexion sécurisée.
                    </p>
                    <div style="background:#fafcf7;border:2px solid #6d912b;border-radius:12px;padding:22px;margin-bottom:24px;">
                      <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#2e3e14;font-family:Courier New,monospace;">
                        {code}
                      </div>
                    </div>
                    <p style="margin:0;color:#8a6b16;font-size:14px;font-weight:600;">
                      ⏳ Ce code expire dans 5 minutes
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;text-align:center;border-top:1px solid #eef2e6;background:#fcfcfa;">
                    <p style="margin:0;color:#7a8862;font-size:12px;line-height:20px;">
                      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>"""
        return _send(to_email, subject, html)

    # Alias pour compatibilité avec l'ancien code
    @classmethod
    def _send_email(cls, to_email: str, subject: str, html_body: str) -> Tuple[bool, str]:
        return _send(to_email, subject, html_body)

    # ── Réinitialisation MDP ─────────────────────────────────────────────────

    @staticmethod
    def send_password_reset(email: str, nom: str, reset_link: str) -> Tuple[bool, str]:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2d5a27;">🛡️ SHIELD — Réinitialisation du mot de passe</h2>
          <p>Bonjour <strong>{nom}</strong>,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.
             Cliquez sur le bouton ci-dessous (valable <strong>30 minutes</strong>) :</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="{reset_link}" style="background:#2d5a27;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color:#6b7280;font-size:12px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          <p style="color:#9ca3af;font-size:11px;word-break:break-all;">Lien : {reset_link}</p>
        </div>"""
        return _send(email, "SHIELD — Réinitialisation de votre mot de passe", html)

    # ── Mot de passe temporaire ──────────────────────────────────────────────

    @staticmethod
    def send_temp_password(email: str, nom: str, temp_password: str) -> Tuple[bool, str]:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2d5a27;">🛡️ SHIELD — Nouveau mot de passe temporaire</h2>
          <p>Bonjour <strong>{nom}</strong>,</p>
          <p>Un administrateur a réinitialisé votre mot de passe. Voici votre mot de passe temporaire :</p>
          <div style="text-align:center;margin:24px 0;">
            <code style="font-size:20px;background:#f9fafb;padding:12px 24px;border-radius:8px;border:1px solid #e5e7eb;display:inline-block;letter-spacing:2px;">{temp_password}</code>
          </div>
          <p><strong>⚠️ Changez ce mot de passe dès votre prochaine connexion.</strong></p>
          <div style="text-align:center;margin-top:24px;">
            <a href="{FRONTEND_URL}/login" style="background:#2d5a27;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">
              Se connecter
            </a>
          </div>
        </div>"""
        return _send(email, "SHIELD — Votre nouveau mot de passe temporaire", html)

    # ── Création de compte par admin ─────────────────────────────────────────

    @staticmethod
    def send_account_created(
        email: str, nom: str, temp_password: str,
        totp_secret: str, role: str = "Agent Officiel"
    ) -> Tuple[bool, str]:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2d5a27;">🛡️ SHIELD — Bienvenue !</h2>
          <p>Bonjour <strong>{nom}</strong>,</p>
          <p>Votre compte SHIELD a été créé en tant que <strong>{role}</strong>.</p>
          <h3 style="margin-top:24px;color:#374151;">Vos identifiants</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#6b7280;width:120px;">Email :</td>
              <td style="padding:8px 0;font-weight:bold;">{email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#6b7280;">Mot de passe :</td>
              <td style="padding:8px 0;"><code style="background:#f9fafb;padding:4px 8px;border-radius:4px;border:1px solid #e5e7eb;">{temp_password}</code></td>
            </tr>
          </table>
          <h3 style="margin-top:24px;color:#374151;">Secret Google Authenticator (2FA)</h3>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;text-align:center;margin:16px 0;">
            <code style="font-size:16px;letter-spacing:3px;color:#15803d;">{totp_secret}</code>
          </div>
          <p style="background:#fef3c7;border:1px solid #fcd34d;padding:12px;border-radius:8px;font-size:13px;">
            ⚠️ Changez votre mot de passe dès la première connexion.
            Votre accès doit être autorisé par un administrateur avant connexion.
          </p>
          <div style="text-align:center;margin-top:24px;">
            <a href="{FRONTEND_URL}/login" style="background:#2d5a27;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;display:inline-block;">
              Accéder à SHIELD
            </a>
          </div>
        </div>"""
        return _send(email, "SHIELD — Votre compte a été créé", html)

    # ── Reset 2FA par admin ───────────────────────────────────────────────────

    @staticmethod
    def send_2fa_reset(
        email: str, nom: str, totp_secret: str, qr_code_b64: str = ""
    ) -> Tuple[bool, str]:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2d5a27;">🛡️ SHIELD — Votre 2FA a été reconfiguré</h2>
          <p>Bonjour <strong>{nom}</strong>,</p>
          <p>Un administrateur a reconfiguré votre authentification à deux facteurs.</p>
          <p>Votre nouveau secret Google Authenticator :</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;text-align:center;margin:16px 0;">
            <code style="font-size:16px;letter-spacing:3px;color:#15803d;">{totp_secret}</code>
          </div>
          <p style="color:#6b7280;font-size:12px;">
            Supprimez l'ancien compte de votre application Google Authenticator
            et ajoutez-en un nouveau avec ce secret.
          </p>
        </div>"""
        return _send(email, "SHIELD — Reconfiguration de votre 2FA", html)
