const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');

confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
});

// Game objects
const paddleWidth = 10;
const paddleHeight = 80;
const ballRadius = 8;

const player = {
    x: 0,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    speed: 6
};

const computer = {
    x: canvas.width - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    speed: 4.5
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    dx: 5,
    dy: 5,
    radius: ballRadius,
    speed: 5
};

let playerScore = 0;
let computerScore = 0;
let gameRunning = false;
let gamePaused = false;
let winPoints = 5;
let gameWon = false;

// Confetti particles
let confetti = [];

class ConfettiPiece {
    constructor() {
        this.x = Math.random() * confettiCanvas.width;
        this.y = -10;
        this.width = Math.random() * 10 + 5;
        this.height = Math.random() * 10 + 5;
        this.velocity = Math.random() * 5 + 3;
        this.angle = Math.random() * 360;
        this.spin = Math.random() * 10 - 5;
        this.color = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)];
    }

    update() {
        this.y += this.velocity;
        this.angle += this.spin;
    }

    draw() {
        confettiCtx.save();
        confettiCtx.translate(this.x, this.y);
        confettiCtx.rotate((this.angle * Math.PI) / 180);
        confettiCtx.fillStyle = this.color;
        confettiCtx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        confettiCtx.restore();
    }
}

function createConfetti() {
    confetti = [];
    for (let i = 0; i < 100; i++) {
        confetti.push(new ConfettiPiece());
    }
}

function updateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    for (let i = confetti.length - 1; i >= 0; i--) {
        confetti[i].update();
        confetti[i].draw();
        
        if (confetti[i].y > confettiCanvas.height) {
            confetti.splice(i, 1);
        }
    }
}

// Difficulty settings
let difficulty = 'medium';
const difficultySettings = {
    easy: {
        speed: 3.5,
        accuracy: 0.6,
        missChance: 0.35
    },
    medium: {
        speed: 4.5,
        accuracy: 0.8,
        missChance: 0.10
    },
    hard: {
        speed: 5.5,
        accuracy: 0.95,
        missChance: 0.02
    },
    impossible: {
        speed: 6,
        accuracy: 1.0,
        missChance: 0.0
    }
};

const keys = {};

// Update win points
function updateWinPoints(value) {
    winPoints = Math.max(1, Math.min(100, parseInt(value) || 5));
    document.getElementById('winPoints').value = winPoints;
}

// Difficulty selector
function changeDifficulty(newDifficulty) {
    difficulty = newDifficulty;
    if (gameRunning) {
        resetGame();
    }
}

// Check for winner
function checkWinner() {
    if (playerScore >= winPoints) {
        showWinScreen('YOU WIN!', 'You defeated the computer!');
        gameWon = true;
        gameRunning = false;
        return true;
    } else if (computerScore >= winPoints) {
        showWinScreen('GAME OVER!', 'The computer defeated you!');
        gameWon = true;
        gameRunning = false;
        return true;
    }
    return false;
}

// Show win screen
function showWinScreen(title, message) {
    const winScreen = document.getElementById('winScreen');
    document.getElementById('winTitle').textContent = title;
    document.getElementById('winMessage').textContent = message;
    winScreen.classList.remove('hidden');
    createConfetti();
}

// Close win screen
function closeWinScreen() {
    document.getElementById('winScreen').classList.add('hidden');
    resetGame();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    player.y = Math.max(0, Math.min(mouseY - paddleHeight / 2, canvas.height - paddleHeight));
});

canvas.addEventListener('click', () => {
    if (!gameWon) {
        if (!gameRunning) {
            gameRunning = true;
            gamePaused = false;
            updateGameStatus();
        } else {
            gamePaused = !gamePaused;
            updateGameStatus();
        }
    }
});

