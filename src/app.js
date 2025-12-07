// Firebase Analytics
import { trackCharacterSelect, trackViewChange, trackSearch } from './firebase.js';

// Character data storage
let matchupsData = [];
let allCharacters = [];
let characterStats = new Map(); // Store stats for each character
let selectedCharacter = null;
let cy = null; // Cytoscape instance
let currentLayout = 'cose';
let currentSort = 'name';
let sortDirection = 'asc';
let imageCache = new Map(); // Cache for preloaded images as data URLs
let searchFilter = ''; // Filter for character search
let currentPanel = 'characters'; // Track current panel (mobile only)
let isMobile = false; // Track if we're on mobile

// Check if device is mobile
function checkMobile() {
    isMobile = window.innerWidth <= 768;
    return isMobile;
}

// Initialize the application
async function init() {
    try {
        // Check initial device type
        checkMobile();
        window.addEventListener('resize', handleResize);
        
        const response = await fetch('matchups.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        matchupsData = await response.json();
        
        // Check if data is valid
        if (!Array.isArray(matchupsData) || matchupsData.length === 0) {
            throw new Error('Invalid data format or empty data');
        }

        extractCharacters();
        renderCharacterGrid();
        setupSearch();
        setupSorting();
        setupViewToggle();
        setupMobileNavigation();
        
        // Initialize panel visibility
        updatePanelVisibility();
        
        // Preload images before initializing graph
        await preloadAllImages();
        
        // Initialize graph separately so errors don't break the list view
        try {
            initializeGraph();
        } catch (graphError) {
            console.warn('Graph initialization failed:', graphError);
            // Hide graph view button if graph failed
            const graphBtn = document.querySelector('.view-btn[data-view="graph"]');
            if (graphBtn) graphBtn.style.display = 'none';
        }
        
        // Select Naruto by default
        selectCharacter('Naruto Uzumaki');
    } catch (error) {
        console.error('Error loading matchups data:', error);
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: white;">
            <h1>Error loading data</h1>
            <p>Please make sure matchups.json exists and contains valid JSON.</p>
            <p style="font-size: 0.8em; opacity: 0.7;">${error.message}</p>
            <p style="font-size: 0.6em; opacity: 0.5; white-space: pre-wrap; text-align: left; max-width: 800px; margin: 20px auto;">${error.stack}</p>
        </div>`;
    }
}

// Handle window resize
function handleResize() {
    const wasMobile = isMobile;
    checkMobile();
    
    // If switching between mobile and desktop, update panel visibility
    if (wasMobile !== isMobile) {
        updatePanelVisibility();
    }
}

// Update panel visibility based on device type
function updatePanelVisibility() {
    const charactersPanel = document.getElementById('charactersPanel');
    const detailsPanel = document.getElementById('detailsPanel');
    
    if (isMobile) {
        // Mobile: show only active panel
        if (currentPanel === 'characters') {
            charactersPanel?.classList.add('active');
            detailsPanel?.classList.remove('active');
        } else {
            charactersPanel?.classList.remove('active');
            detailsPanel?.classList.add('active');
        }
    } else {
        // Desktop: show both panels (remove active class, let CSS handle display)
        charactersPanel?.classList.remove('active');
        detailsPanel?.classList.remove('active');
    }
    
    updateTabState();
}

// Update tab state based on current panel
function updateTabState() {
    const charactersTab = document.getElementById('charactersTab');
    const detailsTab = document.getElementById('detailsTab');
    
    if (currentPanel === 'characters') {
        charactersTab?.classList.add('active');
        detailsTab?.classList.remove('active');
    } else {
        charactersTab?.classList.remove('active');
        detailsTab?.classList.add('active');
    }
}

// Extract all unique character names and calculate stats
function extractCharacters() {
    const characterSet = new Set();
    matchupsData.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        Object.keys(entry).forEach(character => {
            characterSet.add(character);
        });
    });
    allCharacters = Array.from(characterSet);
    
    // Calculate stats for each character
    calculateCharacterStats();
}

// Calculate statistics for all characters
function calculateCharacterStats() {
    characterStats.clear();
    
    matchupsData.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        Object.keys(entry).forEach(character => {
            const matchups = entry[character];
            if (!Array.isArray(matchups)) return;

            let wins = 0, losses = 0, draws = 0;
            
            matchups.forEach(matchup => {
                if (!matchup || typeof matchup !== 'object') return;
                // Support both old format {"Opponent": "win"} and new format {opponent: "Opponent", result: "win"}
                let result;
                if (matchup.result) {
                    // New format
                    result = matchup.result;
                } else {
                    // Old format - get first value
                    result = Object.values(matchup)[0];
                }
                if (result === 'win') wins++;
                else if (result === 'lose') losses++;
                else if (result === 'draw') draws++;
            });
            
            const total = wins + losses + draws;
            characterStats.set(character, {
                wins,
                losses,
                draws,
                total
            });
        });
    });
}

// Get character stats
function getCharacterStats(characterName) {
    return characterStats.get(characterName) || { wins: 0, losses: 0, draws: 0, total: 0 };
}

// Character name to filename mapping for special cases
const characterNameMap = {
    'Danzō Shimura': 'Danzō_Shimura',
    'Danzo Shimura': 'Danzō_Shimura',
    'Yugito Nii': 'Yugito_Nii',
    'Hiruzen Sarutobi': 'Hiruzen_Sarutobi',
    'Third Hokage Hiruzen Sarutobi': 'Hiruzen_Sarutobi',
    'Gengetsu Hōzuki (Second Mizukage)': 'Gengetsu_Hōzuki',
    'Gengetsu Hozuki (Second Mizukage)': 'Gengetsu_Hōzuki',
    'Second Mizukage': 'Second_Mizukage',
    'Rōshi (Four-Tails)': 'Rōshi',
    'Roshi (Four-Tails)': 'Rōshi',
    'Rōshi': 'Rōshi',
    'Roshi': 'Rōshi',
    'Nagato': 'Nagato',
    'Pain (Nagato)': 'Nagato',
    'Pain': 'Nagato',
    'Rasa (Fourth Kazekage)': 'Rasa',
    'Rasa': 'Rasa',
    'Fourth Kazekage': 'Rasa',
    'Ōnoki': 'Ōnoki',
    'Onoki': 'Ōnoki',
    'Neji Hyūga': 'Neji_Hyūga',
    'Neji Hyuga': 'Neji_Hyūga',
    'Mū (Second Tsuchikage)': 'Mū',
    'Mu (Second Tsuchikage)': 'Mū',
    'Mū': 'Mū',
    'Mu': 'Mū',
    'Mei Terumī (Fifth Mizukage)': 'Mei_Terumī',
    'Mei Terumi (Fifth Mizukage)': 'Mei_Terumī',
    'Fifth Mizukage': 'Mei_Terumī',
    'Kurenai Yūhi': 'Kurenai_Yūhi',
    'Kurenai Yuhi': 'Kurenai_Yūhi',
    'Kidōmaru': 'Kidōmaru',
    'Kidomaru': 'Kidōmaru',
    'Kankurō': 'Kankurō',
    'Kankuro': 'Kankurō',
    'Jirōbō': 'Jirōbō',
    'Jirobo': 'Jirōbō',
    'Hinata Hyūga': 'Hinata_Hyūga',
    'Hinata Hyuga': 'Hinata_Hyūga',
    'Fū (Seven-Tails)': 'Fū',
    'Fu (Seven-Tails)': 'Fū',
    'Fū': 'Fū',
    'Fu': 'Fū',
    'Yagura Karatachi': 'Yagura_Karatachi',
    'Fourth Raikage A': 'Fourth_Raikage_A',
    'A (Fourth Raikage)': 'Fourth_Raikage_A',
    'A (Third Raikage)': 'A',
    'Third Raikage': 'A',
    'Kaguya Ōtsutsuki': 'Kaguya_Ōtsutsuki',
    'Kaguya Otsutsuki': 'Kaguya_Ōtsutsuki',
    'Hanzō': 'Hanzō',
    'Hanzo': 'Hanzō'
};

// Character image mapping - prioritize local images, fallback to web
function getCharacterImageUrl(characterName, forGraph = false) {
    if (!characterName) return 'none';
    const cleanName = characterName.split('(')[0].trim();
    
    // For graph view, use cached URL if available
    if (forGraph && imageCache.has(cleanName)) {
        const cached = imageCache.get(cleanName);
        if (cached) return cached;
        // If null (failed to load), return 'none' to indicate no image
        return 'none';
    }
    
    // Check if we have a mapped filename
    let filename = characterNameMap[characterName] || characterNameMap[cleanName];
    
    if (!filename) {
        // Create filename from character name (matches scraper output)
        filename = cleanName.replace(/\s+/g, '_');
    }
    
    // Return local image URL
    return `img/${filename}.png`;
}

// Preload an image and cache it
function preloadImage(characterName) {
    return new Promise((resolve) => {
        if (!characterName) {
            resolve(null);
            return;
        }
        const cleanName = characterName.split('(')[0].trim();
        
        // Skip if already cached
        if (imageCache.has(cleanName)) {
            resolve(imageCache.get(cleanName));
            return;
        }
        
        const img = new Image();
        const url = getCharacterImageUrl(characterName, false);
        
        img.onload = () => {
            // Image loaded successfully, cache the URL
            imageCache.set(cleanName, url);
            resolve(url);
        };
        
        img.onerror = () => {
            // Use simple initials as fallback (no external service)
            imageCache.set(cleanName, null); // null means use default background
            resolve(null);
        };
        
        img.src = url;
    });
}

// Preload all character images
async function preloadAllImages() {
    const uniqueNames = new Set();
    
    // Get all unique character names from matchups
    matchupsData.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        Object.keys(entry).forEach(character => {
            if (character) {
                const cleanName = character.split('(')[0].trim();
                uniqueNames.add(cleanName);
            }
        });
    });
    
    // Preload in batches to avoid overwhelming the server
    const names = Array.from(uniqueNames);
    const batchSize = 10;
    
    for (let i = 0; i < names.length; i += batchSize) {
        const batch = names.slice(i, i + batchSize);
        await Promise.all(batch.map(name => preloadImage(name)));
    }
    
    console.log(`Preloaded ${imageCache.size} images`);
}

// Enhanced image loading with multiple fallback sources
function createImageWithFallback(characterName, className = '') {
    const img = document.createElement('img');
    if (!characterName) return img;

    const cleanName = characterName.split('(')[0].trim();
    const encodedName = encodeURIComponent(cleanName);
    
    // Check if we have a mapped filename
    let filename = characterNameMap[characterName] || characterNameMap[cleanName];
    
    if (!filename) {
        filename = cleanName.replace(/\s+/g, '_');
    }
    
    // Create slug for Fandom wiki (fallback)
    const slug = cleanName.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_');
    
    // Try multiple image sources in order of preference
    const imageSources = [
        `img/${filename}.png`,
        `img/${filename}.jpg`,
        `img/${filename}.jpeg`,
        `img/${filename}.gif`,
        `https://vignette.wikia.nocookie.net/naruto/images/thumb/${slug.charAt(0)}/${slug}/revision/latest/scale-to-width-down/200`,
        `https://static.wikia.nocookie.net/naruto/images/thumb/${slug.charAt(0)}/${slug}/revision/latest/scale-to-width-down/200`,
        `https://ui-avatars.com/api/?name=${encodedName}&background=ff6b35&color=fff&size=200&bold=true&font-size=0.4`
    ];
    
    let currentIndex = 0;
    
    img.className = className;
    img.alt = characterName;
    img.loading = 'lazy';
    
    function tryNextImage() {
        if (currentIndex < imageSources.length) {
            img.src = imageSources[currentIndex];
            currentIndex++;
        }
    }
    
    img.onerror = () => {
        if (currentIndex < imageSources.length - 1) {
            setTimeout(() => tryNextImage(), 100);
        }
    };
    
    tryNextImage();
    return img;
}

// Render character grid
function renderCharacterGrid() {
    const grid = document.getElementById('characterGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Sort characters based on current sort
    const sortedCharacters = [...allCharacters].sort((a, b) => {
        const statsA = getCharacterStats(a);
        const statsB = getCharacterStats(b);
        let comparison = 0;
        
        switch (currentSort) {
            case 'name':
                comparison = a.localeCompare(b);
                break;
            case 'wins':
                comparison = statsA.wins - statsB.wins;
                break;
            case 'losses':
                comparison = statsA.losses - statsB.losses;
                break;
            case 'draws':
                comparison = statsA.draws - statsB.draws;
                break;
            case 'total':
                comparison = statsA.total - statsB.total;
                break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Filter characters based on search
    const filteredCharacters = searchFilter 
        ? sortedCharacters.filter(c => c.toLowerCase().includes(searchFilter))
        : sortedCharacters;
    
    if (filteredCharacters.length === 0 && searchFilter) {
        grid.innerHTML = '<div class="no-results" style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No characters found matching your search.</div>';
        return;
    }
    
    filteredCharacters.forEach(character => {
        const stats = getCharacterStats(character);
        
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.character = character;
        
        if (character === selectedCharacter) {
            card.classList.add('active');
        }
        
        const img = createImageWithFallback(character);
        card.innerHTML = `
            <h3>${character}</h3>
            <div class="card-stats">
                <span class="card-stat win">W: ${stats.wins}</span>
                <span class="card-stat lose">L: ${stats.losses}</span>
                <span class="card-stat draw">D: ${stats.draws}</span>
            </div>
        `;
        card.insertBefore(img, card.firstChild);
        
        card.addEventListener('click', () => {
            selectCharacter(character);
            // On mobile, navigate to details panel
            if (isMobile) {
                navigateToPanel('details');
            }
        });
        
        grid.appendChild(card);
    });
}

// Setup search functionality
let searchDebounceTimer = null;
function setupSearch() {
    const searchInput = document.getElementById('characterSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        searchFilter = e.target.value.toLowerCase().trim();
        renderCharacterGrid();
        
        // Debounced analytics tracking for search
        clearTimeout(searchDebounceTimer);
        if (searchFilter.length >= 2) {
            searchDebounceTimer = setTimeout(() => {
                trackSearch(searchFilter);
            }, 1000);
        }
    });
}

// Setup sorting controls
function setupSorting() {
    const sortSelect = document.getElementById('sortSelect');
    
    const options = {
        'name': 'Sort by: Name',
        'wins': 'Sort by: Wins',
        'losses': 'Sort by: Losses',
        'draws': 'Sort by: Draws',
        'total': 'Sort by: Total Fights'
    };
    
    function updateSortUI(select) {
        if (!select) return;
        const directionSymbol = sortDirection === 'asc' ? ' ↑' : ' ↓';
        const option = select.querySelector(`option[value="${currentSort}"]`);
        if (option) {
            option.textContent = options[currentSort] + directionSymbol;
        }
        
        // Reset other options
        Object.keys(options).forEach(key => {
            if (key !== currentSort) {
                const opt = select.querySelector(`option[value="${key}"]`);
                if (opt) opt.textContent = options[key];
            }
        });
    }
    
    function handleSortChange(sortType) {
        // Toggle direction if selecting same sort
        if (currentSort === sortType) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort = sortType;
            // Default to descending for numeric sorts, ascending for name
            sortDirection = sortType === 'name' ? 'asc' : 'desc';
        }
        
        updateSortUI(sortSelect);
        renderCharacterGrid();
        
        // Restore active state if character was selected
        if (selectedCharacter) {
            document.querySelectorAll('.character-card').forEach(card => {
                card.classList.remove('active');
                if (card.dataset.character === selectedCharacter) {
                    card.classList.add('active');
                }
            });
        }
    }
    
    if (sortSelect) {
        sortSelect.value = currentSort;
        sortSelect.addEventListener('change', (e) => handleSortChange(e.target.value));
    }
}

// Setup mobile tab navigation
function setupMobileNavigation() {
    const charactersTab = document.getElementById('charactersTab');
    const detailsTab = document.getElementById('detailsTab');
    const backBtn = document.getElementById('backToCharacters');
    
    // Tab clicks
    if (charactersTab) {
        charactersTab.addEventListener('click', () => {
            if (isMobile) {
                navigateToPanel('characters', true);
            }
        });
    }
    
    if (detailsTab) {
        detailsTab.addEventListener('click', () => {
            if (isMobile && !detailsTab.disabled) {
                navigateToPanel('details');
            }
        });
    }
    
    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (isMobile) {
                navigateToPanel('characters', true);
            }
        });
    }
}

