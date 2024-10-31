import { backend } from "declarations/backend";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const BALL_RADIUS = 20;
const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
const SHOOTER_HEIGHT = 60;
const GRID_ROWS = 8;
const GRID_COLS = 10;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        
        this.score = 0;
        this.grid = [];
        this.shooter = {
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT - SHOOTER_HEIGHT,
            angle: -Math.PI / 2,
            currentBall: this.getRandomColor()
        };
        
        this.activeBall = null;
        this.setupEventListeners();
        this.initGrid();
        this.loadHighScore();
        this.gameLoop();
    }

    async loadHighScore() {
        try {
            const highScore = await backend.getHighScore();
            document.getElementById('highScore').textContent = `High Score: ${highScore}`;
        } catch (error) {
            console.error('Error loading high score:', error);
        }
    }

    initGrid() {
        for (let row = 0; row < GRID_ROWS; row++) {
            this.grid[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                if (row < 4) {
                    this.grid[row][col] = {
                        color: this.getRandomColor(),
                        x: col * (BALL_RADIUS * 2) + BALL_RADIUS,
                        y: row * (BALL_RADIUS * 2) + BALL_RADIUS
                    };
                } else {
                    this.grid[row][col] = null;
                }
            }
        }
    }

    getRandomColor() {
        return COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            this.shooter.angle = Math.atan2(
                mouseY - this.shooter.y,
                mouseX - this.shooter.x
            );
        });

        this.canvas.addEventListener('click', () => {
            if (!this.activeBall) {
                this.shootBall();
            }
        });

        document.getElementById('newGame').addEventListener('click', () => {
            this.resetGame();
        });
    }

    shootBall() {
        const speed = 10;
        this.activeBall = {
            x: this.shooter.x,
            y: this.shooter.y,
            color: this.shooter.currentBall,
            dx: Math.cos(this.shooter.angle) * speed,
            dy: Math.sin(this.shooter.angle) * speed
        };
        this.shooter.currentBall = this.getRandomColor();
    }

    updateBall() {
        if (!this.activeBall) return;

        this.activeBall.x += this.activeBall.dx;
        this.activeBall.y += this.activeBall.dy;

        if (this.activeBall.x <= BALL_RADIUS || this.activeBall.x >= CANVAS_WIDTH - BALL_RADIUS) {
            this.activeBall.dx *= -1;
        }
        if (this.activeBall.y <= BALL_RADIUS) {
            this.activeBall.dy *= -1;
        }

        this.checkCollisions();
    }

    checkCollisions() {
        if (!this.activeBall) return;

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const ball = this.grid[row][col];
                if (ball) {
                    const dx = this.activeBall.x - ball.x;
                    const dy = this.activeBall.y - ball.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < BALL_RADIUS * 2) {
                        const newRow = Math.round((this.activeBall.y - BALL_RADIUS) / (BALL_RADIUS * 2));
                        const newCol = Math.round((this.activeBall.x - BALL_RADIUS) / (BALL_RADIUS * 2));

                        if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS && !this.grid[newRow][newCol]) {
                            this.grid[newRow][newCol] = {
                                color: this.activeBall.color,
                                x: newCol * (BALL_RADIUS * 2) + BALL_RADIUS,
                                y: newRow * (BALL_RADIUS * 2) + BALL_RADIUS
                            };
                            this.checkMatches(newRow, newCol);
                            this.activeBall = null;
                            return;
                        }
                    }
                }
            }
        }
    }

    checkMatches(row, col) {
        const color = this.grid[row][col].color;
        const matches = this.findMatches(row, col, color, new Set());
        
        if (matches.size >= 3) {
            matches.forEach(pos => {
                const [r, c] = pos.split(',').map(Number);
                this.grid[r][c] = null;
                this.score += 10;
            });
            document.getElementById('score').textContent = this.score;
            this.updateHighScore();
        }
    }

    async updateHighScore() {
        try {
            await backend.updateScore(this.score);
            this.loadHighScore();
        } catch (error) {
            console.error('Error updating high score:', error);
        }
    }

    findMatches(row, col, color, matches) {
        const key = `${row},${col}`;
        if (matches.has(key)) return matches;
        
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return matches;
        if (!this.grid[row][col] || this.grid[row][col].color !== color) return matches;

        matches.add(key);

        this.findMatches(row - 1, col, color, matches);
        this.findMatches(row + 1, col, color, matches);
        this.findMatches(row, col - 1, color, matches);
        this.findMatches(row, col + 1, color, matches);

        return matches;
    }

    draw() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw grid
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.grid[row][col]) {
                    this.drawBall(
                        this.grid[row][col].x,
                        this.grid[row][col].y,
                        this.grid[row][col].color
                    );
                }
            }
        }

        // Draw shooter
        this.ctx.save();
        this.ctx.translate(this.shooter.x, this.shooter.y);
        this.ctx.rotate(this.shooter.angle);
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(0, -5, 40, 10);
        this.ctx.restore();

        // Draw current ball in shooter
        this.drawBall(this.shooter.x, this.shooter.y, this.shooter.currentBall);

        // Draw active ball
        if (this.activeBall) {
            this.drawBall(this.activeBall.x, this.activeBall.y, this.activeBall.color);
        }
    }

    drawBall(x, y, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.closePath();
    }

    resetGame() {
        this.score = 0;
        document.getElementById('score').textContent = '0';
        this.initGrid();
        this.activeBall = null;
        this.shooter.currentBall = this.getRandomColor();
    }

    gameLoop() {
        this.updateBall();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
};
