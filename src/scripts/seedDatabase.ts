import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Book } from "../models/Book.js";
import { Borrowing } from "../models/Borrowing.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// French translations of Z-Library categories
const frenchCategories = {
  Arts: {
    name: "Arts",
    subcategories: [
      "Architecture",
      "Commerce de l'art",
      "Conservation, restauration et entretien",
      "Art contemporain",
      "Danse",
      "Musique numérique",
      "Mode, arts décoratifs et design",
      "Cinéma",
      "Arts graphiques",
      "Histoire et critique",
      "Musées et collections",
      "Musique",
      "Peinture",
      "Arts du spectacle",
      "Photographie",
      "Sculpture",
      "Étude et enseignement",
      "Techniques",
    ],
  },
  Astronomie: {
    name: "Astronomie",
    subcategories: [
      "Astronomes et astrophysiciens - Biographie",
      "Guides d'observation des étoiles",
      "Astrophysique et sciences spatiales",
      "Cosmologie",
      "Galaxies - Études et observations astronomiques",
      "Histoire de l'astronomie",
      "Espace - Observation et exploration",
      "Étoiles - Études et observations astronomiques",
      "Système solaire - Études et observations astronomiques",
      "Univers - Études et observations astronomiques",
    ],
  },
  "Biographie et Autobiographie": {
    name: "Biographie et Autobiographie",
    subcategories: [
      "Artistes, architectes et photographes",
      "Affaires et finance",
      "Biographie éducative",
      "Biographie de divertissement",
      "Essais, journaux et lettres",
      "Cinéma, télévision et musique",
      "Biographie générale et diverse",
      "Biographie historique",
      "Holocauste",
      "Biographie littéraire",
      "Médical, juridique et sciences sociales",
      "Romanciers, poètes et dramaturges",
      "Peuples et cultures - Biographie",
      "Religieux",
      "Science, mathématiques et technologie",
      "Questions sociales et de santé",
      "Sports et biographie d'aventure",
      "Théâtre et art de la performance",
      "Histoires de vie tragiques",
      "Crime véritable",
      "Guerre et espionnage",
    ],
  },
  "Biologie et autres sciences naturelles": {
    name: "Biologie et autres sciences naturelles",
    subcategories: [
      "Biologie",
      "Biophysique",
      "Biostatistiques",
      "Biotechnologie",
      "Cytologie",
      "Écologie",
      "Génétique",
      "Histoire de la biologie",
      "Biologie humaine",
      "Microbiologie",
      "Moléculaire",
      "Paléontologie",
      "Plantes : Agriculture et foresterie",
      "Plantes : Botanique",
      "Virologie",
      "Zoologie",
    ],
  },
  "Affaires et Économie": {
    name: "Affaires et Économie",
    subcategories: [
      "Comptabilité",
      "Commerce électronique",
      "Économétrie",
      "Économie",
      "Ressources humaines",
      "Industries",
      "Investissement",
      "Recherche d'emploi et carrières",
      "Logistique",
      "Management et leadership",
      "Marchés",
      "Économie mathématique",
      "Finance personnelle",
      "Populaire",
      "Finance professionnelle",
      "Gestion de projet",
      "Immobilier",
      "Responsabilité et éthique des affaires",
      "Ventes et marketing",
      "Petite entreprise",
      "Trading",
    ],
  },
  Chimie: {
    name: "Chimie",
    subcategories: [
      "Chimie analytique",
      "Biochimie",
      "Chimie - Général et divers",
      "Histoire de la chimie",
      "Chimie inorganique",
      "Microchimie",
      "Chimie organique",
      "Chimie physique",
      "Chimie technique et industrielle",
    ],
  },
  Informatique: {
    name: "Informatique",
    subcategories: [
      "Algorithmes et structures de données",
      "Applications et logiciels",
      "Intelligence artificielle (IA)",
      "Affaires et culture informatiques",
      "Certification et formation informatiques",
      "Graphisme et design informatiques",
      "Informatique - Général et divers",
      "Cryptographie",
      "Cybernétique",
      "Bases de données",
      "Photographie numérique",
      "Vidéo numérique",
      "Systèmes informatiques d'entreprise",
      "Matériel",
      "Utilisateur domestique et débutant",
      "Systèmes d'information",
      "Internet et World Wide Web",
      "Conférences, monographies",
      "Mac OS",
      "Médias",
      "Microsoft Windows",
      "Réseaux",
      "Nouveau en informatique",
      "Systèmes d'exploitation",
      "Organisation et traitement des données",
      "Jeux PC et vidéo",
      "Professionnels",
      "Programmation",
      "Sécurité",
      "UNIX et Linux",
      "Développement web",
    ],
  },
  "Livres de cuisine, nourriture et vin": {
    name: "Livres de cuisine, nourriture et vin",
    subcategories: [
      "Asiatique",
      "Pâtisserie et desserts",
      "Barbecue et grillades",
      "Livre de cuisine pour débutants",
      "Français",
      "International",
      "Italien",
      "Repas rapides et faciles",
      "Régime spécial",
      "Végétarien et végétalien",
      "Vin et boissons",
    ],
  },
  "Sciences de la Terre": {
    name: "Sciences de la Terre",
    subcategories: [
      "Cartographie",
      "Histoire de la Terre",
      "Géochimie",
      "Géodésie",
      "Géographie",
      "Géologie",
      "Géophysique",
      "Hydrogéologie",
      "Météorologie, Climatologie",
      "Minéralogie",
      "Exploitation minière",
      "Océanographie",
      "Rivières et lacs",
      "L'environnement",
      "Volcans, tremblements de terre et tectonique",
    ],
  },
  "Études de l'éducation et enseignement": {
    name: "Études de l'éducation et enseignement",
    subcategories: [
      "Administration académique",
      "Éducation des adultes et formation continue",
      "Éducation bilingue et multiculturelle",
      "Éducation - Général et divers",
      "Gestion et organisation de l'éducation",
      "Orientation et conseil pédagogiques",
      "Théorie, recherche et histoire de l'éducation",
      "Enseignement élémentaire",
      "Enseignement supérieur et post-secondaire",
      "Histoire de l'éducation",
      "Enseignement à domicile",
      "Collèges et universités individuels",
      "Conférences et symposiums internationaux",
      "Philosophie de l'éducation",
      "Éducation préscolaire et petite enfance",
      "Éducation et enseignement scolaire",
      "Éducation spécialisée",
      "Étude et préparation aux tests",
      "Enseignement et formation des enseignants",
      "Enseignement - Lecture et langue",
      "Résumés de thèses",
      "Formation professionnelle",
    ],
  },
  Ingénierie: {
    name: "Ingénierie",
    subcategories: [
      "Ingénierie aérospatiale",
      "Automobile",
      "Bio-ingénierie",
      "Génie chimique",
      "Génie civil et structurel",
      "Technologie informatique",
      "Métiers de la construction et du bâtiment",
      "Génie électrique et électronique",
      "Énergie et ressources énergétiques",
      "Ingénierie - Général et divers",
      "Technologie de l'ingénierie",
      "Environnementale",
      "Génie hydraulique",
      "Génie industriel et science des matériaux",
      "Génie mécanique et dynamique",
      "Robotique et intelligence artificielle",
      "Aspects sociaux et culturels de la technologie",
      "Télécommunications",
    ],
  },
  Fiction: {
    name: "Fiction",
    subcategories: [
      "Récits d'aventure et action",
      "Fiction américaine",
      "Anthologies",
      "Classiques",
      "Fiction contemporaine",
      "Théâtre",
      "Essais",
      "Sagas familiales",
      "Fantastique",
      "Fiction historique",
      "Horreur",
      "Humour",
      "Littérature générale",
      "Métaphysique et visionnaire",
      "Mythes et folklore",
      "Fiction nautique et maritime",
      "Peuples et cultures - Fiction",
      "Psychologique",
      "Religieuse et inspirante",
      "Nouvelles",
      "Fiction de guerre et militaire",
      "Westerns",
      "Fiction féminine",
      "Fiction mondiale",
      "Jeunes adultes",
    ],
  },
  Histoire: {
    name: "Histoire",
    subcategories: [
      "Histoire africaine",
      "Études américaines",
      "Histoire ancienne",
      "Archéologie",
      "Histoire asiatique",
      "Histoire australienne et océanienne",
      "Histoire canadienne",
      "Histoire chinoise",
      "Histoire européenne",
      "Histoire indienne",
      "Histoire islamique",
      "Histoire de l'Amérique latine",
      "Moyen Âge",
      "Histoire du Moyen-Orient",
      "Histoire militaire",
      "Histoire russe et soviétique",
      "Histoire mondiale",
    ],
  },
  "Entretien de la maison et loisirs": {
    name: "Entretien de la maison et loisirs",
    subcategories: [
      "Livres d'activités et de jeux",
      "Antiquités et objets de collection",
      "Dessin",
      "Mode, joaillerie",
      "Artisanat floral et nature",
      "Jeux : Jeux de société",
      "Jeux : Échecs",
      "Jardinage",
      "Travail du verre et du métal",
      "Artisanat",
      "Artisanat : Coupe et couture",
      "Design d'intérieur et décoration",
      "Modélisme",
      "Artisanat du papier",
      "Jeux de rôle et fantastiques",
      "Travail du bois et sculpture",
    ],
  },
  "Jurisprudence et droit": {
    name: "Jurisprudence et droit",
    subcategories: [
      "Droit des affaires, commercial et financier",
      "Droit des droits civiques",
      "Droit constitutionnel",
      "Tribunaux et pratique des procès",
      "Droit et procédure pénale",
      "Criminologie, science forensique",
      "Criminologie : Examen judiciaire",
      "Droit de l'environnement",
      "Droit de la famille",
      "Droit étranger et international",
      "Droit général et divers",
      "Propriété intellectuelle",
      "Droit du travail",
      "Référence juridique",
      "Théorie et philosophie du droit",
      "Droit médical",
      "Droit immobilier et de la propriété",
      "Droit religieux",
      "Droit de la responsabilité civile",
    ],
  },
  Langues: {
    name: "Langues",
    subcategories: [
      "Référence de langue arabe",
      "Référence de langue chinoise",
      "Études comparatives",
      "Dictionnaires",
      "Anglais langue étrangère et référence",
      "Référence de langue française",
      "Langues générales et diverses - Référence",
      "Référence de langue allemande",
      "Référence de langues germaniques",
      "Grammaire, dictionnaires et guides de conversation",
      "Référence de langue hindi",
      "Référence de langues indiennes",
      "Référence de langue indonésienne",
      "Référence de langue italienne",
      "Référence de langue japonaise",
      "Référence de langue coréenne",
      "Référence de langue latine",
      "Dictionnaires polyglottes",
      "Référence de langue portugaise",
      "Rhétorique",
      "Référence de langues romanes",
      "Référence de langue russe",
      "Référence de langues slaves",
      "Référence de langue espagnole",
      "Référence de langue chinoise traditionnelle",
      "Référence de langue turque",
    ],
  },
  Linguistique: {
    name: "Linguistique",
    subcategories: [
      "Linguistique historique et comparative",
      "Sémiotique",
      "Sociolinguistique",
      "Stylistique",
    ],
  },
  Mathématiques: {
    name: "Mathématiques",
    subcategories: [
      "Algèbre",
      "Analyse",
      "Mathématiques appliquées",
      "Théorie du contrôle automatique",
      "Combinatoire",
      "Mathématiques computationnelles",
      "Algèbre informatique",
      "Fractions continues",
      "Équations différentielles",
      "Mathématiques discrètes",
      "Systèmes dynamiques",
      "Élémentaire",
      "Analyse fonctionnelle",
      "Logique floue et applications",
      "Théorie des jeux",
      "Géométrie et topologie",
      "Théorie des graphes",
      "Cours",
      "Fondements mathématiques",
      "Physique mathématique",
      "Statistiques mathématiques",
      "Théorie mathématique",
      "Théorie des nombres",
      "Analyse numérique",
      "Théorie des opérateurs",
      "Contrôle optimal",
      "Optimisation. Recherche opérationnelle",
      "Probabilité",
      "Casse-tête",
      "Symétrie et groupe",
      "La variable complexe",
      "Ondelettes et traitement du signal",
    ],
  },
  Médecine: {
    name: "Médecine",
    subcategories: [
      "Anatomie et physiologie",
      "Anesthésiologie et soins intensifs",
      "Cardiologie",
      "Médecine chinoise",
      "Médecine clinique",
      "Dentisterie, orthodontie",
      "Dermatologie",
      "Diabète",
      "Maladies",
      "Endocrinologie",
      "ORL",
      "Épidémiologie",
      "Feng Shui",
      "Professions de la santé",
      "Histologie",
      "Homéopathie",
      "Immunologie",
      "Maladies infectieuses",
      "Médecine interne",
      "Référence en médecine et soins infirmiers",
      "Préparation aux examens de médecine et soins infirmiers",
      "Médecine moléculaire",
      "Médecine naturelle",
      "Neurologie",
      "Neuroscience",
      "Soins infirmiers",
      "Oncologie",
      "Ophtalmologie",
      "Pédiatrie",
      "Pharmacologie",
      "Littérature scientifique populaire",
      "Psychiatrie",
      "Radiologie",
      "Chirurgie, orthopédie",
      "Thérapie, psychothérapie",
      "Essai clinique",
      "Médecine vétérinaire",
      "Yoga, Ayurveda",
    ],
  },
  "Nature, animaux et animaux de compagnie": {
    name: "Nature, animaux et animaux de compagnie",
    subcategories: [
      "Soins aux animaux et animaux de compagnie",
      "Animaux",
      "Oiseaux",
      "Chats",
      "Dinosaures",
      "Chiens",
      "Animaux exotiques et autres animaux de compagnie",
      "Guides de terrain",
      "Fossiles",
      "Aquarium domestique",
      "Chevaux",
      "Insectes et arachnides",
      "Mammifères",
      "Vie marine et aquatique",
      "Catastrophes naturelles",
      "Histoire naturelle",
      "Terrain naturel",
      "Nature - Autres",
      "Oiseaux de compagnie",
      "Poissons de compagnie",
      "Mémoires d'animaux de compagnie",
      "Souris, lapins, hamsters, etc. de compagnie",
      "Porcs de compagnie",
      "Reptiles et amphibiens de compagnie",
      "Animaux de compagnie - Général et divers",
      "Plantes et champignons",
      "Observation des étoiles - Manuels d'amateurs",
      "Météo",
    ],
  },
  Autres: {
    name: "Autres",
    subcategories: [],
  },
  Physique: {
    name: "Physique",
    subcategories: [
      "Astronomie : Astrophysique",
      "Atomique et moléculaire",
      "Chaos et systèmes dynamiques",
      "Physique des cristaux",
      "Électricité et magnétisme",
      "Électrodynamique",
      "Cours généraux",
      "Lumière, optique et laser",
      "Mécanique",
      "Mécanique : Mécanique des fluides",
      "Mécanique : Mécanique des corps déformables",
      "Mécanique : Dynamique non linéaire et chaos",
      "Mécanique : Oscillations et ondes",
      "Mécanique : Résistance des matériaux",
      "Mécanique : Théorie de l'élasticité",
      "Nucléaire",
      "Optique",
      "Physique de l'atmosphère",
      "Physique des plasmas",
      "Mécanique quantique",
      "Physique quantique",
      "Relativité",
      "Physique du solide",
      "Spectroscopie",
      "États de la matière",
      "Physique théorique",
      "Théorie de la relativité et gravitation",
      "Thermodynamique",
    ],
  },
  Poésie: {
    name: "Poésie",
    subcategories: [
      "Poésie américaine",
      "Poésie ancienne et classique",
      "Poésie arabe et du Moyen-Orient",
      "Poésie asiatique",
      "Poésie australienne, néo-zélandaise et des îles du Pacifique",
      "Poésie canadienne",
      "Poésie anglaise, irlandaise et écossaise",
      "Poésie européenne",
      "Poésie générale et diverse",
      "Poésie inspirante et religieuse",
      "Poésie d'Amérique latine et des Caraïbes",
      "Anthologies de poésie",
      "Poésie russe",
    ],
  },
  Psychologie: {
    name: "Psychologie",
    subcategories: [
      "Psychologie clinique",
      "Psychologie cognitive",
      "Psychologie du développement",
      "Neuropsychologie",
      "Pédagogie",
      "Troubles psychologiques",
      "Psychologie - Théorie, histoire et recherche",
      "Psychopathie",
      "Psychothérapie",
      "Psychologie sociale",
    ],
  },
  Référence: {
    name: "Référence",
    subcategories: [
      "Almanachs et annuaires",
      "Atlas et cartes",
      "Guides de consommation",
      "Encyclopédies",
      "Généalogie et histoire familiale",
      "Bibliothéconomie et sciences de l'information",
      "Autres références par sujet",
      "Guides scolaires et préparation aux examens",
      "Thésaurus",
      "Écriture",
    ],
  },
  "Religion et spiritualité": {
    name: "Religion et spiritualité",
    subcategories: [
      "Islam",
      "Conflit religieux",
      "Études religieuses",
      "Textes sacrés",
    ],
  },
  "Science Général": {
    name: "Science Général",
    subcategories: [
      "Recherche et développement",
      "Science de la science",
      "Scientifique et populaire : Journalisme",
      "Scientifique-populaire",
      "Théories de la science",
    ],
  },
  "Science-Fiction": {
    name: "Science-Fiction",
    subcategories: [
      "Réalités alternatives",
      "Cyberpunk",
      "Fiction dystopique",
      "Fiction fantastique",
      "Haute technologie et science-fiction dure",
      "Science-fiction militaire",
      "Autre science-fiction",
      "Space opera",
      "Space western",
      "Steampunk",
      "Fiction surnaturelle",
      "Fiction utopique",
    ],
  },
  "Développement personnel, relations et style de vie": {
    name: "Développement personnel, relations et style de vie",
    subcategories: [
      "Dépendance et rétablissement",
      "Vieillissement",
      "Médecine alternative et guérison naturelle",
      "Beauté et mode",
      "Rencontres",
      "Régime alimentaire et nutrition",
      "Style de vie numérique",
      "Divorce",
      "Guérison émotionnelle",
      "Exercice et forme physique",
      "Familles et parents",
      "Santé - Maladies et troubles",
      "Amour et romance",
      "Mariage",
      "Santé et style de vie masculins",
      "Croissance personnelle et inspiration",
      "Grossesse et soins des enfants",
      "Aide psychologique",
      "Relations",
      "Sexualité",
      "L'art de la communication",
      "Mariages",
      "Santé et style de vie féminins",
    ],
  },
  "Société, politique et philosophie": {
    name: "Société, politique et philosophie",
    subcategories: [
      "Philosophie antique et médiévale",
      "Anthropologie",
      "Philosophie asiatique",
      "Culturel",
      "Ethnographie",
      "Philosophie européenne et américaine",
      "Philosophie générale et diverse",
      "Gouvernement et politique",
      "Relations internationales",
      "Journalisme, médias",
      "Grandes branches de l'étude philosophique",
      "Positions et mouvements philosophiques",
      "Politique",
      "Philosophie de la Renaissance et moderne",
      "Sciences sociales",
      "Sociologie",
      "Guerre et défense",
      "Études féminines",
    ],
  },
  "Sports, loisirs et jeux": {
    name: "Sports, loisirs et jeux",
    subcategories: [
      "Sports aériens",
      "Athlétisme et gymnastique",
      "Jeux de balle",
      "Vélo",
      "Canotage et voile",
      "Culturisme",
      "Escalade et alpinisme",
      "Escrime",
      "Football et rugby",
      "Golf",
      "Hockey",
      "Chasse et pêche",
      "Arts martiaux",
      "Sports motorisés",
      "Jeux olympiques et sports olympiques",
      "Autres sports",
      "Sports de plein air et d'aventure",
      "Survie",
      "Entraînement et coaching",
      "Sports nautiques",
      "Sports d'hiver",
    ],
  },
  Technique: {
    name: "Technique",
    subcategories: [
      "Équipement aérospatial",
      "Automatisation",
      "Communication",
      "Construction",
      "Construction : Industrie du ciment",
      "Construction : Rénovation et design d'intérieur",
      "Construction : Ventilation et climatisation",
      "Électronique",
      "Électronique : Fibre optique",
      "Électronique : Matériel (Hardware)",
      "Électronique : Électronique domestique",
      "Électronique : Technologie des microprocesseurs",
      "Électronique : Radio",
      "Électronique : Robotique",
      "Électronique : Traitement du signal",
      "Électronique : Télécommunications",
      "Électronique : TV. Vidéo",
      "Électronique : VLSI",
      "Énergie",
      "Énergie : Énergies renouvelables",
      "Expériences, instruments et mesures",
      "Fabrication alimentaire",
      "Technologie des carburants",
      "Chaleur",
      "Équipement et technologie industriels",
      "Industrie légère",
      "Marine et nautique",
      "Matériaux",
      "Métallurgie",
      "Métrologie",
      "Équipement militaire",
      "Équipement militaire : Missiles",
      "Équipement militaire : Armes",
      "Nanotechnologie",
      "Technologies du pétrole et du gaz",
      "Affaires de brevets. Ingéniosité. Innovation",
      "Édition",
      "Réfrigération",
      "Littérature réglementaire",
      "Sécurité et sûreté",
      "Transport",
      "Transport : Aviation",
      "Transport : Voitures, motos",
      "Transport : Rail",
      "Transport : Navires",
      "Traitement de l'eau",
    ],
  },
};

