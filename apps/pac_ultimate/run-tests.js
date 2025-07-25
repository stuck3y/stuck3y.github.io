// Node.js test runner for Pac-Man game tests
// This allows us to run the tests without a browser

// Mock DOM elements
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
        getContext: () => ({
            fillRect: () => {},
            drawImage: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {}
        }),
        width: 0,
        height: 0
    })
};

global.window = {};

// Load and run the test file
const fs = require('fs');
const testCode = fs.readFileSync('./game.test.js', 'utf8');

// Execute the test code
eval(testCode);

// Run the tests
async function runTests() {
    console.log('\n🎮 Running Pac-Man Game Tests...\n');
    
    if (typeof window.runGameTests === 'function') {
        const success = await window.runGameTests();
        process.exit(success ? 0 : 1);
    } else {
        console.error('❌ Test runner not found!');
        process.exit(1);
    }
}

runTests();