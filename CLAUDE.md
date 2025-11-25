# Claude AI - Guide d'utilisation pour IDOINE

Ce document décrit comment utiliser Claude AI pour le développement et la maintenance du générateur de site statique IDOINE.

## Table des matières

1. [Introduction](#introduction)
2. [Configuration initiale](#configuration-initiale)
3. [Workflows recommandés](#workflows-recommandés)
4. [Bonnes pratiques](#bonnes-pratiques)
5. [Exemples d'utilisation](#exemples-dutilisation)
6. [Limitations et considérations](#limitations-et-considérations)

## Introduction

Claude est un assistant IA développé par Anthropic qui peut aider au développement, à la maintenance et à l'amélioration du projet IDOINE. Ce guide établit des conventions pour maximiser l'efficacité de la collaboration avec Claude.

### Capacités de Claude pour IDOINE

- **Analyse de code:** Review et suggestions d'amélioration pour Python et JavaScript
- **Refactoring:** Amélioration de la structure et de la qualité du code
- **Débogage:** Identification et résolution de bugs
- **Documentation:** Création et mise à jour de documentation technique
- **Tests:** Développement de tests unitaires et d'intégration
- **Optimisation:** Amélioration des performances et de la sécurité

## Configuration initiale

### Contexte du projet

Avant de commencer à travailler avec Claude sur IDOINE, assurez-vous de fournir le contexte suivant:

1. **Architecture du projet:**
   - Générateur de site statique basé sur Python + Grunt
   - Support multilingue (français/anglais)
   - Templates Jinja2
   - Contenu Markdown avec Front Matter
   - Pipeline de build automatisé

2. **Stack technique:**
   - Python 3.9+ (Jinja2, PyYAML, Python-Frontmatter, Markdown)
   - Node.js 18+ (Grunt, SASS, PostCSS, Autoprefixer)
   - Git pour le contrôle de version

3. **Structure des fichiers:**
   ```
   idoine/
   ├── scripts/          # Scripts Python de build
   ├── src/              # Sources (assets, styles, locales)
   ├── templates/        # Templates Jinja2
   ├── dist/             # Site généré
   └── Gruntfile.js      # Configuration Grunt
   ```

### Documentation de référence

Fournissez à Claude l'accès aux documents suivants:
- `README.md` - Documentation générale du projet
- `IMPROVEMENTS.md` - Suggestions d'amélioration
- `package.json` et `requirements.txt` - Dépendances
- `src/config/site_config.yaml` - Configuration du site

## Workflows recommandés

### 1. Développement de nouvelles fonctionnalités

**Processus:**
1. Décrire la fonctionnalité souhaitée à Claude
2. Demander une proposition d'implémentation
3. Réviser l'approche suggérée
4. Implémenter par étapes avec validation
5. Ajouter des tests si nécessaire
6. Mettre à jour la documentation

**Exemple:**
```
User: "Je souhaite ajouter un système de tags pour les articles de blog"
Claude: [Analyse la structure existante, propose une solution, identifie les fichiers à modifier]
```

### 2. Refactoring et amélioration du code

**Processus:**
1. Identifier le code à améliorer
2. Demander à Claude d'analyser les problèmes
3. Obtenir des suggestions d'amélioration prioritisées
4. Implémenter les changements progressivement
5. Valider que les fonctionnalités existantes fonctionnent toujours

**Exemple:**
```
User: "Analyse scripts/page_builder.py et suggère des améliorations"
Claude: [Identifie les problèmes de conception, propose des refactorings, priorise les changements]
```

### 3. Débogage

**Processus:**
1. Décrire le problème observé
2. Fournir les logs d'erreur et le contexte
3. Demander à Claude d'analyser la cause
4. Implémenter la solution suggérée
5. Vérifier la résolution

**Exemple:**
```
User: "Le build échoue avec l'erreur [error message]"
Claude: [Analyse l'erreur, identifie la cause racine, propose une solution]
```

### 4. Création de documentation

**Processus:**
1. Identifier le besoin de documentation
2. Fournir le contexte technique
3. Demander à Claude de rédiger la documentation
4. Réviser et ajuster selon les besoins
5. Intégrer dans le projet

**Exemple:**
```
User: "Crée une documentation pour le module gallery_builder.py"
Claude: [Génère une documentation complète avec exemples d'utilisation]
```

### 5. Tests unitaires

**Processus:**
1. Identifier le code à tester
2. Demander à Claude de créer des tests
3. Réviser la couverture de tests
4. Ajouter des cas de test supplémentaires si nécessaire
5. Intégrer dans la suite de tests

**Exemple:**
```
User: "Crée des tests pytest pour scripts/utils.py"
Claude: [Génère des tests unitaires complets avec fixtures et assertions appropriées]
```

## Bonnes pratiques

### Communication efficace avec Claude

1. **Soyez spécifique:**
   - ❌ "Améliore le code"
   - ✅ "Refactorise la classe PageBuilder pour réduire le nombre de paramètres du constructeur"

2. **Fournissez le contexte:**
   - Mentionnez les contraintes techniques
   - Indiquez les priorités (performance, lisibilité, sécurité)
   - Signalez les conventions du projet à respecter

3. **Validez progressivement:**
   - Demandez des changements incrémentaux
   - Testez après chaque modification significative
   - N'acceptez pas aveuglément toutes les suggestions

4. **Documentez les décisions:**
   - Enregistrez les choix d'architecture importants
   - Maintenez un historique des changements majeurs
   - Mettez à jour la documentation après les modifications

### Standards de code à respecter

Lors de travaux avec Claude, assurez-vous que le code généré respecte:

1. **Python:**
   - PEP 8 pour le style
   - Docstrings Google Style
   - Type hints pour les signatures de fonctions
   - Gestion d'erreurs explicite avec exceptions personnalisées

2. **JavaScript:**
   - ES6+ features
   - Conventions de nommage cohérentes
   - Commentaires JSDoc pour les fonctions publiques

3. **YAML:**
   - Indentation de 2 espaces
   - Structure cohérente avec les fichiers existants

4. **Markdown:**
   - Format cohérent avec README.md
   - Liens relatifs pour les références internes

### Sécurité

Lors de l'utilisation de Claude, soyez attentif à:

1. **Validation des données:**
   - Vérifier que le code valide les entrées utilisateur
   - S'assurer de la sanitization du contenu Markdown/HTML

2. **Dépendances:**
   - Vérifier les versions suggérées
   - Consulter les notes de sécurité des packages

3. **Path traversal:**
   - Valider tous les chemins de fichiers
   - Utiliser `pathlib.Path.resolve()` pour normaliser les chemins

4. **Injection de code:**
   - Éviter `eval()` et `exec()`
   - Valider les templates et configurations YAML

## Exemples d'utilisation

### Exemple 1: Ajout d'une fonctionnalité

**Demande:**
```
Je veux ajouter un système de catégories pour les articles de blog.
Chaque article devrait pouvoir appartenir à une ou plusieurs catégories,
et je veux générer des pages de catégories qui listent tous les articles.
```

**Réponse attendue de Claude:**
- Analyse de la structure actuelle des posts
- Proposition de modification du Front Matter
- Création d'un nouveau builder pour les catégories
- Modification du template des articles
- Création du template de page catégorie
- Mise à jour de la navigation si nécessaire

### Exemple 2: Optimisation de performance

**Demande:**
```
Le build du site devient lent avec 100+ articles.
Analyse scripts/post_builder.py et suggère des optimisations.
```

**Réponse attendue de Claude:**
- Identification des goulots d'étranglement
- Suggestions de caching
- Optimisation du traitement Markdown
- Implémentation de build incrémental
- Métriques de performance avant/après

### Exemple 3: Ajout de tests

**Demande:**
```
Crée une suite de tests pour scripts/frontmatter_parser.py
incluant les cas d'erreur et les cas limites.
```

**Réponse attendue de Claude:**
- Tests pour le parsing valide
- Tests pour les erreurs de format
- Tests pour les valeurs manquantes
- Tests pour les types de données invalides
- Fixtures réutilisables

## Limitations et considérations

### Limitations de Claude

1. **Connaissance limitée:**
   - Claude a une date de coupure de connaissance (janvier 2025)
   - Les versions très récentes de packages peuvent ne pas être connues
   - Vérifiez toujours les versions dans la documentation officielle

2. **Contexte:**
   - Claude a une fenêtre de contexte limitée
   - Pour les gros fichiers, fournissez des extraits pertinents
   - Résumez les informations importantes si nécessaire

3. **Validation nécessaire:**
   - Testez toujours le code généré
   - Vérifiez la compatibilité avec l'existant
   - Validez les dépendances suggérées

### Quand NE PAS utiliser Claude

1. **Décisions stratégiques:**
   - Choix d'architecture majeure (migration framework, etc.)
   - Décisions business critiques
   - Changements qui affectent l'expérience utilisateur

2. **Opérations sensibles:**
   - Gestion des secrets et credentials
   - Configuration de production critique
   - Déploiements en production

3. **Tâches nécessitant un contexte humain:**
   - Design UX/UI qui nécessite un jugement esthétique
   - Rédaction de contenu marketing
   - Décisions nécessitant une compréhension du métier

## Ressources complémentaires

### Documentation du projet
- [README.md](./README.md) - Documentation principale
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Liste des améliorations suggérées
- [IMPROVEMENTS_STATUS.md](./IMPROVEMENTS_STATUS.md) - Statut des améliorations

### Outils recommandés
- **Claude Code:** CLI officiel pour interagir avec Claude
- **GitHub Copilot:** Pour l'autocomplétion en temps réel
- **pytest:** Framework de test Python
- **Black:** Formateur de code Python
- **ESLint:** Linter JavaScript

### Liens utiles
- [Documentation Anthropic](https://docs.anthropic.com/)
- [Guide Claude API](https://docs.anthropic.com/claude/reference/)
- [Meilleures pratiques Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)

---

## Historique des modifications

| Date | Version | Description |
|------|---------|-------------|
| 2025-11-25 | 1.0.0 | Création initiale de la documentation Claude |

---

**Note:** Ce document est maintenu par l'équipe de développement IDOINE et devrait être mis à jour au fur et à mesure de l'évolution des pratiques et des capacités de Claude.
