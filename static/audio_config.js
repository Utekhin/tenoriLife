// static/audio_config.js
const audioConfig = {
    noteFrequencies: [
        73.42, 82.41, 92.50, 110.00,
        123.47, 146.83, 164.81, 185.00,
        220.00, 246.94, 293.66,
        329.63, 369.99, 440.00, 493.88, 587.33
    ],
    matrixSize: {
        rows: 16,
        columns: 16
    },
    defaultBPM: 120,
    defaultIntervalTime: 500,
    elementIds: {
        grid: 'grid',
        bpmInput: 'bpm',
        applySettings: 'applySettings',
        stepButton: 'step',
        autoButton: 'auto',
        stopButton: 'stop',
        resetButton: 'reset'
    },
    audioSettings: {
        masterVolume: -6,
        birth: {
            samplePrefix: 'birth_',
            count: 16,
            gain: 0.05
        },
        death: {
            samplePrefix: 'death_',
            count: 16,
            gain: 0.05
        }
    },
    colors: {
        alive: 'yellow',
        dead: 'white',
        born: 'blue',
        dying: 'red',
        current: 'lightblue'
    }
};