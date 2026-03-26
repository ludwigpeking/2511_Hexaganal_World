// music.js - Handles background music for the game

function preload() {
    // This will be called by p5.js before setup()
    soundFormats("mp3");
    bgMusic = loadSound("assets/sounds/PoncePreludioInEMajor.mp3");
}

function playBackgroundMusic() {
    if (!bgMusic) return;
    if (!bgMusic.isPlaying()) {
        bgMusic.setLoop(true);
        bgMusic.setVolume(0.5);
        bgMusic.play();
    }
}

function stopBackgroundMusic() {
    if (bgMusic && bgMusic.isPlaying()) {
        bgMusic.stop();
    }
}
