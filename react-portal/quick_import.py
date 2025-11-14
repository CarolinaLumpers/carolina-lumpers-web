#!/usr/bin/env python3
"""
Quick Worker Import - Manual Data Entry
Active workers from CSV analysis
"""

import psycopg2

CONNECTION_STRING = "postgresql://postgres:Stv060485!!!@db.dxbybjxpglpslmoenqyg.supabase.co:5432/postgres"

# Active workers extracted from CSV (Availability = Active)
# Format: (id, display_name, email, phone, role, hourly_rate, w9_status, language)
ACTIVE_WORKERS = [
    ("SG-001", "Steve Garay", "s.garay@carolinalumpers.com", "8287810002", "Admin", 26.00, "approved", "en"),
    ("DMR-002", "Daniela Molina", "d.molina@carolinalumpers.com", "7044212877", "Supervisor", 26.00, "approved", "en"),
    ("GH-017", "Grebil Hernandez", "gebilhernandez@gmail.com", "9803095489", "Worker", 18.00, "approved", "es"),
    ("AG-025", "Albert García", "albertjgarciav@gmail.com", "9802169643", "Worker", 18.50, "approved", "es"),
    ("MNC-026", "Martha Naranjo Cantos", "martha13naranjo@gmail.com", "9804183447", "Supervisor", 19.00, "approved", "es"),
    ("EM-028", "Estefani Montero", "1021estefani@gmail.com", "7043619399", "Worker", 19.00, "approved", "es"),
    ("JN-029", "Jorge Narvaez", "j.jnarvaez76@gmail.com", "7868618327", "Worker", 18.00, "approved", "es"),
    ("KGP-030", "Keilyn Gomez Perez", "keilynp92@gmail.com", "7048048796", "Worker", 18.00, "approved", "es"),
    ("CAB-031", "Carlos Andres Beltran", "physic.a.ndres@gmail.com", "9804408260", "Worker", 18.00, "approved", "es"),
    ("GETL-033", "Elizabeth Toapanta Lalaleo", "elizatoapanta1981@gmail.com", "7048580125", "Worker", 18.00, "approved", "es"),
    ("JAS-036", "Jennifer A Salcedo", "alondrasalcedo08@gmail.com", "9802000282", "Worker", 18.00, "approved", "es"),
    ("AM-040", "Angel Morales", "2362r1.9915g@gmail.com", "7045025346", "Worker", 18.00, "approved", "es"),
    ("MQ-041", "Moises Quevedo", "moisesquevedo271@gmail.com", "17049981780", "Worker", 18.00, "approved", "es"),
    ("AME-042", "Alexander Molina Escalante", "alexandermolina424@gmail.com", "9802169720", "Worker", 18.00, "pending", "es"),
    ("YBQp-043", "Yoselin Beatriz Quevedo padilla", "yoselinquevedo27@gmail.com", "7046359209", "Worker", 18.00, "approved", "es"),
    ("WR-044", "Wendy Rodriguez", "wendyazucenarodriguezmartinez@gmail.com", "15049207917", "Worker", 18.00, "approved", "es"),
    ("HH-043", "Hector Hernandez", "hectorhernandezsoto@gmail.com", "7047241561", "Worker", 18.00, "approved", "es")
]

def quick_import():
    print("🚀 Quick Worker Import - Active Workers Only\n")
    
    try:
        conn = psycopg2.connect(CONNECTION_STRING, sslmode='require')
        cursor = conn.cursor()
        
        # Clear existing workers (except admin if exists)
        print("🗑️  Clearing existing workers...")
        cursor.execute("DELETE FROM workers WHERE id != 'SG-001'")
        
        print("📥 Inserting active workers...")
        
        insert_sql = """
        INSERT INTO workers (
            id, display_name, email, phone, role, hourly_rate, 
            w9_status, language, is_active, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, true, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role,
            hourly_rate = EXCLUDED.hourly_rate,
            w9_status = EXCLUDED.w9_status,
            language = EXCLUDED.language,
            updated_at = NOW()
        """
        
        for worker in ACTIVE_WORKERS:
            cursor.execute(insert_sql, worker)
            print(f"   ✅ {worker[1]} ({worker[0]}) - {worker[4]}")
        
        conn.commit()
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM workers WHERE is_active = true")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT role, COUNT(*) FROM workers GROUP BY role")
        roles = cursor.fetchall()
        
        print(f"\n🎯 Import Complete!")
        print(f"   Total active workers: {total}")
        print("   Role breakdown:")
        for role, count in roles:
            print(f"     • {role}: {count}")
        
        print(f"\n✅ Ready for authentication!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    quick_import()