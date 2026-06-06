// ================================================
// navbar-role-manager.js
// Script untuk mengatur navbar berdasarkan role user
// Tambahkan script ini di akhir body SETIAP halaman (kecuali login.html)
// ================================================

(function() {
    'use strict';
    
    console.log('Navbar Role Manager loaded');
    
    // Fungsi untuk setup navbar berdasarkan role
    function setupNavbarByRole() {
        const user = localStorage.getItem('user');
        
        if (!user) {
            return;
        }
        
        try {
            const userData = JSON.parse(user);
            const role = userData.role;
            
            // Update profile display
            updateProfileDisplay(userData);
            
            // Setup menu berdasarkan role
            if (role === 'admin') {
                setupAdminNavbar();
            } else if (role === 'staff') {
                setupStaffNavbar();
            } else if (role === 'kepala_instalasi') {
                setupKepalaInstalasiNavbar();
            }
            
            // Setup logout buttons
            setupLogoutButtons();
            
            // Hide action buttons for kepala instalasi
            if (role === 'kepala_instalasi') {
                hideActionButtons();
            }
            
            // Hide action buttons for staff (tidak bisa edit/hapus di calendar)
            if (role === 'staff') {
                hideStaffActionButtons();
            }
            
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    }
    
    // Update informasi profile di navbar
    function updateProfileDisplay(userData) {
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
    
    // Setup navbar untuk admin (BISA SEMUA)
    function setupAdminNavbar() {
        const navbarMenu = document.querySelector('.navbar-menu');
        if (!navbarMenu) return;
        
        navbarMenu.innerHTML = `
            <a href="index.html" class="nav-link ${isCurrentPage('index.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Halaman Utama</span>
            </a>

            <div class="nav-dropdown">
                <a href="#" class="nav-link ${isCurrentPage(['medicine-stock.html', 'medicine-transaction.html', 'medicine-report.html']) ? 'active' : ''}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    <span>Manajemen Obat</span>
                    <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </a>
                <div class="dropdown-menu">
                    <a href="medicine-stock.html" class="dropdown-item">Daftar Obat</a>
                    <a href="medicine-transaction.html" class="dropdown-item">Obat Keluar/Masuk</a>
                    <a href="medicine-report.html" class="dropdown-item">Laporan</a>
                </div>
            </div>

            <a href="calendar.html" class="nav-link ${isCurrentPage('calendar.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Kalender</span>
            </a>

            <a href="users-management.html" class="nav-link ${isCurrentPage('users-management.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Manajemen Pengguna</span>
            </a>
        `;
    }
    
    // Setup navbar untuk staff (Dashboard + Transaksi Obat + Kalender)
    function setupStaffNavbar() {
        const navbarMenu = document.querySelector('.navbar-menu');
        if (!navbarMenu) return;
        
        navbarMenu.innerHTML = `
            <a href="dashboard-staff.html" class="nav-link ${isCurrentPage('dashboard-staff.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Halaman Utama</span>
            </a>

            <a href="medicine-transaction.html" class="nav-link ${isCurrentPage('medicine-transaction.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Pencatatan Obat</span>
            </a>

            <a href="calendar.html" class="nav-link ${isCurrentPage('calendar.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Kalender</span>
            </a>
        `;
    }
    
    // Setup navbar untuk kepala instalasi (Dashboard + Obat Keluar/Masuk (View) + Laporan + Kalender)
    function setupKepalaInstalasiNavbar() {
        const navbarMenu = document.querySelector('.navbar-menu');
        if (!navbarMenu) return;
        
        navbarMenu.innerHTML = `
            <a href="dashboard-kepala-instalasi.html" class="nav-link ${isCurrentPage('dashboard-kepala-instalasi.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Halaman Utama</span>
            </a>

            <a href="medicine-transaction.html" class="nav-link ${isCurrentPage('medicine-transaction.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Obat Keluar/Masuk</span>
            </a>

            <a href="medicine-report.html" class="nav-link ${isCurrentPage('medicine-report.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>Laporan Obat</span>
            </a>

            <a href="calendar.html" class="nav-link ${isCurrentPage('calendar.html') ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Kalender</span>
            </a>
        `;
    }
    
    // Hide action buttons untuk kepala instalasi (tidak bisa tambah/edit/hapus)
    function hideActionButtons() {
        const currentPage = window.location.pathname.split('/').pop();
        
        // Hide tombol tambah kegiatan di calendar
        const addEventBtn = document.getElementById('addEventBtn');
        if (addEventBtn) {
            addEventBtn.style.display = 'none';
        }
        
        // Hide tombol "Catat Obat Keluar/Masuk" di medicine-transaction.html
        if (currentPage === 'medicine-transaction.html') {
            const addBtn = document.querySelector('.add-btn');
            if (addBtn) {
                addBtn.style.display = 'none';
            }
            
            // PERBAIKAN: TIDAK disable tab buttons, biarkan bisa switch
            // Tab buttons tetap bisa diklik untuk melihat data Keluar dan Masuk
        }
        
        // Hide semua action buttons (edit, hapus) di tabel setelah DOM loaded
        setTimeout(() => {
            const actionBtns = document.querySelectorAll('.edit-btn, .delete-btn, .action-btn');
            actionBtns.forEach(btn => {
                // Jangan hide tombol print dan export di laporan
                if (!btn.classList.contains('btn-print') && 
                    !btn.classList.contains('btn-export') &&
                    !btn.classList.contains('btn-generate')) {
                    btn.style.display = 'none';
                }
            });
            
            // Hide kolom aksi di tabel
            const aksiHeaders = document.querySelectorAll('th');
            aksiHeaders.forEach(th => {
                if (th.textContent.trim() === 'Aksi') {
                    th.style.display = 'none';
                }
            });
            
            const tableRows = document.querySelectorAll('tbody tr');
            tableRows.forEach(row => {
                const lastCell = row.querySelector('td:last-child');
                if (lastCell && (lastCell.querySelector('.edit-btn') || lastCell.querySelector('.delete-btn'))) {
                    lastCell.style.display = 'none';
                }
            });
        }, 500);
    }
    
    // Hide action buttons untuk staff di calendar (tidak bisa tambah/edit/hapus kegiatan)
    function hideStaffActionButtons() {
        const currentPage = window.location.pathname.split('/').pop();
        
        // Jika di halaman calendar, hide tombol tambah kegiatan
        if (currentPage === 'calendar.html') {
            const addEventBtn = document.getElementById('addEventBtn');
            if (addEventBtn) {
                addEventBtn.style.display = 'none';
            }
            
            // Hide action buttons di event cards setelah DOM loaded
            setTimeout(() => {
                const editBtns = document.querySelectorAll('.event-card .edit-btn, .event-card .delete-btn');
                editBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                
                // Hide tombol edit/hapus di modal detail kegiatan
                const detailActions = document.querySelectorAll('#detailActions .btn-primary, #detailActions .btn-delete');
                detailActions.forEach(btn => {
                    btn.style.display = 'none';
                });
            }, 500);
        }
    }
    
    // Check apakah halaman saat ini
    function isCurrentPage(page) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (Array.isArray(page)) {
            return page.includes(currentPage);
        }
        
        return currentPage === page;
    }
    
    // Setup tombol logout
    function setupLogoutButtons() {
        document.querySelectorAll('.logout').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                handleLogout();
            });
        });
    }
    
    // Handle logout
    async function handleLogout() {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            try {
                const response = await fetch('php/auth-api.php?action=logout', {
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
    
    // Jalankan saat halaman dimuat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNavbarByRole);
    } else {
        setupNavbarByRole();
    }
    
})();