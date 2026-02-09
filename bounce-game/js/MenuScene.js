class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor(COLORS.earthSky);
        this.sound = new SoundManager(this);
        this.sound.init();

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Title
        this.add.text(cx, cy - 160, 'BOUNCE', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '36px',
            color: '#FFFFFF',
            stroke: '#2196F3',
            strokeThickness: 6,
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, cy - 110, 'From Earth to Space!', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#B0BEC5',
        }).setOrigin(0.5);

        // Draw a little robot preview
        const player = new Player(this);
        player.createTexture();
        const robot = this.add.sprite(cx, cy - 20, 'player').setScale(2.5);

        // Bobbing animation
        this.tweens.add({
            targets: robot,
            y: cy - 30,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Play button
        const playBtn = this.add.text(cx, cy + 80, 'TAP TO PLAY', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#FFD54F',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // Blink
        this.tweens.add({
            targets: playBtn,
            alpha: 0.3,
            duration: 700,
            yoyo: true,
            repeat: -1,
        });

        // Controls info
        this.add.text(cx, cy + 140, 'Arrow keys / Touch to move', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#78909C',
        }).setOrigin(0.5);

        // High score
        const highScore = localStorage.getItem('bounce_highscore') || 0;
        if (highScore > 0) {
            this.add.text(cx, cy + 180, 'BEST: ' + highScore, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '10px',
                color: '#B0BEC5',
            }).setOrigin(0.5);
        }

        // Decorative clouds
        for (let i = 0; i < 5; i++) {
            const cloud = this.add.ellipse(
                Phaser.Math.Between(20, GAME_WIDTH - 20),
                Phaser.Math.Between(GAME_HEIGHT - 200, GAME_HEIGHT),
                Phaser.Math.Between(60, 120),
                Phaser.Math.Between(20, 40),
                0xFFFFFF, 0.2
            );
            this.tweens.add({
                targets: cloud,
                x: cloud.x + Phaser.Math.Between(-30, 30),
                duration: Phaser.Math.Between(3000, 6000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // Input
        this.input.on('pointerdown', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    }

    startGame() {
        this.sound.resume();
        this.sound.playMenuSelect();
        this.scene.start('GameScene');
    }
}
