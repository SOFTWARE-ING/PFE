"""
search.py - Routes de recherche des communiqués
================================================
Endpoints pour la recherche de communiqués avec différents algorithmes.
"""

from fastapi import HTTPException, Depends, APIRouter, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services.search_service import SearchService, AdvancedSearchService
from app.models.models import Communique
from app.schemas.schemas import CommuniqueResponse, CommuniqueSummary


router = APIRouter(prefix='/search', tags=['RECHERCHE'])


# ============================================================================
# SCHÉMAS POUR LES RÉPONSES
# ============================================================================

class SearchResult(BaseModel):
    """Résultat de recherche avec score."""
    communique: CommuniqueResponse
    score: int
    highlights: Optional[dict] = None


class SearchResponse(BaseModel):
    """Réponse de recherche paginée."""
    success: bool = True
    query: str
    total: int
    page: int
    limit: int
    results: List[SearchResult]


class SearchSuggestionResponse(BaseModel):
    """Réponse pour les suggestions."""
    query: str
    suggestions: List[str]


# ============================================================================
# ENDPOINTS DE RECHERCHE
# ============================================================================

@router.get("/simple", response_model=SearchResponse)
def search_simple(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(20, ge=1, le=100, description="Résultats par page"),
    db: Session = Depends(get_db)
):
    """
    Recherche simple avec scoring (Version 2).
    
    Exemple :
        GET /search/simple?q=crise+économique&page=1&limit=20
    
    Tri par pertinence (score le plus haut d'abord)
    """
    # Récupérer tous les communiqués publiés
    communiques = db.query(Communique).filter(
        Communique.statut == "PUBLIE"
    ).all()
    
    if not communiques:
        return SearchResponse(
            query=q,
            total=0,
            page=page,
            limit=limit,
            results=[]
        )
    
    # Recherche avec scoring
    results_with_scores = SearchService.search_communique_v3(q, communiques)
    
    # Pagination
    total = len(results_with_scores)
    start = (page - 1) * limit
    end = start + limit
    paginated_results = results_with_scores[start:end]
    
    # Construction de la réponse
    results = []
    for doc, score in paginated_results:
        results.append(SearchResult(
            communique=CommuniqueResponse.model_validate(doc),
            score=score
        ))
    
    return SearchResponse(
        query=q,
        total=total,
        page=page,
        limit=limit,
        results=results
    )


