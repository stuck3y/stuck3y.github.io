// Sample product data (since we can't actually search external sites)
const sampleProducts = {
    'gaming chair': [
        { id: 'gc1', title: 'GTRacing Gaming Chair', price: '$139.99', rating: 4.5, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/product1' },
        { id: 'gc2', title: 'GTRACING GT099 Gaming Chair', price: '$119.99', rating: 4.3, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/product2' },
        { id: 'gc3', title: 'Homall Gaming Chair', price: '$89.99', rating: 4.2, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/product3' },
        { id: 'gc4', title: 'RESPAWN 110 Racing Style Gaming Chair', price: '$169.99', rating: 4.1, source: 'Best Buy', image: '/api/placeholder/80/60', url: 'https://example.com/product4' },
        { id: 'gc5', title: 'OFM ESS Collection Racing Style Gaming Chair', price: '$99.99', rating: 3.9, source: 'Walmart', image: '/api/placeholder/80/60', url: 'https://example.com/product5' }
    ],
    'monitor': [
        { id: 'm1', title: 'LG 27GL83A-B 27" Ultragear QHD IPS', price: '$379.99', rating: 4.7, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/monitor1' },
        { id: 'm2', title: 'ASUS TUF Gaming 27" 1440P HDR Monitor', price: '$329.99', rating: 4.6, source: 'Best Buy', image: '/api/placeholder/80/60', url: 'https://example.com/monitor2' },
        { id: 'm3', title: 'Samsung Odyssey G7 32" WQHD', price: '$699.99', rating: 4.5, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/monitor3' },
        { id: 'm4', title: 'Acer Nitro XV272U 27" WQHD IPS', price: '$299.99', rating: 4.3, source: 'Newegg', image: '/api/placeholder/80/60', url: 'https://example.com/monitor4' },
        { id: 'm5', title: 'Dell S2721DGF 27" Gaming Monitor', price: '$399.99', rating: 4.8, source: 'Dell', image: '/api/placeholder/80/60', url: 'https://example.com/monitor5' }
    ],
    'hdmi cable': [
        { id: 'hdmi1', title: 'AmazonBasics High-Speed HDMI Cable', price: '$7.99', rating: 4.8, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/hdmi1' },
        { id: 'hdmi2', title: 'Belkin Ultra HD High Speed HDMI Cable', price: '$24.99', rating: 4.6, source: 'Best Buy', image: '/api/placeholder/80/60', url: 'https://example.com/hdmi2' },
        { id: 'hdmi3', title: 'Monoprice 8K Certified Braided HDMI Cable', price: '$12.99', rating: 4.7, source: 'Monoprice', image: '/api/placeholder/80/60', url: 'https://example.com/hdmi3' },
        { id: 'hdmi4', title: 'Cable Matters Braided HDMI Cable', price: '$9.99', rating: 4.5, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/hdmi4' },
        { id: 'hdmi5', title: 'Anker Ultra High Speed HDMI Cable', price: '$17.99', rating: 4.7, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/hdmi5' }
    ],
    'gaming headset': [
        { id: 'h1', title: 'HyperX Cloud II', price: '$99.99', rating: 4.6, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/headset1' },
        { id: 'h2', title: 'SteelSeries Arctis 7', price: '$149.99', rating: 4.4, source: 'Best Buy', image: '/api/placeholder/80/60', url: 'https://example.com/headset2' },
        { id: 'h3', title: 'Razer BlackShark V2', price: '$99.99', rating: 4.7, source: 'Razer', image: '/api/placeholder/80/60', url: 'https://example.com/headset3' },
        { id: 'h4', title: 'Logitech G Pro X', price: '$129.99', rating: 4.5, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/headset4' },
        { id: 'h5', title: 'Corsair HS60 Pro', price: '$69.99', rating: 4.3, source: 'Corsair', image: '/api/placeholder/80/60', url: 'https://example.com/headset5' }
    ],
    'console stand': [
        { id: 'cs1', title: 'Kootek Vertical Stand for PS5', price: '$19.99', rating: 4.5, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/stand1' },
        { id: 'cs2', title: 'NexiGo PS5 Stand with Cooling Fan', price: '$39.99', rating: 4.3, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/stand2' },
        { id: 'cs3', title: 'OIVO PS5 Stand with Dual Controller Charger', price: '$32.99', rating: 4.6, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/stand3' },
        { id: 'cs4', title: 'FASTSNAIL Vertical Stand for PS5', price: '$15.99', rating: 4.2, source: 'Amazon', image: '/api/placeholder/80/60', url: 'https://example.com/stand4' },
        { id: 'cs5', title: 'Monzlteck Vertical Stand for PS5', price: '$24.99', rating: 4.0, source: 'Walmart', image: '/api/placeholder/80/60', url: 'https://example.com/stand5' }
    ]
};

// Default components to start with
const defaultComponents = [
    { id: 'comp-1', name: 'Gaming Chair', notes: 'Need something comfortable for long sessions, preferably with lumbar support', products: [], purchased: null },
    { id: 'comp-2', name: 'PS5', notes: 'Already have this', products: [], purchased: 'ps5-1' },
    { id: 'comp-3', name: 'Gaming Monitor', notes: 'Already have this - LG 27GL850', products: [], purchased: 'monitor-1' },
    { id: 'comp-4', name: 'HDMI Cable', notes: 'Need HDMI 2.1 for PS5', products: [], purchased: null }
];