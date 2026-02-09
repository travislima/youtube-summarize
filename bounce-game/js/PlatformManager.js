class PlatformManager {
    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.highestY = 0;
    }

    createPlatformGraphics(type) {
        const g = this.scene.add.graphics();
        const w = PLATFORM.width;
        const h = PLATFORM.height;
        const r = h / 2;

        let color, lightColor;
        switch (type) {
            case 'breakable':
                color = COLORS.breakablePlatform;
                lightColor = COLORS.breakablePlatformLight;
                break;
            case 'superBoost':
                color = COLORS.superBoostPlatform;
                lightColor = COLORS.superBoostPlatformLight;
                break;
            case 'moving':
                color = COLORS.movingPlatform;
                lightColor = COLORS.movingPlatformLight;
                break;
            default:
                color = COLORS.normalPlatform;
                lightColor = COLORS.normalPlatformLight;
        }

        // Shadow/glow
        g.fillStyle(color, 0.3);
        g.fillRoundedRect(-2, 2, w + 4, h + 2, r);

        // Main body
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, w, h, r);

        // Highlight
        g.fillStyle(lightColor, 0.6);
        g.fillRoundedRect(4, 2, w - 8, h / 2 - 1, r / 2);

        // Super boost gets sparkle indicators
        if (type === 'superBoost') {
            g.fillStyle(0xFFFFFF, 0.8);
            g.fillCircle(15, h / 2, 3);
            g.fillCircle(w - 15, h / 2, 3);
            g.fillCircle(w / 2, 3, 2);
        }

        // Breakable gets crack lines
        if (type === 'breakable') {
            g.lineStyle(1, 0x000000, 0.3);
            g.lineBetween(w * 0.3, 2, w * 0.4, h - 2);
            g.lineBetween(w * 0.6, 2, w * 0.7, h - 2);
        }

        g.generateTexture('platform_' + type, w, h + 4);
        g.destroy();
    }

    init() {
        ['normal', 'breakable', 'superBoost', 'moving'].forEach(type => {
            this.createPlatformGraphics(type);
        });
    }

    choosePlatformType(height) {
        const difficulty = Math.min(height / 10000, 1);
        const rand = Math.random();

        if (rand < 0.05 + difficulty * 0.05) return 'superBoost';
        if (rand < 0.15 + difficulty * 0.15) return 'breakable';
        if (rand < 0.25 + difficulty * 0.1) return 'moving';
        return 'normal';
    }

    createPlatform(x, y, type) {
        const platform = this.scene.physics.add.sprite(x, y, 'platform_' + type);
        platform.body.setImmovable(true);
        platform.body.allowGravity = false;
        platform.body.checkCollision.down = false;
        platform.body.checkCollision.left = false;
        platform.body.checkCollision.right = false;
        platform.setData('type', type);
        platform.setData('landed', false);

        if (type === 'moving') {
            const speed = PLATFORM.movingSpeed * (0.8 + Math.random() * 0.4);
            const dir = Math.random() < 0.5 ? 1 : -1;
            platform.body.setVelocityX(speed * dir);
            platform.setData('movingSpeed', speed);
            platform.setData('movingDir', dir);
        }

        this.platforms.push(platform);
        return platform;
    }

    generateInitialPlatforms() {
        // Starting platform (wide, centered)
        const startPlat = this.createPlatform(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'normal');
        startPlat.setScale(1.5, 1);
        startPlat.body.setSize(PLATFORM.width * 1.5, PLATFORM.height);

        let y = GAME_HEIGHT - 80;
        for (let i = 0; i < PLATFORM.count; i++) {
            y -= PLATFORM.baseGapY + Math.random() * 30;
            const x = Phaser.Math.Between(PLATFORM.width / 2 + 10, GAME_WIDTH - PLATFORM.width / 2 - 10);
            const type = i < 2 ? 'normal' : this.choosePlatformType(0);
            this.createPlatform(x, y, type);
        }
        this.highestY = y;
    }

    update(cameraTop) {
        const difficulty = Math.min(this.scene.score / 5000, 1);
        const gapY = PLATFORM.baseGapY + difficulty * (PLATFORM.maxGapY - PLATFORM.baseGapY);

        // Generate new platforms above camera
        while (this.highestY > cameraTop - 200) {
            this.highestY -= gapY * (0.8 + Math.random() * 0.4);
            const x = Phaser.Math.Between(PLATFORM.width / 2 + 10, GAME_WIDTH - PLATFORM.width / 2 - 10);
            const type = this.choosePlatformType(Math.abs(this.highestY));
            this.createPlatform(x, this.highestY, type);
        }

        // Remove platforms below camera + buffer
        const removeY = cameraTop + GAME_HEIGHT + 100;
        this.platforms = this.platforms.filter(p => {
            if (p.y > removeY || !p.active) {
                p.destroy();
                return false;
            }
            return true;
        });

        // Bounce moving platforms off walls
        this.platforms.forEach(p => {
            if (p.getData('type') === 'moving' && p.active) {
                if (p.x <= PLATFORM.width / 2 + 5) {
                    p.body.setVelocityX(Math.abs(p.body.velocity.x));
                } else if (p.x >= GAME_WIDTH - PLATFORM.width / 2 - 5) {
                    p.body.setVelocityX(-Math.abs(p.body.velocity.x));
                }
            }
        });
    }

    getGroup() {
        return this.platforms;
    }

    breakPlatform(platform) {
        // Crumble animation
        const x = platform.x;
        const y = platform.y;
        for (let i = 0; i < 6; i++) {
            const particle = this.scene.add.rectangle(
                x + Phaser.Math.Between(-20, 20),
                y,
                Phaser.Math.Between(4, 10),
                Phaser.Math.Between(3, 6),
                COLORS.breakablePlatform
            );
            this.scene.tweens.add({
                targets: particle,
                y: y + 80,
                x: particle.x + Phaser.Math.Between(-30, 30),
                alpha: 0,
                angle: Phaser.Math.Between(-180, 180),
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        platform.destroy();
    }
}
