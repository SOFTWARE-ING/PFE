from app.core.database import engine
import pathlib, sys

sql_path = pathlib.Path(__file__).parent / 'alter_tables.sql'
print('Executing SQL file:', sql_path)
if not sql_path.exists():
    print('SQL file not found:', sql_path)
    sys.exit(1)

sql = sql_path.read_text(encoding='utf-8')

try:
    raw = engine.raw_connection()
    cur = raw.cursor()
    cur.execute(sql)
    raw.commit()
    cur.close()
    raw.close()
    print('SQL script executed successfully')
except Exception as e:
    print('Error executing SQL script:')
    print(repr(e))
    sys.exit(2)
