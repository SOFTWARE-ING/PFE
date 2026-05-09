"""
register.py - Endpoint pour l'inscription des utilisateurs
==========================================================
Utilise les schémas existants pour créer des comptes.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.auth_service import register_user
from app.schemas.schemas import (
    AgentOfficielCreate,
    AdministrateurCreate, 
    CitoyenCreate,
    APIResponse
)


router = APIRouter(prefix='/register', tags=['REGISTER'])


@router.post("/agent", response_model=APIResponse)
def register_agent(data: AgentOfficielCreate, db: Session = Depends(get_db)):
    """
    Inscription d'un agent officiel.
    Utilise le schéma AgentOfficielCreate existant.
    """
    user_data = {
        "email": data.email,
        "mot_de_passe": data.mot_de_passe,
        "nom": data.nom,
        "prenom": data.prenom,
        "type_utilisateur": "agent_officiel",
        "id_institution": data.id_institution,
        "fonction": data.fonction,
        "departement": data.departement,
        "matricule": data.matricule
    }
    
    success, message, user_id = register_user(db, user_data)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return APIResponse(
        success=True,
        message=message,
        data={"user_id": user_id, "email": data.email}
    )


@router.post("/admin", response_model=APIResponse)
def register_admin(data: AdministrateurCreate, db: Session = Depends(get_db)):
    """
    Inscription d'un administrateur.
    Utilise le schéma AdministrateurCreate existant.
    """
    user_data = {
        "email": data.email,
        "mot_de_passe": data.mot_de_passe,
        "nom": data.nom,
        "prenom": data.prenom,
        "type_utilisateur": "administrateur",
        "niveau_habilitation": data.niveau_habilitation
    }
    
    success, message, user_id = register_user(db, user_data)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return APIResponse(
        success=True,
        message=message,
        data={"user_id": user_id, "email": data.email}
    )


@router.post("/citoyen", response_model=APIResponse)
def register_citoyen(data: CitoyenCreate, db: Session = Depends(get_db)):
    """
    Inscription d'un citoyen.
    Utilise le schéma CitoyenCreate existant.
    """
    user_data = {
        "email": data.email,
        "mot_de_passe": data.mot_de_passe,
        "nom": data.nom,
        "prenom": data.prenom,
        "type_utilisateur": "citoyen",
        "id_session": data.id_session,
        "ip_adresse": data.ip_adresse
    }
    
    success, message, user_id = register_user(db, user_data)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return APIResponse(
        success=True,
        message=message,
        data={"user_id": user_id, "email": data.email}
    )