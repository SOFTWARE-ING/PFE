"""
totp_service.py - Gestion du 2FA avec Google Authenticator
===========================================================
CE FICHIER GÈRE TOUT LE 2FA :
1. Génération du secret unique par utilisateur
2. Création du QR code à scanner
3. Vérification des codes TOTP à 6 chiffres
"""

import base64
import io
from typing import Optional, Tuple

import pyotp
import qrcode


class TOTPService:
    """
    Service de gestion du 2FA TOTP (Google Authenticator).
    """
    
    @staticmethod
    def generate_secret() -> str:
        """
        Génère un nouveau secret TOTP pour un utilisateur.
        
        📌 Exemple :
            secret = TOTPService.generate_secret()
            # Résultat : "JBSWY3DPEHPK3PXP"
        """
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(email: str, secret: str, issuer_name: str = "SignatureOfficielle") -> str:
        """
        Génère un QR code que l'utilisateur scanne avec Google Authenticator.
        
        Retourne l'image en base64 à afficher dans l'interface.
        """
        # Construit l'URI pour Google Authenticator
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=email, issuer_name=issuer_name)
        
        # Génère le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)
        
        # Convertit le QR code en image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertit l'image en base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return img_base64
    
    @staticmethod
    def verify_code(secret: str, code: str) -> bool:
        """
        Vérifie si un code TOTP est valide.
        
        Tolérance de 1 intervalle (30 secondes) pour éviter les problèmes de synchro.
        """
        if not secret or not code:
            return False
        
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
    
    @staticmethod
    def get_current_code(secret: str) -> str:
        """
        Calcule le code TOTP actuel (pour debug).
        """
        totp = pyotp.TOTP(secret)
        return totp.now()