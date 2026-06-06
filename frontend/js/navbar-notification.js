// ================================================
// navbar-notification.js (FIXED VERSION)
// Sistem notifikasi obat kedaluwarsa di navbar
// ================================================

const TRANSACTION_API_URL = 'http://localhost:8000/api/transaction';

// ================================================
// Check expiry status
// ================================================
function checkExpiryStatus(expiryDate) {
    if (!expiryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffDays < 0) {
        return {
            status: 'expired',
            color: '#dc2626',
            icon: '<img src="assets/icons/expired.svg" alt="Expired" style="width: 30px; height: 24px;">',
            label: 'KEDALUWARSA',
            days: Math.abs(diffDays)
        };
    } else if (diffDays <= 30) {
        return {
            status: 'critical',
            color: '#dc2626',
            icon: '<img src="assets/icons/red-circle.svg" alt="Critical" style="width: 24px; height: 24px;">',
            label: '≤ 1 BULAN',
            days: diffDays
        };
    } else if (diffDays <= 90) {
        return {
            status: 'warning',
            color: '#f59e0b',
            icon: '<img src="assets/icons/orange-circle.svg" alt="Warning" style="width: 24px; height: 24px;">',
            label: '≤ 3 BULAN',
            days: diffDays,
            months: diffMonths
        };
    } else if (diffDays <= 180) {
        return {
            status: 'caution',
            color: '#10b981',
            icon: '<img src="assets/icons/green-circle.svg" alt="Caution" style="width: 24px; height: 24px;">',
            label: '≤ 6 BULAN',
            days: diffDays,
            months: diffMonths
        };
    }
    
    return null;
}

// ================================================
// Load expiring medicines untuk notifikasi
// ================================================
async function loadExpiryNotifications() {
    try {
        // Tampilkan loading state
        updateNotificationBadge('...');
        
        const response = await fetch(TRANSACTION_API_URL + '?tipe=masuk');
        const result = await response.json();
        
        if (result.success) {
            const transactions = result.data;
            
            // Group obat yang sama dengan tanggal kedaluwarsa berbeda
            const medicineMap = new Map();
            
            transactions.forEach(function(t) {
                if (t.tanggal_kedaluwarsa) {
                    const key = t.id_obat + '_' + t.tanggal_kedaluwarsa;
                    
                    if (!medicineMap.has(key)) {
                        medicineMap.set(key, {
                            id_obat: t.id_obat,
                            nama_obat: t.nama_obat,
                            dosis: t.dosis,
                            tanggal_kedaluwarsa: t.tanggal_kedaluwarsa,
                            total_jumlah: 0,
                            satuan: t.satuan
                        });
                    }
                    
                    const item = medicineMap.get(key);
                    item.total_jumlah += parseInt(t.jumlah) || 0;
                }
            });
            
            // Convert Map to Array dan filter yang perlu alert (≤ 6 bulan)
            const expiringItems = Array.from(medicineMap.values())
                .map(function(item) {
                    const status = checkExpiryStatus(item.tanggal_kedaluwarsa);
                    return {
                        id_obat: item.id_obat,
                        nama_obat: item.nama_obat,
                        dosis: item.dosis,
                        tanggal_kedaluwarsa: item.tanggal_kedaluwarsa,
                        total_jumlah: item.total_jumlah,
                        satuan: item.satuan,
                        expiryStatus: status
                    };
                })
                .filter(function(item) {
                    return item.expiryStatus !== null;
                })
                .sort(function(a, b) {
                    // Sort by urgency
                    const order = { expired: 0, critical: 1, warning: 2, caution: 3 };
                    const urgencyDiff = order[a.expiryStatus.status] - order[b.expiryStatus.status];
                    
                    if (urgencyDiff !== 0) return urgencyDiff;
                    
                    // If same urgency, sort by date (earliest first)
                    return new Date(a.tanggal_kedaluwarsa) - new Date(b.tanggal_kedaluwarsa);
                });
            
            updateNotificationBadge(expiringItems.length);
            renderNotificationDropdown(expiringItems);
            
            console.log('Loaded', expiringItems.length, 'expiring items');
        } else {
            console.error('Error loading notifications:', result.message);
            updateNotificationBadge(0);
        }
    } catch (error) {
        console.error('Error loading expiry notifications:', error);
        updateNotificationBadge(0);
    }
}

