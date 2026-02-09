// Game constants
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;

const COLORS = {
    // Earth zone
    earthSky: 0x87CEEB,
    earthGround: 0x4CAF50,
    grass: 0x66BB6A,

    // Transition zone
    twilight: 0x1a1a4e,

    // Space zone
    spaceBg: 0x0a0a2e,
    stars: 0xFFFFFF,

    // Platforms
    normalPlatform: 0x4CAF50,
    normalPlatformLight: 0x66BB6A,
    breakablePlatform: 0xFFB74D,
    breakablePlatformLight: 0xFFCC80,
    superBoostPlatform: 0xE91E63,
    superBoostPlatformLight: 0xF48FB1,
    movingPlatform: 0x42A5F5,
    movingPlatformLight: 0x90CAF9,

    // Danger
    dangerLayer: 0xFF1744,
    dangerGlow: 0xFF5252,

    // UI
    scoreText: 0xFFFFFF,
    comboText: 0xFFD54F,
    highScoreText: 0xB0BEC5,
};

const PHYSICS = {
    gravity: 800,
    jumpForce: -420,
    superJumpForce: -700,
    moveSpeed: 250,
    maxFallSpeed: 600,
};

const PLATFORM = {
    width: 80,
    height: 16,
    minGapX: 30,
    baseGapY: 80,
    maxGapY: 140,
    count: 12,
    movingSpeed: 60,
};

const DANGER = {
    initialDelay: 3000,
    baseSpeed: 0.3,
    maxSpeed: 2.5,
    accelerationRate: 0.0001,
};

const COMBO = {
    decayTime: 2000,
    maxMultiplier: 10,
};

const ZONES = {
    earth: 0,
    transition: 3000,
    space: 6000,
};