// Update game status display
function updateGameStatus() {
    const statusElement = document.getElementById('gameStatus');
    if (!gameRunning) {
        statusElement.textContent = 'Click to Start';
    } else if (gamePaused) {
        statusElement.textContent = 'PAUSED';
    } else {
        statusElement.textContent = 'Playing...';
    }
}

// Handle player paddle movement with arrow keys
function handlePlayerMovement() {
    if (keys['ArrowUp']) {
        player.y = Math.max(0, player.y - player.speed);
    }
    if (keys['ArrowDown']) {
        player.y = Math.min(canvas.height - paddleHeight, player.y + player.speed);
    }
}

// Computer AI with difficulty-based mechanics
function updateComputerAI() {
    const computerCenter = computer.y + paddleHeight / 2;
    const ballCenter = ball.y;
    const settings = difficultySettings[difficulty];
    
    const shouldMove = Math.random() < settings.accuracy;
    
    if (!shouldMove) {
        return;
    }
    
    const ballNearPaddle = ball.x > canvas.width - 200;
    
    if (ballNearPaddle && Math.random() < settings.missChance) {
        const randomDirection = Math.random() > 0.5 ? 1 : -1;
        computer.y = Math.max(0, Math.min(canvas.height - paddleHeight, 
            computer.y + settings.speed * randomDirection));
        return;
    }
    
    if (computerCenter < ballCenter - 35) {
        computer.y = Math.min(canvas.height - paddleHeight, computer.y + settings.speed);
    } else if (computerCenter > ballCenter + 35) {
        computer.y = Math.max(0, computer.y - settings.speed);
    }
}

// Update ball position
function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy = -ball.dy;
        ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
    }

    if (
        ball.x - ball.radius < player.x + player.width &&
        ball.y > player.y &&
        ball.y < player.y + player.height
    ) {
        ball.dx = -ball.dx;
        ball.x = player.x + player.width + ball.radius;
        
        const collidePoint = ball.y - (player.y + player.height / 2);
        ball.dy = (collidePoint / (player.height / 2)) * ball.speed;
        ball.dx = Math.abs(ball.dx);
    }

    if (
        ball.x + ball.radius > computer.x &&
        ball.y > computer.y &&
        ball.y < computer.y + computer.height
    ) {
        ball.dx = -ball.dx;
        ball.x = computer.x - ball.radius;
        
        const collidePoint = ball.y - (computer.y + computer.height / 2);
        ball.dy = (collidePoint / (computer.height / 2)) * ball.speed;
        ball.dx = -Math.abs(ball.dx);
    }

    if (ball.x - ball.radius < 0) {
        computerScore++;
        updateScore();
        if (!checkWinner()) {
            resetBall();
        }
    } else if (ball.x + ball.radius > canvas.width) {
        playerScore++;
        updateScore();
        if (!checkWinner()) {
            resetBall();
        }
    }
}

// Reset ball position
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = (Math.random() - 0.5) * ball.speed;
}

// Update score display
function updateScore() {
    document.getElementById('playerScore').textContent = playerScore;
    document.getElementById('computerScore').textContent = computerScore;
}

// Reset game
function resetGame() {
    playerScore = 0;
    computerScore = 0;
    gameRunning = false;
    gamePaused = false;
    gameWon = false;
    updateScore();
    updateGameStatus();
    resetBall();
    
    player.y = canvas.height / 2 - paddleHeight / 2;
    computer.y = canvas.height / 2 - paddleHeight / 2;
    
    confetti = [];
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// Draw functions
function drawPaddle(paddle) {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawCenterLine() {
    ctx.strokeStyle = '#00ff00';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCenterLine();
    drawPaddle(player);
    drawPaddle(computer);
    drawBall();
}

// Main game loop
function gameLoop() {
    if (gameRunning && !gamePaused) {
        handlePlayerMovement();
        updateComputerAI();
        updateBall();
    }

    drawGame();
    
    if (confetti.length > 0) {
        updateConfetti();
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the game loop
updateGameStatus();
gameLoop();