// SlitherGM.io - with homescreen, red laser border, particles, sound, and snake customization!
// Mouse-driven main menu selection + black, twinkling star background + evenly spaced menu!
// ENEMY SNAKES: 3 AI snakes, can be killed and can kill, with avoidance and attack behavior!

const canvas = document.createElement('canvas');
document.body.style.margin = '0';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const SNAKE_RADIUS = 16;
const SNAKE_INITIAL_LENGTH = 100;
const ORB_RADIUS = 12;
const ORB_GLOW = 35;
const ORB_COUNT = 100;
const SEGMENT_SPACING = 1.82;
const SNAKE_OUTLINE_WIDTH = SNAKE_RADIUS * 1.92;
const OUTLINE_SAMPLES = 140;
const SNAKE_SPEED = 4.1;
const BOOST_SPEED = 7.5;
const BOOST_COST = 0.15;

// === SNAKE CUSTOMIZATION SETTINGS ===
let snakeSettings = {
    bodyColor: "#000000",
    outlineStyle: "rainbow", // "rainbow", "green", "blue", "red", "gold"
    outlineWave: true,
};
let menuSelection = 0; // 0 = color, 1 = outline, 2 = wave, 3 = play

// === GAME STATE ===
let gameState = "home"; // "home" | "playing" | "dead"
function setGameState(state) {
    gameState = state;
    if (state === "playing") {
        snakeLength = SNAKE_INITIAL_LENGTH;
        resetSnake();
        generateStars();
        regenOrbs();
        camera.x = world.width/2;
        camera.y = world.height/2;
        lastFrame = performance.now();
        resetEnemySnakes();
    }
}

let isBoosting = false;
let wasBoosting = false;
let snake = [];
let snakeLength = SNAKE_INITIAL_LENGTH;
let score = 0;
let mouse = {x: canvas.width / 2, y: canvas.height / 2};
let camera = {x: 0, y: 0};
let deathTime = 0;

const world = {
    width: 5000,
    height: 5000,
};

// --- RANDOM ENEMY NAMES ---
const ENEMY_ADJECTIVES = [
    "Sneaky", "Swift", "Angry", "Clever", "Sleepy", "Hungry", "Tiny", "Giant",
    "Wild", "Silent", "Curious", "Crazy", "Dizzy", "Lucky", "Chilly", "Spooky",
    "Funky", "Happy", "Shiny", "Bouncy", "Brave", "Wiggly", "Silly", "Rapid"
];
const ENEMY_NOUNS = [
    "Penguin", "Tiger", "Eagle", "Worm", "Viper", "Jaguar", "Shark", "Bison",
    "Falcon", "Otter", "Dragon", "Kangaroo", "Raptor", "Wolf", "Mongoose", "Rhino",
    "Badger", "Cobra", "Crab", "Monkey", "Dingo", "Gecko", "Cheetah", "Panda"
];
function randomEnemyName() {
    const adj = ENEMY_ADJECTIVES[Math.floor(Math.random() * ENEMY_ADJECTIVES.length)];
    const noun = ENEMY_NOUNS[Math.floor(Math.random() * ENEMY_NOUNS.length)];
    const num = Math.floor(Math.random() * 900) + 100; // 100-999
    return `${adj}${noun}${num}`;
}

// --- ENEMY SNAKES ---
const ENEMY_COUNT = 3;
const ENEMY_COLORS = ["#f43", "#29e", "#ffd700"];
const ENEMY_OUTLINES = ["red", "blue", "gold"];
let enemySnakes = [];
function defaultEnemySettings(i) {
    return {
        bodyColor: ENEMY_COLORS[i % ENEMY_COLORS.length],
        outlineStyle: ENEMY_OUTLINES[i % ENEMY_OUTLINES.length],
        outlineWave: true,
        aiType: "mix",
        id: i,
        alive: true,
        respawnTimer: 0,
        score: 0,
        boost: false,
        target: null,
        attackMode: false,
        attackTimer: 0,
        avoidTimer: 0,
        lastPlayerDist: 9999,
        name: randomEnemyName()
    };
}
function resetEnemySnakes() {
    enemySnakes = [];
    for (let i = 0; i < ENEMY_COUNT; i++) {
        enemySnakes.push(initEnemySnake(i));
    }
}
function initEnemySnake(idx) {
    let minDist = 400;
    let px = world.width/2, py = world.height/2;
    let sx, sy;
    do {
        sx = Math.random() * world.width;
        sy = Math.random() * world.height;
    } while (distance(px, py, sx, sy) < 800);
    let segments = [];
    for (let i = 0; i < SNAKE_INITIAL_LENGTH; i++) {
        segments.push({x: sx - i * SEGMENT_SPACING, y: sy, dir: 0});
    }
    let settings = defaultEnemySettings(idx);
    return {
        segments,
        length: SNAKE_INITIAL_LENGTH,
        settings,
        alive: true,
        boost: false,
        id: idx,
    };
}

// --- Starfield ---
const STAR_LAYERS = [
    {count: 170, speed: 0.3, size: [1.2, 2.6], alpha: [0.78, 1], color: [0, 360]},
    {count: 100,  speed: 0.7, size: [0.9, 1.7], alpha: [0.7, 0.95], color: [180, 340]},
    {count: 33,  speed: 1.2, size: [2, 3.1], alpha: [0.9, 1], color: [0, 360]},
];
let stars = [];
function generateStars() {
    stars = [];
    for (let l = 0; l < STAR_LAYERS.length; l++) {
        const layer = STAR_LAYERS[l];
        for (let i = 0; i < layer.count; i++) {
            let hue = Math.random() < 0.85
                ? 0 : Math.floor(Math.random() * (layer.color[1] - layer.color[0]) + layer.color[0]);
            let color = hue === 0 ? "#fff" : `hsl(${hue}, 90%, 80%)`;
            stars.push({
                x: Math.random() * world.width,
                y: Math.random() * world.height,
                r: Math.random() * (layer.size[1] - layer.size[0]) + layer.size[0],
                a: Math.random() * (layer.alpha[1] - layer.alpha[0]) + layer.alpha[0],
                color,
                speed: layer.speed,
                hue
            });
        }
    }
}
generateStars();

