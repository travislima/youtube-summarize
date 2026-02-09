class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Load Google Font for retro text
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    create() {
        // Small delay to let font load
        this.time.delayedCall(500, () => {
            this.scene.start('MenuScene');
        });
    }
}
