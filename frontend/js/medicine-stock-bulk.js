// ================================================
// medicine-stock-bulk.js - WITH BULK ADD FEATURE
// ================================================

const API_URL = 'http://localhost:8000/api/obat';

let obatData = [];
let editingId = null;
let currentFilter = 'all';
let deleteTargetId = null;
let bulkMedicines = [];
let bulkIdCounter = 1;
let currentMode = 'single';

// ================================================
// Load data dari database
// ================================================
async function loadData() {
    try {
        const response = await fetch(`${API_URL}`);
        const result = await response.json();
        
        if (result.success) {
            obatData = result.data;
            renderTable(currentFilter, document.getElementById('searchInput').value);
        } else {
            console.error('Error loading data:', result.message);
            alert('Gagal memuat data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
}

// ================================================
// Render tabel
// ================================================
function renderTable(filter = 'all', searchTerm = '') {
    const tbody = document.getElementById('tableBody');
    let filteredData = obatData;

    if (filter !== 'all') {
        filteredData = filteredData.filter(obat => obat.kategori === filter);
    }

    if (searchTerm) {
        filteredData = filteredData.filter(obat => 
            obat.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obat.dosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obat.kategori.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <p>Tidak ada data obat ditemukan</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredData.map(obat => `
        <tr>
            <td>${obat.nama}</td>
            <td>${obat.dosis}</td>
            <td>${obat.kategori}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editObat(${obat.id})">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteObat(${obat.id})">Hapus</button>
            </td>
        </tr>
    `).join('');
}

// ================================================
// Switch Mode (Single / Bulk)
// ================================================
function switchMode(mode) {
    currentMode = mode;
    
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const singleContainer = document.querySelector('.single-container');
    const bulkContainer = document.querySelector('.bulk-container');
    
    if (mode === 'single') {
        singleContainer.classList.add('active');
        bulkContainer.classList.remove('active');
    } else {
        singleContainer.classList.remove('active');
        bulkContainer.classList.add('active');
        initBulkMode();
    }
}

// ================================================
// Initialize Bulk Mode
// ================================================
function initBulkMode() {
    bulkMedicines = [{ id: 1, nama: '', dosis: '', kategori: '' }];
    bulkIdCounter = 2;
    renderBulkMedicines();
}

// ================================================
// Render Bulk Medicines
// ================================================
function renderBulkMedicines() {
    const container = document.getElementById('bulkMedicinesContainer');
    
    container.innerHTML = bulkMedicines.map((medicine, index) => `
        <div class="bulk-medicine-item" id="bulk-item-${medicine.id}">
            ${bulkMedicines.length > 1 ? `
                <button type="button" class="bulk-remove-btn" onclick="removeBulkMedicine(${medicine.id})" title="Hapus obat ini">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            ` : ''}
            
            <div class="bulk-item-header">
                <div class="bulk-item-number">${index + 1}</div>
                <div class="bulk-item-title">Obat #${index + 1}</div>
            </div>
            
            <div class="bulk-form-grid">
                <div class="form-group">
                    <label>Nama Obat <span style="color: red;">*</span></label>
                    <input 
                        type="text" 
                        id="bulk-nama-${medicine.id}"
                        value="${medicine.nama}"
                        onchange="updateBulkMedicine(${medicine.id}, 'nama', this.value)"
                        placeholder="Contoh: Paracetamol"
                        required
                    >
                </div>
                
                <div class="form-group">
                    <label>Dosis <span style="color: red;">*</span></label>
                    <input 
                        type="text" 
                        id="bulk-dosis-${medicine.id}"
                        value="${medicine.dosis}"
                        onchange="updateBulkMedicine(${medicine.id}, 'dosis', this.value)"
                        placeholder="Contoh: 500 mg"
                        required
                    >
                </div>
                
                <div class="form-group">
                    <label>Kategori <span style="color: red;">*</span></label>
                    <select 
                        id="bulk-kategori-${medicine.id}"
                        onchange="updateBulkMedicine(${medicine.id}, 'kategori', this.value)"
                        required
                    >
                        <option value="">Pilih Kategori</option>
                        <option value="Obat DAK" ${medicine.kategori === 'Obat DAK' ? 'selected' : ''}>Obat DAK</option>
                        <option value="Perbekkes DAK" ${medicine.kategori === 'Perbekkes DAK' ? 'selected' : ''}>Perbekkes DAK</option>
                        <option value="Droping" ${medicine.kategori === 'Droping' ? 'selected' : ''}>Droping</option>
                        <option value="Perbekkes DID" ${medicine.kategori === 'Perbekkes DID' ? 'selected' : ''}>Perbekkes DID</option>
                        <option value="Vaksin Covid" ${medicine.kategori === 'Vaksin Covid' ? 'selected' : ''}>Vaksin Covid</option>
                    </select>
                </div>
            </div>
        </div>
    `).join('');
    
    updateBulkCount();
}

// ================================================
// Add Bulk Medicine
// ================================================
function addBulkMedicine() {
    bulkMedicines.push({
        id: bulkIdCounter++,
        nama: '',
        dosis: '',
        kategori: ''
    });
    renderBulkMedicines();
}

// ================================================
// Remove Bulk Medicine
// ================================================
function removeBulkMedicine(id) {
    if (bulkMedicines.length > 1) {
        bulkMedicines = bulkMedicines.filter(m => m.id !== id);
        renderBulkMedicines();
    }
}

// ================================================
// Update Bulk Medicine
// ================================================
function updateBulkMedicine(id, field, value) {
    const medicine = bulkMedicines.find(m => m.id === id);
    if (medicine) {
        medicine[field] = value;
    }
}

// ================================================
// Update Bulk Count
// ================================================
function updateBulkCount() {
    document.getElementById('bulkCount').textContent = bulkMedicines.length;
    document.getElementById('bulkSubmitText').textContent = `Simpan ${bulkMedicines.length} Obat`;
}

// ================================================
// Handle Single Submit
// ================================================
async function handleSingleSubmit() {
    const nama = document.getElementById('namaObat').value;
    const dosis = document.getElementById('dosis').value;
    const kategori = document.getElementById('kategori').value;

    if (!nama || !dosis || !kategori) {
        alert('Mohon lengkapi semua field!');
        return;
    }

    try {
        let response;
        
        if (editingId) {
            response = await fetch(`${API_URL}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: editingId,
                    nama: nama,
                    dosis: dosis,
                    kategori: kategori
                })
            });
        } else {
            response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nama: nama,
                    dosis: dosis,
                    kategori: kategori
                })
            });
        }

        const result = await response.json();
        
        if (result.success) {
            alert(editingId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan');
            closeModal();
            loadData();
        } else {
            alert('Gagal menyimpan data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menyimpan data');
    }
}

// ================================================
// Handle Bulk Submit
// ================================================
async function handleBulkSubmit() {
    // Validasi
    const emptyFields = bulkMedicines.filter(m => !m.nama || !m.dosis || !m.kategori);
    if (emptyFields.length > 0) {
        alert('Mohon lengkapi semua field untuk setiap obat!');
        return;
    }

    // Check duplicates in form
    const names = bulkMedicines.map(m => `${m.nama}-${m.dosis}`);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
        alert('Ada obat dengan nama dan dosis yang sama dalam form! Mohon periksa kembali.');
        return;
    }

    try {
        // Show loading
        const submitBtn = event.target;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Menyimpan...';
        submitBtn.disabled = true;

        // Save one by one
        const results = await Promise.all(
            bulkMedicines.map(async (medicine) => {
                const response = await fetch(`${API_URL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nama: medicine.nama,
                        dosis: medicine.dosis,
                        kategori: medicine.kategori
                    })
                });
                return response.json();
            })
        );

        // Check results
        const failed = results.filter(r => !r.success);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        if (failed.length > 0) {
            alert(`Berhasil menyimpan ${results.length - failed.length} obat. Gagal: ${failed.length} obat.\n\nError: ${failed[0].message}`);
        } else {
            alert(`✅ Berhasil menambahkan ${bulkMedicines.length} obat!`);
            closeModal();
            loadData();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menyimpan data');
    }
}

// ================================================
// Open modal
// ================================================
function openModal(id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');

    if (id) {
        // Edit mode - always use single mode
        currentMode = 'single';
        const obat = obatData.find(o => o.id === id);
        modalTitle.textContent = 'Edit Obat';
        document.getElementById('namaObat').value = obat.nama;
        document.getElementById('dosis').value = obat.dosis;
        document.getElementById('kategori').value = obat.kategori;
        editingId = id;
        
        // Show only single mode
        document.querySelector('.mode-toggle').style.display = 'none';
        document.querySelector('.single-container').classList.add('active');
        document.querySelector('.bulk-container').classList.remove('active');
    } else {
        // Add mode - show toggle
        modalTitle.textContent = 'Tambah Obat';
        editingId = null;
        
        // Reset forms
        document.getElementById('namaObat').value = '';
        document.getElementById('dosis').value = '';
        document.getElementById('kategori').value = '';
        
        // Show mode toggle
        document.querySelector('.mode-toggle').style.display = 'flex';
        
        // Reset to single mode
        currentMode = 'single';
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.mode-btn')[0].classList.add('active');
        document.querySelector('.single-container').classList.add('active');
        document.querySelector('.bulk-container').classList.remove('active');
        
        // Initialize bulk mode
        initBulkMode();
    }

    modal.classList.add('show');
}

// ================================================
// Close modal
// ================================================
function closeModal() {
    document.getElementById('modal').classList.remove('show');
    editingId = null;
    bulkMedicines = [];
}

// ================================================
// Edit obat
// ================================================
function editObat(id) {
    openModal(id);
}

// ================================================
// Delete obat
// ================================================
function deleteObat(id) {
    const obat = obatData.find(o => o.id === id);
    if (obat) {
        deleteTargetId = id;
        document.getElementById('deleteNama').textContent = obat.nama;
        document.getElementById('deleteDosis').textContent = obat.dosis;
        document.getElementById('deleteKategori').textContent = obat.kategori;
        document.getElementById('deleteReason').value = '';
        document.getElementById('deleteModal').classList.add('show');
    }
}

// ================================================
// Close delete modal
// ================================================
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteTargetId = null;
}

// ================================================
// Confirm delete
// ================================================
async function confirmDelete() {
    const reason = document.getElementById('deleteReason').value.trim();
    
    if (!reason) {
        alert('Alasan penghapusan wajib diisi!');
        return;
    }
    
    if (deleteTargetId) {
        try {
            const response = await fetch(`${API_URL}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: deleteTargetId,
                    alasan: reason
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Data berhasil dihapus');
                closeDeleteModal();
                loadData();
            } else {
                alert('Gagal menghapus data: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan saat menghapus data');
        }
    }
}

// ================================================
// Filter kategori
// ================================================
function filterCategory(category) {
    currentFilter = category;
    const btn = document.getElementById('categoryBtn');
    const btnText = category === 'all' ? 'Kategori' : category;
    btn.innerHTML = `<span>${btnText}</span> <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
    renderTable(category, document.getElementById('searchInput').value);
    document.getElementById('categoryDropdown').classList.remove('show');
}

// ================================================
// Event listeners
// ================================================
document.getElementById('searchInput').addEventListener('input', function(e) {
    renderTable(currentFilter, e.target.value);
});

document.getElementById('categoryBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('categoryDropdown');
    dropdown.classList.toggle('show');
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        const dropdown = document.getElementById('categoryDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

const modal = document.getElementById('modal');
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        closeModal();
    }
});

const deleteModal = document.getElementById('deleteModal');
deleteModal.addEventListener('click', function(e) {
    if (e.target === deleteModal) {
        closeDeleteModal();
    }
});

// ================================================
// Initialize
// ================================================
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// Add spin animation for loading
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
