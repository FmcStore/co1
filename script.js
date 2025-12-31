// Konfigurasi
const PROXY_URL = 'https://api.nekolabs.web.id/px?url=';
const API_BASE = 'https://www.sankavollerei.com/comic/komikcast';
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

// State
let homeData = null;
let searchTimeout = null;
let searchPage = 1;
let hasMoreSearchResults = false;

// DOM Elements
const loadingScreen = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const searchResults = document.getElementById('searchResults');
const hotComicsGrid = document.getElementById('hotComics');
const recommendedComicsGrid = document.getElementById('recommendedComics');
const latestUpdatesContainer = document.getElementById('latestUpdates');

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
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function getTimeAgo(timeString) {
    const now = new Date();
    const time = new Date(timeString);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return formatDate(timeString);
}

// Comic Card Template
function createComicCard(comic) {
    const card = document.createElement('div');
    card.className = 'comic-card';
    card.dataset.slug = comic.slug;
    
    card.innerHTML = `
        <div class="comic-image">
            <img src="${comic.image}" alt="${comic.title}" loading="lazy">
            <span class="comic-badge">${comic.type || 'Manga'}</span>
        </div>
        <div class="comic-info">
            <h3 class="comic-title">${comic.title}</h3>
            <div class="comic-meta">
                <span class="comic-type">${comic.type || 'Manga'}</span>
                <span class="comic-rating">
                    <i class="fas fa-star"></i>
                    ${comic.rating || 'N/A'}
                </span>
            </div>
            <div class="comic-chapter">
                ${comic.latestChapter || comic.chapter || 'Ch. ?'}
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openDetailPage(comic.slug));
    return card;
}

// Update Item Template
function createUpdateItem(update) {
    const item = document.createElement('div');
    item.className = 'update-item';
    item.dataset.slug = update.slug;
    
    const chaptersHTML = update.chapters ? update.chapters.slice(0, 3).map(chapter => `
        <div class="chapter-item">
            <span class="chapter-title">${chapter.title}</span>
            <span class="chapter-time">${getTimeAgo(chapter.time)}</span>
        </div>
    `).join('') : '';
    
    item.innerHTML = `
        <div class="update-image">
            <img src="${update.image}" alt="${update.title}" loading="lazy">
        </div>
        <div class="update-content">
            <h3 class="update-title">${update.title}</h3>
            <div class="update-meta">
                <span class="update-type">${update.type || 'Manga'}</span>
                <span class="update-chapter-count">${update.chapters?.length || 0} Chapter</span>
            </div>
            <div class="update-chapters">
                ${chaptersHTML}
            </div>
        </div>
    `;
    
    item.addEventListener('click', () => openDetailPage(update.slug));
    return item;
}

// Search Result Template
function createSearchResultItem(comic) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.dataset.slug = comic.slug;
    
    item.innerHTML = `
        <img src="${comic.image}" alt="${comic.title}" loading="lazy">
        <div class="search-result-info">
            <h4>${comic.title}</h4>
            <p>${comic.type || 'Manga'} • Rating: ${comic.rating || 'N/A'} • ${comic.latestChapter || 'Ch. ?'}</p>
        </div>
    `;
    
    item.addEventListener('click', () => {
        openDetailPage(comic.slug);
        searchResults.classList.remove('active');
        searchInput.value = '';
    });
    
    return item;
}

// Navigation Functions
function openDetailPage(slug) {
    window.location.href = `detail.html?slug=${slug}`;
}

function openReaderPage(chapterSlug) {
    window.location.href = `reader.html?chapter=${chapterSlug}`;
}

// Load Home Data
async function loadHomeData() {
    try {
        showLoading();
        
        const data = await fetchWithProxy(`${API_BASE}/home`);
        
        if (data && data.success) {
            homeData = data.data;
            
            // Render Hot Comics
            renderHotComics(homeData.hotUpdates);
            
            // Render Recommended Comics
            renderRecommendedComics(homeData.projectUpdates);
            
            // Render Latest Updates
            renderLatestUpdates(homeData.latestReleases);
            
            // Initialize Swiper
            initSwiper();
        }
    } catch (error) {
        console.error('Error loading home data:', error);
        showError('Gagal memuat data. Silakan coba lagi.');
    } finally {
        hideLoading();
    }
}

function renderHotComics(comics) {
    hotComicsGrid.innerHTML = '';
    comics.slice(0, 8).forEach(comic => {
        hotComicsGrid.appendChild(createComicCard(comic));
    });
}

function renderRecommendedComics(comics) {
    recommendedComicsGrid.innerHTML = '';
    comics.slice(0, 8).forEach(comic => {
        recommendedComicsGrid.appendChild(createComicCard(comic));
    });
}

function renderLatestUpdates(updates) {
    latestUpdatesContainer.innerHTML = '';
    updates.slice(0, 10).forEach(update => {
        latestUpdatesContainer.appendChild(createUpdateItem(update));
    });
}

function initSwiper() {
    if (!homeData || !homeData.hotUpdates) return;
    
    const swiperWrapper = document.querySelector('.heroSwiper .swiper-wrapper');
    swiperWrapper.innerHTML = '';
    
    // Ambil 5 komik teratas untuk banner
    homeData.hotUpdates.slice(0, 5).forEach(comic => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `
            <img src="${comic.image}" alt="${comic.title}">
            <div class="banner-overlay">
                <h3>${comic.title}</h3>
                <p>${comic.type} • ${comic.rating} ⭐</p>
            </div>
        `;
        swiperWrapper.appendChild(slide);
    });
    
    // Initialize Swiper
    new Swiper('.heroSwiper', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
    });
}

// Search Functionality
async function performSearch(query, page = 1) {
    try {
        if (!query.trim()) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }
        
        const encodedQuery = encodeURIComponent(query);
        const data = await fetchWithProxy(`${API_BASE}/search/${encodedQuery}/${page}`);
        
        if (data && data.success) {
            searchResults.innerHTML = '';
            
            if (data.data.length === 0) {
                searchResults.innerHTML = '<div class="search-result-item">Tidak ditemukan</div>';
                searchResults.classList.add('active');
                return;
            }
            
            data.data.forEach(comic => {
                searchResults.appendChild(createSearchResultItem(comic));
            });
            
            // Check pagination
            hasMoreSearchResults = data.pagination?.hasNextPage || false;
            searchPage = page;
            
            // Add load more button if needed
            if (hasMoreSearchResults) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = 'load-more-btn';
                loadMoreBtn.textContent = 'Muat lebih banyak...';
                loadMoreBtn.addEventListener('click', () => {
                    performSearch(query, searchPage + 1);
                });
                searchResults.appendChild(loadMoreBtn);
            }
            
            searchResults.classList.add('active');
        }
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="search-result-item">Error saat mencari</div>';
        searchResults.classList.add('active');
    }
}

// Loading States
function showLoading() {
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.querySelector('.main-content').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Event Listeners
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        searchResults.classList.remove('active');
        return;
    }
    
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 500);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.classList.remove('active');
    searchInput.focus();
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl + K untuk fokus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Escape untuk clear search
    if (e.key === 'Escape') {
        searchInput.value = '';
        searchResults.classList.remove('active');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHomeData();
    
    // Check for saved scroll position
    const scrollPosition = sessionStorage.getItem('scrollPosition');
    if (scrollPosition) {
        window.scrollTo(0, parseInt(scrollPosition));
        sessionStorage.removeItem('scrollPosition');
    }
});

// Save scroll position before leaving page
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('scrollPosition', window.scrollY.toString());
});