// ================================================
// calendar.js - Kalender Kegiatan
// ================================================

const API_URL = 'http://localhost:8000/api/calendar';

let currentDate = new Date();
let events = [];
let editingId = null;
let userRole = null;

// Nama bulan dalam Bahasa Indonesia
const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ================================================
// Load kegiatan dari database
// ================================================
async function loadEvents() {
    try {
        const bulan = currentDate.getMonth() + 1;
        const tahun = currentDate.getFullYear();
        
        const response = await fetch(`${API_URL}?bulan=${bulan}&tahun=${tahun}`);
        const result = await response.json();
        
        if (result.success) {
            events = result.data;
            renderCalendar();
            renderEventList();
        } else {
            console.error('Error loading events:', result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
}

// ================================================
// Render kalender
// ================================================
function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const monthYear = document.getElementById('currentMonthYear');
    
    // Set header bulan dan tahun
    monthYear.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // Dapatkan hari pertama dan jumlah hari dalam bulan
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Clear calendar
    calendarDays.innerHTML = '';
    
    // Hari-hari dari bulan sebelumnya
    const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayDiv = createDayElement(day, true, false);
        calendarDays.appendChild(dayDiv);
    }
    
    // Hari-hari bulan ini
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isDateToday(day);
        const dayDiv = createDayElement(day, false, isToday);
        
        // Tambahkan event pada hari ini
        const dayEvents = getEventsForDay(day);
        dayEvents.forEach(event => {
            const eventBadge = document.createElement('div');
            eventBadge.className = `event-badge ${event.jenis}`;
            eventBadge.textContent = event.judul;
            eventBadge.onclick = (e) => {
                e.stopPropagation();
                viewDetail(event.id);
            };
            dayDiv.appendChild(eventBadge);
        });
        
        calendarDays.appendChild(dayDiv);
    }
    
    // Hari-hari bulan berikutnya
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 baris x 7 hari
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = createDayElement(day, true, false);
        calendarDays.appendChild(dayDiv);
    }
}

// ================================================
// Buat elemen hari
// ================================================
function createDayElement(day, isOtherMonth, isToday) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    if (isOtherMonth) dayDiv.classList.add('other-month');
    if (isToday) dayDiv.classList.add('today');
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    
    dayDiv.appendChild(dayNumber);
    
    // Click handler untuk hari (hanya admin yang bisa tambah event)
    if (!isOtherMonth && userRole === 'admin') {
        dayDiv.onclick = () => openModalForDate(day);
    }
    
    return dayDiv;
}

// ================================================
// Cek apakah tanggal adalah hari ini
// ================================================
function isDateToday(day) {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
}

// ================================================
// Dapatkan event untuk hari tertentu
// ================================================
function getEventsForDay(day) {
    return events.filter(event => {
        // Parse tanggal dengan cara yang lebih akurat
        // Format dari DB: "2025-12-12 09:00:00"
        const [datePart] = event.tanggal_mulai.split(' ');
        const [year, month, eventDay] = datePart.split('-');
        
        return parseInt(eventDay) === day &&
               parseInt(month) - 1 === currentDate.getMonth() &&
               parseInt(year) === currentDate.getFullYear();
    });
}

// ================================================
// Render daftar event
// ================================================
function renderEventList() {
    const container = document.getElementById('eventListContainer');
    
    if (events.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 40px;">Tidak ada kegiatan untuk bulan ini</p>';
        return;
    }
    
    container.innerHTML = events.map(event => {
        
        return `
            <div class="event-card" onclick="viewDetail(${event.id})">
                <div class="event-card-header">
                    <div>
                        <div class="event-card-title">${event.judul}</div>
                        <span class="event-card-type ${event.jenis}">${event.jenis}</span>
                    </div>
                    <span class="status-badge ${event.status}">${event.status}</span>
                </div>
                <div class="event-card-info">
                    <span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        ${formatDateTime(event.tanggal_mulai)} - ${formatDateTime(event.tanggal_selesai)}
                    </span>
                    ${event.lokasi ? `
                    <span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${event.lokasi}
                    </span>
                    ` : ''}
                </div>
                ${event.deskripsi ? `<p style="color: #6b7280; font-size: 14px; margin-top: 8px;">${event.deskripsi}</p>` : ''}
            </div>
        `;
    }).join('');
}

// ================================================
// Format tanggal dan waktu
// ================================================
function formatDateTime(dateString) {
    // Input bisa berupa string "2025-12-12 09:00:00" atau Date object
    if (typeof dateString === 'string') {
        // Parse manual untuk menghindari timezone shift
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        
        // Buat date object dengan nilai lokal
        const date = new Date(year, month - 1, day, hour, minute);
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('id-ID', options);
    } else {
        // Jika sudah Date object
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return dateString.toLocaleDateString('id-ID', options);
    }
}

