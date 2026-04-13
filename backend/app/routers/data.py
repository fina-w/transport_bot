from datetime import date, timedelta

from fastapi import APIRouter

from app.db import fetch_all

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/vehicules")
def list_vehicules():
    return fetch_all(
        "SELECT id, immatriculation, marque, modele, type_vehicule, capacite_places, statut "
        "FROM vehicules ORDER BY id"
    )


@router.get("/chauffeurs")
def list_chauffeurs():
    return fetch_all(
        "SELECT id, nom, prenom, numero_permis, telephone, statut FROM chauffeurs ORDER BY id"
    )


@router.get("/trajets")
def list_trajets():
    return fetch_all(
        "SELECT id, vehicule_id, chauffeur_id, origine, destination, "
        "date_depart, date_arrivee_prevue, statut FROM trajets ORDER BY id"
    )


@router.get("/incidents")
def list_incidents():
    return fetch_all(
        "SELECT id, trajet_id, description, gravite, date_incident FROM incidents ORDER BY id"
    )


@router.get("/lignes")
def list_lignes():
    return fetch_all(
        "SELECT id, code, nom, origine, destination, distance_km, duree_minutes FROM lignes ORDER BY id"
    )


@router.get("/tarifs")
def list_tarifs():
    return fetch_all(
        "SELECT id, ligne_id, type_client, prix FROM tarifs ORDER BY ligne_id, type_client"
    )


@router.get("/dashboard")
def get_dashboard():
    stats = {}
    
    # Total véhicules par statut
    vehicules = fetch_all("SELECT statut, COUNT(*) as count FROM vehicules GROUP BY statut")
    stats["vehicules"] = {v["statut"]: v["count"] for v in vehicules}
    stats["total_vehicules"] = sum(v["count"] for v in vehicules)
    
    # Total chauffeurs par statut
    chauffeurs = fetch_all("SELECT statut, COUNT(*) as count FROM chauffeurs GROUP BY statut")
    stats["chauffeurs"] = {c["statut"]: c["count"] for c in chauffeurs}
    stats["total_chauffeurs"] = sum(c["count"] for c in chauffeurs)
    
    # Trajets cette semaine
    trajets_semaine = fetch_all(
        "SELECT COUNT(*) as count FROM trajets WHERE date_depart >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    )
    stats["trajets_semaine"] = trajets_semaine[0]["count"] if trajets_semaine else 0
    
    # Incidents ce mois
    incidents_mois = fetch_all(
        "SELECT COUNT(*) as count FROM incidents WHERE MONTH(date_incident) = MONTH(NOW())"
    )
    stats["incidents_mois"] = incidents_mois[0]["count"] if incidents_mois else 0
    
    # Trajets par statut
    trajets_statut = fetch_all("SELECT statut, COUNT(*) as count FROM trajets GROUP BY statut")
    stats["trajets"] = {t["statut"]: t["count"] for t in trajets_statut}
    
    # Incidents par gravité
    incidents_gravite = fetch_all("SELECT gravite, COUNT(*) as count FROM incidents GROUP BY gravite")
    stats["incidents_gravite"] = {i["gravite"]: i["count"] for i in incidents_gravite}

    trajets_par_jour_raw = fetch_all(
        """
        SELECT DATE(date_depart) AS jour, COUNT(*) AS cnt
        FROM trajets
        WHERE date_depart >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(date_depart)
        ORDER BY jour
        """
    )
    counts_by_day = {}
    for row in trajets_par_jour_raw:
        j = row["jour"]
        key = j.isoformat() if hasattr(j, "isoformat") else str(j)[:10]
        counts_by_day[key] = row["cnt"]
    today = date.today()
    stats["trajets_par_jour"] = [
        {"date": (today - timedelta(days=6 - i)).isoformat(), "count": counts_by_day.get((today - timedelta(days=6 - i)).isoformat(), 0)}
        for i in range(7)
    ]

    return stats
