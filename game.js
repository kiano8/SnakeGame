
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 24;
    const tileCount = canvas.width / gridSize;

    let snake = [{ x: 10, y: 10 }];
    let food = {};
    let dx = 0;
    let dy = 0;
    let score = 0;
    let level = 1;
    let obstacles = [];
    let gameRunning = false;
    let gameStarted = false;
    let lastDirection = { dx: 0, dy: 0 };
    let gameSpeed = 150;
    let gamePaused = false;

    // Debounce and throttle utilities
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Throttled input handling
    const handleInput = throttle((newDx, newDy) => {
        if ((newDx === -lastDirection.dx && newDy === -lastDirection.dy) && snake.length > 1) {
            return;
        }
        dx = newDx;
        dy = newDy;
        lastDirection = { dx, dy };
        gameStarted = true;
    }, 50);

    // Debounced game state updates
    const updateScore = debounce(() => {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('obstacles').textContent = obstacles.length;
    }, 16);

    function generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
        } while (
            snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
            obstacles.some(obstacle => obstacle.x === newFood.x && obstacle.y === newFood.y)
        );
        food = newFood;
    }

    function generateObstacle() {
        let newObstacle;
        let attempts = 0;
        do {
            newObstacle = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
            attempts++;
        } while (
            attempts < 50 && (
                snake.some(segment => segment.x === newObstacle.x && segment.y === newObstacle.y) ||
                obstacles.some(obstacle => obstacle.x === newObstacle.x && obstacle.y === newObstacle.y) ||
                (food.x === newObstacle.x && food.y === newObstacle.y) ||
                (Math.abs(snake[0].x - newObstacle.x) <= 2 && Math.abs(snake[0].y - newObstacle.y) <= 2)
            )
        );
        
        if (attempts < 50) {
            obstacles.push(newObstacle);
        }
    }

    function drawGame() {
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/2);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#0f0f23');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Snake appearance
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        
        snake.forEach((segment, index) => {
            const x = segment.x * gridSize;
            const y = segment.y * gridSize;
            
            if (index === 0) {
                ctx.fillStyle = '#ef4444'; // red skull
                ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
                ctx.strokeRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
                
                ctx.fillStyle = '#000';
                ctx.fillRect(x + 6, y + 6, 4, 4);
                ctx.fillRect(x + 14, y + 6, 4, 4);
                ctx.fillRect(x + 10, y + 12, 4, 2);
                ctx.fillRect(x + 8, y + 16, 2, 2);
                ctx.fillRect(x + 12, y + 16, 2, 2);
                ctx.fillRect(x + 16, y + 16, 2, 2);
            } else {
                ctx.fillStyle = index % 2 === 0 ? '#dc2626' : '#b91c1c'; // red body shades
                ctx.fillRect(x + 3, y + 3, gridSize - 6, gridSize - 6);
                ctx.strokeRect(x + 3, y + 3, gridSize - 6, gridSize - 6);
                ctx.fillStyle = '#7f1d1d';
                ctx.fillRect(x + 8, y + 8, 8, 8);
            }
        });

        const foodX = food.x * gridSize;
        const foodY = food.y * gridSize;
        
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(foodX + 2, foodY + 2, gridSize - 4, gridSize - 4);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#92400e';
        ctx.fillRect(foodX + 6, foodY + 6, 4, 4);
        ctx.fillRect(foodX + 14, foodY + 6, 4, 4);
        ctx.fillRect(foodX + 10, foodY + 12, 4, 2);
        ctx.fillRect(foodX + 8, foodY + 16, 2, 2);
        ctx.fillRect(foodX + 12, foodY + 16, 2, 2);
        ctx.fillRect(foodX + 16, foodY + 16, 2, 2);

        ctx.shadowColor = '#374151';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#4b5563';
        obstacles.forEach(obstacle => {
            const x = obstacle.x * gridSize;
            const y = obstacle.y * gridSize;
            ctx.fillRect(x + 2, y + 4, gridSize - 4, gridSize - 6);
            ctx.beginPath();
            ctx.arc(x + gridSize/2, y + 6, 10, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(x + 10, y + 8, 4, 8);
            ctx.fillRect(x + 8, y + 10, 8, 4);
            ctx.fillStyle = '#4b5563';
        });
        
        ctx.shadowBlur = 0;
    }

    function moveSnake() {
        if (!gameStarted || gamePaused) return; //Stop movement if paused
        
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            gameOver();
            return;
        }

        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            gameOver();
            return;
        }

        if (obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            if (score % 50 === 0) {
                level++;
                const obstaclesToAdd = Math.min(2 + Math.floor(Math.random() * 2), 8);
                for (let i = 0; i < obstaclesToAdd; i++) {
                    generateObstacle();
                }
                gameSpeed = Math.max(80, gameSpeed - 5);
            }
            generateFood();
            updateScore();
        } else {
            snake.pop();
        }
    }

    function gameLoop() {
        if (!gameRunning) return;
        
        moveSnake();
        drawGame();
        
        setTimeout(() => {
            requestAnimationFrame(gameLoop);
        }, gameSpeed);
    }
     //Game over state
    function gameOver() {
        gameRunning = false;
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalLevel').textContent = level;
        document.getElementById('gameOver').style.display = 'block';
    }
     //Start state
    function startGame() {
        document.getElementById('startScreen').style.display = 'none';
        initGame();
        gameRunning = true;
        gameLoop();
    }
       //Restart state
    function restartGame() {
        document.getElementById('gameOver').style.display = 'none';
        initGame();
        gameRunning = true;
        gameLoop();
    }

    function initGame() {
        snake = [{ x: 10, y: 10 }];
        dx = 0;
        dy = 0;
        lastDirection = { dx: 0, dy: 0 };
        score = 0;
        level = 1;
        obstacles = [];
        gameSpeed = 150;
        gameStarted = false;
        gamePaused = false;
        generateFood();
        updateScore();
        drawGame();
    }
     //Return to Menu
    function returnToMenu() {
    gameRunning = false;
    gamePaused = false;
    gameStarted = false;
    dx = 0;
    dy = 0;
    snake = [{ x: 10, y: 10 }];
    score = 0;
    level = 1;
    obstacles = [];
    gameSpeed = 150;

    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
    drawGame();
    }

    //Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;

        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                handleInput(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                handleInput(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                handleInput(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                handleInput(1, 0);
                break;
            case 'p':
            case 'P':
                gamePaused = !gamePaused;
                break;
            case 'r':
            case 'R':
                restartGame();
                break;
            case 'Escape':
                gameRunning = false;
                returnToMenu();
                break;
        }
    });

    drawGame();
