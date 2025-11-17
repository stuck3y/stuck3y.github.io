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
        // First check if movement is possible
        if (!this.canMovePrecise(entity.x, entity.y, entity.direction, speed)) {
            return false;
        }
        
        // Calculate new position
        let newX = entity.x;
        let newY = entity.y;
        
        switch(entity.direction) {
            case 'up': newY -= speed; break;
            case 'down': newY += speed; break;
            case 'left': newX -= speed; break;
            case 'right': newX += speed; break;
        }
        
        // Apply clamping
        newX = Math.max(0.5, Math.min(this.MAZE_WIDTH - 0.5, newX));
        newY = Math.max(0.5, Math.min(this.MAZE_HEIGHT - 0.5, newY));
        
        // Only move if position actually changes
        if (newX !== entity.x || newY !== entity.y) {
            entity.x = newX;
            entity.y = newY;
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
    
    // Move entity close to wall (entity radius is 0.4, so at 3.5 it would hit wall at 4)
    pacman.x = 3.5;
    pacman.y = 1.5;
    pacman.direction = 'right';
    
    // Should not be able to move into wall
    const hitWall = game.moveEntity(pacman);
    assert(!hitWall, 'Entity should NOT move into wall');
    assertEquals(pacman.x, 3.5, 'X position should not change when hitting wall');
});

// Test wall collision at boundaries  
testSuite.test('Wall collision at boundaries', () => {
    const game = new MockGame();
    
    // Test maze structure
    assert(game.getTile(0, 0) === '#', 'Corner should be wall');
    assert(game.getTile(2, 2) === '#', 'Center should be wall');
    
    // Entity in safe position, not too close to walls
    const entity = { x: 2.0, y: 1.5, direction: 'left' };
    const startX = entity.x;
    
    // Move left - should work in open space
    const moved = game.moveEntity(entity);
    assert(moved, 'Should be able to move left from x=2.0');
    assert(entity.x < startX, 'X position should decrease');
    
    // Verify walls block movement at edges
    const blocked = { x: 0.8, y: 1.5, direction: 'left' };
    const cantMove = game.moveEntity(blocked);
    assert(!cantMove, 'Should NOT be able to move left when too close to wall');
});

// Test basic movement in open space
testSuite.test('Basic movement in open space', () => {
    const game = new MockGame();
    
    // Test movement in middle of maze
    const ghost = { x: 2.0, y: 1.5, direction: 'right' };
    const moved1 = game.moveEntity(ghost);
    assert(moved1, 'Should be able to move right in open space');
    assertEquals(ghost.x, 2.15, 'Should move by 0.15');
    
    // Test movement left
    ghost.direction = 'left';
    const moved2 = game.moveEntity(ghost);
    assert(moved2, 'Should be able to move left in open space');
    assertEquals(ghost.x, 2.0, 'Should move back to 2.0');
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
    window.runGameTests = async () => {
        const success = await testSuite.run();
        return success;
    };
    
    console.log('Game tests loaded. Run window.runGameTests() to execute tests.');
}