// ================================================
// Update notification badge
// ================================================
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (count === '...') {
            badge.textContent = '...';
            badge.style.display = 'flex';
            return;
        }
        
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
            badge.classList.add('has-alert');
            
            // Tambahkan animasi pulse jika ada item
            badge.style.animation = 'pulse-notification 2s infinite';
        } else {
            badge.textContent = '0';
            badge.style.display = 'none';
            badge.classList.remove('has-alert');
        }
    }
}

// ================================================
// Render notification dropdown
// ================================================
function renderNotificationDropdown(items) {
    // Cari atau buat dropdown container
    let dropdown = document.querySelector('.notification-dropdown');
    
    if (!dropdown) {
        // Buat dropdown baru
        dropdown = document.createElement('div');
        dropdown.className = 'notification-dropdown';
        
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) {
            notificationBtn.style.position = 'relative';
            notificationBtn.appendChild(dropdown);
        } else {
            console.error('Notification button not found');
            return;
        }
    }
    
    if (items.length === 0) {
        dropdown.innerHTML = 
            '<div class="notification-header">' +
                '<h3>Notifikasi Kedaluwarsa</h3>' +
            '</div>' +
            '<div class="notification-empty">' +
                '<div style="font-size: 48px; margin-bottom: 12px;">✅</div>' +
                '<p>Tidak ada obat yang akan kedaluwarsa</p>' +
                '<small style="color: #9ca3af; font-size: 12px;">Semua obat dalam kondisi baik</small>' +
            '</div>';
        return;
    }
    
    // Group by status
    const grouped = {
        expired: items.filter(function(i) { return i.expiryStatus.status === 'expired'; }),
        critical: items.filter(function(i) { return i.expiryStatus.status === 'critical'; }),
        warning: items.filter(function(i) { return i.expiryStatus.status === 'warning'; }),
        caution: items.filter(function(i) { return i.expiryStatus.status === 'caution'; })
    };
    
    let html = 
        '<div class="notification-header">' +
            '<h3>Notifikasi Kedaluwarsa</h3>' +
            '<span class="notification-count">' + items.length + ' item</span>' +
        '</div>';
    
    // Summary stats
    if (grouped.expired.length > 0 || grouped.critical.length > 0 || grouped.warning.length > 0 || grouped.caution.length > 0) {
        html += '<div class="notification-summary">';
        
        if (grouped.expired.length > 0) {
            html += 
                '<div class="notification-stat expired">' +
                    '<span class="stat-icon"><img src="assets/icons/expired.svg" alt="Expired" style="width: 20px; height: 20px;"></span>' +
                    '<span class="stat-label">Kedaluwarsa</span>' +
                    '<span class="stat-value">' + grouped.expired.length + '</span>' +
                '</div>';
        }
        
        if (grouped.critical.length > 0) {
            html += 
                '<div class="notification-stat critical">' +
                    '<span class="stat-icon"><img src="assets/icons/red-circle.svg" alt="Critical" style="width: 20px; height: 20px;"></span>' +
                    '<span class="stat-label">≤ 1 Bulan</span>' +
                    '<span class="stat-value">' + grouped.critical.length + '</span>' +
                '</div>';
        }
        
        if (grouped.warning.length > 0) {
            html += 
                '<div class="notification-stat warning">' +
                    '<span class="stat-icon"><img src="assets/icons/orange-circle.svg" alt="Warning" style="width: 20px; height: 20px;"></span>' +
                    '<span class="stat-label">≤ 3 Bulan</span>' +
                    '<span class="stat-value">' + grouped.warning.length + '</span>' +
                '</div>';
        }
        
        if (grouped.caution.length > 0) {
            html += 
                '<div class="notification-stat caution">' +
                    '<span class="stat-icon"><img src="assets/icons/green-circle.svg" alt="Caution" style="width: 20px; height: 20px;"></span>' +
                    '<span class="stat-label">≤ 6 Bulan</span>' +
                    '<span class="stat-value">' + grouped.caution.length + '</span>' +
                '</div>';
        }
        
        html += '</div>';
    }
    
    html += '<div class="notification-list">';
    
    // Tampilkan semua item (tidak dibatasi)
    items.forEach(function(item) {
        const status = item.expiryStatus;
        const dateStr = new Date(item.tanggal_kedaluwarsa).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        let timeLeft = '';
        if (status.status === 'expired') {
            timeLeft = status.days + ' hari lalu';
        } else if (status.months > 0) {
            timeLeft = status.months + ' bulan lagi';
        } else {
            timeLeft = status.days + ' hari lagi';
        }
        
        html += 
            '<div class="notification-item ' + status.status + '">' +
                '<div class="notification-icon">' + status.icon + '</div>' +
                '<div class="notification-content">' +
                    '<div class="notification-title">' + item.nama_obat + '</div>' +
                    '<div class="notification-meta">' +
                        '<span>' + item.dosis + '</span> • ' +
                        '<span>' + item.total_jumlah + ' ' + item.satuan + '</span>' +
                    '</div>' +
                    '<div class="notification-time" style="color: ' + status.color + ';">' +
                        '<strong>' + dateStr + '</strong> • ' + timeLeft +
                    '</div>' +
                '</div>' +
            '</div>';
    });
    
    html += '</div>';
    
    // Footer dengan info
    const currentTime = new Date().toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    html += 
        '<div class="notification-footer">' +
            '<div style="font-size: 11px; color: #6b7280; text-align: center; padding: 8px 0;">' +
                'Terakhir diperbarui: ' + currentTime +
            '</div>' +
        '</div>';
    
    dropdown.innerHTML = html;
}

