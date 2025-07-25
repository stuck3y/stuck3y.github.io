// Test suite for Pac-Man game
// Using a simple test framework for browser compatibility

class GameTest {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    test(name, fn) {
        this.tests.push({ name, fn });
    }
    
    async run() {
        console.log('🧪 Running Pac-Man Game Tests...\n');
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.failed++;
                console.error(`❌ ${test.name}`);
                console.error(`   ${error.message}`);
            }
        }
        
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

function assertArrayEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Arrays not equal: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
}

// Mock game class for testing
class MockGame {
    constructor() {
        this.TILE_SIZE = 24;
        this.MAZE_WIDTH = 28;
        this.MAZE_HEIGHT = 31;
        
        // Simple test maze
        this.maze = [
            "#####",
            "#...#",
            "#.#.#",
            "#...#",
            "#####"
        ];
        
        this.MAZE_HEIGHT = this.maze.length;
        this.MAZE_WIDTH = this.maze[0].length;
    }
    
    getTile(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        
        if (y < 0 || y >= this.MAZE_HEIGHT || x < 0 || x >= this.MAZE_WIDTH) {
            return '#'; // Out of bounds is wall
        }
        
        return this.maze[y][x];
    }
    
    canMove(x, y, direction) {
        let newX = x;
        let newY = y;
        
        switch(direction) {
            case 'up': newY -= 1; break;
            case 'down': newY += 1; break;
            case 'left': newX -= 1; break;
            case 'right': newX += 1; break;
        }
        
        // Check if new position is valid
        return this.getTile(newX, newY) !== '#';
    }
    
    canMovePrecise(x, y, direction, speed = 0.15) {
        let newX = x;
        let newY = y;
        
        switch(direction) {
            case 'up': newY -= speed; break;
            case 'down': newY += speed; break;
            case 'left': newX -= speed; break;
            case 'right': newX += speed; break;
        }
        
        // Check all corners of the entity (assuming 0.8 tile size for entity)
        const size = 0.4; // Half size
        const corners = [
            [newX - size, newY - size],
            [newX + size, newY - size],
            [newX - size, newY + size],
            [newX + size, newY + size]
        ];
        
        for (const [cx, cy] of corners) {
            if (this.getTile(cx, cy) === '#') {
                return false;
            }
        }
        
        return true;
    }
    
    moveEntity(entity, speed = 0.15) {
        if (this.canMovePrecise(entity.x, entity.y, entity.direction, speed)) {
            switch(entity.direction) {
                case 'up': entity.y -= speed; break;
                case 'down': entity.y += speed; break;
                case 'left': entity.x -= speed; break;
                case 'right': entity.x += speed; break;
            }
            
            // Clamp to valid positions
            entity.x = Math.max(0.5, Math.min(this.MAZE_WIDTH - 0.5, entity.x));
            entity.y = Math.max(0.5, Math.min(this.MAZE_HEIGHT - 0.5, entity.y));
            
            return true;
        }
        return false;
    }
}

// Create test suite
const testSuite = new GameTest();

// Test basic collision detection
testSuite.test('Wall detection - basic cases', () => {
    const game = new MockGame();
    
    // Test corners
    assertEquals(game.getTile(0, 0), '#', 'Top-left should be wall');
    assertEquals(game.getTile(4, 0), '#', 'Top-right should be wall');
    assertEquals(game.getTile(0, 4), '#', 'Bottom-left should be wall');
    assertEquals(game.getTile(4, 4), '#', 'Bottom-right should be wall');
    
    // Test open spaces
    assertEquals(game.getTile(1, 1), '.', 'Position (1,1) should be dot');
    assertEquals(game.getTile(3, 3), '.', 'Position (3,3) should be dot');
    
    // Test internal wall
    assertEquals(game.getTile(2, 2), '#', 'Position (2,2) should be wall');
});

// Test movement validation
testSuite.test('Movement validation - from open space', () => {
    const game = new MockGame();
    
    // From position (1, 1) - open space with dot
    assert(game.canMove(1, 1, 'right'), 'Should be able to move right from (1,1)');
    assert(game.canMove(1, 1, 'down'), 'Should be able to move down from (1,1)');
    assert(!game.canMove(1, 1, 'up'), 'Should NOT be able to move up from (1,1) into wall');
    assert(!game.canMove(1, 1, 'left'), 'Should NOT be able to move left from (1,1) into wall');
});

// Test precise collision detection
testSuite.test('Precise collision detection with entity size', () => {
    const game = new MockGame();
    
    // Entity at (1.5, 1.5) should be able to move in some directions
    assert(game.canMovePrecise(1.5, 1.5, 'right', 0.15), 'Should move right from (1.5, 1.5)');
    assert(game.canMovePrecise(1.5, 1.5, 'down', 0.15), 'Should move down from (1.5, 1.5)');
    
    // Entity too close to wall shouldn't be able to move into it
    assert(!game.canMovePrecise(1.2, 1.2, 'left', 0.15), 'Should NOT move left when too close to wall');
    assert(!game.canMovePrecise(1.2, 1.2, 'up', 0.15), 'Should NOT move up when too close to wall');
});

// Test entity movement
testSuite.test('Entity movement with collision', () => {
    const game = new MockGame();
    const pacman = { x: 1.5, y: 1.5, direction: 'right' };
    
    // Should be able to move right
    const moved = game.moveEntity(pacman);
    assert(moved, 'Entity should have moved');
    assertEquals(pacman.x, 1.65, 'X position should increase by 0.15');
    assertEquals(pacman.y, 1.5, 'Y position should remain the same');
    
    // Move entity close to wall
    pacman.x = 3.3;
    pacman.y = 1.5;
    pacman.direction = 'right';
    
    // Should not be able to move into wall
    const hitWall = game.moveEntity(pacman);
    assert(!hitWall, 'Entity should NOT move into wall');
    assertEquals(pacman.x, 3.3, 'X position should not change when hitting wall');
});

// Test diagonal movement prevention
testSuite.test('No diagonal movement through walls', () => {
    const game = new MockGame();
    
    // At junction, should only move in one direction at a time
    const pacman = { x: 1.5, y: 3.5, direction: 'up' };
    
    // Move up toward junction
    for (let i = 0; i < 10; i++) {
        game.moveEntity(pacman);
    }
    
    // Should stop at wall, not slip diagonally
    assert(pacman.y >= 2.6, 'Should not move too far up past wall');
});

// Test position clamping
testSuite.test('Position clamping at boundaries', () => {
    const game = new MockGame();
    const ghost = { x: 0.1, y: 1.5, direction: 'left' };
    
    game.moveEntity(ghost);
    assertEquals(ghost.x, 0.5, 'X position should be clamped to minimum 0.5');
    
    ghost.x = 4.9;
    ghost.direction = 'right';
    game.moveEntity(ghost);
    assertEquals(ghost.x, 4.5, 'X position should be clamped to maximum width - 0.5');
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
    window.runGameTests = async () => {
        const success = await testSuite.run();
        return success;
    };
    
    console.log('Game tests loaded. Run window.runGameTests() to execute tests.');
}