// --- Orbs ---
function randomOrb() {
    return {
        x: Math.random() * world.width,
        y: Math.random() * world.height,
        color: `hsl(${Math.floor(Math.random()*360)}, 80%, 60%)`
    };
}
let orbs = [];
function regenOrbs() {
    orbs = [];
    for (let i = 0; i < ORB_COUNT; i++) orbs.push(randomOrb());
}
regenOrbs();

// --- Snake ---
function resetSnake() {
    snake = [];
    let x = world.width/2, y = world.height/2;
    for (let i = 0; i < snakeLength; i++) {
        snake.push({x: x - i * SEGMENT_SPACING, y: y, dir: 0});
    }
    score = 0;
    deathTime = 0;
}
resetSnake();

canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // --- Mouse-driven main menu selection ---
    if (gameState === "home") {
        const menuOptions = [
            { label: "Body Color", type: "color" },
            { label: "Outline", type: "outline" },
            { label: "Outline Wave", type: "wave" },
            { label: "PLAY!", type: "play" }
        ];
        const totalSections = menuOptions.length + 2;
        const sectionSpacing = Math.floor(canvas.height / (totalSections + 1));
        let optionY = sectionSpacing * 2;
        for (let i = 0; i < menuOptions.length; i++) {
            optionY += sectionSpacing;
            let y = optionY;
            let height = (i === 3) ? 54 : 46;
            let margin = (i === 3) ? 28 : 20;
            if (
                mouse.y > y - height/2 - margin &&
                mouse.y < y + height/2 + margin
            ) {
                menuSelection = i;
                break;
            }
        }
    }
});
canvas.addEventListener('touchmove', e => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
    // --- Mouse-driven main menu selection (touch) ---
    if (gameState === "home") {
        const menuOptions = [
            { label: "Body Color", type: "color" },
            { label: "Outline", type: "outline" },
            { label: "Outline Wave", type: "wave" },
            { label: "PLAY!", type: "play" }
        ];
        const totalSections = menuOptions.length + 2;
        const sectionSpacing = Math.floor(canvas.height / (totalSections + 1));
        let optionY = sectionSpacing * 2;
        for (let i = 0; i < menuOptions.length; i++) {
            optionY += sectionSpacing;
            let y = optionY;
            let height = (i === 3) ? 54 : 46;
            let margin = (i === 3) ? 28 : 20;
            if (
                mouse.y > y - height/2 - margin &&
                mouse.y < y + height/2 + margin
            ) {
                menuSelection = i;
                break;
            }
        }
    }
});

// --- Boost Controls ---
function setBoost(state) {
    isBoosting = state && gameState === "playing" && snake.length > 20;
}
window.addEventListener('keydown', e => {
    if (gameState === "home") {
        if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
            menuSelection = (menuSelection+4)%4;
        } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
            menuSelection = (menuSelection+1)%4;
        } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
            menuAction(-1);
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
            menuAction(1);
        } else if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
            if (menuSelection === 3) setGameState("playing");
            else menuAction(1);
        }
        return;
    }
    if (gameState === "dead") {
        if (e.key === "Escape" || e.key.toLowerCase() === "m") {
            setGameState("home");
            return;
        }
    }
    if (e.code === "Space") setBoost(true);
});
window.addEventListener('keyup', e => {
    if (e.code === "Space") setBoost(false);
});
canvas.addEventListener('mousedown', e => {
    if (gameState === "home") {
        // --- Mouse-driven menu click selection ---
        const menuOptions = [
            { label: "Body Color", type: "color" },
            { label: "Outline", type: "outline" },
            { label: "Outline Wave", type: "wave" },
            { label: "PLAY!", type: "play" }
        ];
        const totalSections = menuOptions.length + 2;
        const sectionSpacing = Math.floor(canvas.height / (totalSections + 1));
        let optionY = sectionSpacing * 2;
        for (let i = 0; i < menuOptions.length; i++) {
            optionY += sectionSpacing;
            let y = optionY;
            let height = (i === 3) ? 54 : 46;
            let margin = (i === 3) ? 28 : 20;
            if (
                e.clientY > y - height/2 - margin &&
                e.clientY < y + height/2 + margin
            ) {
                menuSelection = i;
                if (i === 3) {
                    setGameState("playing");
                } else {
                    menuAction(1);
                }
                return;
            }
        }
        return;
    } else if (gameState === "dead" && (Date.now() - deathTime > 400)) {
        let btnY = canvas.height/2 + 90;
        let btnW = 340, btnH = 54;
        let btnX = canvas.width/2 - btnW/2;
        if (
            e.clientX >= btnX && e.clientX <= btnX+btnW &&
            e.clientY >= btnY && e.clientY <= btnY+btnH
        ) {
            setGameState("home");
        } else {
            setGameState("playing");
        }
        return;
    } else if (gameState === "playing") {
        setBoost(true);
    }
});
canvas.addEventListener('mouseup', () => setBoost(false));
canvas.addEventListener('mouseleave', () => setBoost(false));
canvas.addEventListener('touchstart', e => {
    if (gameState === "home") {
        let touch = e.touches[0];
        const menuOptions = [
            { label: "Body Color", type: "color" },
            { label: "Outline", type: "outline" },
            { label: "Outline Wave", type: "wave" },
            { label: "PLAY!", type: "play" }
        ];
        const totalSections = menuOptions.length + 2;
        const sectionSpacing = Math.floor(canvas.height / (totalSections + 1));
        let optionY = sectionSpacing * 2;
        for (let i = 0; i < menuOptions.length; i++) {
            optionY += sectionSpacing;
            let y = optionY;
            let height = (i === 3) ? 54 : 46;
            let margin = (i === 3) ? 28 : 20;
            if (
                touch.clientY > y - height/2 - margin &&
                touch.clientY < y + height/2 + margin
            ) {
                menuSelection = i;
                if (i === 3) {
                    setGameState("playing");
                } else {
                    menuAction(1);
                }
                return;
            }
        }
        return;
    } else if (gameState === "dead") {
        let touch = e.touches[0];
        let btnY = canvas.height/2 + 90;
        let btnW = 340, btnH = 54;
        let btnX = canvas.width/2 - btnW/2;
        if (
            touch.clientX >= btnX && touch.clientX <= btnX+btnW &&
            touch.clientY >= btnY && touch.clientY <= btnY+btnH
        ) {
            setGameState("home");
        } else {
            setGameState("playing");
        }
        return;
    } else if (gameState === "playing") {
        setBoost(true);
    }
});
canvas.addEventListener('touchend', () => setBoost(false));

