#!/usr/bin/env python3
"""
Import Active Workers - Simplified Version
No pandas dependency - manual CSV parsing
"""

import csv
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

CONNECTION_STRING = "postgresql://postgres:Stv060485!!!@db.dxbybjxpglpslmoenqyg.supabase.co:5432/postgres"

def import_active_workers():
    print("📋 Importing Active Workers from CSV\n")
    
    try:
        # Read CSV file manually
        print("📖 Reading workers CSV...")
        active_workers = []
        
        with open('CLS_Hub_Backend - Workers (2).csv', 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            total_count = 0
            
            for row in csv_reader:
                total_count += 1
                if row.get('Availability', '').strip() == 'Active':
                    active_workers.append(row)
        
        print(f"   Total records: {total_count}")
        print(f"   Active workers: {len(active_workers)}")
        
        # Connect to Supabase
        print("\n🔗 Connecting to Supabase...")
        conn = psycopg2.connect(CONNECTION_STRING, sslmode='require', cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Clear existing workers (except admin)
        print("🗑️  Clearing existing worker records (keeping admin)...")
        cursor.execute("DELETE FROM workers WHERE id != 'SG-001'")
        
        print("📥 Inserting active workers...")
        inserted_count = 0
        
        for worker in active_workers:
            try:
                worker_id = worker.get('WorkerID', '').strip()
                
                # Skip if this is the admin user (already exists)
                if worker_id == 'SG-001':
                    print(f"   ⏭️  Skipping admin user: {worker.get('Display Name', '')}")
                    continue
                
                # Map role to industry standard
                role_mapping = {
                    '1': 'Associate',      # General warehouse worker
                    '2': 'Lead',          # Team lead/supervisor
                    '3': 'Supervisor',    # Department supervisor
                    'Admin': 'Admin'      # Management level
                }
                
                raw_role = worker.get('Role', '1').strip()
                mapped_role = role_mapping.get(raw_role, 'Worker')
                
                # Map W9 status
                w9_mapping = {
                    'approved': 'approved',
                    'pending': 'pending',
                    'none': 'pending',
                    '': 'pending'
                }
                
                w9_status = w9_mapping.get(worker.get('W9Status', '').strip().lower(), 'pending')
                
                # Clean hourly rate
                try:
                    hourly_rate = float(worker.get('Hourly Rate', '18').strip() or '18')
                except:
                    hourly_rate = 18.0
                
                # Clean phone
                phone = worker.get('Phone', '').strip()
                if not phone:
                    phone = None
                
                insert_sql = """
                INSERT INTO workers (
                    id, display_name, email, phone, role, hourly_rate, 
                    language, is_active, w9_status, notes, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                """
                
                # Prepare data
                worker_data = (
                    worker_id,
                    worker.get('Display Name', '').strip(),
                    worker.get('Email', '').strip().lower(),
                    phone,
                    mapped_role,
                    hourly_rate,
                    worker.get('Primary Language', 'English').strip() or 'English',
                    True,  # is_active
                    w9_status,
                    f"App Access: {worker.get('App Access', 'Worker')}"
                )
                
                cursor.execute(insert_sql, worker_data)
                inserted_count += 1
                print(f"   ✅ {worker.get('Display Name', '')} ({worker_id}) - {mapped_role}")
                
            except Exception as e:
                print(f"   ❌ Failed to insert {worker.get('Display Name', 'Unknown')}: {e}")
        
        # Commit changes
        conn.commit()
        
        print(f"\n🎯 Import Complete!")
        print(f"   • Workers imported: {inserted_count}")
        print(f"   • Admin preserved: 1 (SG-001)")
        print(f"   • Total active workers: {inserted_count + 1}")
        
        # Verify import
        print("\n📊 Verification:")
        cursor.execute("SELECT COUNT(*) as total FROM workers WHERE is_active = true")
        total_active = cursor.fetchone()['total']
        
        cursor.execute("SELECT role, COUNT(*) as count FROM workers GROUP BY role ORDER BY count DESC")
        role_counts = cursor.fetchall()
        
        print(f"   Total active workers in database: {total_active}")
        print("   Role distribution:")
        for role_data in role_counts:
            print(f"     • {role_data['role']}: {role_data['count']}")
        
        # Show sample workers
        cursor.execute("SELECT id, display_name, role, email FROM workers WHERE is_active = true ORDER BY created_at DESC LIMIT 10")
        sample_workers = cursor.fetchall()
        
        print("\n👥 Recently imported workers:")
        for worker in sample_workers:
            print(f"   • {worker['display_name']} ({worker['id']}) - {worker['role']}")
        
        print(f"\n✅ Workers imported successfully!")
        print("🌐 Ready for React Portal: http://localhost:5173/")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    import_active_workers()