# Team_Alpaka-
Projekt für das Modul 306 von Martin Wyss, Kevin Ertl, Martin Reisbacher, Yassin Abdi-Aden 

# Jumpaka: Legends of the Fluff

Ein einfaches 2D-Jump-and-Run-Spiel, entwickelt im Rahmen des Moduls **306 – IT-Projekt realisieren**. 
Der Spieler steuert ein automatisch laufendes Alpaka und muss per Sprung Taste Hindernissen ausweichen, Punkte sammeln und einen immer höheren Schwierigkeitsgrad meistern.

## Inhalt

- [Über das Projekt](#über-das-projekt)
- [Features](#features)
- [Technik-Stack](#technik-stack)
- [Installation & Start](#installation--start)
- [Steuerung](#steuerung)
- [Projektorganisation](#projektorganisation)
- [Roadmap](#roadmap)
- [Lizenz](#lizenz)

## Über das Projekt

Dieses Repository gehört zum Schulprojekt **Jumpaka: Legends of the Fluff**.
Ziel ist es, ein spielbares Minimal-Viable-Product (MVP) für ein 2D-Jump-and-Run zu erstellen und dabei die HERMES 5.1 Projektmanagement-Methode praktisch anzuwenden.

## Features

- Automatisch laufende Spielfigur (Alpaka)
- Hindernisse, die übersprungen werden müssen
- Punktesystem (Distanz / übersprungene Hindernisse)
- Steigender Schwierigkeitsgrad (z.B. höhere Geschwindigkeit oder mehr Hindernisse)
- Einfache, intuitiv verständliche Steuerung ohne Anleitung
- Leichtgewichtige 2D-Grafik für flüssige Performance auf z.B. Schul-PCs

## Technik-Stack

- HTML5, CSS3
- JavaScript (Vanilla)
- Optional: GitHub Pages für das Hosting
- Entwicklungsumgebung: VS Code

## Installation & Start

```bash
# Repository klonen
git clone https://github.com/martinreisbacher/Team_Alpaka-.git
cd Jumpaka-Legends-of-the-Fluff

# 1. Einfachster Weg: index.html direkt öffnen
# Doppelklick auf index.html → läuft sofort im Browser!

# 2. Mit Live Server (empfohlen für Entwicklung):
# VS Code + Live Server Extension → Rechtsklick auf index.html → "Open with Live Server"

# 3. Python Server (falls VS Code Live Server nicht verfügbar):
python -m http.server 8000
# Dann http://localhost:8000 im Browser öffnen

**## Steuerung**

| Taste          | Funktion          |
|----------------|-------------------|
| **Leertaste**  | Springen         |
| **Enter**      | Spiel starten / Neustart |
| **ESC**        | Pause (optional) |

Das Spiel ist bewusst einfach gehalten – **keine Anleitung nötig**!

**## Projektorganisation**

**Teammitglieder:**
- Martin Wyss -> Business Analyst
- Kevin Ertl  -> Entwickler
- Martin Reisbacher -> Projektleiter  
- Yassin Abdi-Aden -> Tester

**DAuftraggeber:** Michal Duric (CsBe)

**Methodik:** HERMES 5.1 Standard-Methode


**## Roadmap**

```markdown
- [ ] Grundmechanik: Laufen + Canvas Setup
- [ ] Springen implementieren
- [ ] Hindernisse + Kollision
- [ ] Punktesystem
- [ ] Schwierigkeitsgrad erhöhen
- [ ] Game Over Screen + Highscore (lokal)
- [ ] Tests auf Schul-PCs
- [ ] Finale Präsentation

**## Lizenz**

© 2026 Alpaka Inc. Switzerland
Schulprojekt – nicht kommerziell genutzt.
All rights reserved.