// --- Customization Menu Logic ---
function menuAction(dir) {
    if (menuSelection === 0) {
        // Body color: cycle through a few presets
        let colors = ["#000000","#333333","#994dff","#ff4d4d","#ffe347","#25ff70","#4dffb3"];
        let idx = colors.indexOf(snakeSettings.bodyColor);
        idx = (idx+dir+colors.length)%colors.length;
        snakeSettings.bodyColor = colors[idx];
    } else if (menuSelection === 1) {
        let styles = ["rainbow","green","blue","red","gold"];
        let idx = styles.indexOf(snakeSettings.outlineStyle);
        idx = (idx+dir+styles.length)%styles.length;
        snakeSettings.outlineStyle = styles[idx];
    } else if (menuSelection === 2) {
        snakeSettings.outlineWave = !snakeSettings.outlineWave;
    }
}

// --- Util ---
function worldToScreen(wx, wy) {
    return {
        x: wx - camera.x + canvas.width / 2,
        y: wy - camera.y + canvas.height / 2
    };
}
function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
}
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
function angleDiff(a1, a2) {
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
}

// --- PARTICLES ---
let particles = [];
function spawnParticles(x, y, color, count = 18, radius = 2.7, speedMul = 1, dur = 0.33) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = (Math.random() * 3.5 + 1.2) * speedMul;
        const life = Math.random() * 0.25 + dur;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            r: Math.random() * radius + radius,
            life: life,
            ttl: life
        });
    }
}
function spawnBoostParticles(head) {
    let hue = (performance.now() / 3) % 360;
    for (let i = 0; i < 10; i++) {
        let th = Math.random() * 2 * Math.PI;
        let speed = Math.random() * 2.2 + 2.5;
        let color = `hsl(${(hue + i * 36) % 360},100%,60%)`;
        particles.push({
            x: head.x,
            y: head.y,
            vx: Math.cos(th) * speed,
            vy: Math.sin(th) * speed,
            color: color,
            r: Math.random() * 2.2 + 2.5,
            life: Math.random() * 0.12 + 0.18,
            ttl: Math.random() * 0.12 + 0.18
        });
    }
}
function spawnDeathParticlesSnake(snakeArr, settings) {
    let n = Math.min(48, snakeArr.length);
    for (let i = 0; i < n; i += 3) {
        let seg = snakeArr[i];
        let t = i / n;
        let col = settings && settings.outlineStyle === "rainbow"
            ? `hsl(${(t * 360 + performance.now() * 0.9) % 360},100%,60%)`
            : (settings ? settings.bodyColor : "#fff");
        spawnParticles(seg.x, seg.y, col, 5, 3 + 4*t, 2 + t*2.4, 0.34 + 0.15 * t);
    }
}
function spawnDeathParticles() {
    spawnDeathParticlesSnake(snake, snakeSettings);
}
function updateParticles(dt) {
    for (let p of particles) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.ttl -= dt;
    }
    particles = particles.filter(p => p.ttl > 0);
}
function drawParticles() {
    for (let p of particles) {
        let {x, y} = worldToScreen(p.x, p.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.ttl / p.life);
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 14 * (p.ttl / p.life);
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- SOUND EFFECTS (Web Audio API) ---
let audioCtx = null;
function playEatSound(hue) {
    if (!audioCtx) {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        } catch(e) { return; }
    }
    const duration = 0.13;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = 440 + (hue % 360) / 360 * 460;
    g.gain.value = 0.32;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration);
}
function playBoostSound() {
    if (!audioCtx) {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        } catch(e) { return; }
    }
    const duration = 0.18;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 330 + (performance.now() % 300);
    g.gain.value = 0.21;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.frequency.linearRampToValueAtTime(o.frequency.value + 80, audioCtx.currentTime + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration);
}
function playDeathSound() {
    if (!audioCtx) {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        } catch(e) { return; }
    }
    const duration = 0.5;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 320;
    g.gain.value = 0.28;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.frequency.linearRampToValueAtTime(90, audioCtx.currentTime + duration * 0.67);
    g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration);
}

