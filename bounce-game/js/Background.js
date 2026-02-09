class Background {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.stars = [];
        this.clouds = [];
        this.dangerLine = null;
        this.dangerGlow = null;
    }

    create() {
        // Create star field (for space zone)
        for (let i = 0; i < 80; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, GAME_WIDTH),
                Phaser.Math.Between(-10000, GAME_HEIGHT),
                Phaser.Math.Between(1, 3),
                0xFFFFFF,
                Math.random() * 0.7 + 0.3
            );
            star.setDepth(0);
            this.stars.push(star);

            // Twinkle animation
            this.scene.tweens.add({
                targets: star,
                alpha: star.alpha * 0.3,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 2000),
            });
        }

        // Create some initial clouds (earth zone)
        for (let i = 0; i < 8; i++) {
            this.createCloud(
                Phaser.Math.Between(0, GAME_WIDTH),
                Phaser.Math.Between(GAME_HEIGHT - 600, GAME_HEIGHT)
            );
        }

        // Danger layer
        this.dangerGlow = this.scene.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT + 50, GAME_WIDTH, 100, COLORS.dangerLayer, 0.3
        ).setDepth(50);

        this.dangerLine = this.scene.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT + 50, GAME_WIDTH, 6, COLORS.dangerGlow, 0.9
        ).setDepth(51);

        // Pulsing glow
        this.scene.tweens.add({
            targets: this.dangerGlow,
            alpha: 0.5,
            scaleY: 1.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    createCloud(x, y) {
        const cloud = this.scene.add.graphics();
        const w = Phaser.Math.Between(60, 120);

        cloud.fillStyle(0xFFFFFF, 0.15);
        cloud.fillEllipse(0, 0, w, w * 0.4);
        cloud.fillEllipse(w * 0.25, -w * 0.1, w * 0.6, w * 0.35);
        cloud.fillEllipse(-w * 0.2, -w * 0.05, w * 0.5, w * 0.3);

        cloud.setPosition(x, y);
        cloud.setDepth(1);
        this.clouds.push(cloud);
        return cloud;
    }

    getBackgroundColor(height) {
        // height is positive going up
        if (height < ZONES.transition) {
            // Earth zone - light blue sky
            const t = height / ZONES.transition;
            return Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.IntegerToColor(COLORS.earthSky),
                Phaser.Display.Color.IntegerToColor(COLORS.twilight),
                100,
                t * 100
            );
        } else if (height < ZONES.space) {
            // Transition zone - twilight to space
            const t = (height - ZONES.transition) / (ZONES.space - ZONES.transition);
            return Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.IntegerToColor(COLORS.twilight),
                Phaser.Display.Color.IntegerToColor(COLORS.spaceBg),
                100,
                t * 100
            );
        }
        // Space zone
        return Phaser.Display.Color.GetColor32(10, 10, 46, 255);
    }

    update(cameraTop, dangerY) {
        const height = Math.abs(cameraTop);

        // Update background color
        const color = this.getBackgroundColor(height);
        if (color.r !== undefined) {
            this.scene.cameras.main.setBackgroundColor(
                Phaser.Display.Color.GetColor(
                    Math.floor(color.r),
                    Math.floor(color.g),
                    Math.floor(color.b)
                )
            );
        }

        // Cloud opacity based on altitude
        const cloudAlpha = Math.max(0, 1 - height / ZONES.space);
        this.clouds.forEach(c => c.setAlpha(cloudAlpha * 0.15));

        // Star visibility based on altitude
        const starAlpha = Math.min(1, height / ZONES.transition);
        this.stars.forEach(s => {
            s.setAlpha(s.getData('baseAlpha') || s.alpha * starAlpha);
        });

        // Update danger layer position
        this.dangerLine.y = dangerY;
        this.dangerGlow.y = dangerY + 50;
    }
}
