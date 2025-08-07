class QuizTracker {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || 'http://127.0.0.1:8000',
            sessionId: null,
            quizId: null,
            currentSlide: null,
            slideStartTime: null,
            visitedSlides: new Set(),
            slideElements: [],
            isInitialized: false,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };

        this.init();
    }

    init() {
        if (this.config.isInitialized) return;

        try {
            this.extractQuizId();
            this.startSession();
            this.detectSlides();
            this.setupEventListeners();
            this.config.isInitialized = true;
            
            console.log('Quiz Tracker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Quiz Tracker:', error);
        }
    }

    extractQuizId() {
        const path = window.location.pathname;
        let quizId = path.split('/').filter(Boolean).pop() || 'default';
        
        if (quizId.includes('.')) {
            quizId = quizId.split('.')[0];
        }
        
        if (quizId.includes('/') || quizId.length > 50) {
            quizId = 'lead2';
        }
        
        this.config.quizId = quizId;
        console.log('Quiz ID extracted:', this.config.quizId);
    }

    async startSession() {
        try {
            const response = await this.makeRequest('/api/tracking/session/start', {
                method: 'POST',
                body: JSON.stringify({
                    url_path: window.location.pathname,
                    user_agent: navigator.userAgent,
                    ip_address: null
                })
            });

            if (response.success) {
                this.config.sessionId = response.session_id;
                console.log('Session started:', this.config.sessionId);
            }
        } catch (error) {
            console.error('Failed to start session:', error);
        }
    }

    detectSlides() {
        const slideSelectors = [
            '[data-slide]',
            '[data-step]',
            '.slide',
            '.step',
            '.question',
            '.quiz-slide',
            '.quiz-step',
            '[class*="slide"]',
            '[class*="step"]',
            '[class*="question"]',
            '.form-step',
            '.wizard-step'
        ];

        let slides = [];
        
        for (const selector of slideSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                slides = Array.from(elements);
                console.log(`Found ${slides.length} slides using selector: ${selector}`);
                break;
            }
        }

        if (slides.length === 0) {
            slides = this.detectSlidesByVisibility();
        }

        this.config.slideElements = slides;
        console.log('Total slides detected:', slides.length);
    }

    detectSlidesByVisibility() {
        const allElements = document.querySelectorAll('*');
        const potentialSlides = [];
        
        for (const element of allElements) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                element.offsetHeight > 100 && element.offsetWidth > 100) {
                potentialSlides.push(element);
            }
        }
        
        return potentialSlides.slice(0, 20);
    }

    setupEventListeners() {
        $(document).on('click', '.option, .btn-next, .btn-prev', () => {
            setTimeout(() => {
                this.checkSlideChange();
            }, 100);
        });

        $(window).on('beforeunload', () => {
            this.recordSlideExit();
        });

        $(document).on('visibilitychange', () => {
            if (document.hidden) {
                this.recordSlideExit();
            } else {
                this.recordSlideEntry();
            }
        });
    }

    checkSlideChange() {
        const currentSlide = this.getCurrentSlide();
        if (currentSlide && currentSlide !== this.config.currentSlide) {
            this.recordSlideExit();
            this.config.currentSlide = currentSlide;
            this.recordSlideEntry();
        }
    }

    getCurrentSlide() {
        const activeSlide = $('.slide.active')[0];
        if (activeSlide) {
            return activeSlide;
        }

        return this.detectCurrentSlideByVisibility();
    }

    detectCurrentSlideByVisibility() {
        let maxVisibility = 0;
        let mostVisibleElement = null;

        for (const element of this.config.slideElements) {
            const visibility = this.getElementVisibility(element);
            if (visibility > maxVisibility) {
                maxVisibility = visibility;
                mostVisibleElement = element;
            }
        }

        return mostVisibleElement;
    }

    getElementVisibility(element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        if (rect.bottom < 0 || rect.top > windowHeight) {
            return 0;
        }
        
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        return visibleHeight / rect.height;
    }

    recordSlideEntry() {
        this.config.slideStartTime = Date.now();
    }

    recordSlideExit() {
        if (this.config.slideStartTime && this.config.currentSlide) {
            const timeSpent = Math.floor((Date.now() - this.config.slideStartTime) / 1000);
            this.recordSlideVisit(
                this.getSlideId(this.config.currentSlide),
                this.getSlideTitle(this.config.currentSlide),
                this.getSlideSequence(this.config.currentSlide),
                timeSpent
            );
        }
    }

    getSlideId(slide) {
        return slide.id || slide.getAttribute('data-slide') || slide.getAttribute('data-step') || 'unknown';
    }

    getSlideTitle(slide) {
        const title = slide.querySelector('h1, h2, h3, h4, h5, h6');
        return title ? title.textContent.trim() : 'Untitled Slide';
    }

    getSlideSequence(slide) {
        const slideNumber = slide.id.match(/\d+/);
        return slideNumber ? parseInt(slideNumber[0]) : 1;
    }

    async recordSlideVisit(slideId, slideTitle, slideSequence, timeSpent = 0) {
        if (!this.config.sessionId || this.config.visitedSlides.has(slideId)) {
            return;
        }

        try {
            await this.makeRequest('/api/tracking/slide/visit', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: this.config.sessionId,
                    slide_id: slideId,
                    slide_title: slideTitle,
                    slide_sequence: slideSequence,
                    time_spent_seconds: timeSpent,
                    slide_metadata: {
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            this.config.visitedSlides.add(slideId);
            console.log('Slide visit recorded:', slideId, slideTitle);
        } catch (error) {
            console.error('Failed to record slide visit:', error);
        }
    }

    async completeSession() {
        if (!this.config.sessionId) {
            console.error('No active session to complete');
            return;
        }

        try {
            await this.makeRequest('/api/tracking/session/complete', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: this.config.sessionId
                })
            });

            console.log('Session completed successfully');
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = this.config.apiBaseUrl + endpoint;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, defaultOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Request attempt ${attempt} failed:`, error);
                
                if (attempt === this.config.retryAttempts) {
                    throw error;
                }
                
                await this.delay(this.config.retryDelay * attempt);
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            sessionId: this.config.sessionId,
            quizId: this.config.quizId,
            currentSlide: this.config.currentSlide,
            visitedSlides: Array.from(this.config.visitedSlides),
            isInitialized: this.config.isInitialized
        };
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.quizTracker = new QuizTracker();
    });
} else {
    window.quizTracker = new QuizTracker();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizTracker;
} 