// --- Drawing ---
function drawSpaceBackground() {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    let now = performance.now() * 0.001;
    for (let star of stars) {
        let px = star.x - (camera.x - world.width/2) * (1 - star.speed);
        let py = star.y - (camera.y - world.height/2) * (1 - star.speed);
        let {x, y} = worldToScreen(px, py);
        if (x < -30 || x > canvas.width + 30 || y < -30 || y > canvas.height + 30) continue;
        let twinkle = 0.55 + 0.45 * Math.abs(Math.sin(now * 2 + star.x * 0.01 + star.y * 0.014 + star.hue));
        ctx.save();
        ctx.globalAlpha = Math.min(1, star.a * 2.5 * twinkle);
        ctx.beginPath();
        ctx.arc(x, y, star.r * (1.1 + 0.32 * Math.sin(now * 3 + star.x * 0.03)), 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 24 * star.r;
        ctx.shadowColor = "#fff";
        ctx.fill();
        ctx.restore();
    }
}
function drawArenaEdge() {
    let topLeft = worldToScreen(0, 0);
    let bottomRight = worldToScreen(world.width, world.height);
    ctx.save();
    ctx.strokeStyle = "rgba(255,28,28,0.93)";
    ctx.shadowBlur = 40;
    ctx.shadowColor = "rgba(255, 0, 0, 0.9)";
    ctx.lineWidth = 13;
    ctx.strokeRect(
        topLeft.x, topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
    );
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(255,90,90,1)";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeRect(
        topLeft.x, topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
    );
    ctx.restore();
}
function drawOrbs() {
    for (let orb of orbs) {
        let {x, y} = worldToScreen(orb.x, orb.y);
        ctx.save();
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = ORB_GLOW;
        ctx.beginPath();
        ctx.arc(x, y, ORB_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = orb.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- Rainbow Outline (customizable) ---
function drawSnakeOutline(snakeArr, settings) {
    if (!snakeArr || snakeArr.length < 2) return;
    const points = [];
    let totalLen = 0;
    let segLens = [];
    for (let i = 1; i < snakeArr.length; i++) {
        let d = distance(snakeArr[i-1].x, snakeArr[i-1].y, snakeArr[i].x, snakeArr[i].y);
        segLens.push(d);
        totalLen += d;
    }
    if (totalLen === 0) return;
    let n = OUTLINE_SAMPLES;
    let step = totalLen / (n-1);
    let i = 0, acc = 0;
    let currPt = {x: snakeArr[0].x, y: snakeArr[0].y};
    points.push(currPt);
    for (let si = 1; si < n; si++) {
        let targetDist = step * si;
        while (i < segLens.length && acc + segLens[i] < targetDist) {
            acc += segLens[i];
            i++;
        }
        if (i >= segLens.length) {
            points.push({x: snakeArr[snakeArr.length-1].x, y: snakeArr[snakeArr.length-1].y});
            continue;
        }
        let remain = targetDist - acc;
        let a = snakeArr[i], b = snakeArr[i+1];
        let segLen = segLens[i];
        let f = remain / segLen;
        let x = a.x + (b.x - a.x) * f;
        let y = a.y + (b.y - a.y) * f;
        points.push({x, y});
    }
    const time = performance.now() * 0.002;
    const waveLength = 18;
    const waveAmplitude = 60;
    const waveSpeed = 2.2;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = SNAKE_OUTLINE_WIDTH;
    ctx.globalAlpha = 0.93;
    for (let j = 0; j < points.length-1; j++) {
        let pA = worldToScreen(points[j].x, points[j].y);
        let pB = worldToScreen(points[j+1].x, points[j+1].y);
        let t = j / (points.length-1);
        let style = settings.outlineStyle;
        let wave = (settings.outlineWave ? Math.sin(waveSpeed*time + t*waveLength*2*Math.PI) : 0);
        let color = "#fff";
        if (style === "rainbow") {
            let baseHue = ((t * 360 + score*7) + wave * waveAmplitude) % 360;
            color = `hsl(${baseHue}, 100%, 55%)`;
        } else if (style === "green") {
            color = "#25ff70";
        } else if (style === "blue") {
            color = "#3af";
        } else if (style === "red") {
            color = "#f44";
        } else if (style === "gold") {
            color = "#FFD700";
        }
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.strokeStyle = color;
        ctx.shadowBlur = 16;
        ctx.shadowColor = color;
        ctx.stroke();
    }
    ctx.restore();
}
function drawSnakeSegments(snakeArr, settings) {
    for (let i = snakeArr.length-1; i >= 0; i--) {
        let seg = snakeArr[i];
        let {x, y} = worldToScreen(seg.x, seg.y);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, SNAKE_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = (settings && settings.bodyColor) || "#000";
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.restore();
    }
}

// --- ENEMY SNAKE: Draw enemy heads/eyes ---
function drawEnemyHeads() {
    for (let e of enemySnakes) {
        if (!e.alive) continue;
        let head = e.segments[0];
        let {x,y} = worldToScreen(head.x, head.y);
        // Remove the large transparent circle entirely, only draw eyes
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2*Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
        let eyeDX = Math.cos(head.dir) * 5.5, eyeDY = Math.sin(head.dir) * 5.5;
        ctx.beginPath();
        ctx.arc(x + eyeDX, y + eyeDY, 2.7, 0, 2*Math.PI);
        ctx.fillStyle = "#111";
        ctx.fill();
        ctx.restore();
    }
}

// --- ENEMY Snakes: Score ---
function drawEnemyScores() {
    ctx.save();
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < enemySnakes.length; i++) {
        let enemy = enemySnakes[i];
        if (!enemy.alive) continue;
        ctx.fillStyle = enemy.settings.bodyColor;
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.strokeText(`${enemy.settings.name}: ${enemy.settings.score}`, canvas.width-32, 32+28*i);
        ctx.fillText(`${enemy.settings.name}: ${enemy.settings.score}`, canvas.width-32, 32+28*i);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    ctx.strokeText(`Score: ${score}`, 25, 40);
    ctx.fillText(`Score: ${score}`, 25, 40);
    if (isBoosting && gameState === "playing") {
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = "#0ff";
        ctx.fillText("BOOST!", 28, 62);
    }
    ctx.restore();
}

function drawGameOver() {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.font = "bold 64px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 7;
    ctx.strokeText("Game Over", canvas.width/2, canvas.height/2-30);
    ctx.fillText("Game Over", canvas.width/2, canvas.height/2-30);

    ctx.font = "32px Arial";
    ctx.strokeText("Click to restart", canvas.width/2, canvas.height/2+36);
    ctx.fillText("Click to restart", canvas.width/2, canvas.height/2+36);

    // BACK TO MAIN MENU BUTTON
    let btnY = canvas.height/2 + 90;
    let btnW = 340, btnH = 54;
    let btnX = canvas.width/2 - btnW/2;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#222";
    ctx.strokeStyle = "#ff0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(btnX, btnY, btnW, btnH, 20);
    } else {
        ctx.rect(btnX, btnY, btnW, btnH);
    }
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "#ff0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Back to Main Menu", canvas.width/2, btnY + btnH/2);
    ctx.restore();

    ctx.restore();
}

// === HOMESCREEN WITH CUSTOMIZATION ===
function drawHomeScreen() {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    let now = performance.now() * 0.001;
    for (let star of stars) {
        let {x, y} = worldToScreen(star.x, star.y);
        if (x < -30 || x > canvas.width + 30 || y < -30 || y > canvas.height + 30) continue;
        let twinkle = 0.55 + 0.45 * Math.abs(Math.sin(now * 2 + star.x * 0.01 + star.y * 0.014 + (star.color.length > 5 ? parseInt(star.color.slice(4)) : 0)));
        ctx.save();
        ctx.globalAlpha = Math.min(1, star.a * 2.5 * twinkle);
        ctx.beginPath();
        ctx.arc(x, y, star.r * (1.1 + 0.32 * Math.sin(now * 3 + star.x * 0.03)), 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 24 * star.r;
        ctx.shadowColor = "#fff";
        ctx.fill();
        ctx.restore();
    }

    const menuOptions = [
        { label: "Body Color", type: "color" },
        { label: "Outline", type: "outline" },
        { label: "Outline Wave", type: "wave" },
        { label: "PLAY!", type: "play" }
    ];
    const totalSections = menuOptions.length + 2;
    const titleFont = 84, subtitleFont = 32, menuFont = 38, playFont = 44;
    const sectionSpacing = Math.floor(canvas.height / (totalSections + 1));
    let baseY = sectionSpacing;

    ctx.save();
    ctx.font = `bold ${titleFont}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let gradient = ctx.createLinearGradient(canvas.width/4, baseY, canvas.width*3/4, baseY);
    gradient.addColorStop(0, "#ff4d4d");
    gradient.addColorStop(0.33, "#ffb347");
    gradient.addColorStop(0.66, "#4dffb3");
    gradient.addColorStop(1, "#4d79ff");
    ctx.fillStyle = gradient;
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#000";
    ctx.strokeText("SlitherGM.io", canvas.width/2, baseY);
    ctx.fillText("SlitherGM.io", canvas.width/2, baseY);
    ctx.restore();

    baseY += sectionSpacing;
    ctx.save();
    ctx.font = `bold ${subtitleFont}px Arial`;
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.7;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("A Modern Snake Experience", canvas.width/2, baseY);
    ctx.restore();

    let optionY = baseY;
    for (let i = 0; i < menuOptions.length; i++) {
        optionY += sectionSpacing;
        const sel = (menuSelection === i);

        if (menuOptions[i].type === "color") {
            ctx.save();
            ctx.font = `bold ${menuFont}px Arial`;
            ctx.textAlign = "left";
            ctx.strokeStyle = sel ? "#fff" : "#111";
            ctx.lineWidth = sel ? 4 : 2;
            ctx.fillStyle = "#fff";
            ctx.strokeText("Body Color:", canvas.width*0.20, optionY);
            ctx.fillText("Body Color:", canvas.width*0.20, optionY);
            ctx.beginPath();
            ctx.arc(canvas.width*0.52, optionY - 6, 23, 0, 2*Math.PI);
            ctx.fillStyle = snakeSettings.bodyColor;
            ctx.globalAlpha = 1;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#888";
            ctx.stroke();
            ctx.restore();
        }
        else if (menuOptions[i].type === "outline") {
            ctx.save();
            ctx.font = `bold ${menuFont}px Arial`;
            ctx.textAlign = "left";
            ctx.strokeStyle = sel ? "#fff" : "#111";
            ctx.lineWidth = sel ? 4 : 2;
            ctx.fillStyle = "#fff";
            ctx.strokeText("Outline:", canvas.width*0.20, optionY);
            ctx.fillText("Outline:", canvas.width*0.20, optionY);

            let styles = ["rainbow","green","blue","red","gold"];
            let labels = ["Rainbow","Emerald","Blue","Red","Gold"];
            let x0 = canvas.width*0.52-50, y0 = optionY-10, x1 = canvas.width*0.52+50;
            ctx.save();
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y0);
            if (snakeSettings.outlineStyle === "rainbow") {
                let g = ctx.createLinearGradient(x0, y0, x1, y0);
                g.addColorStop(0,"#ff4d4d"); g.addColorStop(0.25,"#ffe347");
                g.addColorStop(0.5,"#4dffb3"); g.addColorStop(0.75,"#4d79ff");
                g.addColorStop(1,"#a24dff");
                ctx.strokeStyle = g;
            } else if (snakeSettings.outlineStyle === "green") {
                ctx.strokeStyle = "#25ff70";
            } else if (snakeSettings.outlineStyle === "blue") {
                ctx.strokeStyle = "#3af";
            } else if (snakeSettings.outlineStyle === "red") {
                ctx.strokeStyle = "#f44";
            } else if (snakeSettings.outlineStyle === "gold") {
                ctx.strokeStyle = "#FFD700";
            }
            ctx.shadowBlur = 15; ctx.shadowColor = ctx.strokeStyle;
            ctx.stroke();
            ctx.restore();
            ctx.font = "32px Arial";
            ctx.fillStyle = "#fff";
            ctx.globalAlpha = 0.7;
            ctx.fillText(labels[styles.indexOf(snakeSettings.outlineStyle)], canvas.width*0.52+62, optionY-3);
            ctx.restore();
        }
        else if (menuOptions[i].type === "wave") {
            ctx.save();
            ctx.font = `bold ${menuFont}px Arial`;
            ctx.textAlign = "left";
            ctx.strokeStyle = sel ? "#fff" : "#111";
            ctx.lineWidth = sel ? 4 : 2;
            ctx.fillStyle = "#fff";
            ctx.strokeText("Outline Wave:", canvas.width*0.20, optionY);
            ctx.fillText("Outline Wave:", canvas.width*0.20, optionY);
            ctx.font = "32px Arial";
            ctx.fillStyle = snakeSettings.outlineWave ? "#2f6" : "#f44";
            ctx.fillText(snakeSettings.outlineWave ? "Animated" : "Static", canvas.width*0.52, optionY-3);
            ctx.restore();
        }
        else if (menuOptions[i].type === "play") {
            ctx.save();
            ctx.textAlign = "center";
            ctx.strokeStyle = sel ? "#ff0" : "#111";
            ctx.lineWidth = sel ? 6 : 3;
            ctx.font = `bold ${playFont}px Arial`;
            ctx.globalAlpha = 1;
            ctx.strokeText("PLAY!", canvas.width/2, optionY);
            ctx.fillStyle = sel ? "#ff0" : "#fff";
            ctx.fillText("PLAY!", canvas.width/2, optionY);
            ctx.restore();
        }
    }

    ctx.save();
    ctx.font = "22px Arial";
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("←/→ or A/D to change setting, ↑/↓ or W/S to move, Enter/Space/Click to select", canvas.width/2, canvas.height-48);
    ctx.restore();
}

function drawVignette() {
    // Draw a radial vignette overlay for depth
    let grad = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height)*0.35,
        canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)*0.65
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawSnakeHeadGlow(snakeArr, settings) {
    if (!snakeArr || snakeArr.length === 0) return;
    let head = snakeArr[0];
    let {x, y} = worldToScreen(head.x, head.y);
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.arc(x, y, SNAKE_RADIUS * 2.2, 0, 2 * Math.PI);
    ctx.fillStyle = (settings && settings.bodyColor) || '#fff';
    ctx.shadowBlur = 32;
    ctx.shadowColor = (settings && settings.bodyColor) || '#fff';
    ctx.fill();
    ctx.restore();
}

let snakeTrail = [];
function updateSnakeTrail() {
    // Store last 18 head positions for trail
    if (gameState === 'playing') {
        let head = snake[0];
        snakeTrail.push({x: head.x, y: head.y});
        if (snakeTrail.length > 18) snakeTrail.shift();
    } else {
        snakeTrail = [];
    }
}
function drawSnakeTrail() {
    if (snakeTrail.length < 2) return;
    ctx.save();
    for (let i = 1; i < snakeTrail.length; i++) {
        let a = snakeTrail[i-1], b = snakeTrail[i];
        let pa = worldToScreen(a.x, a.y);
        let pb = worldToScreen(b.x, b.y);
        let t = i / snakeTrail.length;
        ctx.strokeStyle = `rgba(0,255,255,${0.08 + 0.18 * t})`;
        ctx.lineWidth = 8 * t + 2;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
    }
    ctx.restore();
}

// --- Update Logic ---
let lastFrame = performance.now();
function updateSnake(dt) {
    let head = snake[0];
    let target = {
        x: camera.x - canvas.width/2 + mouse.x,
        y: camera.y - canvas.height/2 + mouse.y
    };
    let dx = target.x - head.x, dy = target.y - head.y;
    let dist = Math.hypot(dx, dy);
    let speed = (isBoosting ? BOOST_SPEED : SNAKE_SPEED) * dt * 60;
    let angle = Math.atan2(dy, dx);
    if (dist > 1) {
        head.x += Math.cos(angle) * speed;
        head.y += Math.sin(angle) * speed;
        head.dir = angle;
    }
    for (let i = 1; i < snake.length; i++) {
        let prev = snake[i-1];
        let curr = snake[i];
        let dx = prev.x - curr.x, dy = prev.y - curr.y;
        let d = Math.hypot(dx, dy);
        if (d > SEGMENT_SPACING) {
            let move = (d - SEGMENT_SPACING);
            let angle = Math.atan2(dy, dx);
            curr.x += Math.cos(angle) * move;
            curr.y += Math.sin(angle) * move;
            curr.dir = angle;
        }
    }
    if (isBoosting && snake.length > 20) {
        let lost = 0;
        while (lost < BOOST_COST && snake.length > 20) {
            snake.pop();
            lost += 1;
        }
        snakeLength = snake.length;
    }
}

// --- ENEMY SNAKE AI ---
function updateEnemySnakes(dt) {
    for (let idx = 0; idx < enemySnakes.length; idx++) {
        let e = enemySnakes[idx];
        if (!e.alive) {
            e.settings.respawnTimer -= dt;
            if (e.settings.respawnTimer <= 0) {
                enemySnakes[idx] = initEnemySnake(idx);
            }
            continue;
        }
        let head = e.segments[0];
        let playerHead = snake[0];
        let avoidVec = {x:0, y:0};
        let attackVec = {x:0, y:0};
        let goForAttack = false;
        let goForAvoid = false;

        // --- Predictive Wall Avoidance (look ahead) ---
        let wallMargin = 76;
        let lookAhead = 48 + 32 * (e.boost ? 1.5 : 1);
        let futureX = head.x + Math.cos(head.dir) * lookAhead;
        let futureY = head.y + Math.sin(head.dir) * lookAhead;
        if (futureX < wallMargin) { avoidVec.x += 1.7; goForAvoid = true; }
        if (futureX > world.width-wallMargin) { avoidVec.x -= 1.7; goForAvoid = true; }
        if (futureY < wallMargin) { avoidVec.y += 1.7; goForAvoid = true; }
        if (futureY > world.height-wallMargin) { avoidVec.y -= 1.7; goForAvoid = true; }

        // --- Predictive Snake Avoidance (look ahead) ---
        function addAvoidForSnake(snakeArr, skipHead) {
            for (let i = skipHead ? 6 : 0; i < snakeArr.length; i+=4) {
                let seg = snakeArr[i];
                let d = distance(futureX, futureY, seg.x, seg.y);
                if (d < SNAKE_RADIUS*2.3) {
                    let vx = head.x - seg.x, vy = head.y - seg.y;
                    let mag = Math.hypot(vx, vy) || 1;
                    avoidVec.x += vx/mag * Math.max(0, 2.3 - d/SNAKE_RADIUS);
                    avoidVec.y += vy/mag * Math.max(0, 2.3 - d/SNAKE_RADIUS);
                    goForAvoid = true;
                }
            }
        }
        addAvoidForSnake(snake, true);
        for (let j = 0; j < enemySnakes.length; j++) {
            if (j === idx || !enemySnakes[j].alive) continue;
            addAvoidForSnake(enemySnakes[j].segments, true);
        }

        // --- Player Attack: Only if player is vulnerable ---
        let playerDist = distance(head.x, head.y, playerHead.x, playerHead.y);
        let playerNearWall = (
            playerHead.x < wallMargin*2 || playerHead.x > world.width-wallMargin*2 ||
            playerHead.y < wallMargin*2 || playerHead.y > world.height-wallMargin*2
        );
        let playerVulnerable = !isBoosting && !playerNearWall;
        if (playerDist < 340 + Math.random()*90 && playerVulnerable) {
            // Predict player path, try to cut off
            let predX = playerHead.x + Math.cos(playerHead.dir) * SNAKE_RADIUS * 10;
            let predY = playerHead.y + Math.sin(playerHead.dir) * SNAKE_RADIUS * 10;
            attackVec.x += (predX-head.x);
            attackVec.y += (predY-head.y);
            goForAttack = Math.random() < 0.32 + 0.3*Math.max(0, 1-playerDist/400);
        }

        // --- Smarter Orb Targeting ---
        let seekOrb = !goForAvoid && !goForAttack;
        let orbVec = {x:0, y:0}, bestOrbScore = -Infinity;
        if (seekOrb) {
            for (let i = 0; i < orbs.length; i++) {
                let orb = orbs[i];
                let d = distance(head.x, head.y, orb.x, orb.y);
                // Avoid orbs near player or other snakes
                let safe = true;
                if (distance(playerHead.x, playerHead.y, orb.x, orb.y) < SNAKE_RADIUS*7) safe = false;
                for (let j = 0; j < enemySnakes.length; j++) {
                    if (j === idx || !enemySnakes[j].alive) continue;
                    if (distance(enemySnakes[j].segments[0].x, enemySnakes[j].segments[0].y, orb.x, orb.y) < SNAKE_RADIUS*6) safe = false;
                }
                // Prefer closer, safer, and clustered orbs
                let cluster = 0;
                for (let k = 0; k < orbs.length; k++) {
                    if (k === i) continue;
                    if (distance(orb.x, orb.y, orbs[k].x, orbs[k].y) < ORB_RADIUS*3.5) cluster++;
                }
                let score = (safe ? 1 : -2) * (30-cluster) - d;
                if (score > bestOrbScore) {
                    bestOrbScore = score;
                    orbVec.x = orb.x - head.x;
                    orbVec.y = orb.y - head.y;
                }
            }
        }

        // --- Movement Decision ---
        let moveVec = {x:0, y:0};
        if (goForAvoid) {
            moveVec = avoidVec;
        } else if (goForAttack) {
            moveVec = attackVec;
        } else if (seekOrb) {
            moveVec = orbVec;
        }
        // Smoother movement: blend with previous direction
        let prevDir = head.dir || 0;
        let targetAngle = Math.atan2(moveVec.y, moveVec.x);
        let blend = 0.38;
        let angle = prevDir + angleDiff(prevDir, targetAngle) * blend;
        let mag = Math.hypot(moveVec.x, moveVec.y) || 1;
        let speed = ((goForAvoid || goForAttack) && e.segments.length > 28 ? BOOST_SPEED : SNAKE_SPEED) * dt * 60;
        head.x += Math.cos(angle) * speed;
        head.y += Math.sin(angle) * speed;
        head.dir = angle;

        // --- Boosting: Only when escaping or attacking, not random ---
        let boost = false;
        if (goForAvoid && e.segments.length > 28) boost = true;
        if (goForAttack && e.segments.length > 28 && Math.random() < 0.5) boost = true;
        if (seekOrb) boost = false;
        e.boost = boost;

        // --- Move segments ---
        for (let i = 1; i < e.segments.length; i++) {
            let prev = e.segments[i-1];
            let curr = e.segments[i];
            let dx = prev.x - curr.x, dy = prev.y - curr.y;
            let d = Math.hypot(dx, dy);
            if (d > SEGMENT_SPACING) {
                let move = (d - SEGMENT_SPACING);
                let angle = Math.atan2(dy, dx);
                curr.x += Math.cos(angle) * move;
                curr.y += Math.sin(angle) * move;
                curr.dir = angle;
            }
        }
        if (boost && e.segments.length > 20) {
            let lost = 0;
            while (lost < BOOST_COST && e.segments.length > 20) {
                e.segments.pop();
                lost += 1;
            }
            e.length = e.segments.length;
        }
    }
}
function updateEnemyOrbs() {
    for (let e of enemySnakes) {
        if (!e.alive) continue;
        let head = e.segments[0];
        for (let i = orbs.length-1; i >= 0; i--) {
            if (distance(head.x, head.y, orbs[i].x, orbs[i].y) < SNAKE_RADIUS + ORB_RADIUS) {
                e.settings.score++;
                e.length += 6;
                spawnParticles(orbs[i].x, orbs[i].y, orbs[i].color);
                for (let j = 0; j < 6; j++) {
                    let tail = e.segments[e.segments.length-1];
                    let prev = e.segments[e.segments.length-2] || head;
                    let angle = Math.atan2(tail.y - prev.y, tail.x - prev.x);
                    e.segments.push({
                        x: tail.x + Math.cos(angle) * SEGMENT_SPACING,
                        y: tail.y + Math.sin(angle) * SEGMENT_SPACING,
                        dir: angle
                    });
                }
                orbs[i] = randomOrb();
            }
        }
        while (e.segments.length < e.length) {
            let tail = e.segments[e.segments.length-1];
            let prev = e.segments[e.segments.length-2] || e.segments[0];
            let angle = Math.atan2(tail.y - prev.y, tail.x - prev.x);
            e.segments.push({
                x: tail.x + Math.cos(angle) * SEGMENT_SPACING,
                y: tail.y + Math.sin(angle) * SEGMENT_SPACING,
                dir: angle
            });
        }
    }
}
function drawEnemyBoostFX() {
    for (let e of enemySnakes) {
        if (!e.alive) continue;
        if (e.boost && Math.random() < 0.7) {
            spawnBoostParticles(e.segments[0]);
        }
    }
}
function checkDeath() {
    let head = snake[0];
    if (
        head.x - SNAKE_RADIUS < 0 ||
        head.y - SNAKE_RADIUS < 0 ||
        head.x + SNAKE_RADIUS > world.width ||
        head.y + SNAKE_RADIUS > world.height
    ) {
        if (gameState !== "dead") {
            playDeathSound();
            spawnDeathParticles();
        }
        gameState = "dead";
        deathTime = Date.now();
        isBoosting = false;
        return true;
    }
    for (let e of enemySnakes) {
        if (!e.alive) continue;
        for (let i = 6; i < e.segments.length; i+=2) {
            let d = distance(head.x, head.y, e.segments[i].x, e.segments[i].y);
            if (d < SNAKE_RADIUS*1.7) {
                if (gameState !== "dead") {
                    playDeathSound();
                    spawnDeathParticles();
                }
                gameState = "dead";
                deathTime = Date.now();
                isBoosting = false;
                return true;
            }
        }
    }
    return false;
}
function checkEnemyDeaths() {
    for (let idx = 0; idx < enemySnakes.length; idx++) {
        let e = enemySnakes[idx];
        if (!e.alive) continue;
        let head = e.segments[0];
        if (
            head.x - SNAKE_RADIUS < 0 ||
            head.y - SNAKE_RADIUS < 0 ||
            head.x + SNAKE_RADIUS > world.width ||
            head.y + SNAKE_RADIUS > world.height
        ) {
            e.alive = false;
            e.settings.respawnTimer = 3.5 + Math.random() * 1.7;
            spawnDeathParticlesSnake(e.segments, e.settings);
            continue;
        }
        for (let i = 6; i < snake.length; i+=2) {
            let d = distance(head.x, head.y, snake[i].x, snake[i].y);
            if (d < SNAKE_RADIUS*1.7) {
                e.alive = false;
                e.settings.respawnTimer = 3.5 + Math.random() * 1.7;
                spawnDeathParticlesSnake(e.segments, e.settings);
                score += Math.floor(e.segments.length/3);
                break;
            }
        }
        if (!e.alive) continue;
        for (let j = 0; j < enemySnakes.length; j++) {
            if (j === idx || !enemySnakes[j].alive) continue;
            let other = enemySnakes[j];
            for (let si = 6; si < other.segments.length; si+=2) {
                let d = distance(head.x, head.y, other.segments[si].x, other.segments[si].y);
                if (d < SNAKE_RADIUS*1.7) {
                    e.alive = false;
                    e.settings.respawnTimer = 3.5 + Math.random() * 1.7;
                    spawnDeathParticlesSnake(e.segments, e.settings);
                    break;
                }
            }
            if (!e.alive) break;
        }
    }
}
function updateCamera(dt) {
    let head = snake[0];
    camera.x += (head.x - camera.x) * 0.14 * dt * 60;
    camera.y += (head.y - camera.y) * 0.14 * dt * 60;
    camera.x = clamp(camera.x, canvas.width/2, world.width - canvas.width/2);
    camera.y = clamp(camera.y, canvas.height/2, world.height - canvas.height/2);
}
function updateOrbs() {
    let head = snake[0];
    for (let i = orbs.length-1; i >= 0; i--) {
        if (distance(head.x, head.y, orbs[i].x, orbs[i].y) < SNAKE_RADIUS + ORB_RADIUS) {
            score++;
            snakeLength += 6;
            spawnParticles(orbs[i].x, orbs[i].y, orbs[i].color);
            let hue = 0;
            let colorMatch = orbs[i].color.match(/hsl\(([\d.]+)/);
            if (colorMatch) hue = parseFloat(colorMatch[1]);
            playEatSound(hue);
            for (let j = 0; j < 6; j++) {
                let tail = snake[snake.length-1];
                let prev = snake[snake.length-2] || head;
                let angle = Math.atan2(tail.y - prev.y, tail.x - prev.x);
                snake.push({
                    x: tail.x + Math.cos(angle) * SEGMENT_SPACING,
                    y: tail.y + Math.sin(angle) * SEGMENT_SPACING,
                    dir: angle
                });
            }
            orbs[i] = randomOrb();
        }
    }
    while (snake.length < snakeLength) {
        let tail = snake[snake.length-1];
        let prev = snake[snake.length-2] || snake[0];
        let angle = Math.atan2(tail.y - prev.y, tail.x - prev.x);
        snake.push({
            x: tail.x + Math.cos(angle) * SEGMENT_SPACING,
            y: tail.y + Math.sin(angle) * SEGMENT_SPACING,
            dir: angle
        });
    }
}

// --- Main Loop ---
function gameLoop() {
    let now = performance.now();
    let dt = Math.max(0.01, Math.min(0.04, (now - lastFrame) / 1000));
    lastFrame = now;

    if (isBoosting && !wasBoosting && gameState === "playing") {
        playBoostSound();
        spawnBoostParticles(snake[0]);
    }
    wasBoosting = isBoosting;

    if (isBoosting && gameState === "playing") {
        if (Math.random() < 0.7) spawnBoostParticles(snake[0]);
    }

    if (gameState === "home") {
        drawHomeScreen();
        drawVignette();
        requestAnimationFrame(gameLoop);
        return;
    }
    if (gameState === "dead") {
        drawSpaceBackground();
        drawArenaEdge();
        ctx.globalAlpha = 0.43;
        drawOrbs();
        drawSnakeTrail();
        drawSnakeHeadGlow(snake, snakeSettings);
        drawSnakeOutline(snake, snakeSettings);
        drawSnakeSegments(snake, snakeSettings);
        // Enemy Snakes
        for (let e of enemySnakes) {
            if (!e.alive) continue;
            drawSnakeOutline(e.segments, e.settings);
            drawSnakeSegments(e.segments, e.settings);
            drawEnemyHeads();
        }
        drawParticles();
        ctx.globalAlpha = 1;
        drawGameOver();
        drawVignette();
        updateParticles(dt);
        requestAnimationFrame(gameLoop);
        return;
    }
    updateSnake(dt);
    updateOrbs();
    updateEnemySnakes(dt);
    updateEnemyOrbs();
    drawEnemyBoostFX();
    checkDeath();
    checkEnemyDeaths();
    updateCamera(dt);
    updateParticles(dt);

    drawSpaceBackground();
    drawArenaEdge();
    drawOrbs();

    // --- Player ---
    drawSnakeTrail();
    drawSnakeHeadGlow(snake, snakeSettings);
    drawSnakeOutline(snake, snakeSettings);
    drawSnakeSegments(snake, snakeSettings);

    // --- Enemy Snakes ---
    for (let e of enemySnakes) {
        if (!e.alive) continue;
        drawSnakeOutline(e.segments, e.settings);
        drawSnakeSegments(e.segments, e.settings);
    }
    drawEnemyHeads();

    drawParticles();
    drawScore();
    drawEnemyScores();

    drawVignette();
    requestAnimationFrame(gameLoop);
}

// --- Resize ---
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// --- Start ---
gameLoop();