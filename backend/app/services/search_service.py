# backend/app/services/search_service.py
"""
search_service.py - Service de recherche avec OCR
==================================================
Gère la recherche textuelle dans les communiqués avec support OCR optimisé
"""

import os
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import or_, and_, func, asc, desc
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
import logging

from app.models.models import Communique, Archive, ConsultationCitoyenCommunique
from app.services.ocr_service import OCRService

logger = logging.getLogger(__name__)


class SearchService:
    """Service de recherche avancée avec OCR optimisé"""
    
    def __init__(self, db: Session):
        self.db = db
        self.ocr_service = OCRService()
    
    def search_communiques(
        self,
        q: Optional[str] = None,
        institution: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        statut: Optional[str] = None,
        theme: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
        search_in_attachments: bool = False,
        sort_by: str = "date",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Recherche avancée dans les communiqués (Optimisée Full-Text)
        """
        try:
            # Construction de la requête de base
            query = self.db.query(Communique).distinct()

            # Application des filtres
            if q:
                query = self._apply_text_search(query, q, search_in_attachments)

            if institution:
                query = self._apply_institution_filter(query, institution)

            if date_from:
                query = query.filter(Communique.date_publication >= date_from)

            if date_to:
                query = query.filter(Communique.date_publication <= date_to)

            if statut:
                query = query.filter(Communique.statut == statut)
                
            if theme:
                query = query.filter(Communique.theme.ilike(f"%{theme}%"))

            # Comptage total avant pagination
            total_count = query.count()

            # Tri intelligent
            order_func = desc if sort_order == "desc" else asc
            if sort_by == "relevance" and q:
                # Approximation de pertinence avec SQLAlchemy : on favorise les correspondances de titre
                relevance_condition = Communique.titre.ilike(f"%{q}%")
                query = query.order_by(desc(relevance_condition), order_func(Communique.date_publication))
            else:
                query = query.order_by(order_func(Communique.date_publication))

            # Pagination
            offset = (page - 1) * per_page
            communiques = query.offset(offset).limit(per_page).all()

            # Formatage des résultats
            results = []
            for communique in communiques:
                result = self._format_communique_result(communique)

                # Extraire le contexte OCR si demandé
                if search_in_attachments and q:
                    ocr_matches = self._get_ocr_context_from_db(communique.id_communique, q)
                    if ocr_matches:
                        result['ocr_matches'] = ocr_matches

                results.append(result)

            return results, total_count

        except Exception as e:
            logger.error(f"Erreur lors de la recherche: {str(e)}")
            raise
    
    def _apply_text_search(self, query, search_term: str, search_ocr: bool = False):
        """Application de la recherche textuelle intelligente"""
        search_pattern = f"%{search_term}%"
        
        # Filtres sur le communiqué lui-même
        text_filters = [
            Communique.titre.ilike(search_pattern),
            Communique.contenu.ilike(search_pattern),
            Communique.mots_cles.ilike(search_pattern)
        ]
        
        if search_ocr:
            # Jointure avec Archive pour chercher dans l'OCR indexé
            query = query.outerjoin(Archive, Archive.id_communique == Communique.id_communique)
            text_filters.append(Archive.contenu_extrait.ilike(search_pattern))
            
        return query.filter(or_(*text_filters))
    
    def _apply_institution_filter(self, query, institution_id: str):
        """Filtre par institution via la table agent_officiel."""
        from app.models.models import Signature, AgentOfficiel
        return query.join(
            Signature, Signature.id_communique == Communique.id_communique
        ).join(
            AgentOfficiel, AgentOfficiel.id_utilisateur == Signature.id_agent_officiel
        ).filter(
            AgentOfficiel.id_institution == institution_id
        )
    
    def _get_ocr_context_from_db(self, communique_id: str, search_term: str) -> List[Dict]:
        """
        Récupère les correspondances OCR à partir de la base de données (Ultra-rapide)
        """
        archives = self.db.query(Archive).filter(
            Archive.id_communique == communique_id,
            Archive.contenu_extrait.ilike(f"%{search_term}%")
        ).all()
        
        matches = []
        for archive in archives:
            if archive.contenu_extrait:
                context = self._get_search_context(archive.contenu_extrait, search_term)
                if context:
                    matches.append({
                        'archive_id': archive.id_archive,
                        'chemin': archive.chemin_stockage,
                        'taille': archive.taille_fichier,
                        'context': context
                    })
        return matches
    
    def _get_search_context(self, text_val: str, search_term: str, context_chars: int = 100) -> str:
        """Extrait le contexte autour du terme recherché"""
        search_lower = search_term.lower()
        text_lower = text_val.lower()
        position = text_lower.find(search_lower)
        
        if position == -1:
            return ""
        
        start = max(0, position - context_chars)
        end = min(len(text_val), position + len(search_term) + context_chars)
        
        context = text_val[start:end]
        
        if start > 0:
            context = "..." + context
        if end < len(text_val):
            context = context + "..."
        
        return context
    
    def _format_communique_result(self, communique: Communique) -> Dict[str, Any]:
        """Formate un communiqué pour la réponse API"""
        consultation_count = self.db.query(ConsultationCitoyenCommunique).filter(
            ConsultationCitoyenCommunique.id_communique == communique.id_communique
        ).count()
        
        signatures = self.db.execute(
            text("""
                SELECT s.*, u.nom, u.prenom, ao.id_institution
                FROM signature s
                JOIN agent_officiel ao ON ao.id_utilisateur = s.id_agent_officiel
                JOIN utilisateur u ON u.id_utilisateur = ao.id_utilisateur
                WHERE s.id_communique = :comm_id
                AND s.est_valide = true
            """),
            {"comm_id": communique.id_communique}
        ).fetchall()
        
        return {
            'id_communique': communique.id_communique,
            'titre': communique.titre,
            'contenu': communique.contenu[:500] + "..." if len(communique.contenu) > 500 else communique.contenu,
            'date_publication': communique.date_publication.isoformat() if communique.date_publication else None,
            'hash_contenu': communique.hash_contenu,
            'qr_code': communique.qr_code,
            'statut': communique.statut,
            'theme': communique.theme,
            'mots_cles': communique.mots_cles,
            'consultations': consultation_count,
            'signatures': [
                {
                    'signataire': f"{sig.prenom} {sig.nom}",
                    'institution': sig.id_institution,
                    'date_signature': sig.date_signature.isoformat() if sig.date_signature else None,
                    'est_valide': sig.est_valide
                }
                for sig in signatures
            ]
        }
    
    def index_communique_content(self, communique_id: str) -> bool:
        """
        Indexe le contenu d'un communiqué et ses archives pour la recherche OCR
        Appliqué lors du téléversement pour éviter de le faire à la recherche.
        """
        try:
            communique = self.db.query(Communique).filter(
                Communique.id_communique == communique_id
            ).first()
            
            if not communique:
                return False
            
            communique.hash_contenu = hashlib.sha256(
                (communique.titre + communique.contenu).encode('utf-8')
            ).hexdigest()
            
            # Extraction OCR des fichiers associés
            archives = self.db.query(Archive).filter(Archive.id_communique == communique_id).all()
            for archive in archives:
                if os.path.exists(archive.chemin_stockage):
                    try:
                        with open(archive.chemin_stockage, 'rb') as f:
                            file_content = f.read()
                            extracted_text = self.ocr_service.extract_text(
                                file_content, 
                                os.path.basename(archive.chemin_stockage)
                            )
                            if extracted_text:
                                archive.contenu_extrait = extracted_text
                    except Exception as e:
                        logger.error(f"Erreur extraction OCR lors de l'indexation: {e}")
            
            self.db.commit()
            logger.info(f"Contenu indexé pour communiqué {communique_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de l'indexation: {e}")
            self.db.rollback()
            return False


class OCRSearchService:
    """Service spécialisé pour la recherche OCR optimisée (base de données)"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def search_in_documents(
        self,
        search_term: str,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Recherche super-rapide dans l'OCR en base de données.
        """
        results = []
        
        # Requête combinée Archive + Communique
        query = self.db.query(Archive, Communique).join(
            Communique, Communique.id_communique == Archive.id_communique
        ).filter(
            Archive.contenu_extrait.ilike(f"%{search_term}%")
        )
        
        if date_from:
            query = query.filter(Communique.date_publication >= date_from)
        if date_to:
            query = query.filter(Communique.date_publication <= date_to)
        
        matches = query.all()
        
        for archive, communique in matches:
            if archive.contenu_extrait:
                results.append({
                    'communique_id': communique.id_communique,
                    'titre': communique.titre,
                    'archive_id': archive.id_archive,
                    'chemin': archive.chemin_stockage,
                    'extraits': self._extract_relevant_parts(archive.contenu_extrait, search_term)
                })
        
        return results
    
    def _extract_relevant_parts(self, text_val: str, search_term: str, max_parts: int = 3) -> List[str]:
        """Extrait les phrases pertinentes autour du terme"""
        parts = []
        search_lower = search_term.lower()
        text_lower = text_val.lower()
        
        position = 0
        while position < len(text_lower) and len(parts) < max_parts:
            pos = text_lower.find(search_lower, position)
            if pos == -1:
                break
            
            start = max(0, text_val.rfind('.', 0, pos) + 1)
            end = text_val.find('.', pos + len(search_term))
            if end == -1:
                end = len(text_val)
            
            part = text_val[start:end].strip()
            if part and part not in parts:
                parts.append(part)
            
            position = pos + len(search_term)
        
        return parts