// Sample French book titles and authors
const frenchBooks = [
  {
    title: "Les Misérables",
    author: "Victor Hugo",
    description:
      "Un roman épique sur la justice sociale et la rédemption dans la France du 19e siècle.",
    language: "fr",
    format: "pdf",
    publicationYear: 1862,
  },
  {
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    description:
      "Un conte philosophique et poétique sous l'apparence d'un conte pour enfants.",
    language: "fr",
    format: "epub",
    publicationYear: 1943,
  },
  {
    title: "L'Étranger",
    author: "Albert Camus",
    description:
      "Un roman existentialiste sur l'absurdité de la condition humaine.",
    language: "fr",
    format: "pdf",
    publicationYear: 1942,
  },
  {
    title: "Madame Bovary",
    author: "Gustave Flaubert",
    description:
      "L'histoire tragique d'Emma Bovary, une femme rêveuse et romantique.",
    language: "fr",
    format: "epub",
    publicationYear: 1857,
  },
  {
    title: "Le Rouge et le Noir",
    author: "Stendhal",
    description:
      "L'ascension sociale de Julien Sorel dans la France de la Restauration.",
    language: "fr",
    format: "pdf",
    publicationYear: 1830,
  },
  {
    title: "Germinal",
    author: "Émile Zola",
    description:
      "Un roman sur les conditions de vie des mineurs au 19e siècle.",
    language: "fr",
    format: "epub",
    publicationYear: 1885,
  },
  {
    title: "Notre-Dame de Paris",
    author: "Victor Hugo",
    description: "L'histoire d'amour tragique entre Quasimodo et Esmeralda.",
    language: "fr",
    format: "pdf",
    publicationYear: 1831,
  },
  {
    title: "Candide",
    author: "Voltaire",
    description: "Un conte philosophique satirique sur l'optimisme.",
    language: "fr",
    format: "epub",
    publicationYear: 1759,
  },
  {
    title: "Les Fleurs du mal",
    author: "Charles Baudelaire",
    description: "Un recueil de poèmes sur la beauté, l'amour et la mort.",
    language: "fr",
    format: "pdf",
    publicationYear: 1857,
  },
  {
    title: "À la recherche du temps perdu",
    author: "Marcel Proust",
    description: "Une œuvre monumentale sur la mémoire et le temps qui passe.",
    language: "fr",
    format: "epub",
    publicationYear: 1913,
  },
  {
    title: "Introduction à l'informatique",
    author: "Jean-Pierre Dupont",
    description:
      "Guide complet pour comprendre les bases de l'informatique moderne.",
    language: "fr",
    format: "pdf",
    publicationYear: 2020,
  },
  {
    title: "Mathématiques appliquées",
    author: "Marie Dubois",
    description:
      "Concepts mathématiques essentiels pour les étudiants en sciences.",
    language: "fr",
    format: "epub",
    publicationYear: 2019,
  },
  {
    title: "Histoire de France",
    author: "Pierre Martin",
    description:
      "Panorama complet de l'histoire française des origines à nos jours.",
    language: "fr",
    format: "pdf",
    publicationYear: 2021,
  },
  {
    title: "Biologie cellulaire",
    author: "Sophie Laurent",
    description: "Étude approfondie des cellules et de leurs fonctions.",
    language: "fr",
    format: "epub",
    publicationYear: 2020,
  },
  {
    title: "Chimie organique",
    author: "François Bernard",
    description: "Principes fondamentaux de la chimie des composés carbonés.",
    language: "fr",
    format: "pdf",
    publicationYear: 2018,
  },
];

