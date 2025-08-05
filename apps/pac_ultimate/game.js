// Ultimate Pac-Man Game with Custom Themes - Optimized Version
class PacManGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for Brave
        
        // Game constants
        this.TILE_SIZE = 20; // Smaller for better performance
        this.MAZE_WIDTH = 28;
        this.MAZE_HEIGHT = 31;
        this.FPS = 60;
        this.FRAME_TIME = 1000 / this.FPS;
        
        // Movement speeds (tiles per second)
        this.MOVE_SPEED = 8;
        this.GHOST_SPEED = 7;
        this.FRIGHTENED_SPEED = 4;
        
        // Set canvas size
        this.canvas.width = this.MAZE_WIDTH * this.TILE_SIZE;
        this.canvas.height = this.MAZE_HEIGHT * this.TILE_SIZE;
        
        // Disable image smoothing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;
        
        // Game state
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.paused = false;
        this.gameOver = false;
        this.victory = false;
        this.dotsRemaining = 0;
        this.totalDots = 0;
        this.powerMode = false;
        this.powerTimer = 0;
        this.POWER_DURATION = 6000; // 6 seconds
        
        // Current theme
        this.currentTheme = 'neon';
        this.themeIndex = 0;
        
        // Animation
        this.animationTime = 0;
        this.lastFrameTime = 0;
        this.accumulator = 0;
        
        // Define themes
        this.themes = {
            neon: {
                background: '#0a0a0a',
                walls: '#00ffff',
                wallStroke: '#0099cc',
                pacman: '#ffff00',
                ghosts: ['#ff0084', '#00ff00', '#ff00ff', '#ffa500'],
                dots: '#ffffff',
                powerPellet: '#ffff00',
                frightened: '#0066ff',
                text: '#00ffff'
            },
            retro: {
                background: '#000000',
                walls: '#2121ff',
                wallStroke: '#0000ff',
                pacman: '#ffff00',
                ghosts: ['#ff0000', '#00ffff', '#ffb8ff', '#ffb852'],
                dots: '#ffb897',
                powerPellet: '#ffffff',
                frightened: '#ffffff',
                text: '#ffffff'
            },
            ocean: {
                background: '#001f3f',
                walls: '#0074d9',
                wallStroke: '#005599',
                pacman: '#ff851b',
                ghosts: ['#ff4136', '#01ff70', '#b10dc9', '#ffdc00'],
                dots: '#7fdbff',
                powerPellet: '#39cccc',
                frightened: '#111111',
                text: '#7fdbff'
            },
            candy: {
                background: '#ffe0f0',
                walls: '#ff69b4',
                wallStroke: '#ff1493',
                pacman: '#ff1493',
                ghosts: ['#ff69b4', '#dda0dd', '#ff6347', '#ffa07a'],
                dots: '#ffc0cb',
                powerPellet: '#ff1493',
                frightened: '#4b0082',
                text: '#ff1493'
            },
            space: {
                background: '#000814',
                walls: '#001d3d',
                wallStroke: '#000814',
                pacman: '#ffd60a',
                ghosts: ['#003566', '#000814', '#ffc300', '#001d3d'],
                dots: '#ffd60a',
                powerPellet: '#003566',
                frightened: '#ffc300',
                text: '#ffd60a'
            },
            switcheroo: {
                background: '#1a0033',
                walls: '#6a0dad',
                wallStroke: '#4a0080',
                pacman: '#00ff00',
                ghosts: ['#ffff00', '#ffff00', '#ffff00', '#ffff00'],
                dots: '#ff00ff',
                powerPellet: '#00ffff',
                frightened: '#ff0000',
                text: '#00ff00',
                switcheroo: true
            }
        };
        
        this.themeNames = Object.keys(this.themes);
        
        // Initialize maze
        this.initMaze();
        
        // Initialize entities
        this.initEntities();
        
        // Initialize controls
        this.initControls();
        
        // Initialize theme buttons
        this.initThemeButtons();
        
        // Pre-render static elements
        this.wallCanvas = null;
        this.renderWalls();
        
        // Start game loop
        this.startGameLoop();
    }
    
    initMaze() {
        // Classic Pac-Man maze layout
        this.maze = [
            "############################",
            "#............##............#",
            "#.####.#####.##.#####.####.#",
            "#o####.#####.##.#####.####o#",
            "#.####.#####.##.#####.####.#",
            "#..........................#",
            "#.####.##.########.##.####.#",
            "#.####.##.########.##.####.#",
            "#......##....##....##......#",
            "######.##### ## #####.######",
            "######.##### ## #####.######",
            "######.##          ##.######",
            "######.## ###--### ##.######",
            "######.## #      # ##.######",
            "      .   #      #   .      ",
            "######.## #      # ##.######",
            "######.## ######## ##.######",
            "######.##          ##.######",
            "######.## ######## ##.######",
            "######.## ######## ##.######",
            "#............##............#",
            "#.####.#####.##.#####.####.#",
            "#.####.#####.##.#####.####.#",
            "#o..##.......  .......##..o#",
            "###.##.##.########.##.##.###",
            "###.##.##.########.##.##.###",
            "#......##....##....##......#",
            "#.##########.##.##########.#",
            "#.##########.##.##########.#",
            "#..........................#",
            "############################"
        ];
        
        // Convert to 2D array and count dots
        this.mazeArray = [];
        this.dotsRemaining = 0;
        
        for (let y = 0; y < this.maze.length; y++) {
            this.mazeArray[y] = [];
            for (let x = 0; x < this.maze[y].length; x++) {
                const char = this.maze[y][x];
                this.mazeArray[y][x] = char;
                if (char === '.' || char === 'o') {
                    this.dotsRemaining++;
                }
            }
        }
        
        this.totalDots = this.dotsRemaining;
    }
    
    initEntities() {
        // Pacman starting position
        this.pacman = {
            x: 14,
            y: 23,
            targetX: 14,
            targetY: 23,
            direction: null,
            nextDirection: null,
            speed: this.MOVE_SPEED,
            animationPhase: 0
        };
        
        // Ghosts with different behaviors
        this.ghosts = [
            { 
                x: 14, y: 11,
                targetX: 14, targetY: 11,
                direction: 'left',
                color: 0,
                mode: 'scatter',
                scatterX: 25, scatterY: 0,
                speed: this.GHOST_SPEED
            },
            { 
                x: 12, y: 14,
                targetX: 12, targetY: 14,
                direction: 'up',
                color: 1,
                mode: 'house',
                scatterX: 2, scatterY: 0,
                speed: this.GHOST_SPEED
            },
            { 
                x: 14, y: 14,
                targetX: 14, targetY: 14,
                direction: 'up',
                color: 2,
                mode: 'house',
                scatterX: 25, scatterY: 30,
                speed: this.GHOST_SPEED
            },
            { 
                x: 16, y: 14,
                targetX: 16, targetY: 14,
                direction: 'up',
                color: 3,
                mode: 'house',
                scatterX: 2, scatterY: 30,
                speed: this.GHOST_SPEED
            }
        ];
    }
    
    initControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.victory) return;
            
            switch(e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    e.preventDefault();
                    this.pacman.nextDirection = 'up';
                    break;
                case 'arrowdown':
                case 's':
                    e.preventDefault();
                    this.pacman.nextDirection = 'down';
                    break;
                case 'arrowleft':
                case 'a':
                    e.preventDefault();
                    this.pacman.nextDirection = 'left';
                    break;
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    this.pacman.nextDirection = 'right';
                    break;
                case ' ':
                    e.preventDefault();
                    this.paused = !this.paused;
                    break;
                case 't':
                    e.preventDefault();
                    this.switchTheme();
                    break;
            }
        });
    }
    
    initThemeButtons() {
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
            });
        });
    }
    
    switchTheme() {
        this.themeIndex = (this.themeIndex + 1) % this.themeNames.length;
        this.currentTheme = this.themeNames[this.themeIndex];
        this.setTheme(this.currentTheme);
    }
    
    setTheme(themeName) {
        this.currentTheme = themeName;
        this.themeIndex = this.themeNames.indexOf(themeName);
        
        // Update button states
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeName);
        });
        
        // Re-render walls with new theme
        this.renderWalls();
    }
    
    getTile(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        
        if (y < 0 || y >= this.MAZE_HEIGHT || x < 0 || x >= this.MAZE_WIDTH) {
            return '#';
        }
        
        return this.mazeArray[y][x];
    }
    
    isWall(x, y) {
        const tile = this.getTile(x, y);
        return tile === '#' || tile === '-';
    }
    
    canMoveTo(x, y) {
        // Check entity bounds (smaller hitbox for better gameplay)
        const margin = 0.4;
        
        // Check all four corners
        if (this.isWall(x - margin, y - margin)) return false;
        if (this.isWall(x + margin, y - margin)) return false;
        if (this.isWall(x - margin, y + margin)) return false;
        if (this.isWall(x + margin, y + margin)) return false;
        
        return true;
    }
    
    getValidDirections(x, y, currentDir) {
        const dirs = ['up', 'down', 'left', 'right'];
        const opposite = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        return dirs.filter(dir => {
            if (dir === opposite[currentDir]) return false;
            
            let testX = x, testY = y;
            switch(dir) {
                case 'up': testY -= 1; break;
                case 'down': testY += 1; break;
                case 'left': testX -= 1; break;
                case 'right': testX += 1; break;
            }
            
            return this.canMoveTo(testX, testY);
        });
    }
    
    update(deltaTime) {
        if (this.paused || this.gameOver || this.victory) return;
        
        // Update animation
        this.animationTime += deltaTime;
        
        // Update power mode
        if (this.powerMode) {
            this.powerTimer -= deltaTime;
            if (this.powerTimer <= 0) {
                this.powerMode = false;
                this.ghosts.forEach(ghost => {
                    if (ghost.mode === 'frightened') {
                        ghost.mode = 'chase';
                        ghost.speed = this.GHOST_SPEED;
                    }
                });
            }
        }
        
        // Update Pacman
        this.updatePacman(deltaTime);
        
        // Update ghosts
        this.updateGhosts(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Check win condition
        if (this.dotsRemaining === 0) {
            this.victory = true;
            document.getElementById('victory').style.display = 'block';
        }
    }
    
    updatePacman(deltaTime) {
        const speed = this.pacman.speed * deltaTime / 1000;
        
        // Check if we're at the center of a tile
        const atCenter = Math.abs(this.pacman.x - Math.round(this.pacman.x)) < 0.1 &&
                        Math.abs(this.pacman.y - Math.round(this.pacman.y)) < 0.1;
        
        // Try to change direction at tile center
        if (atCenter && this.pacman.nextDirection) {
            let testX = this.pacman.x, testY = this.pacman.y;
            
            switch(this.pacman.nextDirection) {
                case 'up': testY -= 1; break;
                case 'down': testY += 1; break;
                case 'left': testX -= 1; break;
                case 'right': testX += 1; break;
            }
            
            if (this.canMoveTo(testX, testY)) {
                this.pacman.direction = this.pacman.nextDirection;
                this.pacman.nextDirection = null;
            }
        }
        
        // Move in current direction
        if (this.pacman.direction) {
            let newX = this.pacman.x, newY = this.pacman.y;
            
            switch(this.pacman.direction) {
                case 'up': newY -= speed; break;
                case 'down': newY += speed; break;
                case 'left': newX -= speed; break;
                case 'right': newX += speed; break;
            }
            
            // Handle tunnel
            if (newX < -0.5) newX = this.MAZE_WIDTH - 0.5;
            if (newX > this.MAZE_WIDTH - 0.5) newX = -0.5;
            
            // Check collision
            if (this.canMoveTo(newX, newY)) {
                this.pacman.x = newX;
                this.pacman.y = newY;
                this.pacman.animationPhase += deltaTime * 0.01;
            } else {
                // Snap to grid if hitting wall
                this.pacman.x = Math.round(this.pacman.x * 2) / 2;
                this.pacman.y = Math.round(this.pacman.y * 2) / 2;
            }
        }
        
        // Eat dots
        const tileX = Math.round(this.pacman.x);
        const tileY = Math.round(this.pacman.y);
        
        if (Math.abs(this.pacman.x - tileX) < 0.3 && Math.abs(this.pacman.y - tileY) < 0.3) {
            const tile = this.getTile(tileX, tileY);
            
            if (tile === '.') {
                this.mazeArray[tileY][tileX] = ' ';
                this.score += 10;
                this.dotsRemaining--;
                this.updateUI();
            } else if (tile === 'o') {
                this.mazeArray[tileY][tileX] = ' ';
                this.score += 50;
                this.dotsRemaining--;
                this.powerMode = true;
                this.powerTimer = this.POWER_DURATION;
                
                // Frighten all active ghosts
                this.ghosts.forEach(ghost => {
                    if (ghost.mode !== 'house') {
                        ghost.mode = 'frightened';
                        ghost.speed = this.FRIGHTENED_SPEED;
                        // Reverse direction
                        ghost.direction = this.reverseDirection(ghost.direction);
                    }
                });
                
                this.updateUI();
            }
        }
    }
    
    updateGhosts(deltaTime) {
        this.ghosts.forEach((ghost, index) => {
            const speed = ghost.speed * deltaTime / 1000;
            
            // Release ghosts from house based on dots eaten
            if (ghost.mode === 'house') {
                const dotsEaten = this.totalDots - this.dotsRemaining;
                const releaseThreshold = index * 30; // Release every 30 dots
                
                if (dotsEaten >= releaseThreshold) {
                    ghost.mode = 'scatter';
                    ghost.y = 11;
                }
                return;
            }
            
            // Check if at tile center
            const atCenter = Math.abs(ghost.x - Math.round(ghost.x)) < 0.1 &&
                           Math.abs(ghost.y - Math.round(ghost.y)) < 0.1;
            
            // Choose new direction at intersections
            if (atCenter) {
                const validDirs = this.getValidDirections(ghost.x, ghost.y, ghost.direction);
                
                if (validDirs.length > 0) {
                    if (ghost.mode === 'frightened') {
                        // Random movement when frightened
                        ghost.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
                    } else {
                        // Target-based movement
                        let targetX, targetY;
                        
                        if (ghost.mode === 'scatter') {
                            targetX = ghost.scatterX;
                            targetY = ghost.scatterY;
                        } else { // chase mode
                            targetX = this.pacman.x;
                            targetY = this.pacman.y;
                        }
                        
                        // Choose direction that minimizes distance to target
                        let bestDir = ghost.direction;
                        let minDist = Infinity;
                        
                        validDirs.forEach(dir => {
                            let testX = ghost.x, testY = ghost.y;
                            switch(dir) {
                                case 'up': testY -= 1; break;
                                case 'down': testY += 1; break;
                                case 'left': testX -= 1; break;
                                case 'right': testX += 1; break;
                            }
                            
                            const dist = Math.abs(testX - targetX) + Math.abs(testY - targetY);
                            if (dist < minDist) {
                                minDist = dist;
                                bestDir = dir;
                            }
                        });
                        
                        ghost.direction = bestDir;
                    }
                }
            }
            
            // Move ghost
            let newX = ghost.x, newY = ghost.y;
            
            switch(ghost.direction) {
                case 'up': newY -= speed; break;
                case 'down': newY += speed; break;
                case 'left': newX -= speed; break;
                case 'right': newX += speed; break;
            }
            
            // Handle tunnel
            if (newX < -0.5) newX = this.MAZE_WIDTH - 0.5;
            if (newX > this.MAZE_WIDTH - 0.5) newX = -0.5;
            
            // Move if valid
            if (this.canMoveTo(newX, newY)) {
                ghost.x = newX;
                ghost.y = newY;
            }
            
            // Mode switching
            if (ghost.mode === 'scatter' && this.animationTime % 20000 > 15000) {
                ghost.mode = 'chase';
            } else if (ghost.mode === 'chase' && this.animationTime % 20000 < 15000) {
                ghost.mode = 'scatter';
            }
        });
    }
    
    reverseDirection(dir) {
        switch(dir) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return dir;
        }
    }
    
    checkCollisions() {
        this.ghosts.forEach(ghost => {
            const dist = Math.abs(ghost.x - this.pacman.x) + Math.abs(ghost.y - this.pacman.y);
            
            if (dist < 0.8) {
                if (ghost.mode === 'frightened') {
                    // Eat ghost
                    this.score += 200;
                    ghost.mode = 'house';
                    ghost.x = 14;
                    ghost.y = 14;
                    ghost.speed = this.GHOST_SPEED;
                    this.updateUI();
                } else if (ghost.mode !== 'house') {
                    // Lose life
                    this.lives--;
                    this.updateUI();
                    
                    if (this.lives <= 0) {
                        this.gameOver = true;
                        document.getElementById('gameOver').style.display = 'block';
                    } else {
                        // Reset positions
                        this.resetPositions();
                    }
                }
            }
        });
    }
    
    resetPositions() {
        this.pacman.x = 14;
        this.pacman.y = 23;
        this.pacman.direction = null;
        this.pacman.nextDirection = null;
        
        this.ghosts.forEach((ghost, i) => {
            ghost.x = 14 - 2 + (i % 3) * 2;
            ghost.y = 11 + Math.floor(i / 2) * 3;
            ghost.mode = i === 0 ? 'scatter' : 'house';
            ghost.direction = 'left';
            ghost.speed = this.GHOST_SPEED;
        });
    }
    
    renderWalls() {
        // Pre-render walls to off-screen canvas
        this.wallCanvas = document.createElement('canvas');
        this.wallCanvas.width = this.canvas.width;
        this.wallCanvas.height = this.canvas.height;
        const wallCtx = this.wallCanvas.getContext('2d');
        
        const theme = this.themes[this.currentTheme];
        wallCtx.strokeStyle = theme.walls;
        wallCtx.lineWidth = 2;
        
        // Draw maze walls
        for (let y = 0; y < this.MAZE_HEIGHT; y++) {
            for (let x = 0; x < this.MAZE_WIDTH; x++) {
                if (this.isWall(x, y)) {
                    const px = x * this.TILE_SIZE;
                    const py = y * this.TILE_SIZE;
                    const size = this.TILE_SIZE;
                    
                    wallCtx.fillStyle = theme.wallStroke;
                    wallCtx.fillRect(px + 2, py + 2, size - 4, size - 4);
                    
                    wallCtx.fillStyle = theme.walls;
                    wallCtx.fillRect(px + 3, py + 3, size - 6, size - 6);
                }
            }
        }
    }
    
    render() {
        const theme = this.themes[this.currentTheme];
        
        // Clear canvas
        this.ctx.fillStyle = theme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pre-rendered walls
        if (this.wallCanvas) {
            this.ctx.drawImage(this.wallCanvas, 0, 0);
        }
        
        // Draw dots
        this.renderDots(theme);
        
        // Draw ghosts
        this.renderGhosts(theme);
        
        // Draw Pacman
        this.renderPacman(theme);
        
        // Draw power mode effect
        if (this.powerMode) {
            const alpha = 0.1 + Math.sin(this.animationTime * 0.01) * 0.05;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    renderDots(theme) {
        for (let y = 0; y < this.MAZE_HEIGHT; y++) {
            for (let x = 0; x < this.MAZE_WIDTH; x++) {
                const tile = this.mazeArray[y][x];
                const cx = x * this.TILE_SIZE + this.TILE_SIZE / 2;
                const cy = y * this.TILE_SIZE + this.TILE_SIZE / 2;
                
                if (tile === '.') {
                    this.ctx.fillStyle = theme.dots;
                    this.ctx.fillRect(cx - 2, cy - 2, 4, 4);
                } else if (tile === 'o') {
                    const size = 6 + Math.sin(this.animationTime * 0.005) * 2;
                    this.ctx.fillStyle = theme.powerPellet;
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
    
    renderPacman(theme) {
        const x = this.pacman.x * this.TILE_SIZE + this.TILE_SIZE / 2;
        const y = this.pacman.y * this.TILE_SIZE + this.TILE_SIZE / 2;
        const size = this.TILE_SIZE * 0.45;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Rotate based on direction
        let rotation = 0;
        switch(this.pacman.direction) {
            case 'right': rotation = 0; break;
            case 'down': rotation = Math.PI / 2; break;
            case 'left': rotation = Math.PI; break;
            case 'up': rotation = -Math.PI / 2; break;
        }
        this.ctx.rotate(rotation);
        
        if (theme.switcheroo) {
            // Draw as ghost
            this.ctx.fillStyle = theme.pacman;
            this.ctx.beginPath();
            this.ctx.arc(0, -size * 0.2, size, Math.PI, 0);
            this.ctx.lineTo(size, size);
            for (let i = 3; i >= 0; i--) {
                const wave = size - (i * size * 2 / 4);
                const waveY = size - Math.sin(this.animationTime * 0.01 + i) * 2;
                this.ctx.lineTo(wave, waveY);
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(-size * 0.5, -size * 0.2, size * 0.3, size * 0.3);
            this.ctx.fillRect(size * 0.2, -size * 0.2, size * 0.3, size * 0.3);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(-size * 0.35, -size * 0.1, size * 0.15, size * 0.15);
            this.ctx.fillRect(size * 0.35, -size * 0.1, size * 0.15, size * 0.15);
        } else {
            // Draw as Pacman
            const mouthAngle = Math.abs(Math.sin(this.pacman.animationPhase * 4)) * 0.3;
            
            this.ctx.fillStyle = theme.pacman;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size, mouthAngle, Math.PI * 2 - mouthAngle);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    renderGhosts(theme) {
        this.ghosts.forEach(ghost => {
            const x = ghost.x * this.TILE_SIZE + this.TILE_SIZE / 2;
            const y = ghost.y * this.TILE_SIZE + this.TILE_SIZE / 2;
            const size = this.TILE_SIZE * 0.45;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            
            let color = theme.ghosts[ghost.color];
            if (ghost.mode === 'frightened') {
                color = theme.frightened;
                if (this.powerTimer < 2000 && Math.floor(this.powerTimer / 250) % 2) {
                    color = '#ffffff';
                }
            }
            
            if (theme.switcheroo) {
                // Draw as Pacman
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size, 0.2, Math.PI * 2 - 0.2);
                this.ctx.lineTo(0, 0);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                // Draw as ghost
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(0, -size * 0.2, size, Math.PI, 0);
                this.ctx.lineTo(size, size);
                
                // Wavy bottom
                for (let i = 3; i >= 0; i--) {
                    const wave = size - (i * size * 2 / 4);
                    const waveY = size - Math.sin(this.animationTime * 0.01 + i + ghost.color) * 2;
                    this.ctx.lineTo(wave, waveY);
                }
                
                this.ctx.closePath();
                this.ctx.fill();
                
                // Eyes
                if (ghost.mode !== 'frightened') {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(-size * 0.5, -size * 0.2, size * 0.3, size * 0.3);
                    this.ctx.fillRect(size * 0.2, -size * 0.2, size * 0.3, size * 0.3);
                    
                    // Pupils (look at Pacman)
                    const dx = this.pacman.x - ghost.x;
                    const dy = this.pacman.y - ghost.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const lookX = dist > 0 ? dx / dist * size * 0.1 : 0;
                    const lookY = dist > 0 ? dy / dist * size * 0.1 : 0;
                    
                    this.ctx.fillStyle = '#000';
                    this.ctx.fillRect(-size * 0.35 + lookX, -size * 0.1 + lookY, size * 0.15, size * 0.15);
                    this.ctx.fillRect(size * 0.35 + lookX, -size * 0.1 + lookY, size * 0.15, size * 0.15);
                } else {
                    // Frightened eyes
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(-size * 0.3, -size * 0.1, size * 0.1, size * 0.1);
                    this.ctx.fillRect(size * 0.2, -size * 0.1, size * 0.1, size * 0.1);
                }
            }
            
            this.ctx.restore();
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
    }
    
    restart() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameOver = false;
        this.victory = false;
        this.powerMode = false;
        this.powerTimer = 0;
        
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('victory').style.display = 'none';
        
        this.initMaze();
        this.initEntities();
        this.updateUI();
    }
    
    nextLevel() {
        this.level++;
        this.victory = false;
        this.powerMode = false;
        this.powerTimer = 0;
        
        document.getElementById('victory').style.display = 'none';
        
        // Increase difficulty
        this.MOVE_SPEED = Math.min(this.MOVE_SPEED * 1.1, 12);
        this.GHOST_SPEED = Math.min(this.GHOST_SPEED * 1.1, 10);
        
        this.initMaze();
        this.initEntities();
        this.updateUI();
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            // Fixed timestep with interpolation
            this.accumulator += deltaTime;
            
            while (this.accumulator >= this.FRAME_TIME) {
                this.update(this.FRAME_TIME);
                this.accumulator -= this.FRAME_TIME;
            }
            
            this.render();
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
}

// Start the game
const game = new PacManGame();