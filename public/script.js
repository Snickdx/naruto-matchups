// Character data storage
let matchupsData = [];
let allCharacters = [];
let characterStats = new Map(); // Store stats for each character
let selectedCharacter = null;
let cy = null; // Cytoscape instance
let currentLayout = 'cose';
let currentSort = 'name';
let sortDirection = 'asc';

// Initialize the application
async function init() {
    try {
        const response = await fetch('matchups.json');
        matchupsData = await response.json();
        extractCharacters();
        renderCharacterGrid();
        setupSearch();
        setupSorting();
        setupViewToggle();
        initializeGraph();
    } catch (error) {
        console.error('Error loading matchups data:', error);
        document.body.innerHTML = '<div style="text-align: center; padding: 50px; color: white;"><h1>Error loading data</h1><p>Please make sure matchups.json exists</p></div>';
    }
}

// Extract all unique character names and calculate stats
function extractCharacters() {
    const characterSet = new Set();
    matchupsData.forEach(entry => {
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
        Object.keys(entry).forEach(character => {
            const matchups = entry[character];
            let wins = 0, losses = 0, draws = 0;
            
            matchups.forEach(matchup => {
                const result = Object.values(matchup)[0];
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
    'A (Third Raikage)': 'A',
    'Third Raikage': 'A',
    'Kaguya Ōtsutsuki': 'Kaguya_Ōtsutsuki',
    'Kaguya Otsutsuki': 'Kaguya_Ōtsutsuki'
};

// Character image mapping - prioritize local images, fallback to web
function getCharacterImageUrl(characterName) {
    const cleanName = characterName.split('(')[0].trim();
    
    // Check if we have a mapped filename
    let filename = characterNameMap[characterName] || characterNameMap[cleanName];
    
    if (!filename) {
        // Create filename from character name (matches scraper output)
        // Keep special characters like ō, ū as they are in the actual filenames
        filename = cleanName.replace(/\s+/g, '_');
    }
    
    // URL-encode the filename to handle special characters (ō, ū, etc.)
    const encodedFilename = encodeURIComponent(filename);
    
    // Try local image first (scraped images)
    const localImageUrl = `img/${encodedFilename}.png`;
    
    // Return local image URL (will fallback via onerror handler if not found)
    return localImageUrl;
}

// Enhanced image loading with multiple fallback sources
function createImageWithFallback(characterName, className = '') {
    const img = document.createElement('img');
    const cleanName = characterName.split('(')[0].trim();
    const encodedName = encodeURIComponent(cleanName);
    
    // Check if we have a mapped filename
    let filename = characterNameMap[characterName] || characterNameMap[cleanName];
    
    if (!filename) {
        // Create filename from character name (matches scraper output)
        // Keep special characters like ō, ū as they are in the actual filenames
        filename = cleanName.replace(/\s+/g, '_');
    }
    
    // URL-encode the filename to handle special characters
    const encodedFilename = encodeURIComponent(filename);
    
    // Create slug for Fandom wiki (fallback)
    const slug = cleanName.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_');
    
    // Try multiple image sources in order of preference
    const imageSources = [
        // Source 1: Local scraped image (primary) - PNG (URL-encoded for special chars)
        `img/${encodedFilename}.png`,
        // Source 2: Try with different extensions
        `img/${encodedFilename}.jpg`,
        `img/${encodedFilename}.jpeg`,
        `img/${encodedFilename}.gif`,
        // Source 3: Fandom wiki (fallback)
        `https://vignette.wikia.nocookie.net/naruto/images/thumb/${slug.charAt(0)}/${slug}/revision/latest/scale-to-width-down/200`,
        // Source 4: Alternative Fandom pattern
        `https://static.wikia.nocookie.net/naruto/images/thumb/${slug.charAt(0)}/${slug}/revision/latest/scale-to-width-down/200`,
        // Source 5: Generated avatar (final fallback)
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
    
    sortedCharacters.forEach(character => {
        const stats = getCharacterStats(character);
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.character = character;
        
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
        
        card.addEventListener('click', () => selectCharacter(character));
        grid.appendChild(card);
    });
}

// Setup sorting controls
function setupSorting() {
    const sortSelect = document.getElementById('sortSelect');
    
    if (!sortSelect) return;
    
    // Set initial value
    sortSelect.value = currentSort;
    
    sortSelect.addEventListener('change', (e) => {
        const sortType = e.target.value;
        
        // Toggle direction if selecting same sort
        if (currentSort === sortType) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort = sortType;
            // Default to descending for numeric sorts, ascending for name
            sortDirection = sortType === 'name' ? 'asc' : 'desc';
        }
        
        // Update dropdown text to show direction
        const options = {
            'name': 'Sort by: Name',
            'wins': 'Sort by: Wins',
            'losses': 'Sort by: Losses',
            'draws': 'Sort by: Draws',
            'total': 'Sort by: Total Fights'
        };
        
        const directionSymbol = sortDirection === 'asc' ? ' ↑' : ' ↓';
        sortSelect.querySelector(`option[value="${currentSort}"]`).textContent = 
            options[currentSort] + directionSymbol;
        
        // Reset other options
        Object.keys(options).forEach(key => {
            if (key !== currentSort) {
                sortSelect.querySelector(`option[value="${key}"]`).textContent = options[key];
            }
        });
        
        // Re-render grid with new sort
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
    });
    
    // Double-click to toggle direction
    sortSelect.addEventListener('dblclick', () => {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        const options = {
            'name': 'Sort by: Name',
            'wins': 'Sort by: Wins',
            'losses': 'Sort by: Losses',
            'draws': 'Sort by: Draws',
            'total': 'Sort by: Total Fights'
        };
        const directionSymbol = sortDirection === 'asc' ? ' ↑' : ' ↓';
        sortSelect.querySelector(`option[value="${currentSort}"]`).textContent = 
            options[currentSort] + directionSymbol;
        renderCharacterGrid();
    });
}

// Select a character and display their matchups
function selectCharacter(characterName) {
    selectedCharacter = characterName;
    
    // Update active card
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.character === characterName) {
            card.classList.add('active');
        }
    });
    
    // Find character's matchups
    const characterData = matchupsData.find(entry => entry[characterName]);
    const matchups = characterData ? characterData[characterName] : [];
    
    // Display matchups
    displayMatchups(characterName, matchups);
    
    // Scroll matchup list to top if needed
    const matchupsSection = document.querySelector('.matchups-section');
    if (matchupsSection) {
        matchupsSection.scrollTop = 0;
    }
}

// Display matchups for selected character
function displayMatchups(characterName, matchups) {
    const display = document.getElementById('matchupDisplay');
    const nameElement = document.getElementById('selectedCharacterName');
    const imageElement = document.getElementById('selectedCharacterImage');
    const matchupsList = document.getElementById('matchupsList');
    
    // Update header
    nameElement.textContent = characterName;
    const newImg = createImageWithFallback(characterName, 'character-profile-large');
    newImg.id = 'selectedCharacterImage';
    imageElement.replaceWith(newImg);
    
    // Calculate stats
    let wins = 0, losses = 0, draws = 0;
    matchups.forEach(matchup => {
        const result = Object.values(matchup)[0];
        if (result === 'win') wins++;
        else if (result === 'lose') losses++;
        else if (result === 'draw') draws++;
    });
    
    const totalFights = wins + losses + draws;
    const winPercentage = totalFights > 0 ? ((wins / totalFights) * 100).toFixed(1) : 0;
    
    // Update all stat displays
    document.getElementById('totalFights').textContent = totalFights;
    document.getElementById('winsCount').textContent = wins;
    document.getElementById('lossesCount').textContent = losses;
    document.getElementById('drawsCount').textContent = draws;
    document.getElementById('winPercentage').textContent = `${winPercentage}%`;
    
    // Render matchups
    matchupsList.innerHTML = '';
    
    if (matchups.length === 0) {
        matchupsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No matchups found for this character.</p>';
    } else {
        matchups.forEach(matchup => {
            const opponentName = Object.keys(matchup)[0];
            const result = matchup[opponentName];
            
            const matchupItem = document.createElement('div');
            matchupItem.className = `matchup-item ${result}`;
            
            // Extract context if present (e.g., "Sasuke Uchiha (Final Battle)")
            const contextMatch = opponentName.match(/\((.+)\)/);
            const displayName = contextMatch ? opponentName.replace(/\(.+\)/, '').trim() : opponentName;
            const context = contextMatch ? contextMatch[1] : null;
            
            const opponentImg = createImageWithFallback(displayName, 'matchup-opponent-image');
            matchupItem.innerHTML = `
                <div class="matchup-info">
                    <div class="matchup-opponent-name">${displayName}</div>
                    ${context ? `<div class="matchup-context">${context}</div>` : ''}
                </div>
                <div class="matchup-result ${result}">${result}</div>
            `;
            matchupItem.insertBefore(opponentImg, matchupItem.firstChild);
            
            matchupsList.appendChild(matchupItem);
        });
    }
    
    // Show display
    display.style.display = 'flex';
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('characterSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length === 0) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }
        
        // Filter characters
        const filtered = allCharacters.filter(char => 
            char.toLowerCase().includes(query)
        ).slice(0, 10);
        
        if (filtered.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item" style="cursor: default; color: var(--text-secondary);">No characters found</div>';
        } else {
            searchResults.innerHTML = '';
            filtered.forEach(char => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.dataset.character = char;
                const img = createImageWithFallback(char);
                item.appendChild(img);
                const span = document.createElement('span');
                span.textContent = char;
                item.appendChild(span);
                item.addEventListener('click', () => {
                    selectCharacter(char);
                    searchInput.value = '';
                    searchResults.classList.remove('active');
                });
                searchResults.appendChild(item);
            });
            
            // Add click listeners
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                if (item.dataset.character) {
                    item.addEventListener('click', () => {
                        selectCharacter(item.dataset.character);
                        searchInput.value = '';
                        searchResults.classList.remove('active');
                    });
                }
            });
        }
        
        searchResults.classList.add('active');
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
    
    // Handle Enter key in search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstResult = searchResults.querySelector('.search-result-item[data-character]');
            if (firstResult) {
                selectCharacter(firstResult.dataset.character);
                searchInput.value = '';
                searchResults.classList.remove('active');
            }
        }
    });
}

