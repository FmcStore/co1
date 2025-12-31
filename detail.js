// Konfigurasi
const PROXY_URL = 'https://api.nekolabs.web.id/px?url=';
const API_BASE = 'https://www.sankavollerei.com/comic/komikcast';

// DOM Elements
const loadingScreen = document.getElementById('loading');
const comicDetailContainer = document.getElementById('comicDetail');
const chaptersContainer = document.querySelector('.chapters-container');

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

function formatDate(dateString) {
    if (!dateString) return 'Tidak diketahui';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return as-is if invalid date
    }
    
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Load Comic Detail
async function loadComicDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (!slug) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        showLoading();
        
        const data = await fetchWithProxy(`${API_BASE}/detail/${slug}`);
        
        if (data && data.success) {
            renderComicDetail(data.data);
            renderChapters(data.data.chapters);
        } else {
            throw new Error('Komik tidak ditemukan');
        }
    } catch (error) {
        console.error('Error loading comic detail:', error);
        showError('Gagal memuat detail komik. Silakan coba lagi.');
    } finally {
        hideLoading();
    }
}

function renderComicDetail(detail) {
    const genresHTML = detail.genres?.map(genre => 
        `<span class="genre-tag">${genre.title}</span>`
    ).join('') || '';
    
    comicDetailContainer.innerHTML = `
        <div class="comic-detail-header">
            <div class="comic-poster">
                <img src="${detail.image}" alt="${detail.title}" loading="lazy">
                <div class="comic-actions">
                    <button class="action-btn" id="readFirstBtn">
                        <i class="fas fa-play"></i>
                        Baca Sekarang
                    </button>
                    <button class="action-btn" id="bookmarkBtn">
                        <i class="fas fa-bookmark"></i>
                        Bookmark
                    </button>
                </div>
            </div>
            
            <div class="comic-info">
                <h1 class="comic-title">${detail.title}</h1>
                ${detail.nativeTitle ? `<h3 class="native-title">${detail.nativeTitle}</h3>` : ''}
                
                <div class="comic-meta-grid">
                    <div class="meta-item">
                        <i class="fas fa-star"></i>
                        <div>
                            <span class="meta-label">Rating</span>
                            <span class="meta-value">${detail.rating || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <span class="meta-label">Rilis</span>
                            <span class="meta-value">${detail.released || 'Tidak diketahui'}</span>
                        </div>
                    </div>
                    
                    <div class="meta-item">
                        <i class="fas fa-user-edit"></i>
                        <div>
                            <span class="meta-label">Pengarang</span>
                            <span class="meta-value">${detail.author || 'Tidak diketahui'}</span>
                        </div>
                    </div>
                    
                    <div class="meta-item">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <span class="meta-label">Status</span>
                            <span class="meta-value ${detail.status?.toLowerCase()}">${detail.status || 'Tidak diketahui'}</span>
                        </div>
                    </div>
                    
                    <div class="meta-item">
                        <i class="fas fa-book"></i>
                        <div>
                            <span class="meta-label">Tipe</span>
                            <span class="meta-value">${detail.type || 'Manga'}</span>
                        </div>
                    </div>
                    
                    <div class="meta-item">
                        <i class="fas fa-layer-group"></i>
                        <div>
                            <span class="meta-label">Total Chapter</span>
                            <span class="meta-value">${detail.totalChapters || '?'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="genres-section">
                    <h4><i class="fas fa-tags"></i> Genre</h4>
                    <div class="genres-list">
                        ${genresHTML}
                    </div>
                </div>
                
                <div class="synopsis-section">
                    <h4><i class="fas fa-file-alt"></i> Sinopsis</h4>
                    <p class="synopsis">${detail.synopsis || 'Tidak ada sinopsis.'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to buttons
    const readFirstBtn = document.getElementById('readFirstBtn');
    if (readFirstBtn) {
        readFirstBtn.addEventListener('click', () => {
            const firstChapter = document.querySelector('.chapter-item');
            if (firstChapter) {
                const chapterSlug = firstChapter.dataset.slug;
                openReaderPage(chapterSlug);
            }
        });
    }
    
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', toggleBookmark);
    }
}

function renderChapters(chapters) {
    if (!chapters || chapters.length === 0) {
        chaptersContainer.innerHTML = '<p class="no-chapters">Belum ada chapter.</p>';
        return;
    }
    
    chaptersContainer.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        const chapterItem = document.createElement('div');
        chapterItem.className = 'chapter-item';
        chapterItem.dataset.slug = chapter.slug;
        
        chapterItem.innerHTML = `
            <div class="chapter-info">
                <i class="fas fa-file"></i>
                <span class="chapter-title">${chapter.title}</span>
                <span class="chapter-date">${formatDate(chapter.date)}</span>
            </div>
            <button class="read-chapter-btn" data-slug="${chapter.slug}">
                <i class="fas fa-play"></i>
                Baca
            </button>
        `;
        
        chaptersContainer.appendChild(chapterItem);
    });
    
    // Add event listeners to read buttons
    document.querySelectorAll('.read-chapter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chapterSlug = btn.dataset.slug;
            openReaderPage(chapterSlug);
        });
    });
    
    // Click on chapter item also opens reader
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.addEventListener('click', () => {
            const chapterSlug = item.dataset.slug;
            openReaderPage(chapterSlug);
        });
    });
}

function toggleBookmark() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (!slug) return;
    
    let bookmarks = JSON.parse(localStorage.getItem('fmccomic_bookmarks') || '[]');
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    
    if (bookmarks.includes(slug)) {
        // Remove bookmark
        bookmarks = bookmarks.filter(item => item !== slug);
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmark';
        showNotification('Bookmark dihapus');
    } else {
        // Add bookmark
        bookmarks.push(slug);
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmarked';
        showNotification('Ditambahkan ke bookmark');
    }
    
    localStorage.setItem('fmccomic_bookmarks', JSON.stringify(bookmarks));
}

function openReaderPage(chapterSlug) {
    window.location.href = `reader.html?chapter=${chapterSlug}`;
}

// Loading States
function showLoading() {
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

function showError(message) {
    comicDetailContainer.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${message}</h3>
            <a href="index.html" class="back-home-btn">
                <i class="fas fa-home"></i>
                Kembali ke Beranda
            </a>
        </div>
    `;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add CSS for detail page
const detailCSS = `
    .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: var(--dark-light);
        color: var(--light);
        text-decoration: none;
        border-radius: var(--radius);
        margin: 1rem 0;
        transition: var(--transition);
    }
    
    .back-btn:hover {
        background: var(--primary);
        transform: translateX(-5px);
    }
    
    .comic-detail-header {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 2rem;
        margin: 2rem 0;
    }
    
    .comic-poster {
        position: sticky;
        top: 100px;
    }
    
    .comic-poster img {
        width: 100%;
        border-radius: var(--radius);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        margin-bottom: 1rem;
    }
    
    .comic-actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .action-btn {
        padding: 1rem;
        border: none;
        border-radius: var(--radius);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: var(--transition);
    }
    
    #readFirstBtn {
        background: var(--primary);
        color: white;
    }
    
    #readFirstBtn:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    #bookmarkBtn {
        background: var(--dark-light);
        color: var(--light);
        border: 2px solid var(--gray);
    }
    
    #bookmarkBtn:hover {
        border-color: var(--primary);
        color: var(--primary);
    }
    
    .comic-title {
        font-size: 2rem;
        color: var(--light);
        margin-bottom: 0.5rem;
    }
    
    .native-title {
        font-size: 1.2rem;
        color: var(--gray);
        margin-bottom: 2rem;
        font-weight: normal;
        font-style: italic;
    }
    
    .comic-meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
    }
    
    .meta-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--dark-light);
        border-radius: var(--radius);
    }
    
    .meta-item i {
        font-size: 1.5rem;
        color: var(--primary);
    }
    
    .meta-label {
        display: block;
        font-size: 0.8rem;
        color: var(--gray);
        margin-bottom: 0.25rem;
    }
    
    .meta-value {
        display: block;
        font-size: 1rem;
        color: var(--light);
        font-weight: 600;
    }
    
    .meta-value.ongoing {
        color: var(--success);
    }
    
    .meta-value.completed {
        color: var(--primary);
    }
    
    .genres-section {
        margin: 2rem 0;
    }
    
    .genres-section h4 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--light);
    }
    
    .genres-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .genre-tag {
        padding: 0.5rem 1rem;
        background: var(--dark-light);
        color: var(--light);
        border-radius: 20px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .genre-tag:hover {
        background: var(--primary);
        transform: translateY(-2px);
    }
    
    .synopsis-section {
        margin: 2rem 0;
    }
    
    .synopsis-section h4 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--light);
    }
    
    .synopsis {
        line-height: 1.8;
        color: #ccc;
        font-size: 1.05rem;
    }
    
    .chapters-section {
        margin: 3rem 0;
    }
    
    .chapters-section h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        color: var(--light);
    }
    
    .chapters-container {
        background: var(--dark-light);
        border-radius: var(--radius);
        overflow: hidden;
    }
    
    .chapter-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        transition: var(--transition);
    }
    
    .chapter-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    
    .chapter-item:last-child {
        border-bottom: none;
    }
    
    .chapter-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .chapter-info i {
        color: var(--primary);
    }
    
    .chapter-title {
        font-weight: 500;
        color: var(--light);
    }
    
    .chapter-date {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    .read-chapter-btn {
        padding: 0.5rem 1rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: var(--transition);
    }
    
    .read-chapter-btn:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    .no-chapters {
        text-align: center;
        padding: 3rem;
        color: var(--gray);
    }
    
    .error-state {
        text-align: center;
        padding: 4rem 2rem;
    }
    
    .error-state i {
        font-size: 4rem;
        color: var(--primary);
        margin-bottom: 1.5rem;
    }
    
    .error-state h3 {
        color: var(--light);
        margin-bottom: 2rem;
    }
    
    .back-home-btn {
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
    
    .back-home-btn:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    .notification {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 10000;
    }
    
    .notification.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    @media (max-width: 900px) {
        .comic-detail-header {
            grid-template-columns: 1fr;
        }
        
        .comic-poster {
            position: static;
            max-width: 300px;
            margin: 0 auto;
        }
    }
    
    @media (max-width: 600px) {
        .comic-meta-grid {
            grid-template-columns: 1fr;
        }
        
        .chapter-item {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
        }
        
        .chapter-info {
            justify-content: space-between;
        }
    }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = detailCSS;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadComicDetail();
    
    // Copy search functionality from main page
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (searchInput) {
        // Include search functionality here (similar to script.js)
        // For brevity, you can copy the search functions from script.js
    }
});