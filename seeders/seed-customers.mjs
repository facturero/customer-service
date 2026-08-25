#!/usr/bin/env node
/**
 * Seeder de 1 500 000 clientes ecuatorianos (personas + empresas)
 * Inserts directos a MySQL en batches de 2000 filas.
 *
 * Uso:  node seed-customers.mjs [--count N]
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const ARGV = process.argv;
const COUNT = (() => {
  const idx = ARGV.indexOf('--count');
  return idx !== -1 ? Number(ARGV[idx + 1]) || 1_500_000 : 1_500_000;
})();

const ORG_ID = 'd7fbafaf-b537-4b44-b75c-9b8e82932ba1';
const RUC_TYPE_ID = '3dde11e1-5526-4027-9874-977bbdf50d7e';
const CEDULA_TYPE_ID = '96f27479-5099-40fb-9c77-67dcc0dea110';
const BATCH = 2000;

const pool = await mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root123',
  database: 'customer_db',
  waitForConnections: true,
  connectionLimit: 4,
  // Allow large packet for bulk inserts
  maxAllowedPacket: 64 * 1024 * 1024,
});

// ── Names ───────────────────────────────────────────────────────────
const firstNames = [
  'MARIA','JUAN','JOSE','ANA','LUIS','CARMEN','PEDRO','ROSA','MIGUEL','TERESA',
  'FRANCISCO','GABRIELA','CARLOS','PATRICIA','DANIEL','LAURA','JORGE','SANDRA',
  'MANUEL','GABRIEL','ROBERTO','VERONICA','EDUARDO','CLAUDIA','RICARDO','ANDREA',
  'FERNANDO','MARCELA','ALBERTO','NORMA','ARTURO','MONICA','RAUL','DIANA',
  'GUILLERMO','PAULA','SERGIO','ELENA','HECTOR','LUCIA','RAFAEL','VRTX','AUGUSTO',
  'CRISTINA','MARTIN','ISABEL','ALEJANDRO','MARTHA','ALEXANDER','CECILIA',
  'JORGE','LUISA','ENRIQUE','SILVIA','OSCAR','IRENE','ALFREDO','INES',
];
const lastNames1 = [
  'GARCIA','RODRIGUEZ','MARTINEZ','HERNANDEZ','LOPEZ','GONZALEZ','PEREZ',
  'SANCHEZ','RAMIREZ','TORRES','FLORES','RIVERA','GOMEZ','DIAZ','MORALES',
  'Cruz','ORTIZ','GUTIERREZ','CHAVEZ','RAMOS','REYES','GUILLEN','ESPINOZA',
  'CARRION','PINTO','BENITEZ','MEJIA','ZAMBRANO','SOLORZANO','CEVALLOS',
  'FONSECA','CASTILLO','SALTOS','ARROYO','TENESACA','PILLAGUASQUINGA',
  'HERRERA','ALCIVAR','VALVERDE','MENDOZA','AYALA','SANCHEZ','BUSTAMANTE',
];
const lastNames2 = [
  'PAREDES','VACA','LEON','ACOSTA','PIN','JACOME','NOBOA',
  'CABRERA','TENORIO','SOLIZ','BRITO','MEDINA','PEÑAFIEL','LOOR',
  'PROAÑO','SAAVEDRA','MAFLA','CALVACHE','TROCONIS','BUCHELI',
];

const suffixes = ['S.A.','CIA. LTDA.','& CIA. LTDA.','S.A.S.','COMERCIAL','INDUSTRIAL','DISTRIBUIDORA','SERVICIOS','CONSULTORA','INTERNACIONAL','TRADING','GROUP','SRL'];

const words1 = ['DISTRIBUIDORA','COMERCIAL','INDUSTRIAL','IMPORTADORA','EXPORTADORA','CONSTRUCTORA','TRANSPORTES','INVERSIONES','SERVICIOS','SOLUCIONES','TECNOLOGIA','ALIMENTOS','AGRICOLA','GANADERA','MINERA','MADERERA','PAPELERA','METALURGICA','QUIMICA','FARMACEUTICA'];
const words2 = ['EL','LA','LOS','LAS','SAN','SANTA','DEL','DE LOS','NUEVO','GRAN','ALTO','BAJO','GRANDE','MAYOR','REAL','PREMIUM','PLUS','MAX','PRO','COSMOS'];
const words3 = ['FUTURO','TRENCITO','PATITAS','MANOS','LUNA','SOL','ESTRELLA','RIO','MONTAÑA','VALLE','SIERRA','MAR','BOSQUE','FLOR','ARCOIRIS','MUNDO','PAIS','TIERRA','CIELO','AZUL','VERDE','ROJO','DORADO','PLATA','BRILLANTE','UNION','PROGRESO','LIBERTAD','VICTORIA','TRIUNFO','ESPERANZA','AMISTAD','HOGAR','HACIENDA','CAMPO','VERDE','PLAYA','LAGO'];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function generateRUC() {
  // RUC ecuatoriano: 13 dígitos, province code (01-24) + 9 more
  const province = String(randInt(1, 24)).padStart(2, '0');
  const body = Array.from({ length: 9 }, () => randInt(0, 9)).join('');
  return province + body;
}

function generateCedula() {
  const province = String(randInt(1, 24)).padStart(2, '0');
  const body = Array.from({ length: 8 }, () => randInt(0, 9)).join('');
  return province + body;
}

function generatePhone() {
  return '09' + String(randInt(10000000, 99999999));
}

function generateEmail(firstName, lastName) {
  const normalized = (s) => s.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const f = normalized(firstName);
  const l = normalized(lastName.replace(/\s+/g, ''));
  const num = randInt(1, 999);
  const domains = ['gmail.com','hotmail.com','yahoo.com','outlook.com','live.com','hotmail.es'];
  return `${f}.${l}${num}@${pick(domains)}`;
}

function generateCompany() {
  const name = `${pick(words1)} ${pick(words2)} ${pick(words3)} ${pick(suffixes)}`;
  return name.replace(/  +/g, ' ');
}

function generatePersonName() {
  const fn = pick(firstNames);
  const l1 = pick(lastNames1);
  const l2 = pick(lastNames2);
  return { full: `${fn} ${l1} ${l2}`, first: fn, last1: l1, last2: l2 };
}

function escapeStr(v) {
  if (v === null) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ── Check existing ──
const [existingRows] = await pool.query('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [ORG_ID]);
const existing = Number(existingRows[0].cnt);
if (existing >= COUNT) {
  console.log(`Ya hay ${existing} clientes (>= ${COUNT}). Nada que hacer.`);
  await pool.end();
  process.exit(0);
}
console.log(`Clientes existentes: ${existing}. Generando ${COUNT - existing} más…`);

const t0 = performance.now();
let inserted = 0;
let batch = [];
let personCount = 0;
let companyCount = 0;

// Track generated IDs to avoid collisions in unique index (identification per org)
const seenIds = new Set();
const [existingIds] = await pool.query(
  'SELECT identification FROM customers WHERE organization_id = ? AND identification IS NOT NULL',
  [ORG_ID],
);
for (const row of existingIds) seenIds.add(row.identification);
console.log(`  Identificaciones existentes: ${seenIds.size}`);

function genIdentification(type) {
  let id;
  let attempts = 0;
  do {
    id = type === 'company' ? generateRUC() : generateCedula();
    attempts++;
  } while (seenIds.has(id) && attempts < 50);
  seenIds.add(id);
  return id;
}

for (let i = 0; i < COUNT - existing; i++) {
  const isCompany = Math.random() < 0.55;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const idType = isCompany ? RUC_TYPE_ID : CEDULA_TYPE_ID;

  let businessName, tradeName, email, phone, identification;

  if (isCompany) {
    businessName = generateCompany();
    tradeName = Math.random() < 0.3 ? businessName.split(' ').slice(0, 2).join(' ') : null;
    identification = genIdentification('company');
    phone = Math.random() < 0.7 ? generatePhone() : null;
    email = Math.random() < 0.6 ? generateEmail(pick(firstNames), pick(lastNames1)) : null;
    companyCount++;
  } else {
    const name = generatePersonName();
    businessName = name.full;
    tradeName = null;
    identification = genIdentification('person');
    phone = Math.random() < 0.8 ? generatePhone() : null;
    email = Math.random() < 0.7 ? generateEmail(name.first, name.last1) : null;
    personCount++;
  }

  const row = [
    randomUUID(), ORG_ID, 'EC', idType, identification,
    businessName, tradeName, email, phone,
    isCompany ? 'company' : 'person', 'active',
    false, null, null, now, now,
  ];

  batch.push(`(${row.map(escapeStr).join(',')})`);

  if (batch.length >= BATCH) {
    await flushBatch();
  }

  if ((i + 1) % 100_000 === 0) {
    const elapsed = (performance.now() - t0) / 1000;
    const rate = Math.round((inserted) / elapsed);
    console.log(`  ${inserted.toLocaleString()}/${(COUNT - existing).toLocaleString()} (${rate}/s, personas: ${personCount}, empresas: ${companyCount})`);
  }
}

if (batch.length > 0) await flushBatch();

const totalElapsed = ((performance.now() - t0) / 1000).toFixed(1);
console.log(`\n✅ ${inserted.toLocaleString()} clientes insertados en ${totalElapsed}s`);
console.log(`   Personas: ${personCount.toLocaleString()} | Empresas: ${companyCount.toLocaleString()}`);

const [finalCount] = await pool.query('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [ORG_ID]);
console.log(`   Total en DB: ${Number(finalCount[0].cnt).toLocaleString()}`);

await pool.end();

async function flushBatch() {
  const sql = `INSERT INTO customers
    (id, organization_id, country_code, identification_type_id, identification,
     business_name, trade_name, email, phone, type, status,
     is_system, image_file_id, metadata, created_at, updated_at)
    VALUES ${batch.join(',')}`;
  await pool.query(sql);
  inserted += batch.length;
  batch = [];
}
