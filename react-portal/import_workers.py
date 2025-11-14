#!/usr/bin/env python3
"""
Import Active Workers from CSV to Supabase
Maps to industry-standard warehouse staffing column names
"""

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

CONNECTION_STRING = "postgresql://postgres:Stv060485!!!@db.dxbybjxpglpslmoenqyg.supabase.co:5432/postgres"

def import_workers():
    print("📋 Importing Active Workers from CSV\n")
    
    try:
        # Read CSV file
        print("📖 Reading workers CSV...")
        df = pd.read_csv('CLS_Hub_Backend - Workers (2).csv')
        print(f"   Total records: {len(df)}")
        
        # Filter for active workers only
        active_workers = df[df['Availability'] == 'Active'].copy()
        print(f"   Active workers: {len(active_workers)}")
        
        # Map to industry standard columns (warehouse staffing)
        print("\n🔄 Mapping to industry standard columns...")
        
        # Industry standard mapping
        active_workers['worker_id'] = active_workers['WorkerID']
        active_workers['employee_number'] = active_workers['Employee ID'] 
        active_workers['first_name'] = active_workers['First Name']
        active_workers['last_name'] = active_workers['Last Name']
        active_workers['full_name'] = active_workers['Display Name']
        active_workers['email_address'] = active_workers['Email'].str.lower()
        active_workers['phone_number'] = active_workers['Phone']
        active_workers['job_role'] = active_workers['Role'].map({
            '1': 'Associate',      # General warehouse worker
            '2': 'Lead',          # Team lead/supervisor
            '3': 'Supervisor',    # Department supervisor  
            'Admin': 'Manager'    # Management level
        }).fillna('Associate')
        
        active_workers['pay_rate'] = pd.to_numeric(active_workers['Hourly Rate'], errors='coerce').fillna(18.00)
        active_workers['employment_status'] = 'Active'
        active_workers['access_level'] = active_workers['App Access'].map({
            'Admin': 'Manager',
            'Supervisor': 'Lead', 
            'Worker': 'Associate'
        }).fillna('Associate')
        
        active_workers['primary_language'] = active_workers['Primary Language'].fillna('English')
        active_workers['hire_eligible'] = True  # All active workers are eligible
        active_workers['background_check'] = active_workers['W9Status'].map({
            'approved': 'Cleared',
            'pending': 'In Progress', 
            'none': 'Required'
        }).fillna('Required')
        
        # Connect to Supabase
        print("🔗 Connecting to Supabase...")
        conn = psycopg2.connect(CONNECTION_STRING, sslmode='require', cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Clear existing workers (except admin)
        print("🗑️  Clearing existing worker records (keeping admin)...")
        cursor.execute("DELETE FROM workers WHERE id != 'SG-001'")
        
        print("📥 Inserting active workers...")
        inserted_count = 0
        
        for _, worker in active_workers.iterrows():
            try:
                # Skip if this is the admin user (already exists)
                if worker['worker_id'] == 'SG-001':
                    print(f"   ⏭️  Skipping admin user: {worker['full_name']}")
                    continue
                
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
                    worker['worker_id'],
                    worker['full_name'],
                    worker['email_address'],
                    worker['phone_number'],
                    worker['job_role'], 
                    float(worker['pay_rate']),
                    worker['primary_language'],
                    True,  # is_active
                    worker['background_check'].replace('Cleared', 'approved').replace('Required', 'pending').replace('In Progress', 'pending').lower(),
                    f"Role: {worker['access_level']}, Status: {worker['employment_status']}"
                )
                
                cursor.execute(insert_sql, worker_data)
                inserted_count += 1
                print(f"   ✅ {worker['full_name']} ({worker['worker_id']}) - {worker['job_role']}")
                
            except Exception as e:
                print(f"   ❌ Failed to insert {worker.get('full_name', 'Unknown')}: {e}")
        
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
        cursor.execute("SELECT id, display_name, role, email FROM workers WHERE is_active = true LIMIT 5")
        sample_workers = cursor.fetchall()
        
        print("\n👥 Sample imported workers:")
        for worker in sample_workers:
            print(f"   • {worker['display_name']} ({worker['id']}) - {worker['role']}")
        
        print(f"\n✅ Ready for React Portal login!")
        print("🌐 URL: http://localhost:5173/")
        
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
    import_workers()