// ================================================
// Format datetime untuk database (tanpa timezone shift)
// ================================================
function formatDateTimeForDB(datetimeLocal) {
    // Input format: "2025-12-12T09:00"
    // Output format: "2025-12-12 09:00:00"
    return datetimeLocal.replace('T', ' ') + ':00';
}

// ================================================
// Format datetime dari database untuk input field
// ================================================
function formatDateTimeForInput(datetimeDB) {
    // Input format: "2025-12-12 09:00:00"
    // Output format: "2025-12-12T09:00"
    return datetimeDB.substring(0, 16).replace(' ', 'T');
}

// ================================================
// Navigasi bulan
// ================================================
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadEvents();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadEvents();
}

function goToToday() {
    currentDate = new Date();
    loadEvents();
}

// ================================================
// Open modal
// ================================================
function openModal(id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('eventForm');
    const lokasiLainnyaGroup = document.getElementById('lokasiLainnyaGroup');
    
    if (id) {
        // Mode edit
        const event = events.find(e => e.id === id);
        modalTitle.textContent = 'Edit Kegiatan';
        document.getElementById('judul').value = event.judul;
        document.getElementById('jenis').value = event.jenis;
        document.getElementById('tanggalMulai').value = event.tanggal_mulai.replace(' ', 'T');
        document.getElementById('tanggalSelesai').value = event.tanggal_selesai.replace(' ', 'T');
        document.getElementById('status').value = event.status;
        document.getElementById('deskripsi').value = event.deskripsi || '';
        
        // Handle lokasi
        const lokasiSelect = document.getElementById('lokasi');
        if (event.lokasi) {
            // Cek apakah lokasi ada di dropdown
            const optionExists = Array.from(lokasiSelect.options).some(opt => opt.value === event.lokasi);
            if (optionExists) {
                lokasiSelect.value = event.lokasi;
            } else {
                // Jika tidak ada, set ke "Lainnya"
                lokasiSelect.value = 'Lainnya';
                lokasiLainnyaGroup.style.display = 'block';
                document.getElementById('lokasiLainnya').value = event.lokasi;
            }
        } else {
            lokasiSelect.value = '';
        }
        
        editingId = id;
    } else {
        // Mode tambah
        modalTitle.textContent = 'Tambah Kegiatan Baru';
        form.reset();
        lokasiLainnyaGroup.style.display = 'none';
        editingId = null;
    }
    
    modal.classList.add('show');
}

// ================================================
// Open modal untuk tanggal tertentu
// ================================================
function openModalForDate(day) {
    openModal();
    
    // Format: YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    
    // Set default waktu 09:00 - 10:00
    document.getElementById('tanggalMulai').value = `${dateString}T09:00`;
    document.getElementById('tanggalSelesai').value = `${dateString}T10:00`;
}

// ================================================
// Toggle lokasi lainnya field
// ================================================
function toggleLokasiLainnya() {
    const lokasiSelect = document.getElementById('lokasi');
    const lokasiLainnyaGroup = document.getElementById('lokasiLainnyaGroup');
    const lokasiLainnyaInput = document.getElementById('lokasiLainnya');
    
    if (lokasiSelect.value === 'Lainnya') {
        lokasiLainnyaGroup.style.display = 'block';
        lokasiLainnyaInput.required = false; // Opsional
    } else {
        lokasiLainnyaGroup.style.display = 'none';
        lokasiLainnyaInput.required = false;
        lokasiLainnyaInput.value = '';
    }
}

// ================================================
// Close modal
// ================================================
function closeModal() {
    document.getElementById('modal').classList.remove('show');
    editingId = null;
}

// ================================================
// View detail kegiatan
// ================================================
async function viewDetail(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const event = result.data;
            const detailContent = document.getElementById('detailContent');
            const detailActions = document.getElementById('detailActions');
            

            
            detailContent.innerHTML = `
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Judul
                    </div>
                    <div class="modal-detail-value"><strong>${event.judul}</strong></div>
                </div>
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        Jenis
                    </div>
                    <div class="modal-detail-value">
                        <span class="event-card-type ${event.jenis}">${event.jenis}</span>
                    </div>
                </div>
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Waktu Mulai
                    </div>
                    <div class="modal-detail-value">${formatDateTime(event.tanggal_mulai)}</div>
                </div>
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Waktu Selesai
                    </div>
                    <div class="modal-detail-value">${formatDateTime(event.tanggal_selesai)}</div>
                </div>
                ${event.lokasi ? `
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Lokasi
                    </div>
                    <div class="modal-detail-value">${event.lokasi}</div>
                </div>
                ` : ''}
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        Status
                    </div>
                    <div class="modal-detail-value">
                        <span class="status-badge ${event.status}">${event.status}</span>
                    </div>
                </div>
                ${event.deskripsi ? `
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        Deskripsi
                    </div>
                    <div class="modal-detail-value">${event.deskripsi}</div>
                </div>
                ` : ''}
                <div class="modal-detail-row">
                    <div class="modal-detail-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Dibuat oleh
                    </div>
                    <div class="modal-detail-value">${event.nama_pembuat} (${event.email_pembuat})</div>
                </div>
            `;
            
            // Tambahkan tombol edit dan hapus untuk admin
            if (userRole === 'admin') {
                detailActions.innerHTML = `
                    <button type="button" class="btn-secondary" onclick="closeDetailModal()">Tutup</button>
                    <button type="button" class="action-btn edit-btn" onclick="editEvent(${event.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                    <button type="button" class="action-btn delete-btn" onclick="deleteEvent(${event.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Hapus
                    </button>
                `;
            } else {
                detailActions.innerHTML = `
                    <button type="button" class="btn-secondary" onclick="closeDetailModal()">Tutup</button>
                `;
            }
            
            document.getElementById('detailModal').classList.add('show');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat detail');
    }
}

