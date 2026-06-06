// ================================================
// auth-middleware.js
// Middleware untuk cek authentication dan authorization
// Include di semua halaman yang memerlukan login
// ================================================

const API_URL = 'http://localhost:8000/api/auth';

// Definisi halaman dan role yang bisa mengakses
const PAGE_ACCESS = {
    // Admin bisa akses semua halaman
    'index.html': ['admin'],
    'medicine-stock.html': ['admin'],
    'medicine-transaction.html': ['admin', 'staff', 'kepala_instalasi'],
    'medicine-report.html': ['admin', 'kepala_instalasi'],
    'calendar.html': ['admin', 'staff', 'kepala_instalasi'],
    'users-management.html': ['admin'],
    
    // Dashboard untuk masing-masing role
    'dashboard-staff.html': ['staff'],
    'dashboard-kepala-instalasi.html': ['kepala_instalasi']
};

// Function untuk check authentication
async function checkAuth() {
    const user = localStorage.getItem('user');
    
    if (!user) {
        // User belum login
        redirectToLogin();
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/check`);
        const result = await response.json();
        
        if (!result.success) {
            // Session expired
            localStorage.removeItem('user');
            redirectToLogin();
            return false;
        }
        
        // Check authorization
        const currentPage = window.location.pathname.split('/').pop();
        const userData = JSON.parse(user);
        
        if (PAGE_ACCESS[currentPage] && !PAGE_ACCESS[currentPage].includes(userData.role)) {
            alert('Anda tidak memiliki akses ke halaman ini!');
            
            // Redirect ke halaman sesuai role
            let redirectUrl = 'login.html';
            
            if (userData.role === 'admin') {
                redirectUrl = 'index.html';
            } else if (userData.role === 'staff') {
                redirectUrl = 'dashboard-staff.html';
            } else if (userData.role === 'kepala_instalasi') {
                redirectUrl = 'dashboard-kepala-instalasi.html';
            }
            
            window.location.href = redirectUrl;
            return false;
        }
        
        // Update profile info di navbar jika ada
        updateNavbarProfile(userData);
        
        return true;
    } catch (error) {
        console.error('Error checking auth:', error);
        redirectToLogin();
        return false;
    }
}

// Function untuk redirect ke login
function redirectToLogin() {
    if (!window.location.pathname.includes('login.html')) {
        alert('Silakan login terlebih dahulu');
        window.location.href = 'login.html';
    }
}

// Function untuk update profile di navbar
function updateNavbarProfile(userData) {
    const profileName = document.querySelector('.profile-name');
    const profileInfoName = document.querySelector('.profile-info-name');
    const profileInfoEmail = document.querySelector('.profile-info-email');
    
    if (profileName) {
        if (userData.role === 'admin') {
            profileName.textContent = 'Admin';
        } else if (userData.role === 'staff') {
            profileName.textContent = 'Staff';
        } else if (userData.role === 'kepala_instalasi') {
            profileName.textContent = 'Kepala Instalasi';
        }
    }
    
    if (profileInfoName) {
        profileInfoName.textContent = userData.nama_lengkap;
    }
    
    if (profileInfoEmail) {
        profileInfoEmail.textContent = userData.email;
    }
}

// Function untuk logout
async function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        try {
            const response = await fetch(`${API_URL}/logout`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                localStorage.removeItem('user');
                alert('Anda telah keluar');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error:', error);
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    }
}

// Setup logout buttons
function setupLogoutButtons() {
    const logoutButtons = document.querySelectorAll('.logout, a[href*="logout"]');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

// Run authentication check on page load
window.addEventListener('DOMContentLoaded', async function() {
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
        setupLogoutButtons();
    }
});

// Export functions for use in other scripts
window.authMiddleware = {
    checkAuth,
    handleLogout,
    updateNavbarProfile
};