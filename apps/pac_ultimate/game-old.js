// Ultimate Pac-Man Game with Custom Themes
class PacManGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game constants
        this.TILE_SIZE = 24;
        this.MAZE_WIDTH = 28;
        this.MAZE_HEIGHT = 31;
        this.MOVE_SPEED = 0.15;
        this.GHOST_SPEED = 0.12;
        
        // Set canvas size
        this.canvas.width = this.MAZE_WIDTH * this.TILE_SIZE;
        this.canvas.height = this.MAZE_HEIGHT * this.TILE_SIZE;
        
        // Game state
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.paused = false;
        this.gameOver = false;
        this.victory = false;
        this.dots = 0;
        this.powerMode = false;
        this.powerTimer = 0;
        this.POWER_DURATION = 8000; // 8 seconds
        
        // Current theme
        this.currentTheme = 'neon';
        
        // Animation
        this.animationFrame = 0;
        this.lastTime = 0;
        
        // Define themes
        this.themes = {
            neon: {
                background: '#0a0a0a',
                walls: '#00ffff',
                wallGlow: 'rgba(0, 255, 255, 0.5)',
                pacman: '#ffff00',
                pacmanGlow: 'rgba(255, 255, 0, 0.8)',
                ghosts: ['#ff0084', '#00ff00', '#ff00ff', '#ffa500'],
                ghostGlow: 0.8,
                dots: '#ffffff',
                powerPellet: '#ffff00',
                frightened: '#0066ff',
                text: '#00ffff'
            },
            retro: {
                background: '#000000',
                walls: '#0000ff',
                wallGlow: 'rgba(0, 0, 255, 0.3)',
                pacman: '#ffff00',
                pacmanGlow: 'rgba(255, 255, 0, 0.5)',
                ghosts: ['#ff0000', '#00ffff', '#ffb8ff', '#ffb852'],
                ghostGlow: 0.3,
                dots: '#ffb897',
                powerPellet: '#ffffff',
                frightened: '#ffffff',
                text: '#ffffff'
            },
            ocean: {
                background: '#001f3f',
                walls: '#0074d9',
                wallGlow: 'rgba(0, 116, 217, 0.4)',
                pacman: '#ff851b',
                pacmanGlow: 'rgba(255, 133, 27, 0.6)',
                ghosts: ['#ff4136', '#01ff70', '#b10dc9', '#ffdc00'],
                ghostGlow: 0.5,
                dots: '#7fdbff',
                powerPellet: '#39cccc',
                frightened: '#111111',
                text: '#7fdbff'
            },
            candy: {
                background: '#ffe0f0',
                walls: '#ff69b4',
                wallGlow: 'rgba(255, 105, 180, 0.4)',
                pacman: '#ff1493',
                pacmanGlow: 'rgba(255, 20, 147, 0.6)',
                ghosts: ['#ff69b4', '#dda0dd', '#ff6347', '#ffa07a'],
                ghostGlow: 0.5,
                dots: '#ffc0cb',
                powerPellet: '#ff1493',
                frightened: '#4b0082',
                text: '#ff1493'
            },
            space: {
                background: '#000814',
                walls: '#001d3d',
                wallGlow: 'rgba(0, 29, 61, 0.8)',
                pacman: '#ffd60a',
                pacmanGlow: 'rgba(255, 214, 10, 0.7)',
                ghosts: ['#003566', '#000814', '#ffc300', '#001d3d'],
                ghostGlow: 0.6,
                dots: '#ffd60a',
                powerPellet: '#003566',
                frightened: '#ffc300',
                text: '#ffd60a'
            },
            switcheroo: {
                background: '#1a0033',
                walls: '#6a0dad',
                wallGlow: 'rgba(106, 13, 173, 0.5)',
                pacman: '#00ff00', // Pacman looks like a ghost
                pacmanGlow: 'rgba(0, 255, 0, 0.6)',
                ghosts: ['#ffff00', '#ffff00', '#ffff00', '#ffff00'], // Ghosts look like Pacman
                ghostGlow: 0.6,
                dots: '#ff00ff',
                powerPellet: '#00ffff',
                frightened: '#ff0000',
                text: '#00ff00',
                switcheroo: true // Special flag for this theme
            }
        };
        
        // Initialize maze
        this.initMaze();
        
        // Initialize entities
        this.pacman = {
            x: 14,
            y: 23,
            direction: 'right',
            nextDirection: null,
            mouthOpen: true,
            moveProgress: 0
        };
        
        this.ghosts = [
            { x: 14, y: 11, color: 0, mode: 'scatter', direction: 'left', moveProgress: 0, homeX: 1, homeY: 1 },
            { x: 12, y: 14, color: 1, mode: 'house', direction: 'up', moveProgress: 0, homeX: 26, homeY: 1 },
            { x: 14, y: 14, color: 2, mode: 'house', direction: 'up', moveProgress: 0, homeX: 1, homeY: 29 },
            { x: 16, y: 14, color: 3, mode: 'house', direction: 'up', moveProgress: 0, homeX: 26, homeY: 29 }
        ];
        
        // Initialize controls
        this.initControls();
        
        // Initialize theme buttons
        this.initThemeButtons();
        
        // Start game loop
        this.gameLoop();
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
        
        // Count dots
        this.dots = 0;
        for (let row of this.maze) {
            for (let char of row) {
                if (char === '.' || char === 'o') {
                    this.dots++;
                }
            }
        }
    }
    
    initControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.victory) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.pacman.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.pacman.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.pacman.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.pacman.nextDirection = 'right';
                    break;
                case ' ':
                    this.paused = !this.paused;
                    break;
            }
        });
    }
    
    initThemeButtons() {
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTheme = btn.dataset.theme;
            });
        });
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
        
        // Handle tunnel
        if (newX < 0) return true;
        if (newX >= this.MAZE_WIDTH) return true;
        
        if (newY < 0 || newY >= this.MAZE_HEIGHT) return false;
        
        const cell = this.maze[Math.floor(newY)][Math.floor(newX)];
        return cell !== '#';
    }
    
    update(deltaTime) {
        if (this.paused || this.gameOver || this.victory) return;
        
        // Update animation
        this.animationFrame += deltaTime * 0.01;
        
        // Update power mode
        if (this.powerMode) {
            this.powerTimer -= deltaTime;
            if (this.powerTimer <= 0) {
                this.powerMode = false;
                this.ghosts.forEach(ghost => {
                    if (ghost.mode === 'frightened') {
                        ghost.mode = 'chase';
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
        if (this.dots === 0) {
            this.victory = true;
            document.getElementById('victory').style.display = 'block';
        }
    }
    
    updatePacman(deltaTime) {
        // Try to change direction
        if (this.pacman.nextDirection && this.canMove(this.pacman.x, this.pacman.y, this.pacman.nextDirection)) {
            this.pacman.direction = this.pacman.nextDirection;
            this.pacman.nextDirection = null;
        }
        
        // Move Pacman
        if (this.canMove(this.pacman.x, this.pacman.y, this.pacman.direction)) {
            const speed = this.MOVE_SPEED;
            
            switch(this.pacman.direction) {
                case 'up': this.pacman.y -= speed; break;
                case 'down': this.pacman.y += speed; break;
                case 'left': this.pacman.x -= speed; break;
                case 'right': this.pacman.x += speed; break;
            }
            
            // Handle tunnel
            if (this.pacman.x < 0) this.pacman.x = this.MAZE_WIDTH - 1;
            if (this.pacman.x >= this.MAZE_WIDTH) this.pacman.x = 0;
            
            // Animate mouth
            this.pacman.moveProgress += deltaTime * 0.01;
            this.pacman.mouthOpen = Math.sin(this.pacman.moveProgress * 10) > 0;
        }
        
        // Eat dots
        const tileX = Math.floor(this.pacman.x);
        const tileY = Math.floor(this.pacman.y);
        
        if (tileX >= 0 && tileX < this.MAZE_WIDTH && tileY >= 0 && tileY < this.MAZE_HEIGHT) {
            const cell = this.maze[tileY][tileX];
            if (cell === '.') {
                this.maze[tileY] = this.maze[tileY].substring(0, tileX) + ' ' + this.maze[tileY].substring(tileX + 1);
                this.score += 10;
                this.dots--;
                this.updateUI();
            } else if (cell === 'o') {
                this.maze[tileY] = this.maze[tileY].substring(0, tileX) + ' ' + this.maze[tileY].substring(tileX + 1);
                this.score += 50;
                this.dots--;
                this.powerMode = true;
                this.powerTimer = this.POWER_DURATION;
                
                // Frighten all ghosts
                this.ghosts.forEach(ghost => {
                    if (ghost.mode !== 'house') {
                        ghost.mode = 'frightened';
                        // Reverse direction
                        switch(ghost.direction) {
                            case 'up': ghost.direction = 'down'; break;
                            case 'down': ghost.direction = 'up'; break;
                            case 'left': ghost.direction = 'right'; break;
                            case 'right': ghost.direction = 'left'; break;
                        }
                    }
                });
                
                this.updateUI();
            }
        }
    }
    
    updateGhosts(deltaTime) {
        this.ghosts.forEach((ghost, index) => {
            // Ghost house logic
            if (ghost.mode === 'house') {
                if (this.score > (index + 1) * 300) {
                    ghost.mode = 'scatter';
                    ghost.y = 11;
                }
                return;
            }
            
            // Move ghost
            const speed = ghost.mode === 'frightened' ? this.GHOST_SPEED * 0.5 : this.GHOST_SPEED;
            
            // At intersection, choose new direction
            if (Math.floor(ghost.x) === ghost.x && Math.floor(ghost.y) === ghost.y) {
                const possibleDirections = [];
                const opposite = this.getOppositeDirection(ghost.direction);
                
                ['up', 'down', 'left', 'right'].forEach(dir => {
                    if (dir !== opposite && this.canMove(ghost.x, ghost.y, dir)) {
                        possibleDirections.push(dir);
                    }
                });
                
                if (possibleDirections.length > 0) {
                    if (ghost.mode === 'frightened') {
                        // Random movement when frightened
                        ghost.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                    } else if (ghost.mode === 'chase') {
                        // Chase Pacman
                        let bestDir = ghost.direction;
                        let minDist = Infinity;
                        
                        possibleDirections.forEach(dir => {
                            const testX = ghost.x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
                            const testY = ghost.y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
                            const dist = Math.abs(testX - this.pacman.x) + Math.abs(testY - this.pacman.y);
                            
                            if (dist < minDist) {
                                minDist = dist;
                                bestDir = dir;
                            }
                        });
                        
                        ghost.direction = bestDir;
                    } else {
                        // Scatter mode - go to home corner
                        let bestDir = ghost.direction;
                        let minDist = Infinity;
                        
                        possibleDirections.forEach(dir => {
                            const testX = ghost.x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
                            const testY = ghost.y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
                            const dist = Math.abs(testX - ghost.homeX) + Math.abs(testY - ghost.homeY);
                            
                            if (dist < minDist) {
                                minDist = dist;
                                bestDir = dir;
                            }
                        });
                        
                        ghost.direction = bestDir;
                    }
                }
            }
            
            // Move in current direction
            switch(ghost.direction) {
                case 'up': ghost.y -= speed; break;
                case 'down': ghost.y += speed; break;
                case 'left': ghost.x -= speed; break;
                case 'right': ghost.x += speed; break;
            }
            
            // Handle tunnel
            if (ghost.x < 0) ghost.x = this.MAZE_WIDTH - 1;
            if (ghost.x >= this.MAZE_WIDTH) ghost.x = 0;
            
            // Update ghost mode
            if (ghost.mode === 'scatter' && Math.random() < 0.002) {
                ghost.mode = 'chase';
            } else if (ghost.mode === 'chase' && Math.random() < 0.001) {
                ghost.mode = 'scatter';
            }
        });
    }
    
    getOppositeDirection(direction) {
        switch(direction) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
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
                        this.pacman.x = 14;
                        this.pacman.y = 23;
                        this.pacman.direction = 'right';
                        
                        this.ghosts.forEach((g, i) => {
                            g.x = 14;
                            g.y = 11 + (i % 2) * 3;
                            g.mode = i === 0 ? 'scatter' : 'house';
                            g.direction = 'left';
                        });
                    }
                }
            }
        });
    }
    
    render() {
        const theme = this.themes[this.currentTheme];
        
        // Clear canvas
        this.ctx.fillStyle = theme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw maze
        this.drawMaze(theme);
        
        // Draw dots and power pellets
        this.drawDots(theme);
        
        // Draw ghosts
        this.drawGhosts(theme);
        
        // Draw Pacman
        this.drawPacman(theme);
        
        // Draw effects
        if (this.powerMode) {
            this.drawPowerEffect();
        }
    }
    
    drawMaze(theme) {
        this.ctx.strokeStyle = theme.walls;
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = theme.wallGlow;
        
        for (let y = 0; y < this.MAZE_HEIGHT; y++) {
            for (let x = 0; x < this.MAZE_WIDTH; x++) {
                if (this.maze[y][x] === '#') {
                    const cellX = x * this.TILE_SIZE;
                    const cellY = y * this.TILE_SIZE;
                    
                    this.ctx.beginPath();
                    
                    // Check adjacent cells and draw walls accordingly
                    if (x === 0 || this.maze[y][x-1] !== '#') {
                        this.ctx.moveTo(cellX, cellY);
                        this.ctx.lineTo(cellX, cellY + this.TILE_SIZE);
                    }
                    if (x === this.MAZE_WIDTH - 1 || this.maze[y][x+1] !== '#') {
                        this.ctx.moveTo(cellX + this.TILE_SIZE, cellY);
                        this.ctx.lineTo(cellX + this.TILE_SIZE, cellY + this.TILE_SIZE);
                    }
                    if (y === 0 || this.maze[y-1][x] !== '#') {
                        this.ctx.moveTo(cellX, cellY);
                        this.ctx.lineTo(cellX + this.TILE_SIZE, cellY);
                    }
                    if (y === this.MAZE_HEIGHT - 1 || this.maze[y+1][x] !== '#') {
                        this.ctx.moveTo(cellX, cellY + this.TILE_SIZE);
                        this.ctx.lineTo(cellX + this.TILE_SIZE, cellY + this.TILE_SIZE);
                    }
                    
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawDots(theme) {
        for (let y = 0; y < this.MAZE_HEIGHT; y++) {
            for (let x = 0; x < this.MAZE_WIDTH; x++) {
                const cell = this.maze[y][x];
                const centerX = x * this.TILE_SIZE + this.TILE_SIZE / 2;
                const centerY = y * this.TILE_SIZE + this.TILE_SIZE / 2;
                
                if (cell === '.') {
                    this.ctx.fillStyle = theme.dots;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (cell === 'o') {
                    this.ctx.fillStyle = theme.powerPellet;
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = theme.powerPellet;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, 8 + Math.sin(this.animationFrame * 5) * 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
            }
        }
    }
    
    drawPacman(theme) {
        const x = this.pacman.x * this.TILE_SIZE + this.TILE_SIZE / 2;
        const y = this.pacman.y * this.TILE_SIZE + this.TILE_SIZE / 2;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Rotate based on direction
        switch(this.pacman.direction) {
            case 'right': this.ctx.rotate(0); break;
            case 'down': this.ctx.rotate(Math.PI / 2); break;
            case 'left': this.ctx.rotate(Math.PI); break;
            case 'up': this.ctx.rotate(-Math.PI / 2); break;
        }
        
        if (theme.switcheroo) {
            // Draw Pacman as a ghost
            this.drawGhostShape(0, 0, this.TILE_SIZE * 0.4, theme.pacman, theme.pacmanGlow);
        } else {
            // Draw normal Pacman
            this.ctx.fillStyle = theme.pacman;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = theme.pacmanGlow;
            
            this.ctx.beginPath();
            if (this.pacman.mouthOpen) {
                this.ctx.arc(0, 0, this.TILE_SIZE * 0.4, 0.2 * Math.PI, 1.8 * Math.PI);
            } else {
                this.ctx.arc(0, 0, this.TILE_SIZE * 0.4, 0, 2 * Math.PI);
            }
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.restore();
    }
    
    drawGhosts(theme) {
        this.ghosts.forEach((ghost, index) => {
            const x = ghost.x * this.TILE_SIZE + this.TILE_SIZE / 2;
            const y = ghost.y * this.TILE_SIZE + this.TILE_SIZE / 2;
            
            let color;
            if (ghost.mode === 'frightened') {
                color = theme.frightened;
                // Flash when power mode is ending
                if (this.powerTimer < 2000 && Math.floor(this.powerTimer / 200) % 2 === 0) {
                    color = theme.ghosts[ghost.color];
                }
            } else {
                color = theme.ghosts[ghost.color];
            }
            
            if (theme.switcheroo) {
                // Draw ghosts as Pacman
                this.drawPacmanShape(x, y, this.TILE_SIZE * 0.4, color);
            } else {
                // Draw normal ghosts
                this.drawGhostShape(x, y, this.TILE_SIZE * 0.4, color, `rgba(${this.hexToRgb(color).join(',')}, ${theme.ghostGlow})`);
            }
        });
    }
    
    drawGhostShape(x, y, size, color, glow) {
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = glow;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y - size * 0.3, size, Math.PI, 0);
        this.ctx.lineTo(x + size, y + size * 0.7);
        
        // Wavy bottom
        for (let i = 0; i < 4; i++) {
            const waveX = x + size - (i + 1) * (size * 2 / 4);
            const waveY = y + size * 0.7 + Math.sin(this.animationFrame * 5 + i) * size * 0.1;
            this.ctx.lineTo(waveX, waveY);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - size * 0.3, y - size * 0.1, size * 0.2, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - size * 0.3, y - size * 0.1, size * 0.1, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }
    
    drawPacmanShape(x, y, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0.2 * Math.PI, 1.8 * Math.PI);
        this.ctx.lineTo(x, y);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }
    
    drawPowerEffect() {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * Math.sin(this.animationFrame * 10)})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [255, 255, 255];
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
        
        this.pacman = {
            x: 14,
            y: 23,
            direction: 'right',
            nextDirection: null,
            mouthOpen: true,
            moveProgress: 0
        };
        
        this.ghosts = [
            { x: 14, y: 11, color: 0, mode: 'scatter', direction: 'left', moveProgress: 0, homeX: 1, homeY: 1 },
            { x: 12, y: 14, color: 1, mode: 'house', direction: 'up', moveProgress: 0, homeX: 26, homeY: 1 },
            { x: 14, y: 14, color: 2, mode: 'house', direction: 'up', moveProgress: 0, homeX: 1, homeY: 29 },
            { x: 16, y: 14, color: 3, mode: 'house', direction: 'up', moveProgress: 0, homeX: 26, homeY: 29 }
        ];
        
        this.updateUI();
    }
    
    nextLevel() {
        this.level++;
        this.victory = false;
        this.powerMode = false;
        this.powerTimer = 0;
        
        document.getElementById('victory').style.display = 'none';
        
        // Increase difficulty
        this.MOVE_SPEED = Math.min(this.MOVE_SPEED * 1.1, 0.25);
        this.GHOST_SPEED = Math.min(this.GHOST_SPEED * 1.1, 0.2);
        
        this.initMaze();
        
        this.pacman = {
            x: 14,
            y: 23,
            direction: 'right',
            nextDirection: null,
            mouthOpen: true,
            moveProgress: 0
        };
        
        this.ghosts = [
            { x: 14, y: 11, color: 0, mode: 'scatter', direction: 'left', moveProgress: 0, homeX: 1, homeY: 1 },
            { x: 12, y: 14, color: 1, mode: 'house', direction: 'up', moveProgress: 0, homeX: 26, homeY: 1 },
            { x: 14, y: 14, color: 2, mode: 'house', direction: 'up', moveProgress: 0, homeX: 1, homeY: 29 },
            { x: 16, y: 14, color: 3, mode: 'house', direction: 'up', moveProgress: 0, homeX: 26, homeY: 29 }
        ];
        
        this.updateUI();
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
const game = new PacManGame();