// Sample French users
const frenchUsers = [
  {
    firstname: "Jean",
    lastname: "Dupont",
    email: "jean.dupont@universite.fr",
    role: "student",
    cardNumber: "ETU001",
    faculty: "Faculté des Sciences",
  },
  {
    firstname: "Marie",
    lastname: "Martin",
    email: "marie.martin@universite.fr",
    role: "student",
    cardNumber: "ETU002",
    faculty: "Faculté de Lettres",
  },
  {
    firstname: "Pierre",
    lastname: "Dubois",
    email: "pierre.dubois@universite.fr",
    role: "teacher",
    cardNumber: "ENS001",
    faculty: "Faculté des Sciences",
  },
  {
    firstname: "Sophie",
    lastname: "Laurent",
    email: "sophie.laurent@universite.fr",
    role: "teacher",
    cardNumber: "ENS002",
    faculty: "Faculté de Médecine",
  },
  {
    firstname: "Admin",
    lastname: "Bibliothèque",
    email: "admin@bibliotheque.fr",
    role: "staff",
    cardNumber: "STAFF001",
    faculty: null,
  },
  {
    firstname: "Fatima",
    lastname: "Benali",
    email: "fatima.benali@universite.fr",
    role: "student",
    cardNumber: "ETU003",
    faculty: "Faculté de Droit",
  },
  {
    firstname: "Ahmed",
    lastname: "Mansouri",
    email: "ahmed.mansouri@universite.fr",
    role: "student",
    cardNumber: "ETU004",
    faculty: "Faculté d'Économie",
  },
  {
    firstname: "Nadia",
    lastname: "Cherif",
    email: "nadia.cherif@universite.fr",
    role: "teacher",
    cardNumber: "ENS003",
    faculty: "Faculté de Lettres",
  },
];

