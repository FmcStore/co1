// Konfigurasi
const PROXY_URL = 'https://api.nekolabs.web.id/px?url=';
const API_BASE = 'https://www.sankavollerei.com/comic/komikcast';

// State
let currentChapterSlug = '';
let currentChapterData = null;
let readerSettings = {
    zoom: 'auto',
    mode: 'vertical',
    theme: 'dark',
    pageGap: 10,
    headerVisible: true
};

// DOM Elements
const loadingScreen = document.getElementById('loading');
const readerHeader = document.getElementById('readerHeader');
const readerTitle = document.getElementById('readerTitle');
const readerContent = document.getElementById('readerContent');
const readerSettingsPanel = document.getElementById('readerSettings');
const prevChapterBtn = document.getElementById('prevChapterBtn');
const nextChapterBtn = document.getElementById('nextChapterBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettings');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const chapterInfo = document.getElementById('chapterInfo');
const navLeft = document.getElementById('navLeft');
const navRight = document.getElementById('navRight');

// Utility Functions
async function fetchWithProxy(url) {
    try {
        const encodedURL = encodeURIComponent(url);
        const response = await fetch(`${PROXY_URL}${encodedURL}`);
        const data = await response.json();
        
        if (data.success && data.result.content) {
            return data.result.content;
        }
        throw new Error('Failed to fetch data');
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

function showLoading() {
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

function showError(message) {
    readerContent.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${message}</h3>
            <a href="javascript:history.back()" class="back-btn">
                <i class="fas fa-arrow-left"></i>
                Kembali
            </a>
        </div>
    `;
}

// Load Chapter
async function loadChapter(chapterSlug) {
    if (!chapterSlug) {
        const urlParams = new URLSearchParams(window.location.search);
        chapterSlug = urlParams.get('chapter');
    }
    
    if (!chapterSlug) {
        window.location.href = 'index.html';
        return;
    }
    
    currentChapterSlug = chapterSlug;
    
    try {
        showLoading();
        
        const data = await fetchWithProxy(`${API_BASE}/chapter/${chapterSlug}`);
        
        if (data && data.success) {
            currentChapterData = data.data;
            renderChapter(currentChapterData);
            updateNavigation(currentChapterData.navigation);
            saveReadingProgress();
        } else {
            throw new Error('Chapter tidak ditemukan');
        }
    } catch (error) {
        console.error('Error loading chapter:', error);
        showError('Gagal memuat chapter. Silakan coba lagi.');
    } finally {
        hideLoading();
    }
}

function renderChapter(data) {
    // Update title
    document.title = `Membaca: ${data.title || 'Chapter'} - FmcComic`;
    readerTitle.textContent = data.title || 'Membaca Chapter';
    
    // Update chapter info
    chapterInfo.innerHTML = `
        <span>${data.comicSlug ? data.comicSlug.replace(/-/g, ' ') : 'Komik'}</span>
        <i class="fas fa-chevron-right"></i>
        <span>${data.title || 'Chapter'}</span>
    `;
    
    // Clear previous content
    readerContent.innerHTML = '';
    
    // Create images container
    const container = document.createElement('div');
    container.className = 'chapter-images';
    
    // Add images
    if (data.images && data.images.length > 0) {
        data.images.forEach((imageUrl, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = `Halaman ${index + 1}`;
            img.loading = 'lazy';
            img.dataset.index = index;
            
            img.addEventListener('load', () => {
                img.classList.add('loaded');
                applyImageSettings(img);
            });
            
            img.addEventListener('error', () => {
                imgContainer.innerHTML = `
                    <div class="image-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Gagal memuat gambar halaman ${index + 1}</p>
                    </div>
                `;
            });
            
            imgContainer.appendChild(img);
            container.appendChild(imgContainer);
        });
    } else {
        container.innerHTML = '<div class="no-images">Tidak ada gambar tersedia untuk chapter ini.</div>';
    }
    
    readerContent.appendChild(container);
    
    // Apply current settings
    applyReaderSettings();
}

function applyImageSettings(img) {
    const container = img.parentElement;
    
    switch (readerSettings.zoom) {
        case 'fit-width':
            container.style.width = '100%';
            container.style.height = 'auto';
            break;
        case 'fit-height':
            container.style.width = 'auto';
            container.style.height = '100vh';
            break;
        case 'original':
            container.style.width = 'auto';
            container.style.height = 'auto';
            break;
        default: // auto
            container.style.width = '100%';
            container.style.height = 'auto';
    }
    
    // Apply page gap
    container.style.marginBottom = `${readerSettings.pageGap}px`;
}

function applyReaderSettings() {
    // Apply theme
    document.body.setAttribute('data-theme', readerSettings.theme);
    
    // Apply reading mode
    readerContent.setAttribute('data-mode', readerSettings.mode);
    
    // Apply page gap to all images
    document.querySelectorAll('.image-container').forEach(container => {
        container.style.marginBottom = `${readerSettings.pageGap}px`;
    });
    
    // Apply zoom settings
    document.querySelectorAll('.chapter-images img').forEach(img => {
        applyImageSettings(img);
    });
    
    // Save settings
    localStorage.setItem('fmccomic_reader_settings', JSON.stringify(readerSettings));
}

function updateNavigation(navigation) {
    // Update button states
    prevChapterBtn.disabled = !navigation?.prev;
    nextChapterBtn.disabled = !navigation?.next;
    
    // Set button click handlers
    if (navigation?.prev) {
        prevChapterBtn.onclick = () => navigateToChapter(navigation.prev);
        navLeft.onclick = () => navigateToChapter(navigation.prev);
    }
    
    if (navigation?.next) {
        nextChapterBtn.onclick = () => navigateToChapter(navigation.next);
        navRight.onclick = () => navigateToChapter(navigation.next);
    }
}

function navigateToChapter(chapterSlug) {
    // Save current scroll position
    saveReadingProgress();
    
    // Update URL without page reload for better UX
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('chapter', chapterSlug);
    window.history.pushState({}, '', newUrl);
    
    // Load new chapter
    loadChapter(chapterSlug);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function saveReadingProgress() {
    if (!currentChapterSlug) return;
    
    // Save current chapter
    localStorage.setItem('fmccomic_last_read', currentChapterSlug);
    
    // Save scroll position for current chapter
    const scrollPosition = window.scrollY;
    localStorage.setItem(`fmccomic_progress_${currentChapterSlug}`, scrollPosition.toString());
}

function loadReadingProgress() {
    // Load reader settings
    const savedSettings = localStorage.getItem('fmccomic_reader_settings');
    if (savedSettings) {
        readerSettings = { ...readerSettings, ...JSON.parse(savedSettings) };
        applyReaderSettings();
    }
    
    // Apply settings to controls
    document.getElementById('zoomLevel').value = readerSettings.zoom;
    document.getElementById('readingMode').value = readerSettings.mode;
    document.getElementById('theme').value = readerSettings.theme;
    document.getElementById('pageGap').value = readerSettings.pageGap;
    document.getElementById('gapValue').textContent = `${readerSettings.pageGap}px`;
    
    // Load last scroll position
    const urlParams = new URLSearchParams(window.location.search);
    const chapterSlug = urlParams.get('chapter');
    
    if (chapterSlug) {
        const savedPosition = localStorage.getItem(`fmccomic_progress_${chapterSlug}`);
        if (savedPosition) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedPosition));
            }, 500);
        }
    }
}

// Event Handlers
function toggleHeader() {
    readerSettings.headerVisible = !readerSettings.headerVisible;
    
    if (readerSettings.headerVisible) {
        readerHeader.classList.remove('hidden');
    } else {
        readerHeader.classList.add('hidden');
    }
}

function toggleSettings() {
    readerSettingsPanel.classList.toggle('show');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
}

// Touch Navigation
function setupTouchNavigation() {
    let touchStartX = 0;
    let touchStartY = 0;
    const touchThreshold = 50;
    const verticalThreshold = 100;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    });
    
    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Only trigger if horizontal swipe and not too much vertical movement
        if (Math.abs(diffY) < verticalThreshold) {
            if (Math.abs(diffX) > touchThreshold) {
                if (diffX > 0 && nextChapterBtn && !nextChapterBtn.disabled) {
                    // Swipe left -> next chapter
                    navigateToChapter(currentChapterData?.navigation?.next);
                } else if (diffX < 0 && prevChapterBtn && !prevChapterBtn.disabled) {
                    // Swipe right -> previous chapter
                    navigateToChapter(currentChapterData?.navigation?.prev);
                }
            }
        }
    });
}

// Mouse Click Navigation
function setupClickNavigation() {
    document.addEventListener('click', (e) => {
        const windowWidth = window.innerWidth;
        const clickX = e.clientX;
        
        // Only handle clicks on images or empty areas
        if (e.target.tagName !== 'IMG' && !e.target.classList.contains('image-container')) {
            return;
        }
        
        // Left 30% of screen -> previous chapter
        if (clickX < windowWidth * 0.3 && prevChapterBtn && !prevChapterBtn.disabled) {
            navigateToChapter(currentChapterData?.navigation?.prev);
        }
        // Right 30% of screen -> next chapter
        else if (clickX > windowWidth * 0.7 && nextChapterBtn && !nextChapterBtn.disabled) {
            navigateToChapter(currentChapterData?.navigation?.next);
        }
        // Center 40% -> toggle header
        else {
            toggleHeader();
        }
    });
}

// Keyboard Navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                if (prevChapterBtn && !prevChapterBtn.disabled) {
                    navigateToChapter(currentChapterData?.navigation?.prev);
                }
                break;
                
            case 'ArrowRight':
                if (nextChapterBtn && !nextChapterBtn.disabled) {
                    navigateToChapter(currentChapterData?.navigation?.next);
                }
                break;
                
            case ' ':
                // Space bar toggles header
                e.preventDefault();
                toggleHeader();
                break;
                
            case 'Escape':
                if (document.fullscreenElement) {
                    toggleFullscreen();
                }
                if (readerSettingsPanel.classList.contains('show')) {
                    toggleSettings();
                }
                break;
                
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
        }
    });
}

// Initialize
function init() {
    // Load initial chapter
    const urlParams = new URLSearchParams(window.location.search);
    const chapterSlug = urlParams.get('chapter');
    loadChapter(chapterSlug);
    
    // Load saved settings and progress
    loadReadingProgress();
    
    // Setup event listeners
    settingsBtn.addEventListener('click', toggleSettings);
    closeSettingsBtn.addEventListener('click', toggleSettings);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Setup settings controls
    document.getElementById('zoomLevel').addEventListener('change', (e) => {
        readerSettings.zoom = e.target.value;
        applyReaderSettings();
    });
    
    document.getElementById('readingMode').addEventListener('change', (e) => {
        readerSettings.mode = e.target.value;
        applyReaderSettings();
    });
    
    document.getElementById('theme').addEventListener('change', (e) => {
        readerSettings.theme = e.target.value;
        applyReaderSettings();
    });
    
    document.getElementById('pageGap').addEventListener('input', (e) => {
        readerSettings.pageGap = parseInt(e.target.value);
        document.getElementById('gapValue').textContent = `${readerSettings.pageGap}px`;
        applyReaderSettings();
    });
    
    // Setup navigation
    setupTouchNavigation();
    setupClickNavigation();
    setupKeyboardNavigation();
    
    // Handle back/forward browser navigation
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const chapterSlug = urlParams.get('chapter');
        loadChapter(chapterSlug);
    });
    
    // Auto-hide header on scroll
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            readerHeader.classList.add('hidden');
        } else {
            // Scrolling up
            readerHeader.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
}

// Add CSS for reader
const readerCSS = `
    .reader-mode {
        background: #000;
    }
    
    .reader-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        padding: 1rem 0;
        z-index: 1000;
        transition: transform 0.3s ease;
    }
    
    .reader-header.hidden {
        transform: translateY(-100%);
    }
    
    .reader-header .container {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .reader-back-btn {
        color: var(--light);
        font-size: 1.5rem;
        text-decoration: none;
        padding: 0.5rem;
        transition: var(--transition);
    }
    
    .reader-back-btn:hover {
        color: var(--primary);
        transform: translateX(-3px);
    }
    
    .reader-title {
        color: var(--light);
        font-weight: 600;
        text-align: center;
        flex: 1;
        margin: 0 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .reader-controls {
        display: flex;
        gap: 0.5rem;
    }
    
    .control-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: var(--light);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .control-btn:hover {
        background: var(--primary);
        transform: scale(1.1);
    }
    
    .reader-settings {
        position: fixed;
        top: 0;
        right: -300px;
        width: 300px;
        height: 100%;
        background: var(--dark-light);
        z-index: 1001;
        transition: right 0.3s ease;
        box-shadow: -5px 0 20px rgba(0, 0, 0, 0.3);
    }
    
    .reader-settings.show {
        right: 0;
    }
    
    .settings-header {
        padding: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .settings-header h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--light);
    }
    
    .close-settings {
        background: none;
        border: none;
        color: var(--gray);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        transition: var(--transition);
    }
    
    .close-settings:hover {
        color: var(--primary);
        transform: rotate(90deg);
    }
    
    .settings-content {
        padding: 1.5rem;
    }
    
    .setting-group {
        margin-bottom: 1.5rem;
    }
    
    .setting-group label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--light);
        margin-bottom: 0.5rem;
        font-weight: 500;
    }
    
    .setting-group select,
    .setting-group input[type="range"] {
        width: 100%;
        padding: 0.75rem;
        background: var(--dark);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius);
        color: var(--light);
        font-size: 1rem;
    }
    
    .setting-group select:focus,
    .setting-group input[type="range"]:focus {
        outline: none;
        border-color: var(--primary);
    }
    
    .reader-content {
        min-height: 100vh;
        padding: 80px 0 100px;
    }
    
    .reader-content[data-mode="vertical"] .chapter-images {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .reader-content[data-mode="horizontal"] .chapter-images {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        height: 100vh;
        scroll-snap-type: x mandatory;
    }
    
    .reader-content[data-mode="horizontal"] .image-container {
        flex: 0 0 100vw;
        height: 100vh;
        scroll-snap-align: start;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .reader-content[data-mode="horizontal"] .image-container img {
        max-height: 100vh;
        object-fit: contain;
    }
    
    .chapter-images {
        max-width: 900px;
        margin: 0 auto;
    }
    
    .image-container {
        position: relative;
        background: var(--dark);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 10px;
        transition: opacity 0.3s ease;
    }
    
    .image-container img {
        width: 100%;
        height: auto;
        display: block;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .image-container img.loaded {
        opacity: 1;
    }
    
    .image-error {
        padding: 3rem 1rem;
        text-align: center;
        color: var(--gray);
    }
    
    .image-error i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: var(--primary);
    }
    
    .no-images {
        text-align: center;
        padding: 4rem 1rem;
        color: var(--gray);
    }
    
    .reader-navigation {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        z-index: 999;
    }
    
    .nav-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
        font-weight: 600;
        transition: var(--transition);
    }
    
    .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: var(--gray);
    }
    
    .nav-btn:not(:disabled):hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    .chapter-nav-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 998;
        display: flex;
    }
    
    .nav-left,
    .nav-right {
        flex: 1;
        pointer-events: auto;
        display: flex;
        align-items: center;
        padding: 2rem;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .nav-left:hover,
    .nav-right:hover {
        opacity: 0.3;
    }
    
    .nav-left {
        justify-content: flex-start;
        background: linear-gradient(to right, rgba(0,0,0,0.5), transparent);
    }
    
    .nav-right {
        justify-content: flex-end;
        background: linear-gradient(to left, rgba(0,0,0,0.5), transparent);
    }
    
    .nav-center {
        flex: 2;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 80px;
    }
    
    .chapter-info {
        background: rgba(26, 26, 26, 0.8);
        backdrop-filter: blur(10px);
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        color: var(--light);
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        pointer-events: auto;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .chapter-info:hover {
        opacity: 1;
    }
    
    .chapter-info i {
        color: var(--primary);
        font-size: 0.8rem;
    }
    
    /* Themes */
    [data-theme="light"] {
        background: #f5f5f5;
    }
    
    [data-theme="light"] .reader-content,
    [data-theme="light"] .reader-header,
    [data-theme="light"] .reader-settings {
        background: rgba(245, 245, 245, 0.95);
    }
    
    [data-theme="light"] .reader-title,
    [data-theme="light"] .chapter-info {
        color: #333;
    }
    
    [data-theme="sepia"] {
        background: #f4ecd8;
    }
    
    [data-theme="sepia"] .reader-content,
    [data-theme="sepia"] .reader-header,
    [data-theme="sepia"] .reader-settings {
        background: rgba(244, 236, 216, 0.95);
    }
    
    [data-theme="sepia"] .reader-title,
    [data-theme="sepia"] .chapter-info {
        color: #5d4037;
    }
    
    .error-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--light);
    }
    
    .error-state i {
        font-size: 4rem;
        color: var(--primary);
        margin-bottom: 1.5rem;
    }
    
    .error-state h3 {
        margin-bottom: 2rem;
    }
    
    .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 2rem;
        background: var(--primary);
        color: white;
        text-decoration: none;
        border-radius: var(--radius);
        transition: var(--transition);
    }
    
    .back-btn:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    @media (max-width: 768px) {
        .reader-settings {
            width: 100%;
            right: -100%;
        }
        
        .reader-title {
            font-size: 0.9rem;
        }
        
        .nav-btn span {
            display: none;
        }
        
        .nav-btn {
            padding: 1rem;
        }
    }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = readerCSS;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);