// Setup view toggle between list and graph
function setupViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const characterSelector = document.querySelector('.character-selector');
    const matchupDisplay = document.querySelector('.matchup-display');
    const graphView = document.getElementById('graphVisualization');
    const searchSection = document.querySelector('.search-section');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            
            // Update active button
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide views
            if (view === 'list') {
                characterSelector.style.display = 'flex';
                matchupDisplay.style.display = 'flex';
                graphView.style.display = 'none';
                searchSection.style.display = 'block';
            } else {
                characterSelector.style.display = 'none';
                matchupDisplay.style.display = 'none';
                graphView.style.display = 'flex';
                searchSection.style.display = 'none';
                // Resize graph when switching to graph view
                setTimeout(() => {
                    if (cy) {
                        cy.resize();
                        cy.fit();
                        updateZoomLevel();
                    }
                }, 100);
            }
        });
    });
}

// Build graph data from matchups
function buildGraphData() {
    const nodes = new Map();
    const edges = [];
    const nodeIds = new Map();
    let nodeIdCounter = 0;
    
    // Helper to get or create node ID
    function getNodeId(characterName) {
        const cleanName = characterName.split('(')[0].trim();
        if (!nodeIds.has(cleanName)) {
            nodeIds.set(cleanName, nodeIdCounter++);
        }
        return nodeIds.get(cleanName);
    }
    
    // Process all matchups
    matchupsData.forEach(entry => {
        Object.keys(entry).forEach(character => {
            const characterMatchups = entry[character];
            const sourceId = getNodeId(character);
            const sourceName = character.split('(')[0].trim();
            
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
                const opponentName = Object.keys(matchup)[0];
                const result = matchup[opponentName];
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
                
                // Update stats
                const sourceNode = nodes.get(sourceId);
                const targetNode = nodes.get(targetId);
                
                if (result === 'win') {
                    sourceNode.wins++;
                    targetNode.losses++;
                    edges.push({
                        source: sourceId.toString(),
                        target: targetId.toString(),
                        type: 'win',
                        label: 'wins'
                    });
                } else if (result === 'lose') {
                    sourceNode.losses++;
                    targetNode.wins++;
                    edges.push({
                        source: targetId.toString(),
                        target: sourceId.toString(),
                        type: 'win',
                        label: 'wins'
                    });
                } else if (result === 'draw') {
                    sourceNode.draws++;
                    targetNode.draws++;
                    edges.push({
                        source: sourceId.toString(),
                        target: targetId.toString(),
                        type: 'draw',
                        label: 'draws',
                        bidirectional: true
                    });
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
    
    // Create unique edge IDs
    const edgeMap = new Map();
    graphData.edges.forEach((edge, index) => {
        const key = `${edge.source}-${edge.target}-${edge.type}`;
        if (!edgeMap.has(key)) {
            edge.id = `e${index}`;
            edgeMap.set(key, edge);
        }
    });
    
    // Filter edges based on checkboxes
    function getFilteredEdges() {
        const showDraws = document.getElementById('showDraws')?.checked ?? true;
        const showLosses = document.getElementById('showLosses')?.checked ?? true;
        
        return graphData.edges.filter(edge => {
            if (edge.type === 'draw') return showDraws;
            if (edge.type === 'win') return showLosses; // Wins show the win chains
            return true;
        });
    }
    
    // Initialize Cytoscape
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [
            ...graphData.nodes.map(node => ({
                data: {
                    id: node.id,
                    label: node.label,
                    name: node.name,
                    wins: node.wins,
                    losses: node.losses,
                    draws: node.draws,
                    imageUrl: getCharacterImageUrl(node.name)
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
                    'background-image': 'data(imageUrl)',
                    'background-fit': 'cover',
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
                selector: 'node[wins > 10]',
                style: {
                    'background-color': '#4caf50',
                    'width': 100,
                    'height': 100,
                    'font-size': '12px',
                    'border-width': 4
                }
            },
            {
                selector: 'node[losses > 5]',
                style: {
                    'background-color': '#f44336',
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
                    'arrow-size': 10,
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
                    'border-color': '#ffffff',
                    'background-color': '#ff9800'
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
        document.querySelector('.view-btn[data-view="list"]').click();
        setTimeout(() => selectCharacter(characterName), 100);
    });
    
    // Update stats display
    document.getElementById('nodeCount').textContent = `Nodes: ${graphData.nodes.length}`;
    document.getElementById('edgeCount').textContent = `Edges: ${getFilteredEdges().length}`;
    
    // Setup zoom controls
    setupZoomControls();
    
    // Setup controls
    setupGraphControls();
    
    // Update zoom level display
    updateZoomLevel();
}

// Setup zoom controls
function setupZoomControls() {
    if (!cy) return;
    
    // Zoom in button
    document.getElementById('zoomIn').addEventListener('click', () => {
        const currentZoom = cy.zoom();
        const newZoom = Math.min(3.0, currentZoom * 1.2); // Max 300%
        cy.zoom(newZoom);
        updateZoomLevel();
    });
    
    // Zoom out button
    document.getElementById('zoomOut').addEventListener('click', () => {
        const currentZoom = cy.zoom();
        const newZoom = Math.max(0.1, currentZoom * 0.8); // Min 10%
        cy.zoom(newZoom);
        updateZoomLevel();
    });
    
    // Mouse wheel zoom with controlled sensitivity
    cy.on('wheel', (evt) => {
        evt.preventDefault();
        const originalEvent = evt.originalEvent;
        const delta = originalEvent.deltaY;
        const button = originalEvent.button; // 0=left, 1=middle, 2=right
        const buttons = originalEvent.buttons; // Bitmask of pressed buttons
        
        // Check if middle mouse button is pressed or if it's a middle mouse wheel event
        const isMiddleMouse = button === 1 || (buttons & 4) === 4;
        
        const currentZoom = cy.zoom();
        
        // Adjust zoom step based on whether middle mouse is used
        // Middle mouse button zoom should be more sensitive
        const zoomStep = isMiddleMouse ? 0.1 : 0.05;
        const zoomFactor = delta > 0 ? (1 - zoomStep) : (1 + zoomStep);
        let newZoom = currentZoom * zoomFactor;
        
        // Limit zoom range (min: 0.1 = 10%, max: 3.0 = 300%)
        newZoom = Math.max(0.1, Math.min(3.0, newZoom));
        
        cy.zoom(newZoom);
        updateZoomLevel();
    });
    
    // Handle middle mouse button down for panning prevention
    cy.on('mousedown', (evt) => {
        const originalEvent = evt.originalEvent;
        if (originalEvent.button === 1) { // Middle mouse button
            originalEvent.preventDefault();
        }
    });
    
    // Prevent default middle mouse button behavior (opening links in new tab)
    const cyContainer = document.getElementById('cy');
    cyContainer.addEventListener('mousedown', (evt) => {
        if (evt.button === 1) {
            evt.preventDefault();
        }
    });
    
    cyContainer.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
    });
    
    // Update zoom level on zoom events
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
    // Reset view button
    document.getElementById('resetGraph').addEventListener('click', () => {
        if (cy) {
            cy.fit();
            cy.center();
            updateZoomLevel();
        }
    });
    
    // Layout change button
    document.getElementById('layoutGraph').addEventListener('click', () => {
        const layouts = ['cose', 'breadthfirst', 'grid', 'circle', 'concentric'];
        const currentIndex = layouts.indexOf(currentLayout);
        const nextIndex = (currentIndex + 1) % layouts.length;
        currentLayout = layouts[nextIndex];
        document.getElementById('layoutSelect').value = currentLayout;
        applyLayout(currentLayout);
    });
    
    // Layout select dropdown
    document.getElementById('layoutSelect').addEventListener('change', (e) => {
        currentLayout = e.target.value;
        applyLayout(currentLayout);
    });
    
    // Filter checkboxes
    document.getElementById('showDraws').addEventListener('change', () => {
        updateGraph();
    });
    
    document.getElementById('showLosses').addEventListener('change', () => {
        updateGraph();
    });
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const graphViz = document.querySelector('.graph-visualization');
    
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (graphViz.requestFullscreen) {
                graphViz.requestFullscreen();
            } else if (graphViz.webkitRequestFullscreen) {
                graphViz.webkitRequestFullscreen();
            } else if (graphViz.msRequestFullscreen) {
                graphViz.msRequestFullscreen();
            }
            graphViz.classList.add('fullscreen');
            fullscreenBtn.textContent = '⛶ Exit Fullscreen';
            
            // Resize graph after entering fullscreen
            setTimeout(() => {
                if (cy) {
                    cy.resize();
                    cy.fit();
                    updateZoomLevel();
                }
            }, 100);
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            graphViz.classList.remove('fullscreen');
            fullscreenBtn.textContent = '⛶ Fullscreen';
            
            // Resize graph after exiting fullscreen
            setTimeout(() => {
                if (cy) {
                    cy.resize();
                    cy.fit();
                    updateZoomLevel();
                }
            }, 100);
        }
    });
    
    // Handle fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    function handleFullscreenChange() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            graphViz.classList.remove('fullscreen');
            fullscreenBtn.textContent = '⛶ Fullscreen';
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
    
    // Layout-specific options
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
    const showDraws = document.getElementById('showDraws').checked;
    const showLosses = document.getElementById('showLosses').checked;
    
    // Remove all edges
    cy.elements('edge').remove();
    
    // Add filtered edges
    const filteredEdges = graphData.edges.filter(edge => {
        if (edge.type === 'draw') return showDraws;
        if (edge.type === 'win') return showLosses; // Wins show the win chains
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
    
    // Update edge count
    document.getElementById('edgeCount').textContent = `Edges: ${filteredEdges.length}`;
    
    // Reapply layout
    applyLayout(currentLayout);
    updateZoomLevel();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