async function connectToDatabase() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/bibliodz";
    await mongoose.connect(mongoUri);
    console.log("✅ Connexion à MongoDB réussie");
  } catch (error) {
    console.error("❌ Erreur de connexion à MongoDB:", error);
    process.exit(1);
  }
}

async function clearDatabase() {
  try {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Book.deleteMany({});
    await Borrowing.deleteMany({});
    console.log("🗑️  Base de données vidée");
  } catch (error) {
    console.error("❌ Erreur lors du vidage de la base de données:", error);
    throw error;
  }
}

async function seedCategories() {
  try {
    console.log("📚 Création des catégories...");

    const categoryMap = new Map();

    // Create main categories first
    for (const [key, categoryData] of Object.entries(frenchCategories)) {
      const category = new Category({
        name: categoryData.name,
        description: `Catégorie ${categoryData.name}`,
      });

      const savedCategory = await category.save();
      categoryMap.set(categoryData.name, savedCategory);
      console.log(`  ✅ Catégorie créée: ${categoryData.name}`);
    }

    // Create subcategories
    for (const [key, categoryData] of Object.entries(frenchCategories)) {
      const parentCategory = categoryMap.get(categoryData.name);

      for (const subcategoryName of categoryData.subcategories) {
        const subcategory = new Category({
          name: subcategoryName,
          parent: parentCategory._id,
          description: `Sous-catégorie de ${categoryData.name}`,
        });

        const savedSubcategory = await subcategory.save();
        categoryMap.set(subcategoryName, savedSubcategory);
        console.log(`    ✅ Sous-catégorie créée: ${subcategoryName}`);
      }
    }

    console.log(`✅ ${categoryMap.size} catégories et sous-catégories créées`);
    return categoryMap;
  } catch (error) {
    console.error("❌ Erreur lors de la création des catégories:", error);
    throw error;
  }
}

