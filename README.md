# Naruto Character Matchups Visualizer

A beautiful, interactive vanilla JavaScript website to visualize Naruto character fight matchups.

## Features

- 🔍 **Search Functionality** - Quickly find any character
- 📊 **Statistics Display** - See wins, losses, and draws for each character
- 🎨 **Modern UI** - Beautiful gradient design with smooth animations
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🖼️ **Character Profiles** - Visual character cards with profile images
- 📈 **Detailed Matchups** - View all fights with win/loss/draw indicators
- 🌐 **Graph Visualization** - Interactive network graph showing win chains between characters
- 🎯 **Multiple Layouts** - Choose from different graph layouts (Force Directed, Grid, Circle, etc.)
- 🔧 **Interactive Controls** - Filter draws/losses, change layouts, and explore relationships

## How to Use

### List View
1. **Open the website**: Simply open `index.html` in your web browser
2. **Browse characters**: Scroll through the character grid or use the search bar
3. **Select a character**: Click on any character card to view their matchups
4. **View statistics**: See the character's win/loss/draw record at the top
5. **Explore matchups**: Scroll through all the character's fights with color-coded results

### Graph View
1. **Switch to Graph View**: Click the "📊 Graph View" button in the header
2. **Explore the network**: See all characters as nodes connected by win chains (edges)
3. **Interact with nodes**: Click on any character node to switch to list view and see their details
4. **Change layout**: Use the layout dropdown or "Change Layout" button to try different visualizations
5. **Filter edges**: Toggle "Show Draws" and "Show Losses" to focus on specific relationship types
6. **Reset view**: Click "Reset View" to zoom out and center the graph

## File Structure

```
naruto/
├── public/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Stylesheet with modern design
│   ├── script.js           # JavaScript logic and data handling
│   ├── matchups.json       # Character matchup data
│   ├── manifest.json       # PWA manifest
│   ├── img/                # Character profile images
│   └── icons/              # App icons
├── scraper/                # Python scripts for image scraping
└── README.md               # This file
```

## Contribution

We welcome contributions to improve the character data and images!

### Adding Missing Character Images

If you notice a character missing a profile picture:

1.  Find a high-quality image of the character (preferably a square portrait).
2.  Save it as a **PNG** file.
3.  Name the file using the format `Firstname_Lastname.png`. Replace spaces with underscores.
    *   Example: "Naruto Uzumaki" -> `Naruto_Uzumaki.png`
    *   Example: "Might Guy" -> `Might_Guy.png`
4.  Place the file in the `public/img/` directory.

### Updating Matchups

To add missing fights or correct existing ones:

1.  Open `public/matchups.json`.
2.  Find the entry for the character you want to update (or add a new object if they don't exist).
3.  Add the opponent and the result to their list.

**Format Example:**

```json
{
    "Naruto Uzumaki": [
        { "Sasuke Uchiha": "win" },
        { "Neji Hyūga": "win" },
        { "Gaara": "win" }
    ]
}
```

*   **Key**: The character's full name.
*   **Value**: An array of objects, where each object key is the opponent's name and the value is the result (`"win"`, `"lose"`, or `"draw"`).

**Note:** The visualization works best when connections are consistent (e.g., if A beat B, ensure B's record shows a loss to A), but the app handles inconsistencies gracefully.

## Libraries Used

- **Cytoscape.js** - Graph/network visualization library
- **Cytoscape Cose-Bilkent** - Force-directed layout algorithm
- **Dagre** - Hierarchical layout support

## Color Coding

- 🟢 **Green** - Win
- 🔴 **Red** - Loss
- 🟠 **Orange** - Draw

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Notes

- The website uses vanilla JavaScript (no frameworks required)
- Character images are generated using UI Avatars service
- All data is loaded from `matchups.json`
- Graph visualization uses Cytoscape.js (loaded via CDN)
- No build process or dependencies needed - just open and use!
- The graph shows directed edges: arrows point from winner to loser
- Green edges represent wins, orange dashed edges represent draws

## Graph Visualization Details

- **Nodes**: Represent characters, sized by their win count (more wins = larger node)
- **Edges**: Show win relationships (arrow points from winner to loser)
- **Colors**: 
  - Green nodes = High win count characters
  - Red nodes = Characters with many losses
  - Orange nodes = Default character nodes
- **Layouts Available**:
  - Force Directed (Cose) - Natural, organic layout
  - Breadth First - Hierarchical tree structure
  - Grid - Organized grid pattern
  - Circle - Circular arrangement
  - Concentric - Rings based on importance

## Future Enhancements

Potential improvements:
- Character comparison tool
- Add character details/bio information
- Export matchup data and graph images
- Add more character images from external APIs
- Highlight win chains/paths between specific characters
- Add character search within graph view