// Navigate to panel with View Transitions API (mobile only)
function navigateToPanel(panelName, isGoingBack = false) {
    if (!isMobile || currentPanel === panelName) return;
    
    const charactersPanel = document.getElementById('charactersPanel');
    const detailsPanel = document.getElementById('detailsPanel');
    
    // Use View Transitions API if available
    if (document.startViewTransition) {
        // Add direction class for animation
        if (isGoingBack) {
            document.documentElement.classList.add('going-back');
        }
        
        const transition = document.startViewTransition(() => {
            updateMobilePanelVisibility(panelName, charactersPanel, detailsPanel);
        });
        
        transition.finished.then(() => {
            document.documentElement.classList.remove('going-back');
        });
    } else {
        // Fallback for browsers without View Transitions
        updateMobilePanelVisibility(panelName, charactersPanel, detailsPanel);
    }
    
    currentPanel = panelName;
    updateTabState();
}

// Update mobile panel visibility
function updateMobilePanelVisibility(panelName, charactersPanel, detailsPanel) {
    if (panelName === 'characters') {
        charactersPanel?.classList.add('active');
        detailsPanel?.classList.remove('active');
    } else {
        charactersPanel?.classList.remove('active');
        detailsPanel?.classList.add('active');
    }
}

// Select a character and display their matchups
function selectCharacter(characterName) {
    if (!characterName) return;
    selectedCharacter = characterName;
    
    // Track character selection in analytics
    trackCharacterSelect(characterName);
    
    // Update active card
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.character === characterName) {
            card.classList.add('active');
        }
    });
    
    // Enable details tab and update selected name
    const detailsTab = document.getElementById('detailsTab');
    const selectedTabName = document.getElementById('selectedTabName');
    if (detailsTab) {
        detailsTab.disabled = false;
    }
    if (selectedTabName) {
        // Get short name for display
        const shortName = characterName.split(' ')[0];
        selectedTabName.textContent = shortName;
    }
    
    // Find character's matchups
    const characterData = matchupsData.find(entry => entry && entry[characterName]);
    const matchups = characterData ? characterData[characterName] : [];
    
    // Display matchups
    displayMatchups(characterName, matchups);
}

