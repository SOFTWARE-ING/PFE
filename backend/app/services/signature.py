from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization




class SignatureService:
    @staticmethod
    def sign_document(data: bytes, private_key_pem: bytes) -> bytes:
        """
        Signe numériquement les données du communiqué pour garantir l'intégrité.
        """
        private_key = serialization.load_pem_private_key(private_key_pem, password=None)

        signature = private_key.sign(
            data,
            padding.PSS(
                mgf = padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        return signature
    
