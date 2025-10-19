/**
 * Test script to check MongoDB connection and performance
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  compressors: ['zlib'],
  w: 'majority',
  journal: true,
};

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('Connection string:', process.env.MONGODB_URI ? 'Using Atlas' : 'Using local');
  
  try {
    const startTime = Date.now();
    
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jhonks-demo-db", mongooseOptions);
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connected to MongoDB in ${connectionTime}ms`);
    
    // Test a simple query
    const testStartTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - testStartTime;
    console.log(`✅ Database ping successful in ${pingTime}ms`);
    
    // Test a simple find operation
    const User = require('./src/models/User');
    const queryStartTime = Date.now();
    const userCount = await User.countDocuments();
    const queryTime = Date.now() - queryStartTime;
    console.log(`✅ User count query successful in ${queryTime}ms (${userCount} users)`);
    
    console.log('\n📊 Connection Stats:');
    console.log(`- Connection time: ${connectionTime}ms`);
    console.log(`- Ping time: ${pingTime}ms`);
    console.log(`- Query time: ${queryTime}ms`);
    console.log(`- Connection state: ${mongoose.connection.readyState}`);
    console.log(`- Host: ${mongoose.connection.host}`);
    console.log(`- Port: ${mongoose.connection.port}`);
    console.log(`- Database: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  }
}

testConnection();
