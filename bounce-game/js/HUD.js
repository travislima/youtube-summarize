class HUD {
    constructor(scene) {
        this.scene = scene;
        this.scoreText = null;
        this.highScoreText = null;
        this.comboText = null;
        this.comboBar = null;
        this.comboBarBg = null;
        this.multiplierText = null;
    }

    create() {
        const style = {
            fontFamily: '"Press Start 2P", monospace, Arial',
            fontSize: '20px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
        };

        this.scoreText = this.scene.add.text(15, 15, '0', style)
            .setScrollFactor(0)
            .setDepth(100);

        this.highScoreText = this.scene.add.text(15, 42, 'BEST: 0', {
            ...style,
            fontSize: '10px',
            color: '#B0BEC5',
        })
            .setScrollFactor(0)
            .setDepth(100);

        // Combo bar background
        this.comboBarBg = this.scene.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH - 40, 12, 0x333333, 0.6
        )
            .setScrollFactor(0)
            .setDepth(100);

        // Combo bar fill
        this.comboBar = this.scene.add.rectangle(
            20, GAME_HEIGHT - 20, 0, 10, COLORS.comboText, 0.9
        )
            .setScrollFactor(0)
            .setDepth(101)
            .setOrigin(0, 0.5);

        // Combo text
        this.comboText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '', {
            ...style,
            fontSize: '12px',
            color: '#FFD54F',
            align: 'center',
        })
            .setScrollFactor(0)
            .setDepth(101)
            .setOrigin(0.5);

        // Multiplier text (follows player loosely)
        this.multiplierText = this.scene.add.text(0, 0, '', {
            ...style,
            fontSize: '14px',
            color: '#FFD54F',
        })
            .setDepth(100)
            .setOrigin(0.5);
    }

    update(score, highScore, combo, comboTimer, maxComboTime, multiplier, playerX, playerY) {
        this.scoreText.setText(Math.floor(score));
        this.highScoreText.setText('BEST: ' + Math.floor(highScore));

        // Combo bar
        const barWidth = GAME_WIDTH - 40;
        const fill = Math.max(0, comboTimer / maxComboTime);
        this.comboBar.width = barWidth * fill;

        if (combo > 1) {
            this.comboText.setText('COMBO x' + combo + ' (' + multiplier.toFixed(1) + ')');
            this.comboText.setAlpha(1);
            this.comboBarBg.setAlpha(0.6);
            this.comboBar.setAlpha(0.9);
        } else {
            this.comboText.setAlpha(0);
            this.comboBarBg.setAlpha(0.2);
            this.comboBar.setAlpha(0);
        }

        // Multiplier near player
        if (multiplier > 1) {
            this.multiplierText.setText('x' + multiplier.toFixed(1));
            this.multiplierText.setPosition(playerX, playerY + 30);
            this.multiplierText.setAlpha(0.8);
        } else {
            this.multiplierText.setAlpha(0);
        }
    }
}
