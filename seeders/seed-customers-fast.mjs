#!/usr/bin/env node
/**
 * Seeder rápido de 1.5M clientes ecuatorianos.
 * Estrategia: IDs secuenciales (sin Set en memoria), batch INSERT,
 * unique index re-creado al final para evitar locks durante la inserción.
 *
 * Uso:  node seed-customers-fast.mjs [--count N] [--start-from N]
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const ARGV = process.argv;
const COUNT = (() => {
  const idx = ARGV.indexOf('--count');
  return idx !== -1 ? Number(ARGV[idx + 1]) || 1_500_000 : 1_500_000;
})();
const START_FROM = (() => {
  const idx = ARGV.indexOf('--start-from');
  return idx !== -1 ? Number(ARGV[idx + 1]) || 0 : 0;
})();

const ORG_ID = 'd7fbafaf-b537-4b44-b75c-9b8e82932ba1';
const RUC_TYPE_ID = '3dde11e1-5526-4027-9874-977bbdf50d7e';
const CEDULA_TYPE_ID = '96f27479-5099-40fb-9c77-67dcc0dea110';
const BATCH = 5000;

const pool = await mysql.createPool({
  host: '127.0.0.1', port: 3306, user: 'root', password: 'root123',
  database: 'customer_db', waitForConnections: true, connectionLimit: 2,
});

// ── Drop unique index for speed ──
try {
  await pool.query('ALTER TABLE customers DROP INDEX idx_org_identification');
  console.log('  Unique index dropped for bulk insert');
} catch { /* already dropped */ }

// ── Pre-generate province codes ──
const PROVINCES = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0'));

// ── Names ──
const FIRST = ['MARIA','JUAN','JOSE','ANA','LUIS','CARMEN','PEDRO','ROSA','MIGUEL','TERESA','FRANCISCO','GABRIELA','CARLOS','PATRICIA','DANIEL','LAURA','JORGE','SANDRA','MANUEL','GABRIEL','ROBERTO','VERONICA','EDUARDO','CLAUDIA','RICARDO','ANDREA','FERNANDO','MARCELA','ALBERTO','NORMA','ARTURO','MONICA','RAUL','DIANA','GUILLERMO','PAULA','SERGIO','ELENA','HECTOR','LUCIA','RAFAEL','AUGUSTO','CRISTINA','MARTIN','ISABEL','ALEJANDRO','MARTHA','CECILIA','LUISA','ENRIQUE','SILVIA','OSCAR','IRENE','ALFREDO','INES','CLAUDIA','TERESA','SANDRA'];
const LAST1 = ['GARCIA','RODRIGUEZ','MARTINEZ','HERNANDEZ','LOPEZ','GONZALEZ','PEREZ','SANCHEZ','RAMIREZ','TORRES','FLORES','RIVERA','GOMEZ','DIAZ','MORALES','CRUZ','ORTIZ','GUTIERREZ','CHAVEZ','RAMOS','REYES','ESPINOZA','CARRION','PINTO','BENITEZ','MEJIA','ZAMBRANO','SOLORZANO','CEVALLOS','FONSECA','CASTILLO','SALTOS','ARROYO','TENESACA','HERRERA','ALCIVAR','VALVERDE','MENDOZA','AYALA','BUSTAMANTE','MAFLA'];
const LAST2 = ['PAREDES','VACA','LEON','ACOSTA','PIN','JACOME','NOBOA','CABRERA','TENORIO','SOLIZ','BRITO','MEDINA','PEÑAFIEL','LOOR','PROAÑO','SAAVEDRA','CALVACHE','TROCONIS','BUCHELI','NORTE'];
const WORD1 = ['DISTRIBUIDORA','COMERCIAL','INDUSTRIAL','IMPORTADORA','EXPORTADORA','CONSTRUCTORA','TRANSPORTES','INVERSIONES','SERVICIOS','SOLUCIONES','TECNOLOGIA','ALIMENTOS','AGRICOLA','GANADERA','MINERA','MADERERA','METALURGICA','QUIMICA'];
const WORD2 = ['EL','LA','LOS','LAS','SAN','SANTA','DEL','NUEVO','GRAN','ALTO','BAJO','GRANDE','REAL','PREMIUM','PLUS','MAX','PRO'];
const WORD3 = ['FUTURO','LUNA','SOL','ESTRELLA','RIO','MONTAÑA','VALLE','SIERRA','MAR','BOSQUE','FLOR','MUNDO','PAIS','TIERRA','CIELO','AZUL','VERDE','DORADO','UNION','VICTORIA'];
const SUFFIX = ['S.A.','CIA. LTDA.','& CIA. LTDA.','S.A.S.','SRL','CIA. LTDA.'];
const DOMAINS = ['gmail.com','hotmail.com','yahoo.com','outlook.com','live.com','hotmail.es'];

