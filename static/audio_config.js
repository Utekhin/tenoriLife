// static/audio_config.js
const audioConfig = {
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