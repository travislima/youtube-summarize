class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Score and state
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('bounce_highscore') || '0');
        this.combo = 0;
        this.comboTimer = 0;
        this.multiplier = 1;
        this.maxHeight = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.dangerY = GAME_HEIGHT + 200;
        this.dangerSpeed = 0;
        this.dangerStartTime = 0;
        this.moveDir = 0;
        this.touchStartX = -1;

        // Managers
        this.soundManager = new SoundManager(this);
        this.soundManager.init();
        this.soundManager.resume();

        this.platformManager = new PlatformManager(this);
        this.platformManager.init();

        this.background = new Background(this);
        this.background.create();

        this.player = new Player(this);
        this.playerSprite = this.player.create(GAME_WIDTH / 2, GAME_HEIGHT - 120);

        this.hud = new HUD(this);
        this.hud.create();

        // Physics
        this.physics.world.gravity.y = PHYSICS.gravity;
        this.physics.world.setBounds(0, -Infinity, GAME_WIDTH, Infinity);

        // Generate platforms
        this.platformManager.generateInitialPlatforms();

        // Camera setup
        this.cameras.main.setBackgroundColor(COLORS.earthSky);
        this.cameras.main.startFollow(this.playerSprite, false, 0, 0.1);
        this.cameras.main.setDeadzone(GAME_WIDTH, 100);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');

        // Touch input
        this.input.on('pointerdown', (pointer) => {
            this.soundManager.resume();
            this.touchStartX = pointer.x;
        });
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.touchStartX = pointer.x;
            }
        });
        this.input.on('pointerup', () => {
            this.touchStartX = -1;
        });

        // Initial jump
        this.player.jump();
        this.soundManager.playJump();
    }

    handleCollision(playerSprite, platform) {
        // Only bounce when falling down onto a platform from above
        if (playerSprite.body.velocity.y <= 0) return;
        const feetY = playerSprite.body.bottom;
        const platTop = platform.body.top;
        if (feetY < platTop || feetY > platTop + 20) return;

        const type = platform.getData('type');

        switch (type) {
            case 'superBoost':
                this.player.superJump();
                this.soundManager.playSuperJump();
                this.createJumpEffect(platform.x, platform.y, COLORS.superBoostPlatform);
                break;

            case 'breakable':
                if (!platform.getData('landed')) {
                    this.player.jump();
                    this.soundManager.playJump();
                    platform.setData('landed', true);
                    this.soundManager.playBreak();
                    this.platformManager.breakPlatform(platform);
                }
                break;

            default:
                this.player.jump();
                this.soundManager.playJump();
                this.createJumpEffect(platform.x, platform.y, 0x4CAF50);
                break;
        }

        // Update combo
        this.combo++;
        this.comboTimer = COMBO.decayTime;
        this.multiplier = Math.min(1 + (this.combo - 1) * 0.3, COMBO.maxMultiplier);

        if (this.combo > 1 && this.combo % 5 === 0) {
            this.soundManager.playCombo();
        }

        if (!this.gameStarted) {
            this.gameStarted = true;
            this.dangerStartTime = this.time.now;
        }
    }

    createJumpEffect(x, y, color) {
        for (let i = 0; i < 5; i++) {
            const particle = this.add.circle(
                x + Phaser.Math.Between(-15, 15),
                y,
                Phaser.Math.Between(2, 5),
                color,
                0.7
            );
            this.tweens.add({
                targets: particle,
                y: y + 20,
                alpha: 0,
                scale: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => particle.destroy(),
            });
        }
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Input handling
        this.moveDir = 0;
        if (this.cursors.left.isDown || this.keyA.isDown) {
            this.moveDir = -1;
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
            this.moveDir = 1;
        }

        // Touch input
        if (this.touchStartX >= 0) {
            if (this.touchStartX < GAME_WIDTH / 2) {
                this.moveDir = -1;
            } else {
                this.moveDir = 1;
            }
        }

        this.player.update(this.moveDir);

        // Platform collision (manual check for each platform)
        this.platformManager.getGroup().forEach(platform => {
            if (!platform.active) return;
            this.physics.overlap(this.playerSprite, platform, (p, plat) => {
                this.handleCollision(p, plat);
            });
        });

        // Camera - only scroll up, never down
        const cameraTop = this.cameras.main.scrollY;
        const playerScreenY = this.player.getY() - cameraTop;

        if (playerScreenY < GAME_HEIGHT * 0.4) {
            this.cameras.main.scrollY = this.player.getY() - GAME_HEIGHT * 0.4;
        }

        // Score based on height
        const currentHeight = Math.abs(Math.min(0, this.player.getY() - (GAME_HEIGHT - 120)));
        if (currentHeight > this.maxHeight) {
            const heightDiff = currentHeight - this.maxHeight;
            this.score += heightDiff * 0.1 * this.multiplier;
            this.maxHeight = currentHeight;
        }

        // Combo decay
        if (this.comboTimer > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.multiplier = 1;
            }
        }

        // Danger layer
        if (this.gameStarted) {
            const elapsed = time - this.dangerStartTime;
            if (elapsed > DANGER.initialDelay) {
                const accelTime = elapsed - DANGER.initialDelay;
                this.dangerSpeed = Math.min(
                    DANGER.baseSpeed + accelTime * DANGER.accelerationRate,
                    DANGER.maxSpeed
                );
                this.dangerY -= this.dangerSpeed * (delta / 16);

                // Danger should not be below camera bottom
                const cameraBottom = cameraTop + GAME_HEIGHT;
                if (this.dangerY > cameraBottom + 50) {
                    this.dangerY = cameraBottom + 50;
                }
            }
        }

        // Platform management
        this.platformManager.update(this.cameras.main.scrollY);

        // Background
        this.background.update(this.cameras.main.scrollY, this.dangerY);

        // HUD
        this.hud.update(
            this.score, this.highScore, this.combo,
            this.comboTimer, COMBO.decayTime, this.multiplier,
            this.player.getX(), this.player.getY()
        );

        // Game over check - fell below danger line or below camera
        const playerBottom = this.player.getY();
        if (playerBottom > this.dangerY + 20 || playerBottom > cameraTop + GAME_HEIGHT + 50) {
            this.endGame();
        }
    }

    endGame() {
        this.gameOver = true;
        this.soundManager.playGameOver();

        // Flash
        this.cameras.main.flash(300, 255, 50, 50);

        // Save high score
        const finalScore = Math.floor(this.score);
        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            localStorage.setItem('bounce_highscore', finalScore.toString());
        }

        this.time.delayedCall(800, () => {
            this.scene.start('GameOverScene', {
                score: finalScore,
                highScore: this.highScore,
                combo: this.combo,
                height: Math.floor(this.maxHeight),
            });
        });
    }
}
