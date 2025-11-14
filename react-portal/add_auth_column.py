#!/usr/bin/env python3
"""
Add Auth User ID Column to Workers Table
Links workers table with Supabase Auth users
"""

import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

CONNECTION_STRING = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")

if not CONNECTION_STRING:
    print("❌ Missing DATABASE_URL or SUPABASE_DB_URL in .env file")
    exit(1)

def add_auth_column():
    print("🔗 Adding Supabase Auth integration to workers table")
    
    try:
        conn = psycopg2.connect(
            CONNECTION_STRING,
            sslmode='require'
        )
        cursor = conn.cursor()
        
        print("📖 Reading SQL file...")
        with open('add-auth-column.sql', 'r') as file:
            sql = file.read()
        
        print("🏗️  Updating workers table schema...")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Auth column added successfully!")
        
        # Verify the column was added
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workers' 
            AND column_name = 'auth_user_id'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"📋 Verified: {result[0]} ({result[1]})")
        else:
            print("❌ Column not found after creation")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    add_auth_column()