// ================================================
// Toggle notification dropdown
// ================================================
function setupNotificationToggle() {
    const notificationBtn = document.querySelector('.notification-btn');
    
    if (notificationBtn) {
        // Remove existing listeners
        const newBtn = notificationBtn.cloneNode(true);
        notificationBtn.parentNode.replaceChild(newBtn, notificationBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const dropdown = document.querySelector('.notification-dropdown');
            
            if (dropdown) {
                const isCurrentlyShown = dropdown.classList.contains('show');
                
                // Close all other dropdowns
                document.querySelectorAll('.dropdown-menu, .notification-dropdown').forEach(d => {
                    d.classList.remove('show');
                });
                
                // Toggle this dropdown
                if (!isCurrentlyShown) {
                    dropdown.classList.add('show');
                }
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.querySelector('.notification-dropdown');
        
        if (dropdown && !e.target.closest('.notification-btn')) {
            dropdown.classList.remove('show');
        }
    });
}

// ================================================
// Initialize with retry mechanism
// ================================================
function initializeNotifications() {
    // Check if API endpoint is available
    const checkInterval = setInterval(() => {
        if (typeof window.fetch !== 'undefined') {
            clearInterval(checkInterval);
            
            loadExpiryNotifications();
            setupNotificationToggle();
            
            // Refresh every 5 minutes
            setInterval(loadExpiryNotifications, 5 * 60 * 1000);
            
            console.log('Expiry notification system initialized');
        }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 5000);
}

// ================================================
// Initialize on DOM ready
// ================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
    initializeNotifications();
}

// Export untuk digunakan di halaman lain
window.expiryNotification = {
    loadExpiryNotifications,
    updateNotificationBadge,
    checkExpiryStatus,
    refresh: loadExpiryNotifications
};