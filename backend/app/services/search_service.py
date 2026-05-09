"""
search_service.py - Service de recherche des communiqués
========================================================
Algorithme de recherche avec scoring de pertinence.
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, Query
from sqlalchemy import or_, and_, func
from datetime import datetime
import re
from collections import Counter

from app.models.models import Communique, Signature, ConsultationCitoyenCommunique


class SearchService:
    """
    Service de recherche des communiqués avec plusieurs algorithmes.
    """
    
    # Mots communs à ignorer dans la recherche (stop words)
    STOP_WORDS = {
        'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une',
        'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or',
        'a', 'dans', 'par', 'pour', 'avec', 'sans', 'sous',
        'the', 'a', 'an', 'and', 'of', 'to', 'in', 'for', 'on', 'with'
    }
    
    @staticmethod
    def search_communique_v1(query: str, database: List[Communique]) -> List[Communique]:
        """
        Version 1 : Recherche simple par mot-clé (sans scoring).
        
        Utilisation :
            results = SearchService.search_communique_v1("crise", communiques)
        
        Avantages : Simple, rapide pour petits volumes
        Inconvénients : Pas de pertinence, résultats non triés
        """
        if not query or not database:
            return []
        
        query = query.lower()
        results = []
        
        for doc in database:
            if query in doc.titre.lower() or query in doc.contenu.lower():
                results.append(doc)
        
        return results
    
    @staticmethod
    def search_communique_v2(query: str, database: List[Communique]) -> List[Communique]:
        """
        Version 2 : Recherche avec scoring de pertinence.
        
        Scoring :
            - Match exact dans titre : +10 points
            - Match partiel dans titre : +3 points par mot
            - Match exact dans contenu : +5 points
            - Match partiel dans contenu : +1 point par mot
            - Mots rares : bonus
            - Occurrences multiples : bonus
        
        Utilisation :
            results = SearchService.search_communique_v2("crise économique", communiques)
            # Les résultats les plus pertinents en premier
        """
        if not query or not database:
            return []
        
        query = query.lower()
        query_words = query.split()
        
        results = []
        
        for doc in database:
            titre_lower = doc.titre.lower()
            contenu_lower = doc.contenu.lower()
            
            score = 0
            
            # 1. Score pour le titre (plus important)
            if query in titre_lower:
                score += 10  # Match exact dans titre
            else:
                for word in query_words:
                    if word in titre_lower:
                        score += 3  # Match partiel
            
            # 2. Score pour le contenu
            if query in contenu_lower:
                score += 5  # Match exact dans contenu
            else:
                for word in query_words:
                    if word in contenu_lower:
                        score += 1
                        # Bonus pour occurrences multiples
                        count = contenu_lower.count(word)
                        if count > 1:
                            score += min(count, 5)
            
            # 3. Bonus pour mots rares
            if score > 0:
                rare_bonus = sum(5 for word in query_words if word not in SearchService.STOP_WORDS)
                score += rare_bonus
            
            if score > 0:
                results.append((doc, score))
        
        # Trier par score décroissant
        results.sort(key=lambda x: x[1], reverse=True)
        
        return [doc for doc, _ in results]
    
    @staticmethod
    def search_communique_v3(
        query: str, 
        database: List[Communique],
        min_score: int = 1
    ) -> List[Tuple[Communique, int]]:
        """
        Version 3 : Recherche avec scoring ET retour du score.
        
        Retourne une liste de tuples (communiqué, score)
        
        Utilisation :
            results = SearchService.search_communique_v3("crise", communiques)
            for doc, score in results:
                print(f"{doc.titre} - Score: {score}")
        """
        if not query or not database:
            return []
        
        query = query.lower()
        query_words = query.split()
        
        results = []
        
        for doc in database:
            titre_lower = doc.titre.lower()
            contenu_lower = doc.contenu.lower()
            
            score = 0
            match_details = []
            
            # Titre: match exact
            if query in titre_lower:
                score += 10
                match_details.append("titre_exact")
            
            # Titre: mots individuels
            for word in query_words:
                if word in titre_lower:
                    score += 3
                    match_details.append(f"titre_word:{word}")
            
            # Contenu: match exact
            if query in contenu_lower:
                score += 5
                match_details.append("contenu_exact")
            
            # Contenu: mots individuels
            for word in query_words:
                if word in contenu_lower:
                    score += 1
                    count = contenu_lower.count(word)
                    if count > 1:
                        bonus = min(count, 5)
                        score += bonus
                        match_details.append(f"contenu_word:{word}x{count}")
            
            # Mots rares
            for word in query_words:
                if word not in SearchService.STOP_WORDS and len(word) > 3:
                    score += 2
                    match_details.append(f"rare_word:{word}")
            
            if score >= min_score:
                results.append((doc, score, match_details))
        
        results.sort(key=lambda x: x[1], reverse=True)
        
        return [(doc, score) for doc, score, _ in results]
    
    @staticmethod
    def search_communique_sql(
        db: Session,
        query: str,
        statut: Optional[str] = None,
        date_debut: Optional[datetime] = None,
        date_fin: Optional[datetime] = None,
        id_auteur: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Communique], int]:
        """
        Version 4 : Recherche directe en base de données avec filtres.
        
        Cette version est PLUS PERFORMANTE pour de grandes quantités de données.
        
        Paramètres :
            - query : texte à rechercher
            - statut : filtrer par statut (BROUILLON, PUBLIE, ARCHIVE)
            - date_debut : date de publication minimale
            - date_fin : date de publication maximale
            - id_auteur : filtrer par auteur (agent officiel)
            - limit : nombre max de résultats
            - offset : pagination (décalage)
        
        Retourne :
            - List[Communique] : résultats
            - int : nombre total de résultats (pour pagination)
        """
        if not query:
            # Si pas de requête, retourner tous les communiqués avec filtres
            db_query = db.query(Communique)
        else:
            # Recherche dans titre et contenu
            search_term = f"%{query}%"
            db_query = db.query(Communique).filter(
                or_(
                    Communique.titre.ilike(search_term),
                    Communique.contenu.ilike(search_term)
                )
            )
        
        # Appliquer les filtres
        if statut:
            db_query = db_query.filter(Communique.statut == statut)
        
        if date_debut:
            db_query = db_query.filter(Communique.date_publication >= date_debut)
        
        if date_fin:
            db_query = db_query.filter(Communique.date_publication <= date_fin)
        
        # Compter le total avant pagination
        total = db_query.count()
        
        # Appliquer pagination et tri par date
        results = db_query.order_by(
            Communique.date_publication.desc()
        ).offset(offset).limit(limit).all()
        
        return results, total
    
    @staticmethod
    def search_with_highlights(
        query: str, 
        communique: Communique,
        max_context_length: int = 200
    ) -> Dict:
        """
        Version 5 : Recherche avec surbrillance des mots trouvés.
        
        Extrait le contexte autour des mots recherchés.
        
        Retourne :
            - titre: titre original
            - titre_highlight: titre avec balises <mark>
            - extraits: liste d'extraits du contenu avec surbrillance
        """
        if not query:
            return {
                "titre": communique.titre,
                "titre_highlight": communique.titre,
                "extraits": []
            }
        
        query_lower = query.lower()
        query_words = query_lower.split()
        
        # Surbrillance dans le titre
        titre_highlight = communique.titre
        for word in query_words:
            pattern = re.compile(f'({re.escape(word)})', re.IGNORECASE)
            titre_highlight = pattern.sub(r'<mark>\1</mark>', titre_highlight)
        
        # Extraction du contexte dans le contenu
        extraits = []
        contenu_lower = communique.contenu.lower()
        
        for word in query_words:
            if word in contenu_lower:
                # Trouver la position du mot
                positions = [m.start() for m in re.finditer(re.escape(word), contenu_lower)]
                
                for pos in positions:
                    # Extraire le contexte autour du mot
                    start = max(0, pos - max_context_length // 2)
                    end = min(len(communique.contenu), pos + len(word) + max_context_length // 2)
                    
                    contexte = communique.contenu[start:end]
                    
                    # Ajouter des points de suspension
                    if start > 0:
                        contexte = "..." + contexte
                    if end < len(communique.contenu):
                        contexte = contexte + "..."
                    
                    # Mettre en surbrillance
                    for w in query_words:
                        pattern = re.compile(f'({re.escape(w)})', re.IGNORECASE)
                        contexte = pattern.sub(r'<mark>\1</mark>', contexte)
                    
                    extraits.append(contexte)
        
        # Garder les extraits uniques
        extraits = list(dict.fromkeys(extraits))[:3]  # Max 3 extraits
        
        return {
            "titre": communique.titre,
            "titre_highlight": titre_highlight,
            "extraits": extraits
        }
    
    @staticmethod
    def get_search_suggestions(
        query: str,
        database: List[Communique],
        max_suggestions: int = 5
    ) -> List[str]:
        """
        Version 6 : Suggestions de recherche (auto-complétion).
        
        Basé sur les mots fréquents dans les titres des résultats.
        """
        if not query or len(query) < 2:
            return []
        
        query_lower = query.lower()
        suggestions = Counter()
        
        for doc in database:
            titre_lower = doc.titre.lower()
            contenu_lower = doc.contenu.lower()
            
            # Si le document correspond à la recherche
            if query_lower in titre_lower or query_lower in contenu_lower:
                # Extraire les mots des titres
                words = re.findall(r'\b\w+\b', titre_lower)
                for word in words:
                    if word.startswith(query_lower) and word not in SearchService.STOP_WORDS:
                        suggestions[word] += 1
        
        # Retourner les suggestions les plus fréquentes
        return [word for word, _ in suggestions.most_common(max_suggestions)]


# ============================================================================
# CLASSE POUR LA RECHERCHE AVANCÉE (avec cache)
# ============================================================================

class AdvancedSearchService:
    """
    Service de recherche avancé avec cache et indexation.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._cache = {}  # Cache simple (à remplacer par Redis en prod)
    
    def search_with_cache(
        self, 
        query: str, 
        statut: str = "PUBLIE",
        use_cache: bool = True
    ) -> List[Communique]:
        """
        Recherche avec mise en cache.
        """
        cache_key = f"{query}_{statut}"
        
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]
        
        # Recherche en base
        results, _ = SearchService.search_communique_sql(
            self.db, 
            query, 
            statut=statut,
            limit=100
        )
        
        # Mettre en cache (expire après 5 minutes)
        if use_cache:
            self._cache[cache_key] = results
        
        return results
    
    def clear_cache(self):
        """Vide le cache."""
        self._cache.clear()
    
    @staticmethod
    def rank_by_popularity(
        communiques: List[Communique],
        db: Session
    ) -> List[Communique]:
        """
        Trie les communiqués par popularité (nombre de consultations).
        """
        from app.models.models import ConsultationCitoyenCommunique
        
        # Compter les consultations pour chaque communiqué
        popularities = {}
        for comm in communiques:
            count = db.query(ConsultationCitoyenCommunique).filter(
                ConsultationCitoyenCommunique.id_communique == comm.id_communique
            ).count()
            popularities[comm.id_communique] = count
        
        # Trier par popularité
        communiques.sort(key=lambda x: popularities.get(x.id_communique, 0), reverse=True)
        
        return communiques
    
    @staticmethod
    def rank_by_recency(
        communiques: List[Communique]
    ) -> List[Communique]:
        """
        Trie les communiqués par date (plus récent d'abord).
        """
        return sorted(communiques, key=lambda x: x.date_publication, reverse=True)