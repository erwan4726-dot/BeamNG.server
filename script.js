document.addEventListener('DOMContentLoaded', () => {

    // --- NOUVELLES VARIABLES API ET INITIALISATION ---
    const API_URL = 'http://localhost:3000'; // Adresse de TON serveur qui tourne
    const CURRENT_PLAYER_ID = 'player-1';     // Ton ID Admin de test (à rendre dynamique plus tard)
    
    let siteCurrentTime;
    let timeScale = parseInt(localStorage.getItem('timeScale') || '60', 10);
    // userBalance n'est plus initialisé ici, il vient de l'API
    let ads = JSON.parse(localStorage.getItem('ads') || '[]');

    const timeElement = document.getElementById('site-time');
    const balanceElement = document.getElementById('balance');
    const adListingsContainer = document.getElementById('ad-listings');
    const noAdsMessage = document.getElementById('no-ads-message');

    // ... (Le reste des variables Modale/Détails reste inchangé) ...
    const settingsModal = document.getElementById('settings-modal');
    const settingsButton = document.getElementById('settings-button');
    const closeSettingsButton = settingsModal.querySelector('#close-settings-modal');
    const timeScaleInput = document.getElementById('time-scale');
    const applyTimeScaleButton = document.getElementById('apply-time-scale');
    const moneyAmountInput = document.getElementById('money-amount');
    const addMoneyButton = document.getElementById('add-money');
    const removeMoneyButton = document.getElementById('remove-money');
    const themeSelector = document.getElementById('theme-selector');
    const applyThemeButton = document.getElementById('apply-theme');
    let currentTheme = localStorage.getItem('currentTheme') || 'dark-neon'; 
    const detailsModal = document.getElementById('details-modal');
    const closeDetailsButton = document.getElementById('close-details-modal');
    const detailsModel = document.getElementById('details-model');
    const detailsYear = document.getElementById('details-year');
    const detailsMileage = document.getElementById('details-mileage');
    const detailsColor = document.getElementById('details-color');
    const detailsState = document.getElementById('details-state');
    const detailsPrice = document.getElementById('details-price');
    const detailsCarImage = document.getElementById('details-car-image');
    const buyCarButton = document.getElementById('buy-car-button');


    // --- FONCTIONS D'AFFICHAGE ET DE MISE À JOUR ---

    // ** MODIFICATION MAJEURE : On lit la balance via l'API **
    async function updateBalanceDisplay() {
        try {
            const response = await fetch(`${API_URL}/api/balance/${CURRENT_PLAYER_ID}`);
            if (!response.ok) {
                // Si l'API renvoie une erreur (ex: 404), on lève une exception
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur inconnue de l\'API.');
            }
            const data = await response.json();
            window.userBalance = data.balance; // On stocke dans window.userBalance pour la fonction buyCar
            
            // Met à jour l'affichage sur la page
            balanceElement.textContent = `Balance: ${window.userBalance.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} $`;
        } catch (error) {
            console.error("Échec de la récupération de la balance :", error);
            balanceElement.textContent = `Balance: [API OFFLINE]`;
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function updateSiteTimeDisplay() {
        const now = new Date(siteCurrentTime);
        timeElement.textContent = `Heure du Site: ${formatTime(now)}`;
    }

    // ... (La fonction renderAds reste INCHANGÉE) ...
    function renderAds() {
        adListingsContainer.innerHTML = '';
        const now = new Date(siteCurrentTime);
        let hasActiveAds = false;

        ads.forEach(ad => {
            const expiration = new Date(ad.expirationDate);

            if (expiration > now) {
                hasActiveAds = true;
                const timeLeft = expiration.getTime() - now.getTime();
                const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24)); 

                const adCard = document.createElement('div');
                adCard.className = 'car-card';
                adCard.setAttribute('data-id', ad.id);

                adCard.innerHTML = `
                    <div class="card-time-left">${daysLeft} j. restants</div>
                    <div class="card-image">
                        ${ad.imageUrl ? `<img src="${ad.imageUrl}" alt="Image de ${ad.model}">` : `Image non disponible`}
                    </div>
                    <div class="card-content" style="padding: 15px;">
                        <h3 style="margin-top: 0;">${ad.model} (${ad.year})</h3>
                        <p style="font-size: 0.9em; color: inherit;">${ad.mileage.toLocaleString('fr-FR')} km, ${ad.color}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-price">${ad.price.toLocaleString('fr-FR')} $</span>
                        <button class="card-details-button" data-id="${ad.id}">Détails</button>
                    </div>
                `;
                adListingsContainer.appendChild(adCard);
            }
        });

        if (hasActiveAds) {
            noAdsMessage.style.display = 'none';
        } else {
            noAdsMessage.style.display = 'block';
        }

        document.querySelectorAll('.card-details-button').forEach(button => {
            button.onclick = (e) => showAdDetails(e.target.dataset.id);
        });

        ads = ads.filter(ad => new Date(ad.expirationDate) > now);
        localStorage.setItem('ads', JSON.stringify(ads));
    }


    // ... (La fonction applyTheme reste INCHANGÉE) ...
    function applyTheme(themeName) {
        document.body.className = ''; 
        document.body.classList.add(`theme-${themeName}`);
        localStorage.setItem('currentTheme', themeName);
        currentTheme = themeName;
    }


    function showAdDetails(adId) {
        const ad = ads.find(a => a.id === adId);
        if (!ad) return;

        detailsModel.textContent = `Modèle: ${ad.model}`;
        detailsYear.textContent = ad.year;
        detailsMileage.textContent = `${ad.mileage.toLocaleString('fr-FR')} km`;
        detailsColor.textContent = ad.color;
        detailsState.textContent = ad.state;
        detailsPrice.textContent = `${ad.price.toLocaleString('fr-FR')} $`;
        detailsCarImage.src = ad.imageUrl || '';
        detailsCarImage.alt = ad.imageUrl ? `Image de ${ad.model}` : "Image non disponible";
        buyCarButton.setAttribute('data-ad-id', ad.id);

        detailsModal.style.display = 'flex';
    }


    // ** MODIFICATION MAJEURE : buyCar vérifie et déduit via l'API **
    async function buyCar() {
        // userBalance est maintenant stocké dans window.userBalance après le dernier updateBalanceDisplay
        if (!window.userBalance) {
            alert("Balance non chargée. Réessayez.");
            return;
        }

        const adId = buyCarButton.dataset.adId;
        const adIndex = ads.findIndex(a => a.id === adId);

        if (adIndex === -1) {
            alert("Annonce introuvable.");
            return;
        }

        const ad = ads[adIndex];

        if (window.userBalance >= ad.price) {
            
            try {
                // 1. Déduction via l'API
                const response = await fetch(`${API_URL}/api/balance/${CURRENT_PLAYER_ID}/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: ad.price, action: 'remove' })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Échec de la transaction sur le serveur.');
                }

                // 2. Retirer l'annonce du local (l'API gère la balance)
                ads.splice(adIndex, 1);
                localStorage.setItem('ads', JSON.stringify(ads));
                
                alert(`Félicitations ! Vous avez acheté la ${ad.model} pour ${ad.price.toLocaleString('fr-FR')} $.`);
                detailsModal.style.display = 'none';
                
                // 3. Rafraîchir tout
                await updateBalanceDisplay(); 
                renderAds(); 

            } catch (error) {
                alert(`Erreur de paiement Dark API: ${error.message}`);
            }

        } else {
            alert("Solde insuffisant pour acheter ce véhicule. Fais un peu de R.P. !");
        }
    }
    
    // --- GESTION DU TEMPS SIMULÉ (INCHANGÉE) ---
    function initializeSiteTime() {
        const storedTime = localStorage.getItem('siteCurrentTime');
        if (storedTime) {
            siteCurrentTime = new Date(storedTime);
        } else {
            siteCurrentTime = new Date();
        }
        updateSiteTimeDisplay();
    }

    function advanceSiteTime() {
        const now = new Date();
        siteCurrentTime.setSeconds(siteCurrentTime.getSeconds() + timeScale); 
        localStorage.setItem('siteCurrentTime', siteCurrentTime.toISOString());
        
        updateSiteTimeDisplay();
        renderAds(); 
    }

    setInterval(advanceSiteTime, 1000); 

    // --- GESTION DES ÉVÉNEMENTS ---

    settingsButton.onclick = (e) => {
        e.preventDefault();
        timeScaleInput.value = timeScale;
        moneyAmountInput.value = 1000;
        themeSelector.value = currentTheme; 
        settingsModal.style.display = 'flex';
    }
    closeSettingsButton.onclick = () => { settingsModal.style.display = 'none'; }
    
    applyThemeButton.onclick = () => {
        const newTheme = themeSelector.value;
        applyTheme(newTheme);
        settingsModal.style.display = 'none';
        alert(`Le style est passé en mode ${newTheme.replace('-', ' ').toUpperCase()}. Ça claque !`);
    }

    applyTimeScaleButton.onclick = () => {
        const newTimeScale = parseInt(timeScaleInput.value, 10);
        if (!isNaN(newTimeScale) && newTimeScale > 0) {
            timeScale = newTimeScale;
            localStorage.setItem('timeScale', timeScale);
            alert(`La vitesse du temps est réglée à 1:${timeScale}.`);
            settingsModal.style.display = 'none';
        } else {
            alert("Veuillez entrer une valeur positive pour l'échelle de temps.");
        }
    }
    
    // ** MODIFICATION MAJEURE : Fonction générique pour l'API (pour ajouter/retirer) **
    async function modifyBalance(amount, action) {
        if (isNaN(amount) || amount <= 0) {
            alert("Montant invalide ou négatif.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/balance/${CURRENT_PLAYER_ID}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, action })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Échec de la modification sur le serveur.');
            }

            // Rafraîchir l'affichage après la réussite
            await updateBalanceDisplay(); 
            alert(`${amount.toLocaleString('fr-FR')} $ ${action === 'add' ? 'ajoutés' : 'retirés'}. Nouveau solde : ${data.newBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`);
            
        } catch (error) {
            alert(`Erreur Dark API: ${error.message}`);
        }
    }


    addMoneyButton.onclick = () => {
        const amount = parseFloat(moneyAmountInput.value);
        modifyBalance(amount, 'add');
    };

    removeMoneyButton.onclick = () => {
        const amount = parseFloat(moneyAmountInput.value);
        modifyBalance(amount, 'remove');
    };


    closeDetailsButton.onclick = () => { detailsModal.style.display = 'none'; }
    buyCarButton.onclick = buyCar;

    window.onclick = (event) => {
        if (event.target == settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (event.target == detailsModal) {
            detailsModal.style.display = 'none';
        }
    }

    // --- APPELS AU DÉMARRAGE ---
    updateBalanceDisplay(); // Récupère le solde du serveur
    initializeSiteTime();
    applyTheme(currentTheme); 
    renderAds();
});