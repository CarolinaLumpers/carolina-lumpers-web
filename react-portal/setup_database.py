#!/usr/bin/env python3
"""
CLS Supabase Database Setup - Python Version
Direct PostgreSQL connection for reliable table creation
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import sys

# PostgreSQL connection string
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# PostgreSQL connection string from environment
CONNECTION_STRING = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")

if not CONNECTION_STRING:
    print("❌ Missing DATABASE_URL or SUPABASE_DB_URL in .env file")
    exit(1)

def setup_database():
    print("🚀 CLS PostgreSQL Database Setup\n")
    
    try:
        # Connect to database
        print("🔗 Connecting to PostgreSQL...")
        conn = psycopg2.connect(
            CONNECTION_STRING,
            sslmode='require',
            cursor_factory=RealDictCursor
        )
        cursor = conn.cursor()
        print("✅ Connected successfully!\n")

        # Read schema file
        print("📖 Reading schema file...")
        with open('supabase-ready.sql', 'r') as file:
            schema = file.read()

        # Execute schema
        print("🏗️ Creating tables...")
        cursor.execute(schema)
        conn.commit()
        print("✅ Schema executed successfully!\n")

        # Test database
        print("🧪 Testing database...")
        
        # Check workers table
        cursor.execute("SELECT COUNT(*) FROM workers")
        workers_count = cursor.fetchone()['count']
        print(f"👥 Workers table: {workers_count} records")
        
        # Check admin user
        cursor.execute("SELECT * FROM workers WHERE role = 'Admin'")
        admin_users = cursor.fetchall()
        print(f"👤 Admin users: {len(admin_users)} found")
        for user in admin_users:
            print(f"   - {user['display_name']} ({user['id']})")
        
        # Check clients table
        cursor.execute("SELECT COUNT(*) FROM clients")
        clients_count = cursor.fetchone()['count']
        print(f"🏢 Clients table: {clients_count} records")
        
        # Check app settings
        cursor.execute("SELECT COUNT(*) FROM app_settings")
        settings_count = cursor.fetchone()['count']
        print(f"⚙️  App settings: {settings_count} records")
        
        # List all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print(f"\n📋 Database setup complete! ({len(tables)} tables created)")
        for table in tables:
            print(f"   • {table['table_name']}")
        
        print("\n🎯 Next Steps:")
        print("   1. Test React Portal connection")
        print("   2. Update API to use Supabase")
        print("   3. Enable real-time subscriptions")
        
        print("\n✅ Ready for React Portal integration!")
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ Schema file 'supabase-ready.sql' not found")
        print("   Make sure you're in the react-portal directory")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    setup_database()