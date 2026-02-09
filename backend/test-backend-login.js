const axios = require('axios');

async function testBackendLogin() {
  console.log('\n🧪 PROBANDO LOGIN EN BACKEND\n');
  console.log('='.repeat(80));

  // Test 1: Con email
  try {
    console.log('\n📧 Test 1: Login con EMAIL');
    console.log('   URL: http://localhost:3000/api/auth/login');
    console.log('   Body: { email: "juan.perez@example.com", username: "juan.perez@example.com", password: "admin123" }');
    
    const response1 = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'juan.perez@example.com',
      username: 'juan.perez@example.com',
      password: 'admin123'
    });
    
    console.log('   ✅ Status:', response1.status);
    console.log('   ✅ Success:', response1.data.success);
    console.log('   ✅ Token recibido:', response1.data.data?.token ? 'SÍ' : 'NO');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status || error.message);
    console.log('   ❌ Mensaje:', error.response?.data?.message || error.message);
  }

  // Test 2: Con username
  try {
    console.log('\n👤 Test 2: Login con USERNAME');
    console.log('   URL: http://localhost:3000/api/auth/login');
    console.log('   Body: { email: "drjuanperez", username: "drjuanperez", password: "admin123" }');
    
    const response2 = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'drjuanperez',
      username: 'drjuanperez',
      password: 'admin123'
    });
    
    console.log('   ✅ Status:', response2.status);
    console.log('   ✅ Success:', response2.data.success);
    console.log('   ✅ Token recibido:', response2.data.data?.token ? 'SÍ' : 'NO');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status || error.message);
    console.log('   ❌ Mensaje:', error.response?.data?.message || error.message);
  }

  // Test 3: Con contraseña incorrecta
  try {
    console.log('\n🔒 Test 3: Login con contraseña INCORRECTA');
    console.log('   Body: { email: "juan.perez@example.com", password: "wrongpass" }');
    
    const response3 = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'juan.perez@example.com',
      username: 'juan.perez@example.com',
      password: 'wrongpass'
    });
    
    console.log('   ✅ Status:', response3.status);
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status || error.message);
    console.log('   ❌ Mensaje:', error.response?.data?.message || error.message);
    console.log('   ✅ Esto es esperado (401)');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

testBackendLogin().catch(console.error);
