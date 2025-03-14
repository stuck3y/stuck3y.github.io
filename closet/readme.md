# Gaming Closet Project Tracker

A minimal SPA (Single Page Application) to help track components and products for a gaming closet project. This app allows you to:

- Keep track of components needed for your project
- Search for product options for each component
- Save product options for future reference
- Mark components as purchased

## Features

- **Component Management**: Add, edit, and delete components you need
- **Product Search**: Find products related to each component (simulated)
- **Direct Google Search**: Quickly search for products on Google
- **Manual URL Addition**: Add product links you find anywhere on the web
- **Local Storage**: Your data persists between sessions
- **Purchase Tracking**: Mark items as purchased and see what you've bought

## Setup

1. Clone this repository or download the files
2. Place the files in your GitHub repository
3. If you want to host on GitHub Pages:
   - Go to your repository settings
   - Navigate to the "Pages" section
   - Select the branch where you added the files
   - Save the settings

## Project Structure

```
gaming-closet-tracker/
├── index.html      # Main HTML structure
├── styles.css      # All styles and UI components
├── data.js         # Sample product data and default components
├── app.js          # Application logic and functionality
└── README.md       # Project documentation
```

## Customization

### Adding More Product Categories

Edit the `sampleProducts` object in `data.js` to add more product categories:

```javascript
'new-category': [
    { 
        id: 'id1', 
        title: 'Product Title', 
        price: '$XX.XX', 
        rating: 4.X, 
        source: 'Source Name', 
        url: 'https://example.com/product' 
    },
    // Add more products...
]
```

### Changing Default Components

Edit the `defaultComponents` array in `data.js`:

```javascript
const defaultComponents = [
    { 
        id: 'comp-id', 
        name: 'Component Name', 
        notes: 'Component Notes', 
        products: [], 
        purchased: null 
    },
    // Add more default components...
]
```

### Styling

Modify the CSS variables at the top of `styles.css` to customize the colors:

```css
:root {
    --primary: #3949ab;
    --primary-light: #6f74dd;
    --primary-dark: #00227b;
    --secondary: #ff6f00;
    /* more variables... */
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Real API Integration**: Connect to real product search APIs
2. **User Authentication**: Allow multiple users to have their own projects
3. **Export/Import**: Allow exporting and importing project data
4. **Image Support**: Add product images
5. **Price Tracking**: Track price changes over time

## License

MIT