async function seedUsers() {
  try {
    console.log("👥 Création des utilisateurs...");

    const users = [];
    const defaultPassword = "password123";

    for (const userData of frenchUsers) {
      const user = new User({
        ...userData,
        password: defaultPassword,
        cardPhoto: "/uploads/cards/default-card.jpg",
        isActive: true,
        isEmailVerified: true,
      });

      const savedUser = await user.save();
      users.push(savedUser);
      console.log(
        `  ✅ Utilisateur créé: ${userData.firstname} ${userData.lastname} (${userData.role})`
      );
    }

    console.log(`✅ ${users.length} utilisateurs créés`);
    return users;
  } catch (error) {
    console.error("❌ Erreur lors de la création des utilisateurs:", error);
    throw error;
  }
}

async function seedBooks(categoryMap: Map<string, any>) {
  try {
    console.log("📖 Création des livres...");

    const books = [];
    const categories = Array.from(categoryMap.values()).filter(
      (cat) => !cat.parent
    );

    for (let i = 0; i < frenchBooks.length; i++) {
      const bookData = frenchBooks[i];
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];

      // Create different availability types for testing filters
      const availabilityTypes = ['physical', 'digital', 'both'];
      const availabilityType = availabilityTypes[i % 3]; // Cycle through types
      
      let bookConfig: any = {
        ...bookData,
        category: randomCategory._id,
        coverImage: "/uploads/covers/default-cover.jpg",
      };
      
      // Configure based on availability type
      switch (availabilityType) {
        case 'physical':
          // Physical only: has copies but no digital file
          bookConfig = {
            ...bookConfig,
            physicalCopies: Math.floor(Math.random() * 5) + 1, // 1-5 copies
            availableCopies: Math.floor(Math.random() * 3) + 1, // 1-3 available
            isDownloadable: false,
            filePath: null, // No digital file
          };
          break;
          
        case 'digital':
          // Digital only: has file but no physical copies
          bookConfig = {
            ...bookConfig,
            physicalCopies: 0, // No physical copies
            availableCopies: 0,
            isDownloadable: true,
            filePath: (bookData as any)?.format === "pdf"
              ? "/uploads/books/sample.pdf"
              : "/uploads/books/sample.epub",
          };
          break;
          
        case 'both':
          // Both: has physical copies AND digital file
          bookConfig = {
            ...bookConfig,
            physicalCopies: Math.floor(Math.random() * 5) + 1, // 1-5 copies
            availableCopies: Math.floor(Math.random() * 3) + 1, // 1-3 available
            isDownloadable: true,
            filePath: (bookData as any)?.format === "pdf"
              ? "/uploads/books/sample.pdf"
              : "/uploads/books/sample.epub",
          };
          break;
      }

      const book = new Book(bookConfig);
      const savedBook = await book.save();
      books.push(savedBook);
      
      console.log(`  ✅ Livre créé: ${(bookData as any)?.title} par ${(bookData as any)?.author} [${availabilityType?.toUpperCase()}]`);
    }

    console.log(`✅ ${books.length} livres créés`);
    return books;
  } catch (error) {
    console.error("❌ Erreur lors de la création des livres:", error);
    throw error;
  }
}

