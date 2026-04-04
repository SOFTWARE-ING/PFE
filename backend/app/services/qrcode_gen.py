import qrcode
import io

class QRCodeService:
    @staticmethod
    def generate_verification_qr(document_id: str) -> bytes:
        # URL pointant vers la fonctionnalité de vérification publique [7, 8]
        verification_url = f"http://127.0.0.1:8000/verify/{document_id}"
        
        qr = qrcode.QRCode(box_size=10, border=4)
        qr.add_data(verification_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()