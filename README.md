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
├── index.html          # Main HTML file
├── style.css           # Stylesheet with modern design
├── script.js           # JavaScript logic and data handling
├── matchups.json       # Character matchup data
└── README.md          # This file
```

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