// Display matchups for selected character
function displayMatchups(characterName, matchups) {
    const nameElement = document.getElementById('selectedCharacterName');
    const imageElement = document.getElementById('selectedCharacterImage');
    const matchupsList = document.getElementById('matchupsList');
    
    if (!nameElement || !imageElement || !matchupsList) return;

    // Update header
    nameElement.textContent = characterName;
    const newImg = createImageWithFallback(characterName, 'character-profile-large');
    newImg.id = 'selectedCharacterImage';
    imageElement.replaceWith(newImg);
    
    // Calculate stats
    let wins = 0, losses = 0, draws = 0;
    if (Array.isArray(matchups)) {
        matchups.forEach(matchup => {
            if (!matchup) return;
            // Support both old format {"Opponent": "win"} and new format {opponent: "Opponent", result: "win"}
            let result;
            if (matchup.result) {
                // New format
                result = matchup.result;
            } else {
                // Old format - get first value
                result = Object.values(matchup)[0];
            }
            if (result === 'win') wins++;
            else if (result === 'lose') losses++;
            else if (result === 'draw') draws++;
        });
    }
    
    const totalFights = wins + losses + draws;
    const winPercentage = totalFights > 0 ? ((wins / totalFights) * 100).toFixed(1) : 0;
    
    // Update all stat displays
    const totalFightsEl = document.getElementById('totalFights');
    if (totalFightsEl) totalFightsEl.textContent = totalFights;
    
    const winsCountEl = document.getElementById('winsCount');
    if (winsCountEl) winsCountEl.textContent = wins;
    
    const lossesCountEl = document.getElementById('lossesCount');
    if (lossesCountEl) lossesCountEl.textContent = losses;
    
    const drawsCountEl = document.getElementById('drawsCount');
    if (drawsCountEl) drawsCountEl.textContent = draws;
    
    const winPercentageEl = document.getElementById('winPercentage');
    if (winPercentageEl) winPercentageEl.textContent = `${winPercentage}%`;
    
    // Render matchups
    matchupsList.innerHTML = '';
    
    if (!matchups || matchups.length === 0) {
        matchupsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No matchups found for this character.</p>';
    } else {
        matchups.forEach(matchup => {
            if (!matchup) return;
            
            // Support both old format {"Opponent": "win"} and new format {opponent: "Opponent", result: "win", ...}
            let opponentName, result, summary, mangaChapter, animeEpisode;
            
            if (matchup.opponent && matchup.result) {
                // New format
                opponentName = matchup.opponent;
                result = matchup.result;
                summary = matchup.summary || '';
                mangaChapter = matchup.manga || '';
                animeEpisode = matchup.anime || '';
            } else {
                // Old format
                opponentName = Object.keys(matchup)[0];
                if (!opponentName) return;
                result = matchup[opponentName];
                summary = '';
                mangaChapter = '';
                animeEpisode = '';
            }
            
            const matchupItem = document.createElement('div');
            matchupItem.className = `matchup-item ${result}`;
            
            // Extract context if present (e.g., "Sasuke Uchiha (Final Battle)")
            const contextMatch = opponentName.match(/\((.+)\)/);
            const displayName = contextMatch ? opponentName.replace(/\(.+\)/, '').trim() : opponentName;
            const context = contextMatch ? contextMatch[1] : null;
            
            const opponentImg = createImageWithFallback(displayName, 'matchup-opponent-image');
            
            // Build details HTML
            let detailsHTML = '';
            if (summary || mangaChapter || animeEpisode) {
                detailsHTML = '<div class="matchup-details">';
                if (summary) {
                    detailsHTML += `<div class="matchup-summary">${summary}</div>`;
                }
                if (mangaChapter || animeEpisode) {
                    detailsHTML += '<div class="matchup-references">';
                    if (mangaChapter && mangaChapter !== 'N/A') {
                        detailsHTML += `<span class="matchup-reference"><span class="reference-label">📖 Manga:</span> ${mangaChapter}</span>`;
                    }
                    if (animeEpisode && animeEpisode !== 'N/A') {
                        detailsHTML += `<span class="matchup-reference"><span class="reference-label">📺 Anime:</span> ${animeEpisode}</span>`;
                    }
                    detailsHTML += '</div>';
                }
                detailsHTML += '</div>';
            }
            
            matchupItem.innerHTML = `
                <div class="matchup-info">
                    <div class="matchup-opponent-name">${displayName}</div>
                    ${context ? `<div class="matchup-context">${context}</div>` : ''}
                    ${detailsHTML}
                </div>
                <div class="matchup-result ${result}">${result}</div>
            `;
            matchupItem.insertBefore(opponentImg, matchupItem.firstChild);
            
            matchupsList.appendChild(matchupItem);
        });
    }
}

