class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.highScore = data.highScore || 0;
        this.maxCombo = data.combo || 0;
        this.maxHeight = data.height || 0;
        this.isNewRecord = data.score >= data.highScore && data.score > 0;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x0a0a2e);
        this.soundMgr = new SoundManager(this);
        this.soundMgr.init();

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Game Over title
        const title = this.add.text(cx, cy - 180, 'GAME OVER', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '24px',
            color: '#FF5252',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: title,
            alpha: 1,
            y: cy - 170,
            duration: 500,
            ease: 'Back.easeOut',
        });

        // New Record
        if (this.isNewRecord) {
            const recordText = this.add.text(cx, cy - 130, 'NEW RECORD!', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '12px',
                color: '#FFD54F',
            }).setOrigin(0.5);

            this.tweens.add({
                targets: recordText,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                repeat: -1,
            });
        }

        // Stats
        const statStyle = {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#FFFFFF',
            lineSpacing: 8,
        };

        const labelStyle = {
            ...statStyle,
            fontSize: '8px',
            color: '#78909C',
        };

        let y = cy - 70;
        const stats = [
            { label: 'SCORE', value: this.finalScore.toString() },
            { label: 'BEST', value: this.highScore.toString() },
            { label: 'HEIGHT', value: this.maxHeight + 'm' },
            { label: 'MAX COMBO', value: 'x' + this.maxCombo },
        ];

        stats.forEach((stat, i) => {
            const delay = 200 + i * 150;
            const labelText = this.add.text(cx, y, stat.label, labelStyle)
                .setOrigin(0.5).setAlpha(0);
            const valueText = this.add.text(cx, y + 18, stat.value, statStyle)
                .setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: [labelText, valueText],
                alpha: 1,
                duration: 400,
                delay: delay,
            });
            y += 55;
        });

        // Retry button
        const retryBtn = this.add.text(cx, cy + 170, 'TAP TO RETRY', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#4CAF50',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: retryBtn,
            alpha: 1,
            duration: 500,
            delay: 1000,
        });

        this.tweens.add({
            targets: retryBtn,
            alpha: 0.3,
            duration: 700,
            yoyo: true,
            repeat: -1,
            delay: 1500,
        });

        // Menu button
        const menuBtn = this.add.text(cx, cy + 210, 'MENU', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#78909C',
        }).setOrigin(0.5).setAlpha(0).setInteractive();

        this.tweens.add({
            targets: menuBtn,
            alpha: 1,
            duration: 500,
            delay: 1200,
        });

        menuBtn.on('pointerdown', () => {
            this.soundMgr.playMenuSelect();
            this.scene.start('MenuScene');
        });

        // Stars background
        for (let i = 0; i < 40; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, GAME_WIDTH),
                Phaser.Math.Between(0, GAME_HEIGHT),
                Phaser.Math.Between(1, 2),
                0xFFFFFF,
                Math.random() * 0.5 + 0.2
            );
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
            });
        }

        // Sad robot
        const player = new Player(this);
        player.createTexture();
        const robot = this.add.sprite(cx, cy - 220, 'player').setScale(1.5);
        this.tweens.add({
            targets: robot,
            angle: [-5, 5],
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Input - delayed to prevent accidental restart
        this.time.delayedCall(1000, () => {
            this.input.on('pointerdown', (pointer) => {
                // Only restart if not clicking menu button
                if (pointer.y < cy + 195) {
                    this.soundMgr.playMenuSelect();
                    this.scene.start('GameScene');
                }
            });
            this.input.keyboard.on('keydown-SPACE', () => {
                this.soundMgr.playMenuSelect();
                this.scene.start('GameScene');
            });
            this.input.keyboard.on('keydown-ENTER', () => {
                this.soundMgr.playMenuSelect();
                this.scene.start('GameScene');
            });
        });
    }
}
