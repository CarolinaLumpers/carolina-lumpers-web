#!/usr/bin/env python3
"""
CLS Supabase Database Setup - Environment Variables Version
Creates all tables and initial data for Carolina Lumpers Service
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()

# Database connection parameters
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

def setup_database():
    print("🚀 CLS Supabase Database Setup")
    print("=" * 50)
    
    # Validate environment variables
    if not all([USER, PASSWORD, HOST, PORT, DBNAME]):
        print("❌ Missing database credentials in .env file")
        print("   Required: user, password, host, port, dbname")
        return False
    
    try:
        # Connect to database
        print(f"🔗 Connecting to {HOST}...")
        connection = psycopg2.connect(
            user=USER,
            password=PASSWORD,
            host=HOST,
            port=PORT,
            dbname=DBNAME,
            sslmode='require'
        )
        print("✅ Connection successful!")
        
        # Create cursor
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Test connection
        cursor.execute("SELECT NOW();")
        current_time = cursor.fetchone()
        print(f"📅 Database time: {current_time['now']}")
        print()
        
        # Read and execute schema
        print("📖 Reading schema file...")
        try:
            with open('supabase-ready.sql', 'r') as file:
                schema = file.read()
        except FileNotFoundError:
            print("❌ Schema file 'supabase-ready.sql' not found")
            print("   Make sure you're in the react-portal directory")
            return False
        
        print("🏗️  Creating database tables...")
        cursor.execute(schema)
        connection.commit()
        print("✅ Schema executed successfully!")
        print()
        
        # Verify tables created
        print("🧪 Verifying database setup...")
        
        # List all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        print(f"📋 Tables created: {len(tables)}")
        for table in tables:
            print(f"   • {table['table_name']}")
        print()
        
        # Check workers table
        cursor.execute("SELECT COUNT(*) as count FROM workers")
        workers_count = cursor.fetchone()['count']
        print(f"👥 Workers: {workers_count} records")
        
        # Check admin users
        cursor.execute("SELECT id, display_name, email, role FROM workers WHERE role = 'Admin'")
        admin_users = cursor.fetchall()
        print(f"👤 Admin users: {len(admin_users)}")
        for admin in admin_users:
            print(f"   • {admin['display_name']} ({admin['id']}) - {admin['email']}")
        
        # Check clients
        cursor.execute("SELECT COUNT(*) as count FROM clients")
        clients_count = cursor.fetchone()['count']
        print(f"🏢 Clients: {clients_count} records")
        
        # Check app settings
        cursor.execute("SELECT COUNT(*) as count FROM app_settings")
        settings_count = cursor.fetchone()['count']
        print(f"⚙️  App settings: {settings_count} records")
        
        print()
        print("🎯 Database setup complete!")
        print("✅ Ready for React Portal integration")
        print()
        print("Next steps:")
        print("1. Test React Portal Supabase connection")
        print("2. Update API services to use Supabase")
        print("3. Test authentication flow")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        # Clean up connections
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)