// Setup view toggle between list and graph
function setupViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const listViewContainer = document.getElementById('listViewContainer');
    const graphView = document.getElementById('graphVisualization');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            
            // Use View Transitions API if available
            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    updateMainView(view, viewButtons, listViewContainer, graphView);
                });
            } else {
                updateMainView(view, viewButtons, listViewContainer, graphView);
            }
        });
    });
}

// Update main view (list/graph)
function updateMainView(view, viewButtons, listViewContainer, graphView) {
    // Track view change in analytics
    trackViewChange(view);
    
    // Update active button
    viewButtons.forEach(b => b.classList.remove('active'));
    document.querySelector(`.view-btn[data-view="${view}"]`)?.classList.add('active');
    
    // Show/hide views
    if (view === 'list') {
        if (listViewContainer) listViewContainer.style.display = 'flex';
        if (graphView) graphView.style.display = 'none';
    } else {
        if (listViewContainer) listViewContainer.style.display = 'none';
        if (graphView) graphView.style.display = 'flex';
        // Resize graph when switching to graph view
        setTimeout(() => {
            if (cy) {
                cy.resize();
                cy.fit();
                updateZoomLevel();
            }
        }, 100);
    }
}

// Build graph data from matchups
function buildGraphData() {
    const nodes = new Map();
    const edges = [];
    const nodeIds = new Map();
    const existingEdges = new Set();
    let nodeIdCounter = 0;
    
    // Helper to get or create node ID
    function getNodeId(characterName) {
        if (!characterName) return -1;
        const cleanName = characterName.split('(')[0].trim();
        if (!nodeIds.has(cleanName)) {
            nodeIds.set(cleanName, nodeIdCounter++);
        }
        return nodeIds.get(cleanName);
    }
    
    // Process all matchups
    matchupsData.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        Object.keys(entry).forEach(character => {
            const characterMatchups = entry[character];
            if (!Array.isArray(characterMatchups)) return;

            const sourceName = character.split('(')[0].trim();
            const sourceId = getNodeId(character);
            
            // Add node if not exists
            if (!nodes.has(sourceId)) {
                nodes.set(sourceId, {
                    id: sourceId.toString(),
                    label: sourceName,
                    name: sourceName,
                    wins: 0,
                    losses: 0,
                    draws: 0
                });
            }
            
            // Process each matchup
            characterMatchups.forEach(matchup => {
                if (!matchup || typeof matchup !== 'object') return;
                
                // Support both old format {"Opponent": "win"} and new format {opponent: "Opponent", result: "win"}
                let opponentName, result;
                if (matchup.opponent && matchup.result) {
                    // New format
                    opponentName = matchup.opponent;
                    result = matchup.result;
                } else {
                    // Old format
                    opponentName = Object.keys(matchup)[0];
                    if (!opponentName) return;
                    result = matchup[opponentName];
                }

                const cleanOpponentName = opponentName.split('(')[0].trim();
                const targetId = getNodeId(cleanOpponentName);
                
                // Add opponent node if not exists
                if (!nodes.has(targetId)) {
                    nodes.set(targetId, {
                        id: targetId.toString(),
                        label: cleanOpponentName,
                        name: cleanOpponentName,
                        wins: 0,
                        losses: 0,
                        draws: 0
                    });
                }
                
                let edgeToAdd = null;
                
                if (result === 'win') {
                    edgeToAdd = {
                        source: sourceId.toString(),
                        target: targetId.toString(),
                        type: 'win',
                        label: 'wins'
                    };
                } else if (result === 'lose') {
                    edgeToAdd = {
                        source: targetId.toString(),
                        target: sourceId.toString(),
                        type: 'win',
                        label: 'wins'
                    };
                } else if (result === 'draw') {
                    const id1 = sourceId < targetId ? sourceId : targetId;
                    const id2 = sourceId < targetId ? targetId : sourceId;
                    
                    edgeToAdd = {
                        source: id1.toString(),
                        target: id2.toString(),
                        type: 'draw',
                        label: 'draws',
                        bidirectional: true
                    };
                }
                
                if (edgeToAdd) {
                    const edgeKey = `${edgeToAdd.source}-${edgeToAdd.target}-${edgeToAdd.type}`;
                    
                    if (!existingEdges.has(edgeKey)) {
                        existingEdges.add(edgeKey);
                        edges.push(edgeToAdd);
                        
                        const sNode = nodes.get(parseInt(edgeToAdd.source));
                        const tNode = nodes.get(parseInt(edgeToAdd.target));
                        
                        if (edgeToAdd.type === 'win') {
                            if (sNode) sNode.wins++;
                            if (tNode) tNode.losses++;
                        } else if (edgeToAdd.type === 'draw') {
                            if (sNode) sNode.draws++;
                            if (tNode) tNode.draws++;
                        }
                    }
                }
            });
        });
    });
    
    return {
        nodes: Array.from(nodes.values()),
        edges: edges
    };
}

