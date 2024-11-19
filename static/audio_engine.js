// Создаем синглтон для хранения сэмплов
const AudioSampleStore = {
    buffers: new Map(),
    isLoaded: false,
    loadPromise: null,

    async loadSamples(gridSize) {
        // Если уже загружаем, возвращаем существующий промис
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Если уже загружено, сразу возвращаем успех
        if (this.isLoaded) {
            return Promise.resolve();
        }

        this.loadPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('Loading audio samples into global store...');
                const types = ['birth', 'death'];
                const loadPromises = [];

                for (let type of types) {
                    for (let i = 0; i < gridSize; i++) {
                        loadPromises.push(this.loadAndDecodeBuffer(type, i));
                    }
                }

                await Promise.all(loadPromises);
                this.isLoaded = true;
                console.log('All samples loaded successfully into global store');
                resolve();
            } catch (error) {
                console.error('Error loading samples:', error);
                this.loadPromise = null;
                reject(error);
            }
        });

        return this.loadPromise;
    },

    async loadAndDecodeBuffer(type, index) {
        const key = `${type}_${index}`;
        
        // Если буфер уже загружен, возвращаем его
        if (this.buffers.has(key)) {
            return this.buffers.get(key);
        }

        try {
            const response = await fetch(`/static/samples/${key}.wav`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
            this.buffers.set(key, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load sample: ${key}.wav`, error);
            throw error;
        }
    },

    getBuffer(type, index) {
        return this.buffers.get(`${type}_${index}`);
    }
};

export default class AudioEngine {
    constructor(config) {
        this.config = config;
        this.GRID_SIZE = config.GRID_SIZE || 16;
        this.MAX_SIMULTANEOUS_SOUNDS = config.MAX_SIMULTANEOUS_SOUNDS || 8;
        this.playerPool = { birth: [], death: [] };
        this.bpm = config.initialBPM || 120;
        this.fadeTime = 0.015;
        this.isInitialized = false;
        this.activeCount = 0;
        this.initPromise = null;
        // Инициализируем buffers как Map здесь
        this.buffers = new Map();
        console.log('AudioEngine constructor called with config:', config);
    }

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('AudioEngine init started');
                
                if (!window.AudioContext && !window.webkitAudioContext) {
                    throw new Error('Web Audio API is not supported');
                }

                // Убедимся, что Tone.js запущен
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                }
                console.log('Tone.js started');

                await this.setupAudioChain();
                // Загружаем сэмплы через AudioSampleStore
                await AudioSampleStore.loadSamples(this.GRID_SIZE);
                await this.initializePools();
                
                this.isInitialized = true;
                console.log('AudioEngine fully initialized');
                resolve();
            } catch (error) {
                console.error('Error in AudioEngine init:', error);
                this.isInitialized = false;
                this.initPromise = null;
                reject(error);
            }
        });

        return this.initPromise;
    }

    async setupAudioChain() {
        this.limiter = new Tone.Limiter(-0.5).toDestination();
        this.compressor = new Tone.Compressor({
            threshold: -24,
            ratio: 3,
            attack: 0.02,
            release: 0.2,
            knee: 12
        }).connect(this.limiter);
        this.masterGain = new Tone.Gain(0.7).connect(this.compressor);
    }

    async initializePools() {
        console.log('Initializing player pools...');
        
        // Создаем новые пулы плееров
        for (let type of ['birth', 'death']) {
            this.playerPool[type] = [];
            for (let i = 0; i < this.MAX_SIMULTANEOUS_SOUNDS; i++) {
                const player = new Tone.Player({
                    fadeIn: 0.01,
                    fadeOut: 0.01,
                    curve: 'linear'
                }).connect(this.masterGain);
                
                player.isAvailable = true;
                player.type = type;
                this.playerPool[type].push(player);
            }
        }
        console.log('Player pools initialized with sizes:', {
            birth: this.playerPool.birth.length,
            death: this.playerPool.death.length
        });
    }

    getPlayerFromPool(type) {
        if (!this.playerPool || !this.playerPool[type]) {
            console.error(`Player pool for ${type} not initialized`);
            return null;
        }

        let player = this.playerPool[type].find(p => p.isAvailable);
        
        if (!player) {
            // Ищем самый старый плеер для переиспользования
            const oldestPlayer = this.playerPool[type].reduce((oldest, current) => {
                if (!oldest || (current.startTime && current.startTime < oldest.startTime)) {
                    return current;
                }
                return oldest;
            }, null);

            if (oldestPlayer) {
                oldestPlayer.stop();
                oldestPlayer.isAvailable = true;
                player = oldestPlayer;
            }
        }

        if (player) {
            player.isAvailable = false;
            player.startTime = Tone.now();
        }

        return player;
    }

    async playSound(rowIndex, type) {
        if (!this.isInitialized) {
            console.warn('AudioEngine not initialized, attempting to initialize...');
            try {
                await this.init();
            } catch (error) {
                console.error('Failed to initialize AudioEngine:', error);
                return;
            }
        }

        const buffer = AudioSampleStore.getBuffer(type, rowIndex);
        if (!buffer) {
            console.warn(`Buffer not found for ${type}_${rowIndex}`);
            return;
        }

        try {
            const player = this.getPlayerFromPool(type);
            if (!player) {
                console.warn('No available players in pool');
                return;
            }

            const now = Tone.now();
            // Предотвращаем слишком частое воспроизведение одного и того же звука
            if (player.lastPlayTime && (now - player.lastPlayTime) < 0.05) {
                return;
            }
            player.lastPlayTime = now;

            // Устанавливаем буфер и параметры воспроизведения
            player.buffer = buffer;
            player.playbackRate = this.bpm / 120;
            
            this.activeCount++;
            this.adjustVolume();

            // Запускаем воспроизведение с обработкой событий
            player.start(undefined, 0, undefined, {
                onstart: () => {
                    console.log(`Playing ${type} sound for row ${rowIndex}`);
                    player.fade(0, 1, 0.01);
                },
                onend: () => {
                    console.log(`Finished playing ${type} sound for row ${rowIndex}`);
                    player.isAvailable = true;
                    this.activeCount--;
                    this.adjustVolume();
                }
            });

        } catch (error) {
            console.error('Error playing sound:', error);
            if (player) {
                player.isAvailable = true;
                this.activeCount = Math.max(0, this.activeCount - 1);
            }
        }
    }

    adjustVolume() {
        if (!this.masterGain) return;
        
        const baseVolume = -12;
        const volumeReduction = Math.min(Math.pow(this.activeCount, 0.5) * 1.5, 12);
        const targetVolume = Tone.dbToGain(baseVolume - volumeReduction);
        
        this.masterGain.gain.rampTo(targetVolume, 0.05);
    }

    dispose() {
        try {
            // Останавливаем и удаляем все плееры
            Object.values(this.playerPool).flat().forEach(player => {
                if (player) {
                    player.stop();
                    player.dispose();
                }
            });

            // Очищаем пулы плееров
            this.playerPool = { birth: [], death: [] };

            // Удаляем аудио цепочку
            if (this.masterGain) {
                this.masterGain.dispose();
                this.masterGain = null;
            }
            if (this.compressor) {
                this.compressor.dispose();
                this.compressor = null;
            }
            if (this.limiter) {
                this.limiter.dispose();
                this.limiter = null;
            }

            // Очищаем состояние
            this.isInitialized = false;
            this.activeCount = 0;
            this.initPromise = null;

            console.log('AudioEngine resources disposed successfully');
        } catch (error) {
            console.error('Error during AudioEngine disposal:', error);
        }
    }
}