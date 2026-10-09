import sqlite3
import sys

DB_PATH = "inventory.db"

def list_tables(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    print("\n--- Available Database Tables ---")
    print("-" * 40)
    for t in tables:
        count = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  * {t:<25} ({count} rows)")
    print("-" * 40)
    print("\nUsage: python view_db.py <table_name> [limit]")
    print("Example: python view_db.py products 10\n")

def show_table(conn, table_name, limit=20):
    cursor = conn.cursor()
    try:
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = [col[1] for col in cursor.fetchall()]
        if not columns:
            print(f"Table '{table_name}' does not exist.")
            return

        cursor.execute(f"SELECT * FROM {table_name} LIMIT ?", (limit,))
        rows = cursor.fetchall()

        print(f"\n--- Table: {table_name} (Showing top {len(rows)} entries) ---")
        print("=" * 80)
        
        # Calculate col widths
        str_rows = [[str(val) if val is not None else "NULL" for val in row] for row in rows]
        widths = [len(c) for c in columns]
        for row in str_rows:
            for i, val in enumerate(row):
                widths[i] = max(widths[i], min(len(val), 35))

        header = " | ".join(c.ljust(widths[i]) for i, c in enumerate(columns))
        print(header)
        print("-" * len(header))

        for row in str_rows:
            formatted_vals = []
            for i, val in enumerate(row):
                v = val if len(val) <= 35 else val[:32] + "..."
                formatted_vals.append(v.ljust(widths[i]))
            print(" | ".join(formatted_vals))
            
        print("=" * 80)
        total = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        print(f"Total rows in '{table_name}': {total}\n")

    except Exception as e:
        print(f"Error querying table: {e}")

def main():
    conn = sqlite3.connect(DB_PATH)
    if len(sys.argv) < 2:
        list_tables(conn)
    else:
        tbl = sys.argv[1]
        lim = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 20
        show_table(conn, tbl, lim)
    conn.close()

if __name__ == "__main__":
    main()
