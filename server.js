const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // Nécessaire pour les chemins de fichiers

// --- SÉCURITÉ : URI MongoDB vient des variables d'environnement de Render ---
// IMPORTANT : Tu dois la définir dans les réglages "Environment" de Render !
const MONGO_URI = process.env.MONGO_URI; 

const app = express();
// Sur Render, l'environnement fixe le port, on utilise process.env.PORT ou 3000 par défaut
const PORT = process.env.PORT || 3000; 

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// --- 1. AFFICHAGE DU FRONTEND (HTML/CSS/JS) ---

// 1. Permet à Express de trouver index.html, style.css, etc. dans le dossier racine
app.use(express.static(path.join(__dirname, ''))); 

// 2. Définit ce qu'il faut afficher quand on arrive sur l'URL principale (/)
app.get('/', (req, res) => {
    // S'assure que le fichier index.html est envoyé
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- DÉFINITION DU MODÈLE DE DONNÉES (SCHEMA) ---
// Comment les données "joueur" seront stockées dans la DB
const playerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // player-1, player-2, etc.
    name: { type: String, required: true },
    balance: { type: Number, default: 0.00 }
});

const Player = mongoose.model('Player', playerSchema);

// --- FONCTIONS DE BASE POUR INITIALISER LE TEST (Pour le premier lancement) ---
async function ensurePlayerExists(playerId, playerName, initialBalance) {
    let player = await Player.findOne({ id: playerId });
    if (!player) {
        player = new Player({ 
            id: playerId, 
            name: playerName, 
            balance: initialBalance 
        });
        await player.save();
        console.log(`Joueur ${playerName} créé.`);
    }
}

// --- CONNEXION À LA BASE DE DONNÉES ---
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connecté à MongoDB Atlas Baka !");

        // Crée les joueurs si c'est la première fois
        await ensurePlayerExists('player-1', 'Admin Dark', 50000.00);
        await ensurePlayerExists('player-2', 'Dark Runner', 1500.50);

        // Démarre le serveur EXPRESS après la connexion DB
        app.listen(PORT, () => {
            console.log(`Serveur Dark API lancé sur http://localhost:${PORT}.`);
        });
    })
    .catch(err => {
        console.error("Échec de la connexion à MongoDB :", err.message);
    });


// --- ROUTE 2: Lire la Balance d'un Joueur (API) ---
app.get('/api/balance/:id', async (req, res) => {
    try {
        const playerId = req.params.id;
        const player = await Player.findOne({ id: playerId });

        if (player) {
            res.json({ balance: player.balance, name: player.name });
        } else {
            // Si le joueur n'existe pas, on le crée avec 0 $
            const newPlayer = new Player({ 
                id: playerId, 
                name: `Guest-${playerId.slice(-4)}`, 
                balance: 0.00 
            });
            await newPlayer.save();
            res.status(200).json({ balance: newPlayer.balance, name: newPlayer.name });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// --- ROUTE 3: Mettre à Jour la Balance (API) ---
app.post('/api/balance/:id/update', async (req, res) => {
    try {
        const playerId = req.params.id;
        const { amount, action } = req.body;
        
        const player = await Player.findOne({ id: playerId });

        if (!player) {
            return res.status(404).json({ error: 'Joueur introuvable.' });
        }
        
        if (!amount || !action) {
            return res.status(400).json({ error: 'Montant ou action manquant.' });
        }

        let newBalance = player.balance;
        const value = parseFloat(amount);

        if (action === 'add') {
            newBalance += value;
        } else if (action === 'remove') {
            newBalance -= value;
        } else {
            return res.status(400).json({ error: 'Action non reconnue.' });
        }
        
        // Mise à jour de la balance dans la DB
        player.balance = parseFloat(newBalance.toFixed(2));
        await player.save();

        res.json({ message: 'Balance mise à jour.', newBalance: player.balance });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

