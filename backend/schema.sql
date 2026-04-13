-- Transport demo database (MySQL 8+)
CREATE DATABASE IF NOT EXISTS transport_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE transport_demo;

DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS trajets;
DROP TABLE IF EXISTS tarifs;
DROP TABLE IF EXISTS lignes;
DROP TABLE IF EXISTS chauffeurs;
DROP TABLE IF EXISTS vehicules;

CREATE TABLE vehicules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  immatriculation VARCHAR(20) NOT NULL UNIQUE,
  marque VARCHAR(80) NOT NULL,
  modele VARCHAR(80) NOT NULL,
  type_vehicule ENUM('bus', 'minibus', 'camion', 'utilitaire') NOT NULL,
  capacite_places INT NOT NULL DEFAULT 0,
  statut ENUM('actif', 'maintenance', 'hors_service') NOT NULL DEFAULT 'actif'
);

CREATE TABLE chauffeurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80) NOT NULL,
  numero_permis VARCHAR(40) NOT NULL UNIQUE,
  telephone VARCHAR(30),
  statut ENUM('disponible', 'en_route', 'conge', 'indisponible') NOT NULL DEFAULT 'disponible'
);

CREATE TABLE lignes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  nom VARCHAR(120) NOT NULL,
  origine VARCHAR(120) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL,
  duree_minutes INT NOT NULL
);

CREATE TABLE tarifs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ligne_id INT NOT NULL,
  type_client ENUM('normal', 'etudiant', 'senior') NOT NULL,
  prix DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (ligne_id) REFERENCES lignes(id)
);

CREATE TABLE trajets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicule_id INT NOT NULL,
  chauffeur_id INT NOT NULL,
  origine VARCHAR(120) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  date_depart DATETIME NOT NULL,
  date_arrivee_prevue DATETIME NOT NULL,
  statut ENUM('planifie', 'en_cours', 'termine', 'annule') NOT NULL DEFAULT 'planifie',
  FOREIGN KEY (vehicule_id) REFERENCES vehicules(id),
  FOREIGN KEY (chauffeur_id) REFERENCES chauffeurs(id)
);

CREATE TABLE incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trajet_id INT NOT NULL,
  description TEXT NOT NULL,
  gravite ENUM('faible', 'moyenne', 'elevee', 'critique') NOT NULL DEFAULT 'moyenne',
  date_incident DATETIME NOT NULL,
  FOREIGN KEY (trajet_id) REFERENCES trajets(id)
);

INSERT INTO vehicules (immatriculation, marque, modele, type_vehicule, capacite_places, statut) VALUES
('AB-123-CD', 'Mercedes', 'Citaro', 'bus', 85, 'actif'),
('EF-456-GH', 'Iveco', 'Daily', 'utilitaire', 3, 'actif'),
('IJ-789-KL', 'Volvo', '9700', 'bus', 55, 'maintenance'),
('MN-012-OP', 'Renault', 'Master', 'minibus', 16, 'actif'),
('QR-345-ST', 'Scania', 'Touring', 'bus', 49, 'hors_service');

INSERT INTO chauffeurs (nom, prenom, numero_permis, telephone, statut) VALUES
('Diallo', 'Amadou', 'SN-DL-10001', '+221771112233', 'en_route'),
('Ndiaye', 'Fatou', 'SN-DL-10002', '+221772223344', 'disponible'),
('Sarr', 'Ibrahima', 'SN-DL-10003', '+221773334455', 'en_route'),
('Fall', 'Aissatou', 'SN-DL-10004', '+221774445566', 'conge'),
('Mbaye', 'Cheikh', 'SN-DL-10005', '+221775556677', 'disponible');

INSERT INTO trajets (vehicule_id, chauffeur_id, origine, destination, date_depart, date_arrivee_prevue, statut) VALUES
(1, 1, 'Dakar', 'Thiès', '2026-04-09 06:00:00', '2026-04-09 07:30:00', 'en_cours'),
(2, 2, 'Thiès', 'Mbour', '2026-04-09 08:00:00', '2026-04-09 09:15:00', 'planifie'),
(4, 3, 'Dakar', 'Saint-Louis', '2026-04-08 14:00:00', '2026-04-08 20:00:00', 'termine'),
(1, 1, 'Dakar', 'Kaolack', '2026-04-07 05:30:00', '2026-04-07 10:00:00', 'termine'),
(5, 5, 'Dakar', 'Ziguinchor', '2026-04-10 07:00:00', '2026-04-10 18:00:00', 'planifie');

INSERT INTO incidents (trajet_id, description, gravite, date_incident) VALUES
(3, 'Retard de 45 min pour embouteillage sur la route', 'faible', '2026-04-08 16:20:00'),
(4, 'Panne climatisation', 'moyenne', '2026-04-07 08:10:00'),
(1, 'Vérification technique en cours de route', 'faible', '2026-04-09 06:45:00');

INSERT INTO lignes (code, nom, origine, destination, distance_km, duree_minutes) VALUES
('L01', 'Dakar - Thiès Express', 'Dakar', 'Thiès', 70.50, 90),
('L02', 'Thiès - Mbour', 'Thiès', 'Mbour', 45.30, 75),
('L03', 'Dakar - Saint-Louis', 'Dakar', 'Saint-Louis', 265.00, 360),
('L04', 'Dakar - Kaolack', 'Dakar', 'Kaolack', 192.00, 270),
('L05', 'Dakar - Ziguinchor', 'Dakar', 'Ziguinchor', 450.00, 660);

INSERT INTO tarifs (ligne_id, type_client, prix) VALUES
(1, 'normal', 2500.00),
(1, 'etudiant', 2000.00),
(1, 'senior', 1800.00),
(2, 'normal', 1800.00),
(2, 'etudiant', 1500.00),
(2, 'senior', 1300.00),
(3, 'normal', 6500.00),
(3, 'etudiant', 5500.00),
(3, 'senior', 5000.00),
(4, 'normal', 4500.00),
(4, 'etudiant', 3800.00),
(4, 'senior', 3500.00),
(5, 'normal', 12000.00),
(5, 'etudiant', 10000.00),
(5, 'senior', 9000.00);