// ================================================
// Close detail modal
// ================================================
function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
}

// ================================================
// Edit event
// ================================================
function editEvent(id) {
    closeDetailModal();
    openModal(id);
}

// ================================================
// Delete event
// ================================================
async function deleteEvent(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Kegiatan berhasil dihapus');
            closeDetailModal();
            loadEvents();
        } else {
            alert('Gagal menghapus kegiatan: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menghapus kegiatan');
    }
}

// ================================================
// Event listener untuk form submit
// ================================================
document.getElementById('eventForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || !user.id) {
        alert('User tidak terdeteksi. Silakan login kembali.');
        return;
    }
    
    const judul = document.getElementById('judul').value.trim();
    const jenis = document.getElementById('jenis').value;
    const tanggalMulai = document.getElementById('tanggalMulai').value;
    const tanggalSelesai = document.getElementById('tanggalSelesai').value;
    const status = document.getElementById('status').value;
    const deskripsi = document.getElementById('deskripsi').value.trim();
    
    // Handle lokasi
    let lokasi = document.getElementById('lokasi').value;
    if (lokasi === 'Lainnya') {
        lokasi = document.getElementById('lokasiLainnya').value.trim();
        if (!lokasi) {
            alert('Mohon masukkan lokasi lainnya');
            return;
        }
    }
    
    // Validasi
    if (!judul || !jenis || !tanggalMulai || !tanggalSelesai) {
        alert('Mohon lengkapi semua field yang wajib diisi');
        return;
    }
    
    // Validasi tanggal
    if (new Date(tanggalSelesai) < new Date(tanggalMulai)) {
        alert('Tanggal selesai harus setelah tanggal mulai');
        return;
    }
    
    // Disable submit button
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';
    
    try {
        let response;
        const requestData = {
            judul: judul,
            jenis: jenis,
            tanggal_mulai: formatDateTimeForDB(tanggalMulai),
            tanggal_selesai: formatDateTimeForDB(tanggalSelesai),
            lokasi: lokasi || null,
            status: status,
            deskripsi: deskripsi || null
        };
        
        if (editingId) {
            // Update
            requestData.id = editingId;
            response = await fetch(`${API_URL}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
        } else {
            // Create
            requestData.id_pembuat = user.id;
            
            console.log('Sending data:', requestData); // Debug
            
            response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
        }
        
        const result = await response.json();
        console.log('Server response:', result); // Debug
        
        if (result.success) {
            alert(editingId ? 'Kegiatan berhasil diupdate' : 'Kegiatan berhasil ditambahkan');
            closeModal();
            loadEvents();
        } else {
            alert('Gagal menyimpan kegiatan: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menyimpan kegiatan: ' + error.message);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// ================================================
// Close modals on outside click
// ================================================
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailModal();
    }
});

// ================================================
// Check user role dan hide/show button
// ================================================
function checkUserRole() {
    const user = localStorage.getItem('user');
    
    if (user) {
        const userData = JSON.parse(user);
        userRole = userData.role;
        
        // Show tambah button hanya untuk admin
        if (userRole === 'admin') {
            document.getElementById('addEventBtn').style.display = 'flex';
        }
        
        // Hide users management link untuk staff
        if (userRole === 'staff') {
            const userManagementLink = document.getElementById('userManagementLink');
            if (userManagementLink) {
                userManagementLink.style.display = 'none';
            }
        }
    }
}

// ================================================
// Load data saat halaman dimuat
// ================================================
document.addEventListener('DOMContentLoaded', function() {
    checkUserRole();
    loadEvents();
    
    // Event listener untuk lokasi dropdown
    const lokasiSelect = document.getElementById('lokasi');
    if (lokasiSelect) {
        lokasiSelect.addEventListener('change', toggleLokasiLainnya);
    }
});