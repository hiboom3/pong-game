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
let gameMode = 'singleplayer';
let countdownActive = false;
let countdownTime = 3;
let countdownStartTime = 0;
let lastScoringPlayer = null; // 'player' or 'computer'

// Crowd members
const crowdMembers = [];
let crowdCheeringTime = 0;

class CrowdMember {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.size = 3;
        this.cheeringOffset = 0;
        this.cheerPhase = Math.random() * Math.PI * 2;
    }

    update(isCheering) {
        if (isCheering) {
            // Jump up and down when cheering
            this.cheeringOffset = Math.sin(this.cheerPhase) * 4;
            this.cheerPhase += 0.1;
        } else {
            this.cheeringOffset = 0;
        }
    }

    draw() {
        // Draw pixelated crowd member (simple squares)
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(this.x - this.size, this.y + this.cheeringOffset - this.size, this.size * 2, this.size * 2);
        
        // Draw head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(this.x - this.size / 2, this.y + this.cheeringOffset - this.size * 2, this.size, this.size);
    }
}

// Initialize crowd
function initCrowd() {
    crowdMembers.length = 0;
    const crowdSpacing = 12;
    const crowdWidth = 30;
    
    // Left side crowd (player's crowd)
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            crowdMembers.push(new CrowdMember(crowdWidth - i * crowdSpacing, 30 + j * 15));
        }
    }
    
    // Right side crowd (computer's crowd)
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            crowdMembers.push(new CrowdMember(canvas.width - crowdWidth + i * crowdSpacing, 30 + j * 15));
        }
    }
}

// Update crowd
function updateCrowd() {
    const isCheering = crowdCheeringTime > 0;
    
    crowdMembers.forEach((member, index) => {
        // Check which side this crowd member is on
        const isLeftSide = member.x < canvas.width / 2;
        const shouldCheer = isCheering && 
            ((isLeftSide && lastScoringPlayer === 'player') || 
             (!isLeftSide && lastScoringPlayer === 'computer'));
        
        member.update(shouldCheer);
    });
    
    if (isCheering) {
        crowdCheeringTime--;
    }
}

// Draw crowd
function drawCrowd() {
    crowdMembers.forEach(member => member.draw());
}

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

// Mode Menu Functions
function showModeMenu() {
    document.getElementById('modeMenu').classList.remove('hidden');
    document.getElementById('gameContainer').style.display = 'none';
    resetGame();
}

function hideModeMenu() {
    document.getElementById('modeMenu').classList.add('hidden');
    document.getElementById('gameContainer').style.display = 'block';
}

function startSinglePlayer() {
    gameMode = 'singleplayer';
    document.getElementById('player2Label').textContent = 'Computer';
    document.getElementById('difficultyContainer').style.display = 'flex';
    document.getElementById('controlsText').textContent = '🖱️ Mouse Y-axis or ⬆️⬇️ Arrow Keys to move left paddle';
    hideModeMenu();
    resetGame();
}

function startTwoPlayer() {
    gameMode = 'twoplayer';
    document.getElementById('player2Label').textContent = 'Player 2';
    document.getElementById('difficultyContainer').style.display = 'none';
    document.getElementById('controlsText').textContent = '🎮 Player 1: W/S keys  |  Player 2: ⬆️⬇️ Arrow Keys';
    hideModeMenu();
    resetGame();
}

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
        const winnerName = gameMode === 'singleplayer' ? 'You defeated the computer!' : 'Player 1 Wins!';
        showWinScreen('YOU WIN!', winnerName);
        gameWon = true;
        gameRunning = false;
        return true;
    } else if (computerScore >= winPoints) {
        const loserName = gameMode === 'singleplayer' ? 'The computer defeated you!' : 'Player 2 Wins!';
        showWinScreen('GAME OVER!', loserName);
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
    // Prevent default scrolling for arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    
    keys[e.key] = true;
    
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (gameMode === 'singleplayer') {
        const rect = canvas.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        player.y = Math.max(0, Math.min(mouseY - paddleHeight / 2, canvas.height - paddleHeight));
    }
});

canvas.addEventListener('click', () => {
    if (!gameWon && !countdownActive) {
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

// Handle player paddle movement
function handlePlayerMovement() {
    if (gameMode === 'singleplayer') {
        // Single player: arrow keys for left paddle
        if (keys['ArrowUp']) {
            player.y = Math.max(0, player.y - player.speed);
        }
        if (keys['ArrowDown']) {
            player.y = Math.min(canvas.height - paddleHeight, player.y + player.speed);
        }
    } else {
        // Two player: W/S for left paddle, arrow keys for right paddle
        if (keys['w'] || keys['W']) {
            player.y = Math.max(0, player.y - player.speed);
        }
        if (keys['s'] || keys['S']) {
            player.y = Math.min(canvas.height - paddleHeight, player.y + player.speed);
        }
        
        if (keys['ArrowUp']) {
            computer.y = Math.max(0, computer.y - computer.speed);
        }
        if (keys['ArrowDown']) {
            computer.y = Math.min(canvas.height - paddleHeight, computer.y + computer.speed);
        }
    }
}

// Computer AI with difficulty-based mechanics
function updateComputerAI() {
    if (gameMode === 'twoplayer') return; // No AI in two player mode
    
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
    // During countdown, ball doesn't move
    if (countdownActive) {
        return;
    }
    
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
        lastScoringPlayer = 'computer';
        crowdCheeringTime = 30; // 30 frames of cheering
        updateScore();
        if (!checkWinner()) {
            startCountdown();
        }
    } else if (ball.x + ball.radius > canvas.width) {
        playerScore++;
        lastScoringPlayer = 'player';
        crowdCheeringTime = 30; // 30 frames of cheering
        updateScore();
        if (!checkWinner()) {
            startCountdown();
        }
    }
}

// Start countdown
function startCountdown() {
    countdownActive = true;
    countdownTime = 3;
    countdownStartTime = Date.now();
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
}

// Update countdown
function updateCountdown() {
    if (!countdownActive) return;
    
    const elapsed = (Date.now() - countdownStartTime) / 1000;
    const remaining = Math.max(0, 3 - elapsed);
    
    if (remaining <= 0) {
        countdownActive = false;
        ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
        ball.dy = (Math.random() - 0.5) * ball.speed;
    }
}

// Draw countdown
function drawCountdown() {
    if (!countdownActive) return;
    
    const elapsed = (Date.now() - countdownStartTime) / 1000;
    const remaining = Math.max(0, Math.ceil(3 - elapsed));
    
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(remaining, canvas.width / 2, canvas.height / 2);
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
    countdownActive = false;
    crowdCheeringTime = 0;
    lastScoringPlayer = null;
    updateScore();
    updateGameStatus();
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 0;
    ball.dy = 0;
    
    player.y = canvas.height / 2 - paddleHeight / 2;
    computer.y = canvas.height / 2 - paddleHeight / 2;
    
    confetti = [];
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    initCrowd();
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
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    drawCenterLine();
    drawCrowd();
    drawPaddle(player);
    drawPaddle(computer);
    drawBall();
    drawCountdown();
}

// Main game loop
function gameLoop() {
    if (gameRunning && !gamePaused) {
        handlePlayerMovement();
        updateComputerAI();
        updateBall();
    }
    
    updateCountdown();
    updateCrowd();

    drawGame();
    
    if (confetti.length > 0) {
        updateConfetti();
    }
    
    requestAnimationFrame(gameLoop);
}

// Initialize
initCrowd();
updateGameStatus();
gameLoop();