let seq = START_FROM; // sequential counter for identification
let inserted = 0;
let personCount = 0;
let companyCount = 0;
const t0 = performance.now();

// Random helpers (inline for speed)
let _s = Date.now();
function rand(min, max) {
  _s = (_s * 1103515245 + 12345) & 0x7fffffff;
  return min + (_s % (max - min + 1));
}
function pick(a) { return a[rand(0, a.length - 1)]; }
function escStr(v) {
  if (v === null) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function genCedula() {
  seq++;
  const prov = PROVINCES[rand(0, 23)];
  return prov + String(10000000 + (seq % 90000000)).padStart(8, '0');
}

function genRUC() {
  seq++;
  const prov = PROVINCES[rand(0, 23)];
  return prov + String(10000000 + (seq % 90000000)).padStart(8, '0') + String(rand(0, 9));
}

function genPhone() { return '09' + String(10000000 + rand(0, 89999999)); }
function genEmail(fn, ln) {
  const f = fn.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  const l = ln.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  return f + '.' + l + rand(1, 999) + '@' + pick(DOMAINS);
}

let batch = [];

for (let i = 0; i < COUNT; i++) {
  const isCompany = rand(0, 99) < 55;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let bname, trade, email, phone, idType, identification;

  if (isCompany) {
    const name = pick(WORD1) + ' ' + pick(WORD2) + ' ' + pick(WORD3);
    const suffix = pick(SUFFIX);
    bname = name + ' ' + suffix;
    trade = rand(0, 99) < 30 ? name.split(' ').slice(0, 2).join(' ') : null;
    identification = genRUC();
    idType = RUC_TYPE_ID;
    phone = rand(0, 99) < 70 ? genPhone() : null;
    email = rand(0, 99) < 60 ? genEmail(pick(FIRST), pick(LAST1)) : null;
    companyCount++;
  } else {
    const fn = pick(FIRST), l1 = pick(LAST1), l2 = pick(LAST2);
    bname = fn + ' ' + l1 + ' ' + l2;
    trade = null;
    identification = genCedula();
    idType = CEDULA_TYPE_ID;
    phone = rand(0, 99) < 80 ? genPhone() : null;
    email = rand(0, 99) < 70 ? genEmail(fn, l1) : null;
    personCount++;
  }

  batch.push(
    `('${randomUUID()}','${ORG_ID}','EC','${idType}','${identification}',` +
    `${escStr(bname)},${escStr(trade)},${escStr(email)},${escStr(phone)},` +
    `'${isCompany ? 'company' : 'person'}','active',0,NULL,NULL,'${now}','${now}')`
  );

  if (batch.length >= BATCH) {
    await flushBatch();
  }

  if ((inserted) % 100_000 === 0 && inserted > 0) {
    const elapsed = (performance.now() - t0) / 1000;
    console.log(`  ${inserted.toLocaleString()} / ${COUNT.toLocaleString()} (${Math.round(inserted / elapsed)}/s, P:${personCount} C:${companyCount})`);
  }
}

if (batch.length > 0) await flushBatch();

// ── Re-create unique index ──
try {
  await pool.query('ALTER TABLE customers ADD UNIQUE INDEX idx_org_identification (organization_id, identification)');
  console.log('  Unique index re-created');
} catch (e) {
  console.warn('  Warning: could not re-create unique index:', e.message);
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
const [finalCount] = await pool.query('SELECT COUNT(*) as cnt FROM customers');
console.log(`\n✅ ${inserted.toLocaleString()} clientes insertados en ${elapsed}s`);
console.log(`   Personas: ${personCount.toLocaleString()} | Empresas: ${companyCount.toLocaleString()}`);
console.log(`   Total en DB: ${Number(finalCount[0].cnt).toLocaleString()}`);

await pool.end();

async function flushBatch() {
  const sql = `INSERT IGNORE INTO customers
    (id, organization_id, country_code, identification_type_id, identification,
     business_name, trade_name, email, phone, type, status,
     is_system, image_file_id, metadata, created_at, updated_at)
    VALUES ${batch.join(',')}`;
  await pool.query(sql);
  inserted += batch.length;
  batch = [];
}
