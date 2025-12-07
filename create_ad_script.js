document.addEventListener('DOMContentLoaded', () => {
    // --- NOUVELLES VARIABLES API ET INITIALISATION ---
    const API_URL = 'http://localhost:3000'; // Adresse de TON serveur qui tourne
    const CURRENT_PLAYER_ID = 'player-1';     // Ton ID Admin de test
    
    const form = document.getElementById('create-ad-form');
    const adDurationSlider = document.getElementById('ad-duration');
    const adDurationDisplay = document.getElementById('ad-duration-display');
    const adPublicationCostSpan = document.getElementById('ad-publication-cost');
    const adImageInput = document.getElementById('ad-image');
    const imagePreview = document.getElementById('image-preview');
    const balanceElement = document.getElementById('balance'); // Pour mettre à jour la balance

    const BASE_PUBLICATION_COST = 50; 
    const COST_PER_DAY = 10;          

    let userBalance; // Ne plus initialiser via localStorage

    // ** MODIFICATION MAJEURE : On lit la balance via l'API **
    async function updateBalanceDisplay() {
        try {
            const response = await fetch(`${API_URL}/api/balance/${CURRENT_PLAYER_ID}`);
            if (!response.ok) {
                throw new Error('Erreur API: Balance introuvable.');
            }
            const data = await response.json();
            userBalance = data.balance; // Met à jour la variable locale
            
            // Met à jour l'affichage sur la page
            balanceElement.textContent = `Balance: ${userBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
            return userBalance;

        } catch (error) {
            console.error("Échec de la récupération de la balance :", error);
            balanceElement.textContent = `Balance: [API OFFLINE]`;
            return 0; // Retourne 0 en cas d'erreur pour éviter les bugs
        }
    }
    updateBalanceDisplay(); // Première lecture au chargement

    // Fonction pour calculer le coût de publication (INCHANGÉE)
    function updatePublicationCost() {
        const duration = parseInt(adDurationSlider.value, 10);
        const cost = BASE_PUBLICATION_COST + (duration * COST_PER_DAY);
        adPublicationCostSpan.textContent = cost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        adDurationDisplay.textContent = `${duration} jours`;
        return cost;
    }

    updatePublicationCost();

    // Événements (INCHANGÉS)
    adDurationSlider.addEventListener('input', updatePublicationCost);

    adImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.innerHTML = `<img src="${event.target.result}" alt="Image de l'annonce" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.textContent = 'Aucune image sélectionnée';
            imagePreview.innerHTML = 'Aucune image sélectionnée';
        }
    });

    form.onsubmit = (e) => {
        e.preventDefault();

        const model = document.getElementById('model').value.trim();
        const year = parseInt(document.getElementById('year').value, 10);
        const mileage = parseInt(document.getElementById('mileage').value, 10);
        const color = document.getElementById('color').value;
        const state = document.getElementById('state').value;
        const price = parseFloat(document.getElementById('price').value);
        const durationDays = parseInt(adDurationSlider.value, 10);
        const publicationCost = updatePublicationCost();
        let imageUrl = '';

        if (adImageInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageUrl = event.target.result;
                saveAdAndRedirect(model, year, mileage, color, state, price, durationDays, imageUrl, publicationCost);
            };
            reader.readAsDataURL(adImageInput.files[0]);
        } else {
            saveAdAndRedirect(model, year, mileage, color, state, price, durationDays, imageUrl, publicationCost);
        }
    };

    // ** MODIFICATION MAJEURE : saveAdAndRedirect utilise l'API **
    async function saveAdAndRedirect(model, year, mileage, color, state, price, durationDays, imageUrl, publicationCost) {
        
        const currentBalance = await updateBalanceDisplay(); // On récupère le solde à jour

        if (currentBalance < publicationCost) {
            alert(`Solde insuffisant. Il te faut ${publicationCost.toLocaleString('fr-FR')} $ pour publier cette annonce.`);
            return;
        }

        try {
            // 1. Déduire le coût de publication via l'API
            const response = await fetch(`${API_URL}/api/balance/${CURRENT_PLAYER_ID}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: publicationCost, action: 'remove' })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Échec de la déduction des frais de publication.');
            }
            
            // 2. Le reste est INCHANGÉ (gestion des annonces locales)
            const siteCurrentTime = new Date(localStorage.getItem('siteCurrentTime') || new Date().toISOString());
            const expirationDate = new Date(siteCurrentTime.getTime() + durationDays * 24 * 60 * 60 * 1000); 

            const newAd = {
                id: `ad-${Date.now()}`, 
                model, year, mileage, color, state, price, imageUrl,
                publicationDate: siteCurrentTime.toISOString(),
                expirationDate: expirationDate.toISOString(),
                durationDays
            };

            const ads = JSON.parse(localStorage.getItem('ads') || '[]');
            ads.push(newAd);
            localStorage.setItem('ads', JSON.stringify(ads));

            alert(`Annonce pour "${model}" publiée avec succès pour ${publicationCost.toLocaleString('fr-FR')} $ !`);
            window.location.href = 'index.html';

        } catch (error) {
            alert(`Erreur Dark API lors de la publication : ${error.message}`);
        }
    }
});