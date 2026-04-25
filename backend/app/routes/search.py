# backend/app/routes/search.py
"""
search.py - Routes pour la recherche
====================================
Endpoint GET /api/communiques avec recherche avancée
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services.search_service import SearchService, OCRSearchService
from app.core.jwt_utils import get_current_user

router = APIRouter(prefix="/search", tags=["RECHERCHE"])


# ============================================================================
# MODÈLES PYDANTIC POUR LES RÉPONSES
# ============================================================================

class SignatureInfo(BaseModel):
    signataire: str
    institution: str
    date_signature: Optional[str]
    est_valide: bool


class CommuniqueSearchResult(BaseModel):
    id_communique: str
    titre: str
    contenu: str
    date_publication: Optional[str]
    hash_contenu: str
    qr_code: Optional[str]
    statut: str
    theme: Optional[str] = None
    mots_cles: Optional[str] = None
    consultations: int
    signatures: List[SignatureInfo]
    ocr_matches: Optional[List[Dict[str, Any]]] = None


class SearchResponse(BaseModel):
    success: bool
    message: str
    data: List[CommuniqueSearchResult]
    pagination: Dict[str, Any]
    filters_applied: Dict[str, Any]


class OCRSearchResult(BaseModel):
    communique_id: str
    titre: str
    archive_id: str
    chemin: str
    extraits: List[str]


class OCRSearchResponse(BaseModel):
    success: bool
    message: str
    results: List[OCRSearchResult]
    total: int


# ============================================================================
# ENDPOINTS DE RECHERCHE
# ============================================================================

@router.get("/communiques", response_model=SearchResponse)
def search_communiques(
    q: Optional[str] = Query(None, description="Terme de recherche (titre, contenu)"),
    institution: Optional[str] = Query(None, description="ID de l'institution"),
    date_from: Optional[datetime] = Query(None, description="Date de début (YYYY-MM-DD)"),
    date_to: Optional[datetime] = Query(None, description="Date de fin (YYYY-MM-DD)"),
    statut: Optional[str] = Query(None, description="Statut du communiqué (PUBLIE/BROUILLON)"),
    theme: Optional[str] = Query(None, description="Filtre par thème"),
    search_ocr: bool = Query(False, description="Rechercher aussi dans les documents scannés (OCR)"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    per_page: int = Query(20, ge=1, le=100, description="Éléments par page"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recherche avancée dans les communiqués
    
    Fonctionnalités:
    - Recherche textuelle (titre, contenu) avec SQL LIKE
    - Filtrage par institution, date, statut
    - Option de recherche OCR dans les documents scannés
    - Pagination des résultats
    
    Exemples d'utilisation:
    - GET /api/search/communiques?q=santé&statut=PUBLIE
    - GET /api/search/communiques?institution=INST-001&date_from=2024-06-01
    - GET /api/search/communiques?q=économie&search_ocr=true
    """
    try:
        search_service = SearchService(db)
        
        # Exécuter la recherche
        results, total_count = search_service.search_communiques(
            q=q,
            institution=institution,
            date_from=date_from,
            date_to=date_to,
            statut=statut,
            theme=theme,
            page=page,
            per_page=per_page,
            search_in_attachments=search_ocr
        )
        
        # Calcul de la pagination
        total_pages = (total_count + per_page - 1) // per_page
        
        return SearchResponse(
            success=True,
            message=f"{total_count} communiqué(s) trouvé(s)",
            data=results,
            pagination={
                "current_page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            },
            filters_applied={
                "q": q,
                "institution": institution,
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "statut": statut,
                "theme": theme,
                "search_ocr": search_ocr
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")


@router.get("/communiques/advanced", response_model=SearchResponse)
def advanced_search_communiques(
    query: str = Query(..., description="Requête de recherche avancée"),
    search_fields: str = Query("title,content", description="Champs à rechercher (title,content,attachments)"),
    institution: Optional[str] = None,
    date_range: Optional[str] = Query(None, description="Plage de dates (ex: '2024-01-01:2024-12-31')"),
    sort_by: str = Query("date", description="Tri (date,relevance)"),
    sort_order: str = Query("desc", description="Ordre de tri (asc,desc)"),
    page: int = 1,
    per_page: int = 20,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recherche avancée avec plus d'options
    
    Permet de spécifier:
    - Les champs à rechercher (titre, contenu, pièces jointes)
    - La pertinence du tri
    - La plage de dates personnalisée
    """
    try:
        search_service = SearchService(db)
        
        # Parsing de la date range
        date_from = None
        date_to = None
        if date_range and ":" in date_range:
            parts = date_range.split(":")
            if parts[0]:
                date_from = datetime.fromisoformat(parts[0])
            if parts[1]:
                date_to = datetime.fromisoformat(parts[1])
        
        # Recherche dans les attachments si demandé
        search_ocr = "attachments" in search_fields.lower()
        
        results, total_count = search_service.search_communiques(
            q=query,
            institution=institution,
            date_from=date_from,
            date_to=date_to,
            statut="PUBLIE",  # Par défaut uniquement publiés
            page=page,
            per_page=per_page,
            search_in_attachments=search_ocr,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = (total_count + per_page - 1) // per_page
        
        return SearchResponse(
            success=True,
            message=f"{total_count} résultat(s) trouvé(s)",
            data=results,
            pagination={
                "current_page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            },
            filters_applied={
                "query": query,
                "search_fields": search_fields,
                "institution": institution,
                "date_range": date_range,
                "sort_by": sort_by,
                "sort_order": sort_order
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de recherche avancée: {str(e)}")


@router.get("/ocr", response_model=OCRSearchResponse)
def search_by_ocr(
    term: str = Query(..., min_length=3, description="Terme à rechercher dans les documents scannés"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recherche OCR pure
    
    Recherche spécifiquement dans les documents scannés/archivés
    en utilisant la technologie OCR.
    
    Attention: Cette opération peut être lente car elle analyse
    les fichiers en temps réel. À optimiser avec un cache.
    """
    try:
        ocr_service = OCRSearchService(db)
        
        results = ocr_service.search_in_documents(
            search_term=term,
            date_from=date_from,
            date_to=date_to
        )
        
        return OCRSearchResponse(
            success=True,
            message=f"{len(results)} document(s) trouvé(s) contenant '{term}'",
            results=results,
            total=len(results)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur OCR: {str(e)}")


@router.get("/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Préfixe de recherche"),
    limit: int = Query(10, ge=1, le=50, description="Nombre de suggestions"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Suggestions de recherche
    
    Retourne des suggestions basées sur:
    - Titres existants
    - Mots-clés fréquents
    - Recherches populaires
    """
    try:
        # Recherche des titres similaires
        titles = db.execute(
            """
            SELECT DISTINCT titre 
            FROM communique 
            WHERE titre ILIKE :pattern 
            AND statut = 'PUBLIE'
            LIMIT :limit
            """,
            {"pattern": f"%{q}%", "limit": limit}
        ).fetchall()
        
        # Mots-clés extraits optimisés
        keywords = db.execute(
            text("""
            SELECT DISTINCT word FROM (
                SELECT BTRIM(unnest(string_to_array(LOWER(mots_cles), ','))) as word
                FROM communique
                WHERE mots_cles IS NOT NULL AND statut = 'PUBLIE'
            ) AS keywords_list
            WHERE word ILIKE :pattern
            LIMIT :limit
            """),
            {"pattern": f"{q}%", "limit": limit}
        ).fetchall()
        
        return {
            "success": True,
            "query": q,
            "suggestions": {
                "titles": [t[0] for t in titles],
                "keywords": [k[0] for k in keywords]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suggestions: {str(e)}")
    