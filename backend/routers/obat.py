from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection

router = APIRouter()

class ObatCreate(BaseModel):
    nama: str
    dosis: str
    kategori: str

class ObatUpdate(ObatCreate):
    id: int

@router.get("/")
def read_obat():
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    id, 
                    nama_obat as nama, 
                    dosis, 
                    kategori,
                    stok_tersedia as stok,
                    total_masuk,
                    total_keluar
                FROM view_stok_obat 
                ORDER BY nama_obat ASC
            """)
            data = cur.fetchall()
            return {"success": True, "message": "Data berhasil diambil", "data": data}
    finally:
        conn.close()

@router.get("/{id}")
def read_single_obat(id: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
        
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    id, 
                    nama_obat as nama, 
                    dosis, 
                    kategori,
                    stok_tersedia as stok,
                    total_masuk,
                    total_keluar
                FROM view_stok_obat 
                WHERE id = %s
            """, (id,))
            data = cur.fetchone()
            if data:
                return {"success": True, "message": "Data berhasil diambil", "data": data}
            else:
                return {"success": False, "message": "Data tidak ditemukan", "data": None}
    finally:
        conn.close()

@router.get("/{id}/stok")
def get_stok(id: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
        
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT get_stok_obat(%s) as stok", (id,))
            data = cur.fetchone()
            if data:
                return {"success": True, "message": "Stok berhasil diambil", "data": {"stok": data['stok']}}
            else:
                return {"success": False, "message": "Gagal mengambil stok", "data": None}
    finally:
        conn.close()

@router.post("/")
def create_obat(obat: ObatCreate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
        
    try:
        with conn.cursor() as cur:
            # Check duplicate
            cur.execute("SELECT id FROM obat WHERE nama_obat = %s AND dosis = %s", (obat.nama, obat.dosis))
            if cur.fetchone():
                return {"success": False, "message": "Obat dengan nama dan dosis yang sama sudah ada", "data": None}
            
            cur.execute(
                "INSERT INTO obat (nama_obat, dosis, kategori) VALUES (%s, %s, %s) RETURNING id",
                (obat.nama, obat.dosis, obat.kategori)
            )
            new_id = cur.fetchone()['id']
            conn.commit()
            return {"success": True, "message": "Data berhasil ditambahkan", "data": {"id": new_id}}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal menambahkan data: {str(e)}", "data": None}
    finally:
        conn.close()

@router.put("/")
def update_obat(obat: ObatUpdate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
        
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE obat SET nama_obat = %s, dosis = %s, kategori = %s WHERE id = %s",
                (obat.nama, obat.dosis, obat.kategori, obat.id)
            )
            conn.commit()
            return {"success": True, "message": "Data berhasil diupdate", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal mengupdate data: {str(e)}", "data": None}
    finally:
        conn.close()

class DeleteRequest(BaseModel):
    id: int

@router.delete("/")
def delete_obat(req: DeleteRequest):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
        
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as total FROM transaksi_obat WHERE id_obat = %s", (req.id,))
            check = cur.fetchone()
            if check['total'] > 0:
                return {"success": False, "message": f"Tidak dapat menghapus obat yang sudah memiliki transaksi. Total transaksi: {check['total']}", "data": None}
            
            cur.execute("DELETE FROM obat WHERE id = %s", (req.id,))
            conn.commit()
            return {"success": True, "message": "Data berhasil dihapus", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal menghapus data: {str(e)}", "data": None}
    finally:
        conn.close()
