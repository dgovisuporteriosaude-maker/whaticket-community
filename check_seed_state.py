import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port='55432',
    dbname='whaticket_pg',
    user='whaticket',
    password='strongpassword'
)
cur = conn.cursor()
cur.execute("""
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%SequelizeData%' OR table_name LIKE '%SequelizeMeta%')
""")
print('TABLES', cur.fetchall())
cur.execute('SELECT count(*) FROM public."SequelizeData"')
print('COUNT_SEQUELIZE_DATA', cur.fetchone())
cur.execute('SELECT count(*) FROM public."SequelizeMeta"')
print('COUNT_SEQUELIZE_META', cur.fetchone())
cur.close()
conn.close()