@router.get("/advanced", response_model=SearchResponse)
def search_advanced(
    q: Optional[str] = Query(None, min_length=1, description="Terme de recherche"),
    statut: Optional[str] = Query(None, description="Statut: BROUILLON, PUBLIE, ARCHIVE"),
    date_debut: Optional[datetime] = Query(None, description="Date de publication min"),
    date_fin: Optional[datetime] = Query(None, description="Date de publication max"),
    id_auteur: Optional[str] = Query(None, description="ID de l'auteur"),
    tri: str = Query("pertinence", description="Tri: pertinence, date, popularite"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(20, ge=1, le=100, description="Résultats par page"),
    db: Session = Depends(get_db)
):
    """
    Recherche avancée avec filtres (Version 4).
    
    Exemple :
        GET /search/advanced?q=crise&statut=PUBLIE&date_debut=2024-01-01&tri=date
    
    Filtres disponibles :
        - q : texte à rechercher (optionnel)
        - statut : BROUILLON, PUBLIE, ARCHIVE
        - date_debut : date de publication minimale
        - date_fin : date de publication maximale
        - id_auteur : ID de l'agent officiel
        - tri : pertinence, date, popularite
    
    Cette version est PLUS PERFORMANTE pour les grandes bases de données.
    """
    # Calculer l'offset pour la pagination
    offset = (page - 1) * limit
    
    # Recherche en base
    results_list, total = SearchService.search_communique_sql(
        db=db,
        query=q or "",
        statut=statut,
        date_debut=date_debut,
        date_fin=date_fin,
        id_auteur=id_auteur,
        limit=limit,
        offset=offset
    )
    
    # Appliquer le tri supplémentaire si nécessaire
    if tri == "date" and results_list:
        results_list.sort(key=lambda x: x.date_publication, reverse=True)
    elif tri == "popularite" and results_list:
        results_list = AdvancedSearchService.rank_by_popularity(results_list, db)
    
    # Calculer les scores (si recherche par mot-clé)
    results = []
    for doc in results_list:
        score = 0
        if q:
            # Calculer un score simple pour l'affichage
            q_lower = q.lower()
            if q_lower in doc.titre.lower():
                score += 10
            if q_lower in doc.contenu.lower():
                score += 5
        
        results.append(SearchResult(
            communique=CommuniqueResponse.model_validate(doc),
            score=score
        ))
    
    return SearchResponse(
        query=q or "",
        total=total,
        page=page,
        limit=limit,
        results=results
    )


@router.get("/highlights")
def search_with_highlights(
    q: str = Query(..., min_length=1),
    communique_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Recherche avec surbrillance des mots trouvés (Version 5).
    
    Exemple :
        GET /search/highlights?q=crise&communique_id=xxx
    
    Retourne le texte avec des balises <mark> autour des mots recherchés.
    Utile pour l'affichage dans une interface web.
    """
    if communique_id:
        # Rechercher un communiqué spécifique
        communique = db.query(Communique).filter(
            Communique.id_communique == communique_id
        ).first()
        
        if not communique:
            raise HTTPException(status_code=404, detail="Communiqué non trouvé")
        
        highlights = SearchService.search_with_highlights(q, communique)
        
        return {
            "success": True,
            "query": q,
            "communique_id": communique_id,
            "highlights": highlights
        }
    else:
        # Rechercher dans tous les communiqués
        communiques = db.query(Communique).filter(
            Communique.statut == "PUBLIE"
        ).all()
        
        results = []
        for comm in communiques:
            if q.lower() in comm.titre.lower() or q.lower() in comm.contenu.lower():
                highlights = SearchService.search_with_highlights(q, comm)
                results.append({
                    "id": comm.id_communique,
                    "highlights": highlights
                })
        
        return {
            "success": True,
            "query": q,
            "total": len(results),
            "results": results
        }


@router.get("/suggestions", response_model=SearchSuggestionResponse)
def get_suggestions(
    q: str = Query(..., min_length=2, description="Début du mot"),
    limit: int = Query(5, ge=1, le=20, description="Nombre de suggestions"),
    db: Session = Depends(get_db)
):
    """
    Suggestions de recherche (auto-complétion).
    
    Exemple :
        GET /search/suggestions?q=cri
    
    Retourne : ["crise", "criminalité", "critique"]
    
    Utile pour l'autocomplétion dans la barre de recherche.
    """
    communiques = db.query(Communique).filter(
        Communique.statut == "PUBLIE"
    ).all()
    
    suggestions = SearchService.get_search_suggestions(q, communiques, limit)
    
    return SearchSuggestionResponse(
        query=q,
        suggestions=suggestions
    )


@router.get("/popular")
def get_popular_communiques(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Récupère les communiqués les plus consultés.
    
    Exemple :
        GET /search/popular?limit=10
    """
    from app.models.models import ConsultationCitoyenCommunique
    
    # Compter les consultations par communiqué
    popular = db.query(
        Communique.id_communique,
        Communique.titre,
        Communique.statut,
        Communique.date_publication,
        func.count(ConsultationCitoyenCommunique.id_communique).label('nb_consultations')
    ).outerjoin(
        ConsultationCitoyenCommunique, 
        Communique.id_communique == ConsultationCitoyenCommunique.id_communique
    ).filter(
        Communique.statut == "PUBLIE"
    ).group_by(
        Communique.id_communique
    ).order_by(
        func.count(ConsultationCitoyenCommunique.id_communique).desc()
    ).limit(limit).all()
    
    return {
        "success": True,
        "total": len(popular),
        "results": [
            {
                "id": p.id_communique,
                "titre": p.titre,
                "statut": p.statut,
                "date_publication": p.date_publication,
                "nb_consultations": p.nb_consultations or 0
            }
            for p in popular
        ]
    }


@router.get("/recent")
def get_recent_communiques(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Récupère les communiqués les plus récents.
    
    Exemple :
        GET /search/recent?limit=10
    """
    communiques = db.query(Communique).filter(
        Communique.statut == "PUBLIE"
    ).order_by(
        Communique.date_publication.desc()
    ).limit(limit).all()
    
    return {
        "success": True,
        "total": len(communiques),
        "results": [
            CommuniqueSummary.model_validate(c) for c in communiques
        ]
    }


# ============================================================================
# ENDPOINT DE TEST (comparaison des algorithmes)
# ============================================================================

@router.get("/compare")
def compare_algorithms(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    """
    Compare les résultats des différentes versions de l'algorithme.
    Utile pour le débogage et l'évaluation.
    """
    communiques = db.query(Communique).filter(
        Communique.statut == "PUBLIE"
    ).all()
    
    # Version 1 : recherche simple
    v1_results = SearchService.search_communique_v1(q, communiques)
    
    # Version 2 : recherche avec scoring
    v2_results = SearchService.search_communique_v2(q, communiques)
    
    # Version 3 : recherche avec scores détaillés
    v3_results = SearchService.search_communique_v3(q, communiques)
    
    return {
        "success": True,
        "query": q,
        "total_communiques": len(communiques),
        "algorithms": {
            "v1_simple": {
                "count": len(v1_results),
                "results": [{"id": r.id_communique, "titre": r.titre} for r in v1_results[:5]]
            },
            "v2_scoring": {
                "count": len(v2_results),
                "results": [{"id": r.id_communique, "titre": r.titre} for r in v2_results[:5]]
            },
            "v3_with_scores": {
                "count": len(v3_results),
                "results": [
                    {"id": r.id_communique, "titre": r.titre, "score": s} 
                    for r, s in v3_results[:5]
                ]
            }
        }
    }