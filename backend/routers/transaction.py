from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from database import get_db_connection
from datetime import date

router = APIRouter()

class TransactionItem(BaseModel):
    id_obat: int
    jumlah: int
    satuan: str
    nomor_batch: Optional[str] = None
    tanggal_kedaluwarsa: Optional[date] = None
    nomor_faktur: Optional[str] = None
    keterangan: Optional[str] = None

class TransactionData(BaseModel):
    id_staff: int
    tipe_transaksi: str
    tanggal_transaksi: date
    tujuan: Optional[str] = None

class CreateTransactionRequest(BaseModel):
    transaction: TransactionData
    items: List[TransactionItem]

class UpdateTransactionRequest(BaseModel):
    id: int
    id_obat: int
    id_staff: int
    tipe_transaksi: str
    jumlah: int
    satuan: str
    tujuan: Optional[str] = None
    tanggal_transaksi: date
    tanggal_kedaluwarsa: Optional[date] = None
    nomor_batch: Optional[str] = None
    nomor_faktur: Optional[str] = None
    keterangan: Optional[str] = None

class DeleteRequest(BaseModel):
    id: int

def get_stok_obat_func(cur, id_obat: int, exclude_id: int = None):
    if exclude_id:
        cur.execute("""
            SELECT COALESCE(
                SUM(CASE WHEN tipe_transaksi = 'masuk' THEN jumlah ELSE 0 END) - 
                SUM(CASE WHEN tipe_transaksi = 'keluar' THEN jumlah ELSE 0 END), 0
            ) as stok
            FROM transaksi_obat WHERE id_obat = %s AND id != %s
        """, (id_obat, exclude_id))
    else:
        cur.execute("SELECT get_stok_obat(%s) as stok", (id_obat,))
    return int(cur.fetchone()['stok'])

def get_stok_batch_func(cur, id_obat: int, nomor_batch: str, exclude_id: int = None):
    sql = """
        SELECT COALESCE(
            SUM(CASE WHEN tipe_transaksi = 'masuk' THEN jumlah ELSE 0 END) - 
            SUM(CASE WHEN tipe_transaksi = 'keluar' THEN jumlah ELSE 0 END), 0
        ) as stok
        FROM transaksi_obat WHERE id_obat = %s AND nomor_batch = %s
    """
    params = [id_obat, nomor_batch]
    if exclude_id:
        sql += " AND id != %s"
        params.append(exclude_id)
    cur.execute(sql, tuple(params))
    return int(cur.fetchone()['stok'])

@router.get("/staff")
def get_staff():
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nama_lengkap, email FROM users WHERE role = 'staff' AND status = 'aktif' ORDER BY nama_lengkap ASC")
            return {"success": True, "data": cur.fetchall()}
    finally:
        conn.close()

