"""
email_service.py — Service d'envoi d'emails SHIELD v3
======================================================
CORRECTIONS v3.2 :
  - Nom d'expéditeur explicite (anti-spam)
  - En-têtes Reply-To, Date, Message-ID, X-Mailer, X-Priority, List-Unsubscribe
  - Version texte brut automatique attachée avant le HTML
  - Double ehlo() après starttls() (requis par Gmail)
  - Retry automatique x3 avec délai de 2 secondes
  - Nettoyage automatique des espaces dans MAIL_PASSWORD
  - Double fallback SMTP_* → MAIL_* (compatibilité .env)
  - Logs enrichis pour diagnostic facile
"""

import os
import re
import time
import uuid
import smtplib
import secrets
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from typing import Tuple

logger = logging.getLogger(__name__)

# ── Configuration avec double fallback ───────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST")     or os.getenv("MAIL_SERVER",   "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT") or os.getenv("MAIL_PORT",     "587"))
SMTP_USER     = os.getenv("SMTP_USER")     or os.getenv("MAIL_USERNAME", "")
SMTP_PASSWORD = (os.getenv("SMTP_PASSWORD") or os.getenv("MAIL_PASSWORD", "")).replace(" ", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL")    or os.getenv("MAIL_FROM",     "shield@gouv.cm")
FRONTEND_URL  = os.getenv("FRONTEND_URL",  "http://localhost:5173")

MAX_RETRIES = 3


def _send(to: str, subject: str, html_body: str) -> Tuple[bool, str]:
    """
    Envoi SMTP mutualisé avec retry automatique x3.
    Si SMTP_USER est vide → mode développement :
      le code OTP / lien reset / MDP temporaire s'affichent dans le terminal.
    """

    # ── Mode développement : affichage console ───────────────────────────
    if not SMTP_USER or not SMTP_PASSWORD:

        code_match = re.search(r'>\s*(\d{6})\s*<', html_body)
        link_match = re.search(r'href="(http[^"]+reset-password[^"]*)"', html_body)
        pwd_match  = re.search(r'<code[^>]*>([A-Za-z0-9_\-]{8,})<\/code>', html_body)

        logger.info(f"\n{'='*60}")
        logger.info(f"📧  EMAIL (mode dev) — À : {to}")
        logger.info(f"    Sujet : {subject}")
        if code_match:
            logger.info(f"    🔑  CODE OTP : {code_match.group(1)}")
        if link_match:
            logger.info(f"    🔗  LIEN RESET : {link_match.group(1)}")
        if pwd_match:
            logger.info(f"    🔐  MDP TEMP : {pwd_match.group(1)}")
        logger.info(f"{'='*60}\n")

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

    # ── Mode production : envoi SMTP réel avec retry ─────────────────────
    # Générer automatiquement la version texte brut depuis le HTML
    plain_text = re.sub(r'<[^>]+>', ' ', html_body)
    plain_text = re.sub(r'\s+', ' ', plain_text).strip()

    last_error = ""

    for attempt in range(MAX_RETRIES):
        try:
            msg = MIMEMultipart("alternative")

            # ── En-têtes anti-spam ────────────────────────────────────────
            msg["Subject"]          = subject
            msg["From"]             = f"SHIELD — Signatures Officielles <{FROM_EMAIL}>"
            msg["To"]               = to
            msg["Reply-To"]         = FROM_EMAIL
            msg["Date"]             = formatdate(localtime=True)
            msg["Message-ID"]       = f"<{uuid.uuid4()}@shield-gouv>"
            msg["X-Mailer"]         = "SHIELD Mailer v3"
            msg["X-Priority"]       = "3"
            msg["List-Unsubscribe"] = f"<mailto:{FROM_EMAIL}?subject=unsubscribe>"

            # ── Corps : texte brut d'abord, HTML ensuite ──────────────────
            # (les filtres antispam font plus confiance aux emails multipart complets)
            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
            msg.attach(MIMEText(html_body,  "html",  "utf-8"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()  # ← CRUCIAL : requis par Gmail après starttls
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(FROM_EMAIL, [to], msg.as_string())

            logger.info(f"✅ Email envoyé à {to} — sujet : {subject}")
            return True, "Email envoyé avec succès"

        except smtplib.SMTPAuthenticationError as e:
            logger.error(
                f"❌ Erreur d'authentification Gmail.\n"
                f"   Compte utilisé : {SMTP_USER}\n"
                f"   Vérifiez que MAIL_PASSWORD est un App Password Gmail\n"
                f"   de 16 caractères SANS espaces.\n"
                f"   Détail : {e}"
            )
            return False, "Erreur d'authentification Gmail. Vérifiez MAIL_PASSWORD dans .env."

        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"❌ Destinataire refusé : {to} — {e}")
            return False, f"Adresse email invalide ou refusée : {to}"

        except smtplib.SMTPException as e:
            last_error = str(e)
            logger.warning(
                f"⚠️  SMTP tentative {attempt + 1}/{MAX_RETRIES} échouée pour {to} : {e}"
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(2)

        except Exception as e:
            last_error = str(e)
            logger.warning(
                f"⚠️  Erreur réseau tentative {attempt + 1}/{MAX_RETRIES} pour {to} : {e}"
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(2)

    logger.error(
        f"❌ Échec définitif de l'envoi email à {to} après {MAX_RETRIES} tentatives.\n"
        f"   Dernière erreur : {last_error}"
    )
    return False, f"Échec envoi email après {MAX_RETRIES} tentatives : {last_error}"


class EmailService:

    # ── Code OTP 2FA ─────────────────────────────────────────────────────────

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
              <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:520px;background:#ffffff;border-radius:14px;
                       border:1px solid #d9e2c8;overflow:hidden;
                       box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding:28px 30px 20px 30px;text-align:center;
                             border-bottom:1px solid #e8eedc;">
                    <h1 style="margin:0;color:#2e3e14;font-size:24px;
                               font-weight:700;letter-spacing:1px;">🛡️ SHIELD</h1>
                    <p style="margin:6px 0 0 0;color:#6b7c3a;font-size:12px;
                              letter-spacing:2px;text-transform:uppercase;">
                      Signatures Officielles
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:38px 30px;text-align:center;">
                    <p style="margin:0 0 14px 0;color:#435a1a;font-size:16px;">
                      Bonjour <strong>{user_name}</strong>
                    </p>
                    <p style="margin:0 0 30px 0;color:#5f6f42;font-size:15px;line-height:24px;">
                      Utilisez ce code pour confirmer votre connexion sécurisée.
                    </p>
                    <div style="background:#fafcf7;border:2px solid #6d912b;
                                border-radius:12px;padding:22px;margin-bottom:24px;">
                      <div style="font-size:40px;font-weight:700;letter-spacing:10px;
                                  color:#2e3e14;font-family:Courier New,monospace;">
                        {code}
                      </div>
                    </div>
                    <p style="margin:0;color:#8a6b16;font-size:14px;font-weight:600;">
                      ⏳ Ce code expire dans 5 minutes
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 30px;text-align:center;
                             border-top:1px solid #eef2e6;background:#fcfcfa;">
                    <p style="margin:0 0 6px 0;color:#7a8862;font-size:12px;line-height:20px;">
                      Si vous n'êtes pas à l'origine de cette demande,
                      vous pouvez ignorer cet email.
                    </p>
                    <p style="margin:0;color:#aab89a;font-size:11px;">
                      © SHIELD — Système de Signature Numérique des Communiqués Officiels
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

    # ── Réinitialisation MDP ──────────────────────────────────────────────────

    @staticmethod
    def send_password_reset(email: str, nom: str, reset_link: str) -> Tuple[bool, str]:
        """Envoie un lien de réinitialisation de mot de passe."""
        subject = "SHIELD — Réinitialisation de votre mot de passe"
        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Réinitialisation MDP — SHIELD</title></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:520px;background:#ffffff;border-radius:14px;
                       border:1px solid #d9e2c8;overflow:hidden;
                       box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding:28px 30px;text-align:center;
                             border-bottom:1px solid #e8eedc;">
                    <h1 style="margin:0;color:#2e3e14;font-size:24px;font-weight:700;">
                      🛡️ SHIELD
                    </h1>
                    <p style="margin:6px 0 0 0;color:#6b7c3a;font-size:12px;
                              letter-spacing:2px;text-transform:uppercase;">
                      Signatures Officielles
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px;">
                    <p style="color:#374151;font-size:15px;margin:0 0 12px 0;">
                      Bonjour <strong>{nom}</strong>,
                    </p>
                    <p style="color:#5f6f42;font-size:14px;line-height:22px;margin:0 0 24px 0;">
                      Vous avez demandé la réinitialisation de votre mot de passe.
                      Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
                      Ce lien est valable <strong>30 minutes</strong>.
                    </p>
                    <div style="text-align:center;margin:32px 0;">
                      <a href="{reset_link}"
                        style="background:#2d5a27;color:#ffffff;text-decoration:none;
                               padding:14px 32px;border-radius:8px;font-weight:bold;
                               font-size:15px;display:inline-block;">
                        Réinitialiser mon mot de passe
                      </a>
                    </div>
                    <p style="color:#6b7280;font-size:12px;line-height:20px;">
                      Si vous n'avez pas fait cette demande, ignorez cet email.
                      Votre mot de passe ne sera pas modifié.
                    </p>
                    <p style="color:#9ca3af;font-size:11px;word-break:break-all;
                              margin-top:12px;">
                      Lien alternatif : {reset_link}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 30px;text-align:center;
                             border-top:1px solid #eef2e6;background:#fcfcfa;">
                    <p style="margin:0;color:#aab89a;font-size:11px;">
                      © SHIELD — Système de Signature Numérique des Communiqués Officiels
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>"""
        return _send(email, subject, html)

    # ── Mot de passe temporaire (reset par admin) ─────────────────────────────

    @staticmethod
    def send_temp_password(email: str, nom: str, temp_password: str) -> Tuple[bool, str]:
        """Envoie un mot de passe temporaire généré par un admin."""
        subject = "SHIELD — Votre nouveau mot de passe temporaire"
        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Nouveau MDP — SHIELD</title></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:520px;background:#ffffff;border-radius:14px;
                       border:1px solid #d9e2c8;overflow:hidden;
                       box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding:28px 30px;text-align:center;
                             border-bottom:1px solid #e8eedc;">
                    <h1 style="margin:0;color:#2e3e14;font-size:24px;font-weight:700;">
                      🛡️ SHIELD
                    </h1>
                    <p style="margin:6px 0 0 0;color:#6b7c3a;font-size:12px;
                              letter-spacing:2px;text-transform:uppercase;">
                      Signatures Officielles
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px;">
                    <p style="color:#374151;font-size:15px;margin:0 0 12px 0;">
                      Bonjour <strong>{nom}</strong>,
                    </p>
                    <p style="color:#5f6f42;font-size:14px;line-height:22px;margin:0 0 20px 0;">
                      Un administrateur a réinitialisé votre mot de passe.
                      Voici votre mot de passe temporaire :
                    </p>
                    <div style="text-align:center;margin:24px 0;">
                      <code style="font-size:20px;background:#f9fafb;
                                   padding:12px 24px;border-radius:8px;
                                   border:1px solid #e5e7eb;display:inline-block;
                                   letter-spacing:2px;color:#1a2b22;">
                        {temp_password}
                      </code>
                    </div>
                    <p style="color:#b45309;font-size:13px;font-weight:600;
                              margin:0 0 24px 0;">
                      ⚠️ Changez ce mot de passe dès votre prochaine connexion.
                    </p>
                    <div style="text-align:center;">
                      <a href="{FRONTEND_URL}/login"
                        style="background:#2d5a27;color:#ffffff;text-decoration:none;
                               padding:12px 28px;border-radius:8px;font-weight:bold;
                               font-size:14px;display:inline-block;">
                        Se connecter à SHIELD
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 30px;text-align:center;
                             border-top:1px solid #eef2e6;background:#fcfcfa;">
                    <p style="margin:0;color:#aab89a;font-size:11px;">
                      © SHIELD — Système de Signature Numérique des Communiqués Officiels
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>"""
        return _send(email, subject, html)

    # ── Création de compte par admin ──────────────────────────────────────────

    @staticmethod
    def send_account_created(
        email: str, nom: str, temp_password: str,
        totp_secret: str, role: str = "Agent Officiel"
    ) -> Tuple[bool, str]:
        """Envoie les identifiants d'un nouveau compte créé par un admin."""
        subject = "SHIELD — Votre compte a été créé"
        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Compte créé — SHIELD</title></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:560px;background:#ffffff;border-radius:14px;
                       border:1px solid #d9e2c8;overflow:hidden;
                       box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding:28px 30px;text-align:center;
                             border-bottom:1px solid #e8eedc;">
                    <h1 style="margin:0;color:#2e3e14;font-size:24px;font-weight:700;">
                      🛡️ SHIELD — Bienvenue !
                    </h1>
                    <p style="margin:6px 0 0 0;color:#6b7c3a;font-size:12px;
                              letter-spacing:2px;text-transform:uppercase;">
                      Signatures Officielles
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px;">
                    <p style="color:#374151;font-size:15px;margin:0 0 8px 0;">
                      Bonjour <strong>{nom}</strong>,
                    </p>
                    <p style="color:#5f6f42;font-size:14px;margin:0 0 24px 0;">
                      Votre compte SHIELD a été créé en tant que
                      <strong>{role}</strong>.
                    </p>

                    <h3 style="color:#374151;font-size:14px;margin:0 0 10px 0;">
                      Vos identifiants de connexion
                    </h3>
                    <table style="width:100%;border-collapse:collapse;
                                  border:1px solid #e5e7eb;border-radius:8px;
                                  overflow:hidden;margin-bottom:24px;">
                      <tr style="background:#f9fafb;">
                        <td style="padding:10px 14px;color:#6b7280;
                                   font-size:13px;width:130px;
                                   border-bottom:1px solid #e5e7eb;">
                          Email :
                        </td>
                        <td style="padding:10px 14px;font-weight:bold;
                                   font-size:13px;border-bottom:1px solid #e5e7eb;">
                          {email}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 14px;color:#6b7280;font-size:13px;">
                          Mot de passe :
                        </td>
                        <td style="padding:10px 14px;font-size:13px;">
                          <code style="background:#f0fdf4;padding:3px 8px;
                                       border-radius:4px;border:1px solid #bbf7d0;
                                       letter-spacing:1px;">
                            {temp_password}
                          </code>
                        </td>
                      </tr>
                    </table>

                    <h3 style="color:#374151;font-size:14px;margin:0 0 10px 0;">
                      Secret Google Authenticator (2FA obligatoire)
                    </h3>
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                                padding:16px;border-radius:8px;
                                text-align:center;margin-bottom:20px;">
                      <code style="font-size:16px;letter-spacing:3px;color:#15803d;">
                        {totp_secret}
                      </code>
                    </div>

                    <div style="background:#fef3c7;border:1px solid #fcd34d;
                                padding:12px 16px;border-radius:8px;
                                font-size:13px;color:#92400e;margin-bottom:28px;
                                line-height:20px;">
                      ⚠️ Changez votre mot de passe dès la première connexion.
                      Votre accès doit être autorisé par un administrateur
                      avant de pouvoir vous connecter.
                    </div>

                    <div style="text-align:center;">
                      <a href="{FRONTEND_URL}/login"
                        style="background:#2d5a27;color:#ffffff;text-decoration:none;
                               padding:14px 32px;border-radius:8px;font-weight:bold;
                               font-size:15px;display:inline-block;">
                        Accéder à SHIELD
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 30px;text-align:center;
                             border-top:1px solid #eef2e6;background:#fcfcfa;">
                    <p style="margin:0;color:#aab89a;font-size:11px;">
                      © SHIELD — Système de Signature Numérique des Communiqués Officiels
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>"""
        return _send(email, subject, html)

    # ── Reset 2FA par admin ───────────────────────────────────────────────────

    @staticmethod
    def send_2fa_reset(
        email: str, nom: str, totp_secret: str, qr_code_b64: str = ""
    ) -> Tuple[bool, str]:
        """Envoie le nouveau secret TOTP après reset du 2FA par un admin."""
        subject = "SHIELD — Reconfiguration de votre 2FA"
        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>2FA reconfiguré — SHIELD</title></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:520px;background:#ffffff;border-radius:14px;
                       border:1px solid #d9e2c8;overflow:hidden;
                       box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding:28px 30px;text-align:center;
                             border-bottom:1px solid #e8eedc;">
                    <h1 style="margin:0;color:#2e3e14;font-size:24px;font-weight:700;">
                      🛡️ SHIELD
                    </h1>
                    <p style="margin:6px 0 0 0;color:#6b7c3a;font-size:12px;
                              letter-spacing:2px;text-transform:uppercase;">
                      Signatures Officielles
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px;">
                    <p style="color:#374151;font-size:15px;margin:0 0 12px 0;">
                      Bonjour <strong>{nom}</strong>,
                    </p>
                    <p style="color:#5f6f42;font-size:14px;line-height:22px;
                              margin:0 0 20px 0;">
                      Un administrateur a reconfiguré votre authentification
                      à deux facteurs. Voici votre nouveau secret Google Authenticator :
                    </p>
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                                padding:16px;border-radius:8px;
                                text-align:center;margin:0 0 20px 0;">
                      <code style="font-size:16px;letter-spacing:3px;color:#15803d;">
                        {totp_secret}
                      </code>
                    </div>
                    <p style="color:#6b7280;font-size:12px;line-height:20px;margin:0;">
                      Supprimez l'ancien compte de votre application Google Authenticator
                      et ajoutez-en un nouveau avec ce secret.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 30px;text-align:center;
                             border-top:1px solid #eef2e6;background:#fcfcfa;">
                    <p style="margin:0;color:#aab89a;font-size:11px;">
                      © SHIELD — Système de Signature Numérique des Communiqués Officiels
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>"""
        return _send(email, subject, html)