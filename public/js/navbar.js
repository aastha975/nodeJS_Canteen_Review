// ============================================================
// navbar.js - Shared Header & Navigation for all HTML pages
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    let user = null;
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        user = data.user;
    } catch (err) {}

    const path = window.location.pathname;

    // Build the navbar HTML
    const navHTML = `
    <header class="app-header">
        <div class="header-inner">
            <a href="dashboard.html" class="brand-logo">
                <span class="brand-icon"><i data-lucide="utensils-crossed"></i></span>
                <span class="brand-text">Campus<span class="brand-highlight">Bite</span><span class="brand-sub">TOPSIS Engine</span></span>
            </a>

            <nav class="desktop-nav">
                ${user ? `
                    <a href="dashboard.html" class="nav-item ${path.includes('dashboard') ? 'active' : ''}">
                        <i data-lucide="layout-grid"></i> Dashboard
                    </a>
                    <a href="canteens.html" class="nav-item ${path.includes('canteens') || path.includes('menu') ? 'active' : ''}">
                        <i data-lucide="store"></i> Canteens
                    </a>
                    <a href="dish-compare.html" class="nav-item ${path.includes('dish') ? 'active' : ''}">
                        <i data-lucide="search"></i> Dish Finder
                    </a>
                    <a href="compare.html" class="nav-item ${path.includes('compare') && !path.includes('dish') ? 'active' : ''}">
                        <i data-lucide="trophy"></i> Rankings
                    </a>
                    <a href="analytics.html" class="nav-item ${path.includes('analytics') ? 'active' : ''}">
                        <i data-lucide="bar-chart-3"></i> Analytics
                    </a>
                ` : ''}
            </nav>

            <div class="header-right">
                ${user ? `
                    <div class="user-pill">
                        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                        <div class="user-meta">
                            <span class="user-name">${user.name}</span>
                            <span class="role-badge role-${user.role}">${user.role}</span>
                        </div>
                    </div>
                    <button id="logoutBtn" class="btn btn-ghost btn-sm btn-logout" title="Log out">
                        <i data-lucide="log-out"></i>
                    </button>
                ` : `
                    <a href="index.html" class="btn btn-ghost btn-sm">Log in</a>
                    <a href="register.html" class="btn btn-primary btn-sm">Sign up</a>
                `}
            </div>
        </div>
    </header>
    `;

    // Insert navbar at the top of the body
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Add footer at the bottom
    const footerHTML = `
    <footer class="app-footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="brand-logo footer-logo">
                    <span class="brand-icon small"><i data-lucide="utensils-crossed"></i></span>
                    <span class="brand-text">Campus<span class="brand-highlight">Bite</span></span>
                </div>
                <p class="footer-desc">College Canteen Intelligence & TOPSIS Decision Engine built with Node.js, Express, and PostgreSQL.</p>
            </div>
            <div class="footer-bottom" style="width: 100%; border-top: 1px solid var(--slate-800); padding-top: 1rem; margin-top: 1rem;">
                <p>&copy; ${new Date().getFullYear()} College Canteen Comparison System &bull; Field Project Sem 4</p>
            </div>
        </div>
    </footer>
    `;
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Re-render Lucide icons
    if (window.lucide) lucide.createIcons();

    // Attach logout event
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = 'index.html';
        });
    }
});