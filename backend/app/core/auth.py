"""
auth.py - Gestion des mots de passe avec l'algorithme bcrypt
============================================================
CE FICHIER SERT À :
1. Hacher les mots de passe (les transformer en chaîne sécurisée)
2. Vérifier un mot de passe par rapport à son hash

POURQUOI BCRYPT ?
- C'est un algorithme LENT (difficile à casser par force brute)
- Il inclut automatiquement un "sel" (grain de sel aléatoire)
- Résistant aux attaques par GPU

TRÈS SIMPLE : seulement 2 fonctions à utiliser !
"""


import bcrypt

from app.core.config import SecurityConfig



def hash_password(password: str) -> str:
    """
    Transforme un mot de passe en clair en hash sécurisé.
    
      Exemple :
        hash = hash_password("monSuperMotDePasse123")
        # Résultat : "$2b$12$K9xJkL3mNpQrStUvWxYzA.uXyZ..."
    
      Le résultat peut être stocké directement en base de données.
    """
    # Convertit le mot de passe en bytes (bcrypt travaille avec des bytes)
    password_bytes = password.encode('utf-8')
    
    # Génère le hashé avec le nombre de rounds défini dans la config
    # rounds = 12 (par défaut) → ~0.3 seconde par hachage
    salt = bcrypt.gensalt(rounds=SecurityConfig.BCRYPT_ROUNDS)
    
    # Crée le hashé final
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Retourne le hash en string (pour stockage en BD)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si un mot de passe en clair correspond à un hash.
    
    Exemple :
        est_valide = verify_password("monMotDePasse", hash_stocke_en_bd)
        # Retourne True ou False
    """
    # Convertit en bytes
    plain_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    
    # Vérification sécurisée (constant-time comparison)
    return bcrypt.checkpw(plain_bytes, hashed_bytes)



# ============================================
# TEST RAPIDE (pour vérifier que tout fonctionne)
# ============================================
# if __name__ == "__main__":
#     print("=" * 50)
#     print("TEST DU HACHAGE DE MOTS DE PASSE")
#     print("=" * 50)
    
#     # Test 1 : Hachage d'un mot de passe
#     mot_de_passe = "MonSuperMotDePasse123!"
#     print(f"\n Mot de passe original : {mot_de_passe}")
    
#     hash_stocke = hash_password(mot_de_passe)
#     print(f"Hash stocké : {hash_stocke[:50]}...")
#     print(f"Longueur du hash : {len(hash_stocke)} caractères")
    
#     # Test 2 : Vérification correcte
#     est_valide = verify_password(mot_de_passe, hash_stocke)
#     print(f"\nVérification (bon mot de passe) : {est_valide}")
    
#     # Test 3 : Vérification avec mauvais mot de passe
#     est_valide = verify_password("MauvaisMotDePasse", hash_stocke)
#     print(f"Vérification (mauvais mot de passe) : {est_valide}")
    
#     # Test 4 : Sécurité - deux hashs du même mot de passe sont différents
#     hash2 = hash_password(mot_de_passe)
#     print(f"\nDeuxième hachage du même mot de passe : {hash2[:50]}...")
#     print(f"Les hashs sont différents (normal) : {hash_stocke != hash2}")
    
#     print("\n" + "=" * 50)
#     print("Bcrypt fonctionne correctement !")