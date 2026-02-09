require('dotenv').config({ path: '.env.production' });
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function migrateProduction() {
  console.log('\n🚀 MIGRACIÓN A BASE DE DATOS DE PRODUCCIÓN\n');
  console.log('='.repeat(80));
  console.log(`\n📊 Base de datos: ${process.env.DB_NAME}`);
  console.log(`🌐 Host: ${process.env.DB_HOST}`);
  console.log(`👤 Usuario: ${process.env.DB_USER}\n`);

  try {
    // Test conexión
    console.log('🔌 Probando conexión...');
    await db.query('SELECT 1 as test');
    console.log('✅ Conexión exitosa\n');

    // Leer y ejecutar schema.sql
    console.log('📄 Ejecutando schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.log('⚠️  schema.sql no encontrado. Saltando...');
    } else {
      let schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Remover líneas CREATE DATABASE y USE
      const lines = schema.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('CREATE DATABASE') && 
               !trimmed.startsWith('USE ');
      });
      schema = cleanedLines.join('\n');
      
      // Dividir en statements individuales por punto y coma
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.toUpperCase().includes('CREATE TABLE'));

      console.log(`📋 ${statements.length} tablas para crear...`);
      let creados = 0;
      
      for (const statement of statements) {
        try {
          await db.query(statement);
          creados++;
          console.log(`  ✅ Tabla creada`);
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log('  ⏭️  Tabla ya existe');
            creados++;
          } else {
            console.log(`  ⚠️  Error: ${err.message.substring(0, 100)}`);
          }
        }
      }
      console.log(`✅ Schema ejecutado: ${creados} tablas OK\n`);
    }

    // Ejecutar migración de password reset
    console.log('🔑 Ejecutando migración de password reset...');
    const resetPath = path.join(__dirname, '..', 'database', 'update_schema_password_reset.sql');
    
    if (fs.existsSync(resetPath)) {
      const resetSql = fs.readFileSync(resetPath, 'utf8');
      const resetStatements = resetSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of resetStatements) {
        try {
          await db.query(statement);
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate column')) {
            console.log('⚠️  Error (continuando):', err.message);
          }
        }
      }
      console.log('✅ Password reset configurado\n');
    }

    // Agregar columna WhatsApp
    console.log('📱 Agregando columna WhatsApp...');
    try {
      const [columns] = await db.query(`
        SHOW COLUMNS FROM usuarios_admin LIKE 'whatsapp'
      `);

      if (columns.length === 0) {
        await db.query(`
          ALTER TABLE usuarios_admin 
          ADD COLUMN whatsapp VARCHAR(20) NULL AFTER email
        `);
        console.log('✅ Columna whatsapp agregada');

        await db.query(`
          ALTER TABLE usuarios_admin
          ADD INDEX idx_whatsapp (whatsapp)
        `);
        console.log('✅ Índice whatsapp creado\n');
      } else {
        console.log('✅ Columna whatsapp ya existe\n');
      }
    } catch (err) {
      console.log('⚠️  Error con whatsapp (continuando):', err.message);
    }

    // Verificar tablas
    console.log('📋 Verificando tablas...');
    const [tables] = await db.query('SHOW TABLES');
    console.log(`✅ Total de tablas: ${tables.length}`);
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`   - ${tableName}`);
    });

    // Verificar usuarios
    console.log('\n👥 Verificando usuarios...');
    const [users] = await db.query('SELECT COUNT(*) as total FROM usuarios_admin');
    console.log(`✅ Total de usuarios: ${users[0].total}`);

    if (users[0].total === 0) {
      console.log('\n⚠️  No hay usuarios. ¿Deseas crear uno ahora?');
      console.log('   Ejecuta: node create-admin-user.js');
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migrateProduction();
