// Firebase configuration (Replace with your own Firebase config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Game variables
let canvas, ctx, player, players = {}, bullets = [], skin = 'default';
const playerSpeed = 5;
const bulletSpeed = 10;

// Authentication
function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => initGame(userCredential.user))
        .catch((error) => alert(error.message));
}

function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => initGame(userCredential.user))
        .catch((error) => alert(error.message));
}

// Initialize game
function initGame(user) {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    player = {
        id: user.uid,
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 30,
        height: 30,
        skin: 'default'
    };

    setupGameListeners();
    gameLoop();
    syncPlayers();
}

// Game logic
function setupGameListeners() {
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp': player.y -= playerSpeed; break;
            case 'ArrowDown': player.y += playerSpeed; break;
            case 'ArrowLeft': player.x -= playerSpeed; break;
            case 'ArrowRight': player.x += playerSpeed; break;
            case ' ': shoot(); break;
        }
        updatePlayerPosition();
    });

    canvas.addEventListener('click', shoot);
}

function shoot() {
    const bullet = {
        x: player.x + player.width / 2,
        y: player.y,
        dx: 0,
        dy: -bulletSpeed,
        owner: player.id
    };
    bullets.push(bullet);
    database.ref('bullets').push(bullet);
}

function updatePlayerPosition() {
    database.ref('players/' + player.id).set(player);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw players
    Object.values(players).forEach(p => {
        ctx.fillStyle = p.skin === 'red' ? '#ff0000' : p.skin === 'blue' ? '#0000ff' : '#ffffff';
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Update and draw bullets
    bullets = bullets.filter(b => b.y > 0 && b.y < canvas.height && b.x > 0 && b.x < canvas.width);
    bullets.forEach(b => {
        b.x += b.dx;
        b.y += b.dy;
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(b.x, b.y, 5, 5);
    });

    requestAnimationFrame(gameLoop);
}

// Multiplayer sync
function syncPlayers() {
    database.ref('players').on('value', (snapshot) => {
        players = snapshot.val() || {};
    });

    database.ref('bullets').on('child_added', (snapshot) => {
        const bullet = snapshot.val();
        if (bullet.owner !== player.id) bullets.push(bullet);
    });
}

// Skin system
function changeSkin(newSkin) {
    if (player) {
        player.skin = newSkin;
        updatePlayerPosition();
    }
}

function buySkin(skinName) {
    // Simple payment simulation (implement real payment system here)
    const price = skinName === 'red' ? 1 : 2;
    if (confirm(`Buy ${skinName} skin for $${price}?`)) {
        changeSkin(skinName);
        alert('Skin purchased!');
    }
}

// Chat system
function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value;
    if (message) {
        database.ref('chat').push({
            user: player.id,
            text: message,
            timestamp: Date.now()
        });
        input.value = '';
    }
}

database.ref('chat').on('child_added', (snapshot) => {
    const msg = snapshot.val();
    const chat = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.textContent = `${msg.user.slice(0, 5)}: ${msg.text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

// Cleanup on disconnect
auth.onAuthStateChanged((user) => {
    if (!user && player) {
        database.ref('players/' + player.id).remove();
    }
});
