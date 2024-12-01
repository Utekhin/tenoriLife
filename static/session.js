// session.js
class SessionManager {
    constructor() {
        this.sessionKey = 'lifesynth_session';
    }

    // Генерация уникального идентификатора сессии
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }

    // Получение текущей сессии или создание новой
    getSessionId() {
        let sessionId = localStorage.getItem(this.sessionKey);
        
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem(this.sessionKey, sessionId);
        }
        
        return sessionId;
    }

    // Очистка сессии
    clearSession() {
        localStorage.removeItem(this.sessionKey);
    }
}

// Экспортируем для использования в других модулях
export default new SessionManager();