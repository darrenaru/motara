// ================================================
// kepala-instalasi-restrictions.js
// Script tambahan untuk membatasi aksi Kepala Instalasi
// Tambahkan di medicine-transaction.html setelah navbar-role-manager.js
// ================================================

(function() {
    'use strict';
    
    // Cek role user
    const user = localStorage.getItem('user');
    if (!user) return;
    
    const userData = JSON.parse(user);
    
    // Hanya jalankan untuk kepala_instalasi
    if (userData.role === 'kepala_instalasi') {
        console.log('Applying Kepala Instalasi restrictions...');
        
        // Fungsi untuk apply restrictions setelah DOM loaded
        function applyRestrictions() {
            // Hide tombol "Catat Obat Keluar/Masuk"
            const addBtn = document.querySelector('.add-btn');
            if (addBtn && addBtn.textContent.includes('Catat')) {
                addBtn.style.display = 'none';
            }
            
            // PERBAIKAN: Tab buttons tetap bisa diklik untuk melihat data
            // Hanya tambahkan visual indicator bahwa ini read-only mode
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                // Jangan disable, biarkan tetap bisa diklik
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
                // Hapus event blocker jika ada
                btn.onclick = null;
            });
            
            // Hide kolom "Aksi" di tabel
            setTimeout(() => {
                // Hide header "Aksi"
                const headers = document.querySelectorAll('th');
                headers.forEach(th => {
                    if (th.textContent.trim() === 'Aksi') {
                        th.style.display = 'none';
                    }
                });
                
                // Hide semua cell dengan action buttons
                const rows = document.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    const lastCell = cells[cells.length - 1];
                    
                    if (lastCell && (lastCell.querySelector('.edit-btn') || 
                                     lastCell.querySelector('.delete-btn') || 
                                     lastCell.querySelector('.action-btn'))) {
                        lastCell.style.display = 'none';
                    }
                });
            }, 600);
            
            // Tambahkan info banner
            const container = document.querySelector('.container');
            if (container && !document.getElementById('kepala-info-banner')) {
                const banner = document.createElement('div');
                banner.id = 'kepala-info-banner';
                banner.style.cssText = `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                `;
                banner.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <div>
                        <strong>Mode Tampilan Kepala Instalasi</strong><br>
                        <small style="opacity: 0.9;">Anda dapat melihat semua data transaksi obat keluar dan masuk. Untuk menambah atau mengubah data, hubungi Admin atau Staff.</small>
                    </div>
                `;
                
                const h1 = container.querySelector('h1');
                if (h1) {
                    h1.insertAdjacentElement('afterend', banner);
                }
            }
        }
        
        // Jalankan saat DOM loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyRestrictions);
        } else {
            applyRestrictions();
        }
        
        // Re-apply setelah data table di-render
        setTimeout(applyRestrictions, 1000);
        setTimeout(applyRestrictions, 2000);
        
        // Observer untuk memantau perubahan DOM
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    applyRestrictions();
                }
            });
        });
        
        // Observe table body
        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            observer.observe(tableBody, { childList: true, subtree: true });
        }
    }
    
})();