// Initialize Cytoscape graph
function initializeGraph() {
    const graphData = buildGraphData();
    
    const edgeMap = new Map();
    graphData.edges.forEach((edge, index) => {
        const key = `${edge.source}-${edge.target}-${edge.type}`;
        if (!edgeMap.has(key)) {
            edge.id = `e${index}`;
            edgeMap.set(key, edge);
        }
    });
    
    function getFilteredEdges() {
        const showDraws = document.getElementById('showDraws')?.checked ?? true;
        const showLosses = document.getElementById('showLosses')?.checked ?? true;
        
        return graphData.edges.filter(edge => {
            if (edge.type === 'draw') return showDraws;
            if (edge.type === 'win') return showLosses;
            return true;
        });
    }
    
    const container = document.getElementById('cy');
    if (!container) return;

    cy = cytoscape({
        container: container,
        elements: [
            ...graphData.nodes.map(node => ({
                data: {
                    id: node.id,
                    label: node.label,
                    name: node.name,
                    wins: node.wins,
                    losses: node.losses,
                    draws: node.draws,
                    imageUrl: getCharacterImageUrl(node.name, true)
                }
            })),
            ...getFilteredEdges().map((edge, idx) => ({
                data: {
                    id: edge.id || `e${idx}-${edge.source}-${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    type: edge.type,
                    label: edge.label
                }
            }))
        ],
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#ff6b35',
                    'label': 'data(label)',
                    'width': 80,
                    'height': 80,
                    'shape': 'ellipse',
                    'border-width': 3,
                    'border-color': '#f7931e',
                    'color': '#ffffff',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'font-size': '11px',
                    'font-weight': 'bold',
                    'text-wrap': 'wrap',
                    'text-max-width': '90px',
                    'text-outline-width': 2,
                    'text-outline-color': '#000000',
                    'text-margin-y': -5
                }
            },
            {
                selector: 'node[imageUrl != "none"]',
                style: {
                    'background-image': 'data(imageUrl)',
                    'background-fit': 'cover',
                    'background-clip': 'node',
                    'background-image-opacity': 1
                }
            },
            {
                selector: 'node[wins > 10]',
                style: {
                    'border-color': '#4caf50',
                    'width': 100,
                    'height': 100,
                    'font-size': '12px',
                    'border-width': 4
                }
            },
            {
                selector: 'node[losses > 5]',
                style: {
                    'border-color': '#f44336',
                    'width': 90,
                    'height': 90,
                    'border-width': 4
                }
            },
            {
                selector: 'edge[type = "win"]',
                style: {
                    'width': 3,
                    'line-color': '#4caf50',
                    'target-arrow-color': '#4caf50',
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 1.5,
                    'curve-style': 'bezier',
                    'opacity': 0.7
                }
            },
            {
                selector: 'edge[type = "draw"]',
                style: {
                    'width': 2,
                    'line-color': '#ff9800',
                    'line-style': 'dashed',
                    'target-arrow-shape': 'none',
                    'opacity': 0.5
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 5,
                    'border-color': '#ffffff'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'width': 5,
                    'opacity': 1
                }
            }
        ],
        layout: {
            name: currentLayout,
            animate: true,
            animationDuration: 1000,
            fit: true,
            padding: 50
        }
    });
    
    // Add event listeners
    cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        const characterName = node.data('name');
        // Switch to list view and select character
        const listViewBtn = document.querySelector('.view-btn[data-view="list"]');
        if (listViewBtn) listViewBtn.click();
        setTimeout(() => {
            selectCharacter(characterName);
            if (isMobile) {
                navigateToPanel('details');
            }
        }, 100);
    });
    
    // Update stats display
    const nodeCountEl = document.getElementById('nodeCount');
    if (nodeCountEl) nodeCountEl.textContent = `Nodes: ${graphData.nodes.length}`;
    
    const edgeCountEl = document.getElementById('edgeCount');
    if (edgeCountEl) edgeCountEl.textContent = `Edges: ${getFilteredEdges().length}`;
    
    setupZoomControls();
    setupGraphControls();
    updateZoomLevel();
}

// Setup zoom controls
function setupZoomControls() {
    if (!cy) return;
    
    const zoomInBtn = document.getElementById('zoomIn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            const currentZoom = cy.zoom();
            const newZoom = Math.min(3.0, currentZoom * 1.2);
            cy.zoom(newZoom);
            updateZoomLevel();
        });
    }
    
    const zoomOutBtn = document.getElementById('zoomOut');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            const currentZoom = cy.zoom();
            const newZoom = Math.max(0.1, currentZoom * 0.8);
            cy.zoom(newZoom);
            updateZoomLevel();
        });
    }
    
    cy.on('wheel', (evt) => {
        evt.preventDefault();
        const originalEvent = evt.originalEvent;
        const delta = originalEvent.deltaY;
        const buttons = originalEvent.buttons;
        
        const isMiddleMouse = (buttons & 4) === 4;
        
        const currentZoom = cy.zoom();
        const zoomStep = isMiddleMouse ? 0.1 : 0.05;
        const zoomFactor = delta > 0 ? (1 - zoomStep) : (1 + zoomStep);
        let newZoom = currentZoom * zoomFactor;
        
        newZoom = Math.max(0.1, Math.min(3.0, newZoom));
        
        cy.zoom(newZoom);
        updateZoomLevel();
    });
    
    cy.on('mousedown', (evt) => {
        const originalEvent = evt.originalEvent;
        if (originalEvent.button === 1) {
            originalEvent.preventDefault();
        }
    });
    
    const cyContainer = document.getElementById('cy');
    if (cyContainer) {
        cyContainer.addEventListener('mousedown', (evt) => {
            if (evt.button === 1) {
                evt.preventDefault();
            }
        });
        
        cyContainer.addEventListener('contextmenu', (evt) => {
            evt.preventDefault();
        });
    }
    
    cy.on('zoom', () => {
        updateZoomLevel();
    });
}

// Update zoom level display
function updateZoomLevel() {
    if (!cy) return;
    const zoomPercent = Math.round(cy.zoom() * 100);
    const zoomLevelEl = document.getElementById('zoomLevel');
    if (zoomLevelEl) {
        zoomLevelEl.textContent = `Zoom: ${zoomPercent}%`;
    }
}

// Setup graph controls
function setupGraphControls() {
    const resetBtn = document.getElementById('resetGraph');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (cy) {
                cy.fit();
                cy.center();
                updateZoomLevel();
            }
        });
    }
    
    const layoutBtn = document.getElementById('layoutGraph');
    if (layoutBtn) {
        layoutBtn.addEventListener('click', () => {
            const layouts = ['cose', 'breadthfirst', 'grid', 'circle', 'concentric'];
            const currentIndex = layouts.indexOf(currentLayout);
            const nextIndex = (currentIndex + 1) % layouts.length;
            currentLayout = layouts[nextIndex];
            const layoutSelect = document.getElementById('layoutSelect');
            if (layoutSelect) layoutSelect.value = currentLayout;
            applyLayout(currentLayout);
        });
    }
    
    const layoutSelect = document.getElementById('layoutSelect');
    if (layoutSelect) {
        layoutSelect.addEventListener('change', (e) => {
            currentLayout = e.target.value;
            applyLayout(currentLayout);
        });
    }
    
    const showDraws = document.getElementById('showDraws');
    if (showDraws) {
        showDraws.addEventListener('change', () => {
            updateGraph();
        });
    }
    
    const showLosses = document.getElementById('showLosses');
    if (showLosses) {
        showLosses.addEventListener('change', () => {
            updateGraph();
        });
    }
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const graphViz = document.querySelector('.graph-visualization');
    
    if (fullscreenBtn && graphViz) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (graphViz.requestFullscreen) {
                    graphViz.requestFullscreen();
                } else if (graphViz.webkitRequestFullscreen) {
                    graphViz.webkitRequestFullscreen();
                } else if (graphViz.msRequestFullscreen) {
                    graphViz.msRequestFullscreen();
                }
                graphViz.classList.add('fullscreen');
                fullscreenBtn.textContent = '⛶ Exit Fullscreen';
                
                setTimeout(() => {
                    if (cy) {
                        cy.resize();
                        cy.fit();
                        updateZoomLevel();
                    }
                }, 100);
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                graphViz.classList.remove('fullscreen');
                fullscreenBtn.textContent = '⛶ Fullscreen';
                
                setTimeout(() => {
                    if (cy) {
                        cy.resize();
                        cy.fit();
                        updateZoomLevel();
                    }
                }, 100);
            }
        });
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    function handleFullscreenChange() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            if (graphViz) graphViz.classList.remove('fullscreen');
            if (fullscreenBtn) fullscreenBtn.textContent = '⛶ Fullscreen';
            setTimeout(() => {
                if (cy) {
                    cy.resize();
                    updateZoomLevel();
                }
            }, 100);
        }
    }
}

// Apply layout to graph
function applyLayout(layoutName) {
    if (!cy) return;
    
    const layoutOptions = {
        name: layoutName,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50
    };
    
    if (layoutName === 'breadthfirst') {
        layoutOptions.directed = true;
        layoutOptions.spacingFactor = 1.5;
    } else if (layoutName === 'cose') {
        layoutOptions.nodeRepulsion = 4500;
        layoutOptions.idealEdgeLength = 100;
        layoutOptions.edgeElasticity = 0.45;
    } else if (layoutName === 'grid') {
        layoutOptions.rows = Math.ceil(Math.sqrt(cy.nodes().length));
    } else if (layoutName === 'concentric') {
        layoutOptions.minNodeSpacing = 50;
    }
    
    cy.layout(layoutOptions).run();
    updateZoomLevel();
}

// Update graph based on filters
function updateGraph() {
    if (!cy) return;
    
    const graphData = buildGraphData();
    const showDrawsEl = document.getElementById('showDraws');
    const showLossesEl = document.getElementById('showLosses');
    
    const showDraws = showDrawsEl ? showDrawsEl.checked : true;
    const showLosses = showLossesEl ? showLossesEl.checked : true;
    
    cy.elements('edge').remove();
    
    const filteredEdges = graphData.edges.filter(edge => {
        if (edge.type === 'draw') return showDraws;
        if (edge.type === 'win') return showLosses;
        return true;
    });
    
    filteredEdges.forEach((edge, index) => {
        cy.add({
            data: {
                id: `e${index}-${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                type: edge.type,
                label: edge.label
            }
        });
    });
    
    const edgeCountEl = document.getElementById('edgeCount');
    if (edgeCountEl) {
        edgeCountEl.textContent = `Edges: ${filteredEdges.length}`;
    }
    
    applyLayout(currentLayout);
    updateZoomLevel();
}

// Setup About Modal
function setupAboutModal() {
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const closeAbout = document.getElementById('closeAbout');
    
    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener('click', () => {
            aboutModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeAbout && aboutModal) {
        closeAbout.addEventListener('click', () => {
            aboutModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close on overlay click
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal?.classList.contains('active')) {
            aboutModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupAboutModal();
});
