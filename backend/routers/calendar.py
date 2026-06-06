from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection
from datetime import datetime

router = APIRouter()

class KegiatanCreate(BaseModel):
    judul: str
    deskripsi: Optional[str] = None
    tanggal_mulai: str
    tanggal_selesai: str
    lokasi: Optional[str] = None
    jenis: str
    status: str = 'terjadwal'
    id_pembuat: int

class KegiatanUpdate(BaseModel):
    id: int
    judul: str
    deskripsi: Optional[str] = None
    tanggal_mulai: str
    tanggal_selesai: str
    lokasi: Optional[str] = None
    jenis: str
    status: str = 'terjadwal'

class DeleteRequest(BaseModel):
    id: int

@router.get("/")
def read_kegiatan(bulan: Optional[int] = None, tahun: Optional[int] = None):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT k.*, u.nama_lengkap as nama_pembuat 
                FROM kegiatan k 
                JOIN users u ON k.id_pembuat = u.id
            """
            params = []
            if bulan and tahun:
                sql += " WHERE EXTRACT(MONTH FROM k.tanggal_mulai) = %s AND EXTRACT(YEAR FROM k.tanggal_mulai) = %s"
                params.extend([bulan, tahun])
            
            sql += " ORDER BY k.tanggal_mulai ASC"
            
            cur.execute(sql, tuple(params))
            return {"success": True, "message": "Data berhasil diambil", "data": cur.fetchall()}
    finally:
        conn.close()

@router.get("/{id}")
def read_single_kegiatan(id: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT k.*, u.nama_lengkap as nama_pembuat, u.email as email_pembuat
                FROM kegiatan k 
                JOIN users u ON k.id_pembuat = u.id
                WHERE k.id = %s
            """, (id,))
            data = cur.fetchone()
            if data:
                return {"success": True, "message": "Data berhasil diambil", "data": data}
            return {"success": False, "message": "Data tidak ditemukan", "data": None}
    finally:
        conn.close()

@router.post("/")
def create_kegiatan(req: KegiatanCreate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO kegiatan (judul, deskripsi, tanggal_mulai, tanggal_selesai, lokasi, jenis, status, id_pembuat) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (req.judul, req.deskripsi, req.tanggal_mulai, req.tanggal_selesai, req.lokasi, req.jenis, req.status, req.id_pembuat))
            new_id = cur.fetchone()['id']
            conn.commit()
            return {"success": True, "message": "Kegiatan berhasil ditambahkan", "data": {"id": new_id}}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal menambahkan kegiatan: {str(e)}", "data": None}
    finally:
        conn.close()

@router.put("/")
def update_kegiatan(req: KegiatanUpdate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE kegiatan SET 
                judul = %s, deskripsi = %s, tanggal_mulai = %s, tanggal_selesai = %s, 
                lokasi = %s, jenis = %s, status = %s WHERE id = %s
            """, (req.judul, req.deskripsi, req.tanggal_mulai, req.tanggal_selesai, req.lokasi, req.jenis, req.status, req.id))
            conn.commit()
            return {"success": True, "message": "Kegiatan berhasil diupdate", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal mengupdate kegiatan: {str(e)}", "data": None}
    finally:
        conn.close()

@router.delete("/")
def delete_kegiatan(req: DeleteRequest):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM kegiatan WHERE id = %s", (req.id,))
            conn.commit()
            return {"success": True, "message": "Kegiatan berhasil dihapus", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal menghapus kegiatan: {str(e)}", "data": None}
    finally:
        conn.close()
