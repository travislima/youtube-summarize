class Player {
    constructor(scene) {
        this.scene = scene;
        this.sprite = null;
        this.facingRight = true;
    }

    createTexture() {
        const g = this.scene.add.graphics();
        const size = 36;

        // Body (rounded rectangle)
        g.fillStyle(0xFFFFFF, 1);
        g.fillRoundedRect(6, 10, 24, 20, 4);

        // Head
        g.fillStyle(0xFFFFFF, 1);
        g.fillRoundedRect(4, 0, 28, 16, 6);

        // Eyes
        g.fillStyle(0x2196F3, 1);
        g.fillCircle(13, 7, 3.5);
        g.fillCircle(23, 7, 3.5);

        // Pupils
        g.fillStyle(0x0D47A1, 1);
        g.fillCircle(14, 7, 1.5);
        g.fillCircle(24, 7, 1.5);

        // Eye shine
        g.fillStyle(0xFFFFFF, 0.9);
        g.fillCircle(12, 6, 1);
        g.fillCircle(22, 6, 1);

        // Smile
        g.lineStyle(1.5, 0xE91E63, 0.8);
        g.beginPath();
        g.arc(18, 11, 4, 0.2, Math.PI - 0.2, false);
        g.strokePath();

        // Antenna
        g.lineStyle(2, 0xB0BEC5, 1);
        g.lineBetween(18, 0, 18, -6);
        g.fillStyle(0xFF5252, 1);
        g.fillCircle(18, -7, 3);

        // Arms
        g.lineStyle(2, 0xB0BEC5, 1);
        g.lineBetween(6, 18, 1, 24);
        g.lineBetween(30, 18, 35, 24);

        // Legs
        g.fillStyle(0xB0BEC5, 1);
        g.fillRoundedRect(9, 28, 7, 8, 2);
        g.fillRoundedRect(20, 28, 7, 8, 2);

        // Feet
        g.fillStyle(0x78909C, 1);
        g.fillRoundedRect(7, 33, 10, 4, 2);
        g.fillRoundedRect(19, 33, 10, 4, 2);

        // Belly button / chest detail
        g.fillStyle(0x42A5F5, 0.5);
        g.fillRoundedRect(13, 16, 10, 6, 2);

        g.generateTexture('player', size, size + 2);
        g.destroy();
    }

    create(x, y) {
        this.createTexture();
        this.sprite = this.scene.physics.add.sprite(x, y, 'player');
        this.sprite.setCollideWorldBounds(false);
        this.sprite.body.setSize(22, 28);
        this.sprite.body.setOffset(7, 6);
        this.sprite.setDepth(10);
        return this.sprite;
    }

    update(moveDir) {
        // Horizontal movement
        if (moveDir < 0) {
            this.sprite.body.setVelocityX(-PHYSICS.moveSpeed);
            if (this.facingRight) {
                this.sprite.setFlipX(true);
                this.facingRight = false;
            }
        } else if (moveDir > 0) {
            this.sprite.body.setVelocityX(PHYSICS.moveSpeed);
            if (!this.facingRight) {
                this.sprite.setFlipX(false);
                this.facingRight = true;
            }
        } else {
            this.sprite.body.setVelocityX(0);
        }

        // Clamp to world bounds (no wrapping)
        if (this.sprite.x < 12) {
            this.sprite.x = 12;
            this.sprite.body.setVelocityX(0);
        } else if (this.sprite.x > GAME_WIDTH - 12) {
            this.sprite.x = GAME_WIDTH - 12;
            this.sprite.body.setVelocityX(0);
        }

        // Cap fall speed
        if (this.sprite.body.velocity.y > PHYSICS.maxFallSpeed) {
            this.sprite.body.setVelocityY(PHYSICS.maxFallSpeed);
        }

        // Squash and stretch based on velocity
        const vy = this.sprite.body.velocity.y;
        if (vy < -100) {
            // Going up - stretch
            this.sprite.setScale(0.9, 1.1);
        } else if (vy > 100) {
            // Falling - squash
            this.sprite.setScale(1.1, 0.9);
        } else {
            this.sprite.setScale(1, 1);
        }
    }

    jump(force) {
        this.sprite.body.setVelocityY(force || PHYSICS.jumpForce);
    }

    superJump() {
        this.sprite.body.setVelocityY(PHYSICS.superJumpForce);
    }

    getY() {
        return this.sprite.y;
    }

    getX() {
        return this.sprite.x;
    }
}
