// ================================================
// medicine-transaction.js - WITH MULTIPLE ITEMS & MULTI-BATCH SUPPORT
// ================================================

const API_URL = 'http://localhost:8000/api/transaction';

let transaksiData = [];
let obatList = [];
let staffList = [];
let currentTab = 'keluar';
let editingId = null;
let batchDataCache = {};
let currentBatchItem = null;

// ================================================
// Load data dari database
// ================================================
async function loadTransaksi() {
    try {
        const response = await fetch(`${API_URL}?tipe=${currentTab}`);
        const result = await response.json();
        
        if (result.success) {
            transaksiData = result.data;
            renderTable(document.getElementById('searchInput').value);
            updateSummary();
        } else {
            console.error('Error loading data:', result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
}

// ================================================
// Load daftar obat
// ================================================
async function loadObatList() {
    try {
        const response = await fetch('php/api.php?action=read');
        const result = await response.json();
        
        if (result.success) {
            obatList = result.data;
            populateObatDropdowns();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ================================================
// Load daftar staff
// ================================================
async function loadStaffList() {
    try {
        const response = await fetch(`${API_URL}/staff/active`);
        const result = await response.json();
        
        if (result.success) {
            staffList = result.data;
            populateStaffDropdown();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ================================================
// Populate obat dropdown untuk semua item
// ================================================
function populateObatDropdowns() {
    const selects = document.querySelectorAll('.item-obat');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Pilih Obat --</option>';
        
        obatList.forEach(obat => {
            const option = document.createElement('option');
            option.value = obat.id;
            option.textContent = `${obat.nama} - ${obat.dosis} (Stok: ${obat.stok || 0})`;
            option.dataset.nama = obat.nama;
            option.dataset.dosis = obat.dosis;
            option.dataset.stok = obat.stok || 0;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// ================================================
// Populate dropdown staff
// ================================================
function populateStaffDropdown() {
    const select = document.getElementById('idStaff');
    select.innerHTML = '<option value="">-- Pilih Staff --</option>';
    
    staffList.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.id;
        option.textContent = staff.nama_lengkap;
        option.dataset.email = staff.email;
        select.appendChild(option);
    });
}

// ================================================
// Add transaction item
// ================================================
function addTransactionItem() {
    const itemsContainer = document.getElementById('transactionItems');
    const itemCount = itemsContainer.children.length + 1;
    
    const itemHtml = `
    <div class="transaction-item" data-index="${itemCount}">
        <div class="item-header">
            <h4>Item ${itemCount}</h4>
            <button type="button" class="remove-item-btn" onclick="removeTransactionItem(${itemCount})">
                Hapus
            </button>
        </div>
        
        <div class="form-group">
            <label>Pilih Obat <span style="color: red;">*</span></label>
            <select class="item-obat" required onchange="onObatChange(this)">
                <option value="">-- Pilih Obat --</option>
                ${obatList.map(obat => `
                    <option value="${obat.id}" 
                            data-nama="${obat.nama}" 
                            data-dosis="${obat.dosis}" 
                            data-stok="${obat.stok || 0}">
                        ${obat.nama} - ${obat.dosis} (Stok: ${obat.stok || 0})
                    </option>
                `).join('')}
            </select>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div class="form-group">
                <label>Jumlah <span style="color: red;">*</span></label>
                <input type="number" class="item-jumlah" min="1" required onchange="onJumlahChange(this)">
            </div>
            <div class="form-group">
                <label>Satuan <span style="color: red;">*</span></label>
                <select class="item-satuan" required>
                    <option value="tablet">Tablet</option>
                    <option value="kaplet">Kaplet</option>
                    <option value="kapsul">Kapsul</option>
                    <option value="suppositoria">Suppositoria</option>
                    <option value="botol-60ml">Botol 60 ml</option>
                    <option value="botol-100ml">Botol 100 ml</option>
                    <option value="botol-500ml">Botol 500 ml</option>
                    <option value="botol-1000ml">Botol 1000 ml / 1L</option>
                    <option value="botol-plastik-500ml">Botol plastik 500 ml</option>
                    <option value="galon-5l">Galon 5 liter</option>
                    <option value="tube">Tube</option>
                    <option value="box">Box</option>
                    <option value="pot">Pot</option>
                    <option value="strip">Strip</option>
                    <option value="set">Set</option>
                    <option value="unit">Unit</option>
                </select>
            </div>
        </div>
        
        <!-- Batch selection for outgoing drugs -->
        <div id="batchSelectionContainer${itemCount}" style="display: none;">
            <button type="button" class="select-batch-btn" onclick="openBatchSelection(this.parentElement.parentElement)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Pilih Batch
            </button>
            <div class="batch-info-display" id="batchInfo${itemCount}"></div>
        </div>
        
        <div class="batch-section" style="display: none;">
            <div class="form-group">
                <label>Nomor Batch <span style="color: red;">*</span></label>
                <input type="text" class="item-nomor-batch" placeholder="Contoh: BATCH2024001">
            </div>
            
            <div class="batch-info-display" style="display: none;"></div>
            
            <div class="form-group">
                <label>Nomor Faktur <span style="color: red;">*</span></label>
                <input type="text" class="item-nomor-faktur" placeholder="Contoh: FKT/2024/001">
            </div>
            
            <div class="form-group">
                <label>Tanggal Kedaluwarsa <span style="color: red;">*</span></label>
                <input type="date" class="item-tanggal-kedaluwarsa">
            </div>
        </div>
        
        <div class="form-group">
            <label>Keterangan Item (Opsional)</label>
            <textarea class="item-keterangan" rows="2" placeholder="Keterangan untuk item ini..."></textarea>
        </div>
    </div>
    `;
    
    itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    
    const newItem = itemsContainer.lastElementChild;
    const obatSelect = newItem.querySelector('.item-obat');
    const batchInput = newItem.querySelector('.item-nomor-batch');
    
    if (obatSelect) {
        obatSelect.innerHTML = '<option value="">-- Pilih Obat --</option>';
        obatList.forEach(obat => {
            const option = document.createElement('option');
            option.value = obat.id;
            option.textContent = `${obat.nama} - ${obat.dosis} (Stok: ${obat.stok || 0})`;
            option.dataset.nama = obat.nama;
            option.dataset.dosis = obat.dosis;
            option.dataset.stok = obat.stok || 0;
            obatSelect.appendChild(option);
        });
    }
    
    if (batchInput && currentTab === 'masuk') {
        batchInput.addEventListener('blur', function() {
            const idObat = obatSelect.value;
            const nomorBatch = this.value.trim();
            
            if (idObat && nomorBatch) {
                handleBatchNumberChange(newItem, idObat, nomorBatch);
            }
        });
        
        obatSelect.addEventListener('change', function() {
            const batchInfo = newItem.querySelector('.batch-info-display');
            const tanggalKedaluwarsaInput = newItem.querySelector('.item-tanggal-kedaluwarsa');
            
            if (batchInfo) {
                batchInfo.style.display = 'none';
                batchInfo.innerHTML = '';
            }
            
            if (tanggalKedaluwarsaInput) {
                tanggalKedaluwarsaInput.readOnly = false;
                tanggalKedaluwarsaInput.style.backgroundColor = '';
                tanggalKedaluwarsaInput.value = '';
            }
            
            batchInput.value = '';
        });
    }
    
    updateBatchSections();
}

// ================================================
// Handle obat change
// ================================================
function onObatChange(select) {
    const itemElement = select.closest('.transaction-item');
    const batchContainer = itemElement.querySelector('[id^="batchSelectionContainer"]');
    
    if (currentTab === 'keluar' && select.value) {
        batchContainer.style.display = 'block';
        const selectButton = batchContainer.querySelector('.select-batch-btn');
        selectButton.disabled = true;
        
        // Reset batch info
        const batchInfo = itemElement.querySelector('.batch-info-display');
        if (batchInfo) {
            batchInfo.innerHTML = '';
            batchInfo.style.display = 'none';
        }
        
        // Clear selected batches
        delete itemElement.dataset.selectedBatches;
    } else if (currentTab === 'keluar') {
        batchContainer.style.display = 'none';
    }
}

// ================================================
// Handle jumlah change
// ================================================
function onJumlahChange(input) {
    const itemElement = input.closest('.transaction-item');
    const obatSelect = itemElement.querySelector('.item-obat');
    const selectButton = itemElement.querySelector('.select-batch-btn');
    
    if (currentTab === 'keluar' && obatSelect.value && input.value > 0) {
        selectButton.disabled = false;
    } else if (currentTab === 'keluar') {
        selectButton.disabled = true;
    }
}

// ================================================
// Open batch selection modal
// ================================================
async function openBatchSelection(itemElement) {
    currentBatchItem = itemElement;
    
    const idObat = itemElement.querySelector('.item-obat').value;
    const jumlah = parseInt(itemElement.querySelector('.item-jumlah').value);
    const satuan = itemElement.querySelector('.item-satuan').value;
    
    if (!idObat || !jumlah) {
        alert('Harap pilih obat dan isi jumlah terlebih dahulu');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}?id_obat=${idObat}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const batches = result.data.sort((a, b) => 
                new Date(a.tanggal_kedaluwarsa) - new Date(b.tanggal_kedaluwarsa)
            );
            
            createBatchSelectionModal(batches, jumlah, satuan, itemElement);
        } else {
            alert('Tidak ada batch tersedia untuk obat ini');
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        alert('Terjadi kesalahan saat memuat batch');
    }
}

// ================================================
// Create batch selection modal
// ================================================
function createBatchSelectionModal(batches, requiredAmount, unit, itemElement) {
    const modalHtml = `
    <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
            <h2>Pilih Batch untuk Obat Keluar</h2>
            <p>Jumlah yang dibutuhkan: <strong>${requiredAmount} ${unit}</strong></p>
            <p>Stok total tersedia: <strong>${batches.reduce((sum, b) => sum + parseInt(b.sisa_stok), 0)} ${unit}</strong></p>
        </div>
        
        <div class="batch-selection-container">
            <table>
                <thead>
                    <tr>
                        <th>Pilih</th>
                        <th>Nomor Batch</th>
                        <th>Tanggal Kedaluwarsa</th>
                        <th>Sisa Stok</th>
                        <th>Hari Tersisa</th>
                        <th>Jumlah Ambil</th>
                    </tr>
                </thead>
                <tbody id="batchSelectionBody">
                    ${batches.map((batch, index) => {
                        const hariTersisa = batch.hari_tersisa || 
                            Math.floor((new Date(batch.tanggal_kedaluwarsa) - new Date()) / (1000 * 60 * 60 * 24));
                        const statusClass = getExpiryStatusClass(hariTersisa);
                        
                        return `
                        <tr>
                            <td>
                                <input type="checkbox" class="batch-checkbox" 
                                       data-index="${index}"
                                       data-stok="${batch.sisa_stok}"
                                       ${parseInt(batch.sisa_stok) > 0 ? '' : 'disabled'}>
                            </td>
                            <td>${batch.nomor_batch}</td>
                            <td>${formatDate(batch.tanggal_kedaluwarsa)}</td>
                            <td>${batch.sisa_stok} ${batch.satuan}</td>
                            <td>
                                <span class="${statusClass}">
                                    ${hariTersisa} hari
                                </span>
                            </td>
                            <td>
                                <input type="number" 
                                       class="batch-amount-input" 
                                       min="1" 
                                       max="${batch.sisa_stok}"
                                       value="0"
                                       data-index="${index}"
                                       disabled
                                       style="width: 80px;">
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="batch-summary">
                <p><strong>Total Dipilih:</strong> <span id="totalSelected">0</span> ${unit}</p>
                <p><strong>Kebutuhan:</strong> ${requiredAmount} ${unit}</p>
                <p><strong>Status:</strong> <span id="selectionStatus" style="color: #ef4444;">Belum mencukupi</span></p>
                <p><small>Sistem akan otomatis menyarankan batch dengan tanggal kadaluwarsa terdekat (FEFO)</small></p>
            </div>
        </div>
        
        <div class="modal-actions">
            <button type="button" class="btn-secondary" onclick="closeBatchSelectionModal()">Batal</button>
            <button type="button" class="btn-primary" id="confirmBatchSelection" disabled>
                Konfirmasi Pemilihan
            </button>
        </div>
    </div>
    `;
    
    const modalContainer = document.getElementById('batchSelectionModal');
    modalContainer.innerHTML = modalHtml;
    modalContainer.classList.add('show');
    
    // Auto-select based on FEFO
    autoSelectBatches(batches, requiredAmount);
    
    // Event listeners
    document.querySelectorAll('.batch-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const index = this.dataset.index;
            const amountInput = document.querySelector(`.batch-amount-input[data-index="${index}"]`);
            amountInput.disabled = !this.checked;
            if (!this.checked) amountInput.value = 0;
            updateBatchSelectionSummary(requiredAmount);
        });
    });
    
    document.querySelectorAll('.batch-amount-input').forEach(input => {
        input.addEventListener('input', function() {
            const max = parseInt(this.max);
            const value = parseInt(this.value) || 0;
            
            if (value > max) {
                this.value = max;
            } else if (value < 0) {
                this.value = 0;
            }
            
            updateBatchSelectionSummary(requiredAmount);
        });
    });
    
    document.getElementById('confirmBatchSelection').addEventListener('click', function() {
        confirmBatchSelection(batches, itemElement);
    });
}

// ================================================
// Auto-select batches based on FEFO
// ================================================
function autoSelectBatches(batches, requiredAmount) {
    let remaining = requiredAmount;
    const checkboxes = document.querySelectorAll('.batch-checkbox');
    const inputs = document.querySelectorAll('.batch-amount-input');
    
    // Reset semua
    checkboxes.forEach(cb => cb.checked = false);
    inputs.forEach(input => {
        input.value = 0;
        input.disabled = true;
    });
    
    // Pilih batch berdasarkan FEFO
    for (let i = 0; i < batches.length && remaining > 0; i++) {
        const batch = batches[i];
        const available = parseInt(batch.sisa_stok);
        const toTake = Math.min(available, remaining);
        
        if (toTake > 0) {
            checkboxes[i].checked = true;
            inputs[i].value = toTake;
            inputs[i].disabled = false;
            remaining -= toTake;
        }
    }
    
    updateBatchSelectionSummary(requiredAmount);
}

// ================================================
// Update batch selection summary
// ================================================
function updateBatchSelectionSummary(requiredAmount) {
    const checkedBoxes = document.querySelectorAll('.batch-checkbox:checked');
    let totalSelected = 0;
    
    checkedBoxes.forEach(checkbox => {
        const index = checkbox.dataset.index;
        const amountInput = document.querySelector(`.batch-amount-input[data-index="${index}"]`);
        const amount = parseInt(amountInput.value) || 0;
        totalSelected += amount;
    });
    
    document.getElementById('totalSelected').textContent = totalSelected;
    
    const statusElement = document.getElementById('selectionStatus');
    const confirmButton = document.getElementById('confirmBatchSelection');
    
    if (totalSelected === requiredAmount) {
        statusElement.textContent = 'Mencukupi';
        statusElement.style.color = '#10b981';
        confirmButton.disabled = false;
    } else if (totalSelected > requiredAmount) {
        statusElement.textContent = 'Melebihi kebutuhan';
        statusElement.style.color = '#ef4444';
        confirmButton.disabled = true;
    } else {
        statusElement.textContent = 'Belum mencukupi';
        statusElement.style.color = '#f39c12';
        confirmButton.disabled = true;
    }
}

// ================================================
// Confirm batch selection
// ================================================
function confirmBatchSelection(batches, itemElement) {
    const selectedBatches = [];
    
    document.querySelectorAll('.batch-checkbox:checked').forEach(checkbox => {
        const index = checkbox.dataset.index;
        const amountInput = document.querySelector(`.batch-amount-input[data-index="${index}"]`);
        const amount = parseInt(amountInput.value) || 0;
        
        if (amount > 0) {
            selectedBatches.push({
                nomor_batch: batches[index].nomor_batch,
                tanggal_kedaluwarsa: batches[index].tanggal_kedaluwarsa,
                jumlah: amount,
                satuan: batches[index].satuan
            });
        }
    });
    
    // Simpan data batch ke item element
    itemElement.dataset.selectedBatches = JSON.stringify(selectedBatches);
    
    // Update tampilan item
    updateItemWithBatches(itemElement, selectedBatches);
    
    closeBatchSelectionModal();
}

// ================================================
// Update item with batch information
// ================================================
function updateItemWithBatches(itemElement, batches) {
    const batchInfoDiv = itemElement.querySelector('.batch-info-display');
    
    if (batchInfoDiv) {
        const total = batches.reduce((sum, batch) => sum + batch.jumlah, 0);
        
        batchInfoDiv.innerHTML = `
            <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-top: 10px;">
                <strong style="color: #1976D2;">Batch yang dipilih (Total: ${total}):</strong>
                ${batches.map(batch => `
                    <div style="margin-top: 5px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid ${getExpiryColor(batch.tanggal_kedaluwarsa)};">
                        <strong>${batch.nomor_batch}</strong> - 
                        ${formatDate(batch.tanggal_kedaluwarsa)}: 
                        <strong>${batch.jumlah} ${batch.satuan}</strong>
                    </div>
                `).join('')}
            </div>
        `;
        batchInfoDiv.style.display = 'block';
    }
}

// ================================================
// Get expiry color
// ================================================
function getExpiryColor(expiryDate) {
    const hariTersisa = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (hariTersisa < 0) return '#ef4444';
    if (hariTersisa <= 30) return '#f39c12';
    return '#10b981';
}

// ================================================
// Get expiry status class
// ================================================
function getExpiryStatusClass(days) {
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring-soon';
    return 'valid';
}

// ================================================
// Close batch selection modal
// ================================================
function closeBatchSelectionModal() {
    const modal = document.getElementById('batchSelectionModal');
    modal.classList.remove('show');
    modal.innerHTML = '';
    currentBatchItem = null;
}

// ================================================
// Remove transaction item
// ================================================
function removeTransactionItem(index) {
    const item = document.querySelector(`.transaction-item[data-index="${index}"]`);
    if (item) {
        item.remove();
        
        const items = document.querySelectorAll('.transaction-item');
        items.forEach((item, idx) => {
            const header = item.querySelector('h4');
            header.textContent = `Item ${idx + 1}`;
            item.setAttribute('data-index', idx + 1);
            
            const removeBtn = item.querySelector('.remove-item-btn');
            removeBtn.onclick = () => removeTransactionItem(idx + 1);
        });
    }
}

// ================================================
// Update batch section visibility
// ================================================
function updateBatchSections() {
    const batchSections = document.querySelectorAll('.batch-section');
    const batchSelectionContainers = document.querySelectorAll('[id^="batchSelectionContainer"]');
    
    if (currentTab === 'masuk') {
        batchSections.forEach(section => {
            section.style.display = 'block';
            const inputs = section.querySelectorAll('input');
            inputs.forEach(input => input.required = true);
        });
        
        batchSelectionContainers.forEach(container => {
            container.style.display = 'none';
        });
    } else {
        batchSections.forEach(section => {
            section.style.display = 'none';
            const inputs = section.querySelectorAll('input');
            inputs.forEach(input => {
                input.required = false;
                input.value = '';
            });
        });
        
        batchSelectionContainers.forEach(container => {
            container.style.display = 'block';
        });
    }
}

// ================================================
// Auto-fill tanggal kedaluwarsa berdasarkan nomor batch
// ================================================
async function handleBatchNumberChange(itemElement, idObat, nomorBatch) {
    if (!nomorBatch || !idObat) {
        return;
    }
    
    const tanggalKedaluwarsaInput = itemElement.querySelector('.item-tanggal-kedaluwarsa');
    const batchInfo = itemElement.querySelector('.batch-info-display');
    
    try {
        const response = await fetch(`${API_URL}?id_obat=${idObat}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const batchData = result.data.find(b => b.nomor_batch === nomorBatch);
            
            if (batchData) {
                tanggalKedaluwarsaInput.value = batchData.tanggal_kedaluwarsa;
                tanggalKedaluwarsaInput.readOnly = true;
                tanggalKedaluwarsaInput.style.backgroundColor = '#f0f0f0';
                
                if (batchInfo) {
                    batchInfo.innerHTML = `
                        <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 12px; margin-top: 10px; border-radius: 4px; font-size: 14px;">
                            <strong style="color: #1976D2;">Info Batch:</strong><br>
                            Batch ini sudah ada dengan stok tersisa: <strong>${batchData.sisa_stok} ${batchData.satuan}</strong><br>
                            Tanggal kedaluwarsa: <strong>${formatDate(batchData.tanggal_kedaluwarsa)}</strong>
                        </div>
                    `;
                    batchInfo.style.display = 'block';
                }
            } else {
                tanggalKedaluwarsaInput.readOnly = false;
                tanggalKedaluwarsaInput.style.backgroundColor = '';
                
                if (batchInfo) {
                    batchInfo.innerHTML = `
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-top: 10px; border-radius: 4px; font-size: 14px;">
                            <strong style="color: #856404;">Batch Baru:</strong><br>
                            Nomor batch ini belum pernah digunakan. Silakan isi tanggal kedaluwarsa.
                        </div>
                    `;
                    batchInfo.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Error checking batch:', error);
    }
}

// ================================================
// Update summary cards
// ================================================
async function updateSummary() {
    try {
        const response = await fetch(`${API_URL}/summary/today`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalKeluar').textContent = result.data.keluar;
            document.getElementById('totalMasuk').textContent = result.data.masuk;
            document.getElementById('totalTransaksi').textContent = result.data.total;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ================================================
// Check expiry date
// ================================================
function checkExpiryDate(expiryDate) {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return 'expired';
    } else if (diffDays <= 30) {
        return 'expiring-soon';
    }
    return 'valid';
}

// ================================================
// Toggle tujuan field visibility
// ================================================
function toggleTujuanField() {
    const tujuanGroup = document.getElementById('tujuanGroup');
    const tujuanSelect = document.getElementById('tujuan');
    
    if (currentTab === 'keluar') {
        tujuanGroup.style.display = 'block';
        tujuanSelect.required = true;
    } else {
        tujuanGroup.style.display = 'none';
        tujuanSelect.required = false;
        tujuanSelect.value = '';
        document.getElementById('tujuanLainnyaGroup').style.display = 'none';
    }
    
    updateBatchSections();
    updateTableHeaders();
}

// ================================================
// Update table headers
// ================================================
function updateTableHeaders() {
    const tujuanHeader = document.getElementById('tujuanHeader');
    const batchHeader = document.getElementById('batchHeader');
    const fakturHeader = document.getElementById('fakturHeader');
    const kedaluwarsaHeader = document.getElementById('kedaluwarsaHeader');
    
    if (currentTab === 'keluar') {
        if (tujuanHeader) tujuanHeader.style.display = '';
        if (batchHeader) batchHeader.style.display = 'none';
        if (fakturHeader) fakturHeader.style.display = 'none';
        if (kedaluwarsaHeader) kedaluwarsaHeader.style.display = 'none';
    } else {
        if (tujuanHeader) tujuanHeader.style.display = 'none';
        if (batchHeader) batchHeader.style.display = '';
        if (fakturHeader) fakturHeader.style.display = '';
        if (kedaluwarsaHeader) kedaluwarsaHeader.style.display = '';
    }
}

// ================================================
// Render tabel
// ================================================
function renderTable(searchTerm = '') {
    const tbody = document.getElementById('tableBody');
    let filteredData = transaksiData;

    if (searchTerm) {
        filteredData = filteredData.filter(item => 
            item.nama_obat.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.tujuan && item.tujuan.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.nomor_batch && item.nomor_batch.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.nomor_faktur && item.nomor_faktur.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.keterangan && item.keterangan.toLowerCase().includes(searchTerm.toLowerCase())) ||
            item.nama_staff.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filteredData.length === 0) {
        const colspan = currentTab === 'keluar' ? '8' : '10';
        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="empty-state">
                    <p>Tidak ada data transaksi ditemukan</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredData.map(item => {
        let tujuanCell = '';
        let batchCell = '';
        let fakturCell = '';
        let expiryCell = '';
        
        if (currentTab === 'keluar') {
            tujuanCell = `<td>${item.tujuan || '-'}</td>`;
        }
        
        if (currentTab === 'masuk') {
            batchCell = `<td>${item.nomor_batch || '-'}</td>`;
            fakturCell = `<td>${item.nomor_faktur || '-'}</td>`;
            
            if (item.tanggal_kedaluwarsa) {
                const status = checkExpiryDate(item.tanggal_kedaluwarsa);
                const dateStr = formatDate(item.tanggal_kedaluwarsa);
                
                if (status === 'expired') {
                    expiryCell = `<td><span style="color: #ef4444; font-weight: 600;"> ${dateStr}</span></td>`;
                } else if (status === 'expiring-soon') {
                    expiryCell = `<td><span style="color: #f39c12; font-weight: 600;"> ${dateStr}</span></td>`;
                } else {
                    expiryCell = `<td>${dateStr}</td>`;
                }
            } else {
                expiryCell = '<td>-</td>';
            }
        }
        
        return `
        <tr>
            <td>${formatDate(item.tanggal_transaksi)}</td>
            <td>${item.nama_obat}</td>
            <td>
                <span class="badge ${item.tipe_transaksi}">
                    ${item.jumlah} ${item.satuan}
                </span>
            </td>
            ${tujuanCell}
            ${batchCell}
            ${fakturCell}
            ${expiryCell}
            <td>${item.keterangan || '-'}</td>
            <td>${item.nama_staff}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewDetail(${item.id})">
                        Detail
                    </button>
                    <button class="action-btn edit-btn" onclick="editTransaksi(${item.id})">
                        Ubah
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTransaksi(${item.id})">
                        Hapus
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
    
    updateTableHeaders();
}

// ================================================
// Format tanggal
// ================================================
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// ================================================
// Open modal
// ================================================
function openModal() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('transaksiForm');
    const submitBtnText = document.getElementById('submitBtnText');
    
    editingId = null;
    modalTitle.textContent = currentTab === 'keluar' ? 'Catat Obat Keluar' : 'Catat Obat Masuk';
    submitBtnText.textContent = 'Simpan Transaksi';
    form.reset();
    
    const itemsContainer = document.getElementById('transactionItems');
    itemsContainer.innerHTML = '';
    
    addTransactionItem();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalTransaksi').value = today;
    
    toggleTujuanField();
    loadObatList();
    loadStaffList();
    
    showAddItemButton(true);
    
    modal.classList.add('show');
}

// ================================================
// Close modal
// ================================================
function closeModal() {
    document.getElementById('modal').classList.remove('show');
    editingId = null;
    batchDataCache = {};
    showAddItemButton(true);
}

// ================================================
// Show/Hide Add Item Button
// ================================================
function showAddItemButton(show) {
    const addButton = document.querySelector('.form-section-title .add-item-btn');
    if (addButton) {
        addButton.style.display = show ? 'inline-block' : 'none';
    }
}

// ================================================
// Edit transaksi
// ================================================
async function editTransaksi(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const item = result.data;
            editingId = id;
            
            const modal = document.getElementById('modal');
            const modalTitle = document.getElementById('modalTitle');
            const submitBtnText = document.getElementById('submitBtnText');
            
            modalTitle.textContent = item.tipe_transaksi === 'keluar' ? 'Edit Obat Keluar' : 'Edit Obat Masuk';
            submitBtnText.textContent = 'Update Transaksi';
            
            currentTab = item.tipe_transaksi;
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === currentTab) {
                    btn.classList.add('active');
                }
            });
            
            await loadObatList();
            await loadStaffList();
            
            const itemsContainer = document.getElementById('transactionItems');
            itemsContainer.innerHTML = '';
            
            addTransactionItem();
            
            showAddItemButton(false);
            
            setTimeout(() => {
                const firstItem = itemsContainer.querySelector('.transaction-item');
                if (firstItem) {
                    const removeBtn = firstItem.querySelector('.remove-item-btn');
                    if (removeBtn) {
                        removeBtn.style.display = 'none';
                    }
                    
                    firstItem.querySelector('.item-obat').value = item.id_obat;
                    firstItem.querySelector('.item-jumlah').value = item.jumlah;
                    firstItem.querySelector('.item-satuan').value = item.satuan;
                    firstItem.querySelector('.item-keterangan').value = item.keterangan || '';
                    
                    if (item.tipe_transaksi === 'masuk') {
                        if (item.nomor_batch) {
                            firstItem.querySelector('.item-nomor-batch').value = item.nomor_batch;
                        }
                        if (item.nomor_faktur) {
                            firstItem.querySelector('.item-nomor-faktur').value = item.nomor_faktur;
                        }
                        if (item.tanggal_kedaluwarsa) {
                            firstItem.querySelector('.item-tanggal-kedaluwarsa').value = item.tanggal_kedaluwarsa;
                        }
                    }
                    
                    if (item.tipe_transaksi === 'keluar' && item.nomor_batch) {
                        const selectedBatches = [{
                            nomor_batch: item.nomor_batch,
                            tanggal_kedaluwarsa: item.tanggal_kedaluwarsa,
                            jumlah: item.jumlah,
                            satuan: item.satuan
                        }];
                        firstItem.dataset.selectedBatches = JSON.stringify(selectedBatches);
                        updateItemWithBatches(firstItem, selectedBatches);
                    }
                }
                
                document.getElementById('tanggalTransaksi').value = item.tanggal_transaksi;
                document.getElementById('idStaff').value = item.id_staff;
                document.getElementById('keterangan').value = item.keterangan || '';
                
                if (item.tipe_transaksi === 'keluar' && item.tujuan) {
                    const tujuanSelect = document.getElementById('tujuan');
                    let found = false;
                    for (let option of tujuanSelect.options) {
                        if (option.value === item.tujuan) {
                            tujuanSelect.value = item.tujuan;
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        tujuanSelect.value = 'Lainnya';
                        document.getElementById('tujuanLainnya').value = item.tujuan;
                        document.getElementById('tujuanLainnyaGroup').style.display = 'block';
                    }
                }
                
                toggleTujuanField();
                modal.classList.add('show');
            }, 100);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
}

// ================================================
// View detail
// ================================================
async function viewDetail(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const item = result.data;
            const detailContent = document.getElementById('detailContent');
            
            let detailHTML = `
                <div class="detail-row">
                    <span class="detail-label">Tipe Transaksi:</span>
                    <span class="detail-value">
                        <span class="badge ${item.tipe_transaksi}">
                            ${item.tipe_transaksi.toUpperCase()}
                        </span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nama Obat:</span>
                    <span class="detail-value">${item.nama_obat}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Dosis:</span>
                    <span class="detail-value">${item.dosis}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Kategori:</span>
                    <span class="detail-value">${item.kategori}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Jumlah:</span>
                    <span class="detail-value">${item.jumlah} ${item.satuan}</span>
                </div>`;
            
            if (item.tipe_transaksi === 'keluar' && item.tujuan) {
                detailHTML += `
                <div class="detail-row">
                    <span class="detail-label">Tujuan Distribusi:</span>
                    <span class="detail-value">${item.tujuan}</span>
                </div>`;
            }
            
            if (item.nomor_batch) {
                detailHTML += `
                <div class="detail-row">
                    <span class="detail-label">Nomor Batch:</span>
                    <span class="detail-value">${item.nomor_batch}</span>
                </div>`;
            }
            
            if (item.nomor_faktur) {
                detailHTML += `
                <div class="detail-row">
                    <span class="detail-label">Nomor Faktur:</span>
                    <span class="detail-value">${item.nomor_faktur}</span>
                </div>`;
            }
            
            if (item.tanggal_kedaluwarsa) {
                const status = checkExpiryDate(item.tanggal_kedaluwarsa);
                let expiryDisplay = formatDate(item.tanggal_kedaluwarsa);
                
                if (status === 'expired') {
                    expiryDisplay = `<span style="color: #ef4444; font-weight: 600;"> ${expiryDisplay} (KEDALUWARSA)</span>`;
                } else if (status === 'expiring-soon') {
                    expiryDisplay = `<span style="color: #f39c12; font-weight: 600;"> ${expiryDisplay} (SEGERA KEDALUWARSA)</span>`;
                }
                
                detailHTML += `
                <div class="detail-row">
                    <span class="detail-label">Tanggal Kedaluwarsa:</span>
                    <span class="detail-value">${expiryDisplay}</span>
                </div>`;
            }
            
            detailHTML += `
                <div class="detail-row">
                    <span class="detail-label">Tanggal Transaksi:</span>
                    <span class="detail-value">${formatDate(item.tanggal_transaksi)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Staff:</span>
                    <span class="detail-value">${item.nama_staff}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Keterangan:</span>
                    <span class="detail-value">${item.keterangan || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Waktu Input:</span>
                    <span class="detail-value">${new Date(item.tanggal_dibuat).toLocaleString('id-ID')}</span>
                </div>
            `;
            
            detailContent.innerHTML = detailHTML;
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
// Delete transaksi
// ================================================
async function deleteTransaksi(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
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
            alert('Data berhasil dihapus');
            loadTransaksi();
        } else {
            alert('Gagal menghapus data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menghapus data');
    }
}

// ================================================
// Form submit dengan multiple items dan multi-batch
// ================================================
document.getElementById('transaksiForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const items = document.querySelectorAll('.transaction-item');
    if (items.length === 0) {
        alert('Minimal harus ada 1 item obat');
        return;
    }

    const tanggalTransaksi = document.getElementById('tanggalTransaksi').value;
    const idStaff = document.getElementById('idStaff').value;
    const keterangan = document.getElementById('keterangan').value;
    
    if (!tanggalTransaksi || !idStaff) {
        alert('Tanggal transaksi dan Staff Penanggung Jawab wajib diisi');
        return;
    }
    
    let tujuan = null;
    if (currentTab === 'keluar') {
        const tujuanSelect = document.getElementById('tujuan').value;
        if (!tujuanSelect) {
            alert('Tujuan distribusi wajib diisi');
            return;
        }
        if (tujuanSelect === 'Lainnya') {
            tujuan = document.getElementById('tujuanLainnya').value;
            if (!tujuan) {
                alert('Mohon isi tujuan lainnya');
                return;
            }
        } else {
            tujuan = tujuanSelect;
        }
    }
    
    try {
        // Handle UPDATE (single item edit)
        if (editingId) {
            const firstItem = items[0];
            const idObat = firstItem.querySelector('.item-obat').value;
            const jumlah = firstItem.querySelector('.item-jumlah').value;
            const satuan = firstItem.querySelector('.item-satuan').value;
            const itemKeterangan = firstItem.querySelector('.item-keterangan').value;
            
            if (!idObat || !jumlah || !satuan) {
                alert('Mohon lengkapi semua field yang diperlukan');
                return;
            }
            
            const updateData = {
                id: editingId,
                id_obat: idObat,
                id_staff: idStaff,
                tipe_transaksi: currentTab,
                jumlah: parseInt(jumlah),
                satuan: satuan,
                tanggal_transaksi: tanggalTransaksi,
                keterangan: itemKeterangan
            };
            
            if (currentTab === 'keluar' && tujuan) {
                updateData.tujuan = tujuan;
            }
            
            if (currentTab === 'masuk') {
                const nomorBatch = firstItem.querySelector('.item-nomor-batch').value;
                const nomorFaktur = firstItem.querySelector('.item-nomor-faktur').value;
                const tanggalKedaluwarsa = firstItem.querySelector('.item-tanggal-kedaluwarsa').value;
                
                if (!nomorBatch || !nomorFaktur || !tanggalKedaluwarsa) {
                    alert('Batch, faktur, dan tanggal kedaluwarsa wajib diisi untuk obat masuk');
                    return;
                }
                
                updateData.nomor_batch = nomorBatch;
                updateData.nomor_faktur = nomorFaktur;
                updateData.tanggal_kedaluwarsa = tanggalKedaluwarsa;
            }
            
            const response = await fetch(`${API_URL}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Data berhasil diupdate');
                closeModal();
                loadTransaksi();
                loadObatList();
            } else {
                alert('Gagal mengupdate data: ' + result.message);
            }
            
            return;
        }
        
        // Handle CREATE
        const allTransactionItems = [];
        let hasError = false;
        
        items.forEach((item, index) => {
            const idObat = item.querySelector('.item-obat').value;
            const jumlah = item.querySelector('.item-jumlah').value;
            const satuan = item.querySelector('.item-satuan').value;
            const itemKeterangan = item.querySelector('.item-keterangan').value;
            
            if (!idObat || !jumlah || !satuan) {
                alert(`Item #${index + 1}: Mohon lengkapi semua field yang diperlukan`);
                hasError = true;
                return;
            }
            
            if (currentTab === 'keluar') {
                // Untuk obat keluar, cek apakah batch sudah dipilih
                const selectedBatches = item.dataset.selectedBatches ? 
                    JSON.parse(item.dataset.selectedBatches) : [];
                
                if (selectedBatches.length === 0) {
                    alert(`Item #${index + 1}: Silakan pilih batch untuk obat keluar`);
                    hasError = true;
                    return;
                }
                
                const totalFromBatches = selectedBatches.reduce((sum, batch) => sum + batch.jumlah, 0);
                
                if (totalFromBatches !== parseInt(jumlah)) {
                    alert(`Item #${index + 1}: Jumlah dari batch (${totalFromBatches}) tidak sesuai dengan jumlah yang diminta (${jumlah})`);
                    hasError = true;
                    return;
                }
                
                // Buat transaksi untuk setiap batch
                selectedBatches.forEach(batch => {
                    const itemData = {
                        id_obat: idObat,
                        jumlah: batch.jumlah,
                        satuan: batch.satuan || satuan,
                        keterangan: itemKeterangan,
                        nomor_batch: batch.nomor_batch,
                        tanggal_kedaluwarsa: batch.tanggal_kedaluwarsa
                    };
                    
                    allTransactionItems.push(itemData);
                });
            } else {
                // Untuk obat masuk (single batch per item)
                const nomorBatch = item.querySelector('.item-nomor-batch').value;
                const nomorFaktur = item.querySelector('.item-nomor-faktur').value;
                const tanggalKedaluwarsa = item.querySelector('.item-tanggal-kedaluwarsa').value;
                
                if (!nomorBatch || !nomorFaktur || !tanggalKedaluwarsa) {
                    alert(`Item #${index + 1}: Batch, faktur, dan tanggal kedaluwarsa wajib diisi untuk obat masuk`);
                    hasError = true;
                    return;
                }
                
                const itemData = {
                    id_obat: idObat,
                    jumlah: parseInt(jumlah),
                    satuan: satuan,
                    keterangan: itemKeterangan,
                    nomor_batch: nomorBatch,
                    nomor_faktur: nomorFaktur,
                    tanggal_kedaluwarsa: tanggalKedaluwarsa
                };
                
                allTransactionItems.push(itemData);
            }
        });
        
        if (hasError || allTransactionItems.length === 0) {
            return;
        }

        const requestData = {
            transaction: {
                id_staff: idStaff,
                tipe_transaksi: currentTab,
                tanggal_transaksi: tanggalTransaksi,
                keterangan: keterangan
            },
            items: allTransactionItems
        };
        
        if (currentTab === 'keluar' && tujuan) {
            requestData.transaction.tujuan = tujuan;
        }
        
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`Data berhasil disimpan (${result.count || allTransactionItems.length} transaksi)`);
            closeModal();
            loadTransaksi();
            loadObatList();
        } else {
            alert('Gagal menyimpan data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menyimpan data');
    }
});

// ================================================
// Tab navigation
// ================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tab = this.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        currentTab = tab;
        
        const btnText = document.getElementById('btnText');
        btnText.textContent = tab === 'keluar' ? 'Catat Obat Keluar' : 'Catat Obat Masuk';
        
        updateTableHeaders();
        loadTransaksi();
    });
});

// ================================================
// Event listeners
// ================================================
document.getElementById('tujuan').addEventListener('change', function() {
    const tujuanLainnyaGroup = document.getElementById('tujuanLainnyaGroup');
    const tujuanLainnyaInput = document.getElementById('tujuanLainnya');
    
    if (this.value === 'Lainnya') {
        tujuanLainnyaGroup.style.display = 'block';
        tujuanLainnyaInput.required = true;
    } else {
        tujuanLainnyaGroup.style.display = 'none';
        tujuanLainnyaInput.required = false;
        tujuanLainnyaInput.value = '';
    }
});

document.getElementById('searchInput').addEventListener('input', function(e) {
    renderTable(e.target.value);
});

document.getElementById('filterDate').addEventListener('change', async function(e) {
    const date = e.target.value;
    
    if (date) {
        try {
            const response = await fetch(`${API_URL}?tipe=${currentTab}&tanggal=${date}`);
            const result = await response.json();
            
            if (result.success) {
                transaksiData = result.data;
                renderTable(document.getElementById('searchInput').value);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    } else {
        loadTransaksi();
    }
});

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

document.getElementById('batchSelectionModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeBatchSelectionModal();
    }
});

// ================================================
// Load data saat halaman dimuat
// ================================================
document.addEventListener('DOMContentLoaded', function() {
    loadObatList();
    loadStaffList();
    loadTransaksi();
    toggleTujuanField();
});