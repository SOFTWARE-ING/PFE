"""
database.py — Gestion de la connexion à PostgreSQL
===================================================
Ce fichier crée et gère la connexion à la base de données.
TRÈS SIMPLE : il suffit d'importer 'SessionLocal' pour interagir avec la BD.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import DatabaseConfig
from app.models.models import Base  # Importe les modèles que déjà deja dispo

# ============================================
# 1. CRÉATION DU MOTEUR (ENGINE) DE CONNEXION
# ============================================
# Le moteur est le cœur de la connexion. Il gère le pool de connexions.
# echo=True affiche toutes les requêtes SQL (utile pour déboguer, à désactiver en prod)

engine = create_engine(
    DatabaseConfig.get_url(),
    echo=True,  # Met à False en production pour éviter de polluer les logs
    pool_size=5,           # Taille du pool de connexions
    max_overflow=10,       # Connexions supplémentaires si besoin
    pool_pre_ping=True,    # Vérifie que la connexion est encore vivante
)

# ============================================
# 2. CRÉATION DES SESSIONS
# ============================================
# Une session est comme un "brouillon" pour interagir avec la BD.
# On fait nos modifications dans la session, puis on valide (commit).

SessionLocal = sessionmaker(
    autocommit=False,      # On valide manuellement (commit)
    autoflush=False,       # On contrôle manuellement le flush
    bind=engine,           # On attache la session au moteur
)

# ============================================
# 3. FONCTION UTILITAIRE POUR OBTENIR UNE SESSION
# ============================================
# Cette fonction est utilisée dans les endpoints API (dépendance FastAPI)

def get_db() -> Session:
    """
    Crée une nouvelle session de base de données.
    À utiliser comme dépendance dans FastAPI :
    
        @app.get("/utilisateurs")
        def get_users(db: Session = Depends(get_db)):
            ...
    
    La session est automatiquement fermée après la requête.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# 4. CRÉATION DES TABLES (PREMIÈRE INSTALLATION)
# ============================================
def init_db():
    """
    Crée toutes les tables dans la base de données.
    À exécuter UNE SEULE FOIS au démarrage de l'application.
    
    Utilisation :
        python -c "from database import init_db; init_db()"
    """
    print("📦 Création des tables dans la base de données...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées avec succès !")
    
    # Affiche la liste des tables créées
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"📋 Tables existantes : {', '.join(tables)}")


# def drop_all_tables():
#     """
#     ⚠️ ATTENTION : Supprime TOUTES les tables (perte de données !)
#     À utiliser uniquement en développement.
#     """
#     confirm = input("⚠️ Supprimer TOUTES les tables ? (oui/NON) : ")
#     if confirm.lower() == "oui":
#         print("🗑️ Suppression de toutes les tables...")
#         Base.metadata.drop_all(bind=engine)
#         print("✅ Tables supprimées.")
#     else:
#         print("❌ Opération annulée.")


# ============================================
# 5. TEST RAPIDE DE LA CONNEXION
# ============================================
# if __name__ == "__main__":
#     print("=" * 50)
#     print("🔌 TEST DE CONNEXION À POSTGRESQL")
#     print("=" * 50)
    
#     try:
#         # Tente de se connecter
#         with engine.connect() as conn:
#             result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='signature_communiques_officiels';"))
#             tables = [row[0] for row in result]
#             print(f"📋 Tables réelles dans la base : {tables}")
#             version = result.fetchone()[0]
#             print(f"✅ Connexion réussie !")
#             print(f"📦 Version PostgreSQL : {version[:50]}...")
        
#         # Affiche les tables existantes (si la BD est déjà initialisée)
#         from sqlalchemy import inspect
#         inspector = inspect(engine)
#         tables = inspector.get_table_names()
        
#         if tables:
#             print(f"📋 Tables trouvées : {', '.join(tables)}")
#         else:
#             print("📋 Aucune table trouvée. Exécute init_db() pour créer les tables.")
            
#     except Exception as e:
#         print(f"❌ Erreur de connexion : {e}")
#         print("\n💡 Vérifie :")
#         print("   1. Que PostgreSQL est démarré")
#         print("   2. Les identifiants dans .env sont corrects")
#         print("   3. La base de données existe")


    