async function seedBorrowings(users: any[], books: any[]) {
  try {
    console.log("📋 Création des emprunts...");

    const borrowings = [];
    const students = users.filter((user) => user.role === "student");

    // Create some active borrowings
    for (let i = 0; i < Math.min(10, students.length * 2); i++) {
      const randomStudent =
        students[Math.floor(Math.random() * students.length)];
      const randomBook = books[Math.floor(Math.random() * books.length)];

      // Check if this combination already exists
      const existingBorrowing = await Borrowing.findOne({
        user: randomStudent._id,
        book: randomBook._id,
        status: "active",
      });

      if (!existingBorrowing) {
        const borrowDate = new Date();
        borrowDate.setDate(
          borrowDate.getDate() - Math.floor(Math.random() * 10)
        ); // 0-10 days ago

        const dueDate = new Date(borrowDate);
        dueDate.setDate(dueDate.getDate() + 14); // 14 days from borrow date

        const isOverdue = Math.random() > 0.7; // 30% chance of being overdue
        if (isOverdue) {
          dueDate.setDate(
            dueDate.getDate() - Math.floor(Math.random() * 5) - 1
          ); // 1-5 days overdue
        }

        const borrowing = new Borrowing({
          user: randomStudent._id,
          book: randomBook._id,
          borrowDate,
          dueDate,
          status: isOverdue ? "overdue" : "active",
          renewalCount: Math.floor(Math.random() * 2), // 0-1 renewals
        });

        const savedBorrowing = await borrowing.save();
        borrowings.push(savedBorrowing);
        console.log(
          `  ✅ Emprunt créé: ${randomStudent.firstname} ${randomStudent.lastname} - ${randomBook.title}`
        );
      }
    }

    // Create some returned borrowings
    for (let i = 0; i < 5; i++) {
      const randomStudent =
        students[Math.floor(Math.random() * students.length)];
      const randomBook = books[Math.floor(Math.random() * books.length)];

      const borrowDate = new Date();
      borrowDate.setDate(
        borrowDate.getDate() - Math.floor(Math.random() * 30) - 15
      ); // 15-45 days ago

      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + 14);

      const returnDate = new Date(borrowDate);
      returnDate.setDate(
        returnDate.getDate() + Math.floor(Math.random() * 20) + 5
      ); // 5-25 days after borrow

      const borrowing = new Borrowing({
        user: randomStudent._id,
        book: randomBook._id,
        borrowDate,
        dueDate,
        returnDate,
        status: "returned",
        renewalCount: Math.floor(Math.random() * 3), // 0-2 renewals
      });

      const savedBorrowing = await borrowing.save();
      borrowings.push(savedBorrowing);
      console.log(
        `  ✅ Emprunt retourné créé: ${randomStudent.firstname} ${randomStudent.lastname} - ${randomBook.title}`
      );
    }

    console.log(`✅ ${borrowings.length} emprunts créés`);
    return borrowings;
  } catch (error) {
    console.error("❌ Erreur lors de la création des emprunts:", error);
    throw error;
  }
}

async function seedDatabase() {
  try {
    console.log("🌱 Début du seeding de la base de données...\n");

    await connectToDatabase();
    await clearDatabase();

    const categoryMap = await seedCategories();
    const users = await seedUsers();
    const books = await seedBooks(categoryMap);
    const borrowings = await seedBorrowings(users, books);

    console.log("\n🎉 Seeding terminé avec succès!");
    console.log("\n📊 Résumé:");
    console.log(`   👥 Utilisateurs: ${users.length}`);
    console.log(`   📚 Catégories: ${categoryMap.size}`);
    console.log(`   📖 Livres: ${books.length}`);
    console.log(`   📋 Emprunts: ${borrowings.length}`);

    console.log("\n🔑 Comptes de test:");
    console.log(
      "   📧 admin@bibliotheque.fr (staff) - mot de passe: password123"
    );
    console.log(
      "   📧 pierre.dubois@universite.fr (teacher) - mot de passe: password123"
    );
    console.log(
      "   📧 jean.dupont@universite.fr (student) - mot de passe: password123"
    );
  } catch (error) {
    console.error("❌ Erreur lors du seeding:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Déconnexion de MongoDB");
    process.exit(0);
  }
}

// Run the seeding script

seedDatabase();

export { seedDatabase };
