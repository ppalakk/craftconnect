/* CraftConnect — Sidebar Controller */

(function () {
    'use strict';

    function isDesktop() {
        return window.innerWidth >= 900;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const sidebar  = document.getElementById('appSidebar');
        const overlay  = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('closeSidebar');
        const hamBtn   = document.getElementById('hamburgerBtn');

        if (!sidebar) return;

        /* ── Open / Close helpers ─────────────────────── */
        function openSidebar() {
            sidebar.classList.add('open');
            if (overlay && !isDesktop()) overlay.classList.add('open');
            document.body.style.overflow = isDesktop() ? '' : 'hidden';
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        function toggleSidebar() {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        }

        /* ── Expose globally so HTML onclick can call them ── */
        window.openSidebar  = openSidebar;
        window.closeSidebar = closeSidebar;
        window.toggleSidebar = toggleSidebar;

        /* ── Triggers ─────────────────────────────────── */
        // Hamburger button
        if (hamBtn) hamBtn.addEventListener('click', toggleSidebar);

        // Close button inside sidebar
        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

        // Backdrop overlay
        if (overlay) overlay.addEventListener('click', closeSidebar);

        // Logo click on mobile also opens sidebar
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.addEventListener('click', () => {
                if (!isDesktop()) toggleSidebar();
            });
            logo.style.cursor = isDesktop() ? 'default' : 'pointer';
        }

        /* ── Sidebar nav items: close drawer on mobile after nav ── */
        sidebar.querySelectorAll(".sidebar-nav-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const screenId = btn.dataset.screen;
                if (screenId && window.showScreen) window.showScreen(screenId);
                if (!isDesktop()) closeSidebar();
            });
        });

        /* ── Highlight active nav item ─────────────────── */
        function updateSidebarActiveItem(screenId) {
            sidebar.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.screen === screenId);
            });
        }

        // Hook into showScreen
        const origShowScreen = window.showScreen;
        window.showScreen = function (screenId) {
            if (origShowScreen) origShowScreen(screenId);
            updateSidebarActiveItem(screenId);
            if (!isDesktop()) closeSidebar();
        };

        // Initial active state
        updateSidebarActiveItem('home');

        /* ── Responsive: close mobile drawer on resize to desktop ── */
        window.addEventListener('resize', () => {
            if (isDesktop()) {
                // On desktop the sidebar is always visible via CSS
                overlay && overlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    });
})();