@router.post("/")
def create_transaction(req: CreateTransactionRequest):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            if not req.items:
                return {"success": False, "message": "Tidak ada item obat yang ditambahkan"}
            
            inserted_count = 0
            
            for item in req.items:
                if req.transaction.tipe_transaksi == 'keluar':
                    if item.nomor_batch:
                        stok_batch = get_stok_batch_func(cur, item.id_obat, item.nomor_batch)
                        cur.execute("SELECT nama_obat FROM obat WHERE id = %s", (item.id_obat,))
                        obat = cur.fetchone()
                        if not obat:
                            conn.rollback()
                            return {"success": False, "message": f"Obat tidak ditemukan: ID {item.id_obat}"}
                        if stok_batch < item.jumlah:
                            conn.rollback()
                            return {"success": False, "message": f"Stok batch tidak mencukupi! {obat['nama_obat']} - Batch {item.nomor_batch}: Stok tersedia: {stok_batch}, diminta: {item.jumlah}"}
                    else:
                        stok_tersedia = get_stok_obat_func(cur, item.id_obat)
                        cur.execute("SELECT nama_obat FROM obat WHERE id = %s", (item.id_obat,))
                        obat = cur.fetchone()
                        if not obat:
                            conn.rollback()
                            return {"success": False, "message": f"Obat tidak ditemukan: ID {item.id_obat}"}
                        if stok_tersedia < item.jumlah:
                            conn.rollback()
                            return {"success": False, "message": f"Stok tidak mencukupi! {obat['nama_obat']} - Stok tersedia: {stok_tersedia}, diminta: {item.jumlah}"}
                
                cur.execute("""
                    INSERT INTO transaksi_obat 
                    (id_obat, id_staff, tipe_transaksi, jumlah, satuan, tujuan, tanggal_transaksi, 
                     tanggal_kedaluwarsa, nomor_batch, nomor_faktur, keterangan) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    item.id_obat, req.transaction.id_staff, req.transaction.tipe_transaksi,
                    item.jumlah, item.satuan, req.transaction.tujuan, req.transaction.tanggal_transaksi,
                    item.tanggal_kedaluwarsa, item.nomor_batch, item.nomor_faktur, item.keterangan
                ))
                inserted_count += 1
                
            conn.commit()
            return {"success": True, "message": "Data berhasil disimpan", "count": inserted_count}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()

@router.put("/")
def update_transaction(req: UpdateTransactionRequest):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM transaksi_obat WHERE id = %s", (req.id,))
            old_data = cur.fetchone()
            if not old_data:
                return {"success": False, "message": "Data transaksi tidak ditemukan"}
            
            if req.tipe_transaksi == 'keluar':
                stok_tersedia = get_stok_obat_func(cur, req.id_obat, req.id)
                cur.execute("SELECT nama_obat FROM obat WHERE id = %s", (req.id_obat,))
                obat = cur.fetchone()
                if stok_tersedia < req.jumlah:
                    return {"success": False, "message": f"Stok tidak mencukupi! {obat['nama_obat']} - Stok tersedia: {stok_tersedia}, diminta: {req.jumlah}"}
            
            tgl_kedaluwarsa = req.tanggal_kedaluwarsa if req.tipe_transaksi == 'masuk' or (req.tipe_transaksi == 'keluar' and req.nomor_batch) else None
            no_batch = req.nomor_batch if req.tipe_transaksi == 'masuk' or (req.tipe_transaksi == 'keluar' and req.nomor_batch) else None
            no_faktur = req.nomor_faktur if req.tipe_transaksi == 'masuk' else None
            
            cur.execute("""
                UPDATE transaksi_obat SET 
                id_obat = %s, id_staff = %s, tipe_transaksi = %s, jumlah = %s, satuan = %s,
                tujuan = %s, tanggal_transaksi = %s, tanggal_kedaluwarsa = %s, nomor_batch = %s,
                nomor_faktur = %s, keterangan = %s WHERE id = %s
            """, (
                req.id_obat, req.id_staff, req.tipe_transaksi, req.jumlah, req.satuan,
                req.tujuan, req.tanggal_transaksi, tgl_kedaluwarsa, no_batch,
                no_faktur, req.keterangan, req.id
            ))
            conn.commit()
            return {"success": True, "message": "Data berhasil diupdate"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()

@router.get("/")
def read_transactions(tipe: str = 'keluar', tanggal: Optional[date] = None, start_date: Optional[date] = None, end_date: Optional[date] = None):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT t.*, o.nama_obat, o.dosis, o.kategori, 
                       u.nama_lengkap as nama_staff, u.email as email_staff
                FROM transaksi_obat t 
                JOIN obat o ON t.id_obat = o.id 
                JOIN users u ON t.id_staff = u.id
                WHERE t.tipe_transaksi = %s
            """
            params = [tipe]
            if tanggal:
                sql += " AND t.tanggal_transaksi = %s"
                params.append(tanggal)
            if start_date and end_date:
                sql += " AND t.tanggal_transaksi BETWEEN %s AND %s"
                params.extend([start_date, end_date])
                
            sql += " ORDER BY t.tanggal_transaksi DESC, t.tanggal_dibuat DESC"
            cur.execute(sql, tuple(params))
            return {"success": True, "data": cur.fetchall()}
    finally:
        conn.close()

@router.get("/{id}")
def read_single_transaction(id: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT t.*, o.nama_obat, o.dosis, o.kategori, 
                       u.nama_lengkap as nama_staff, u.email as email_staff
                FROM transaksi_obat t 
                JOIN obat o ON t.id_obat = o.id 
                JOIN users u ON t.id_staff = u.id
                WHERE t.id = %s
            """, (id,))
            data = cur.fetchone()
            if data:
                return {"success": True, "data": data}
            else:
                return {"success": False, "message": "Data tidak ditemukan"}
    finally:
        conn.close()

@router.delete("/")
def delete_transaction(req: DeleteRequest):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id_obat, tipe_transaksi, jumlah FROM transaksi_obat WHERE id = %s", (req.id,))
            transaksi = cur.fetchone()
            if transaksi:
                if transaksi['tipe_transaksi'] == 'masuk':
                    stok_tersedia = get_stok_obat_func(cur, transaksi['id_obat'])
                    if stok_tersedia < transaksi['jumlah']:
                        return {"success": False, "message": f"Tidak dapat menghapus transaksi masuk ini karena akan membuat stok negatif. Stok saat ini: {stok_tersedia}"}
                
                cur.execute("DELETE FROM transaksi_obat WHERE id = %s", (req.id,))
                conn.commit()
                return {"success": True, "message": "Data berhasil dihapus"}
            else:
                return {"success": False, "message": "Data tidak ditemukan"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()

@router.get("/summary/today")
def transaction_summary():
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            today = date.today()
            cur.execute("SELECT COUNT(*) as total FROM transaksi_obat WHERE tipe_transaksi = 'keluar' AND tanggal_transaksi = %s", (today,))
            keluar = cur.fetchone()['total']
            
            cur.execute("SELECT COUNT(*) as total FROM transaksi_obat WHERE tipe_transaksi = 'masuk' AND tanggal_transaksi = %s", (today,))
            masuk = cur.fetchone()['total']
            
            return {"success": True, "data": {"keluar": keluar, "masuk": masuk, "total": keluar + masuk}}
    finally:
        conn.close()

@router.get("/stock/check")
def check_stock(id_obat: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nama_obat FROM obat WHERE id = %s", (id_obat,))
            obat = cur.fetchone()
            if obat:
                stok = get_stok_obat_func(cur, id_obat)
                return {"success": True, "data": {"id": obat['id'], "nama_obat": obat['nama_obat'], "stok": stok}}
            return {"success": False, "message": "Obat tidak ditemukan"}
    finally:
        conn.close()

@router.get("/batch/info")
def get_batch_info(id_obat: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    t.nomor_batch,
                    t.tanggal_kedaluwarsa,
                    t.satuan,
                    SUM(CASE WHEN t.tipe_transaksi = 'masuk' THEN t.jumlah ELSE 0 END) as total_masuk,
                    SUM(CASE WHEN t.tipe_transaksi = 'keluar' THEN t.jumlah ELSE 0 END) as total_keluar,
                    (SUM(CASE WHEN t.tipe_transaksi = 'masuk' THEN t.jumlah ELSE 0 END) - 
                     SUM(CASE WHEN t.tipe_transaksi = 'keluar' THEN t.jumlah ELSE 0 END)) as sisa_stok,
                    (t.tanggal_kedaluwarsa - CURRENT_DATE) as hari_tersisa
                FROM transaksi_obat t
                WHERE t.id_obat = %s 
                  AND t.nomor_batch IS NOT NULL
                  AND t.tanggal_kedaluwarsa IS NOT NULL
                GROUP BY t.nomor_batch, t.tanggal_kedaluwarsa, t.satuan
                HAVING (SUM(CASE WHEN t.tipe_transaksi = 'masuk' THEN t.jumlah ELSE 0 END) - 
                        SUM(CASE WHEN t.tipe_transaksi = 'keluar' THEN t.jumlah ELSE 0 END)) > 0
                ORDER BY t.tanggal_kedaluwarsa ASC
            """, (id_obat,))
            return {"success": True, "data": cur.fetchall()}
    finally:
        conn.close()

@router.get("/batch/stock")
def get_batch_stock(id_obat: int, nomor_batch: str):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            stok = get_stok_batch_func(cur, id_obat, nomor_batch)
            return {"success": True, "data": {"stok": stok}}
    finally:
        conn.close()
