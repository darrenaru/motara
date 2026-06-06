// ================================================
// medicine-report.js
// ================================================

const OBAT_API_URL = 'http://localhost:8000/api/obat';
const TRANSACTION_API_URL = 'http://localhost:8000/api/transaction';

let obatData = [];
let transactionData = [];

// ================================================
// Initialize
// ================================================
document.addEventListener('DOMContentLoaded', function() {
    // Set tanggal report ke hari ini
    const today = new Date();
    document.getElementById('reportDate').textContent = formatDate(today);
    
    // Event listener untuk filter periode
    document.getElementById('filterPeriode').addEventListener('change', function() {
        const periode = this.value;
        const customDateStart = document.getElementById('customDateStart');
        const customDateEnd = document.getElementById('customDateEnd');
        
        if (periode === 'custom') {
            customDateStart.style.display = 'block';
            customDateEnd.style.display = 'block';
        } else {
            customDateStart.style.display = 'none';
            customDateEnd.style.display = 'none';
        }
    });
    
    // Load initial data
    loadInitialData();
});

// ================================================
// Load initial data
// ================================================
async function loadInitialData() {
    try {
        // Load obat data
        const obatResponse = await fetch(`${OBAT_API_URL}?action=read`);
        const obatResult = await obatResponse.json();
        
        if (obatResult.success) {
            obatData = obatResult.data;
            document.getElementById('totalJenis').textContent = obatData.length;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ================================================
// Generate report
// ================================================
async function generateReport() {
    const filterKategori = document.getElementById('filterKategori').value;
    const filterPeriode = document.getElementById('filterPeriode').value;
    
    // Get date range
    let startDate, endDate;
    const today = new Date();
    
    switch(filterPeriode) {
        case 'today':
            startDate = endDate = formatDateISO(today);
            break;
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            startDate = formatDateISO(weekAgo);
            endDate = formatDateISO(today);
            break;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            startDate = formatDateISO(monthAgo);
            endDate = formatDateISO(today);
            break;
        case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            startDate = formatDateISO(yearAgo);
            endDate = formatDateISO(today);
            break;
        case 'custom':
            startDate = document.getElementById('startDate').value;
            endDate = document.getElementById('endDate').value;
            if (!startDate || !endDate) {
                alert('Mohon pilih tanggal mulai dan akhir');
                return;
            }
            break;
    }
    
    // Load transactions
    try {
        const url = `${TRANSACTION_API_URL}?start_date=${startDate}&end_date=${endDate}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            transactionData = result.data;
            renderReport(filterKategori);
            updateStatistics();
        } else {
            alert('Gagal memuat data transaksi: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
}

// ================================================
// Render report table
// ================================================
function renderReport(filterKategori) {
    const tbody = document.getElementById('reportTableBody');
    
    // Filter obat berdasarkan kategori
    let filteredObat = obatData;
    if (filterKategori !== 'all') {
        filteredObat = obatData.filter(obat => obat.kategori === filterKategori);
    }
    
    if (filteredObat.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <p>Tidak ada data obat untuk kategori yang dipilih</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate stock for each medicine
    const reportData = filteredObat.map((obat, index) => {
        const transactions = transactionData.filter(t => t.id_obat === obat.id);
        
        const totalMasuk = transactions
            .filter(t => t.tipe_transaksi === 'masuk')
            .reduce((sum, t) => sum + parseInt(t.jumlah), 0);
            
        const totalKeluar = transactions
            .filter(t => t.tipe_transaksi === 'keluar')
            .reduce((sum, t) => sum + parseInt(t.jumlah), 0);
            
        const sisaStok = totalMasuk - totalKeluar;
        
        return {
            no: index + 1,
            nama: obat.nama,
            dosis: obat.dosis,
            kategori: obat.kategori,
            totalMasuk: totalMasuk,
            totalKeluar: totalKeluar,
            sisaStok: sisaStok
        };
    });
    
    // Render table
    tbody.innerHTML = reportData.map(item => `
        <tr>
            <td>${item.no}</td>
            <td>${item.nama}</td>
            <td>${item.dosis}</td>
            <td>${item.kategori}</td>
            <td style="text-align: center; color: #059669; font-weight: 600;">${item.totalMasuk}</td>
            <td style="text-align: center; color: #dc2626; font-weight: 600;">${item.totalKeluar}</td>
            <td style="text-align: center; font-weight: 700; ${item.sisaStok < 10 ? 'color: #dc2626;' : 'color: #059669;'}">${item.sisaStok}</td>
        </tr>
    `).join('');
}

// ================================================
// Update statistics
// ================================================
function updateStatistics() {
    // Total transaksi
    document.getElementById('totalTransaksi').textContent = transactionData.length;
    
    // Total keluar
    const totalKeluar = transactionData
        .filter(t => t.tipe_transaksi === 'keluar')
        .reduce((sum, t) => sum + parseInt(t.jumlah), 0);
    document.getElementById('totalKeluar').textContent = totalKeluar;
    
    // Total masuk
    const totalMasuk = transactionData
        .filter(t => t.tipe_transaksi === 'masuk')
        .reduce((sum, t) => sum + parseInt(t.jumlah), 0);
    document.getElementById('totalMasuk').textContent = totalMasuk;
}

// ================================================
// Print report
// ================================================
function printReport() {
    window.print();
}

// ================================================
// Export to Excel
// ================================================
function exportToExcel() {
    const tbody = document.getElementById('reportTableBody');
    
    if (tbody.querySelector('.empty-state')) {
        alert('Harap generate laporan terlebih dahulu');
        return;
    }
    
    // Get table data
    const rows = tbody.querySelectorAll('tr');
    let csv = 'No,Nama Obat,Dosis,Kategori,Total Masuk,Total Keluar,Sisa Stok\n';
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        const rowData = Array.from(cols).map(col => col.textContent.trim()).join(',');
        csv += rowData + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const today = new Date();
    const filename = `Laporan_Stok_${formatDateISO(today)}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ================================================
// Format date helpers
// ================================================
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}