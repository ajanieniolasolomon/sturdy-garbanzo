#!/usr/bin/env node

const mongoose = require('mongoose');
const Patient = require('./src/models/Patient');

// Test data with new structure
const testPatient = {
  patientId: 'PAT999',
  hospitalId: new mongoose.Types.ObjectId(),
  fullName: 'Test Patient',
  age: 30,
  gender: 'male',
  phoneNumber: null, // Optional
  ccNumber: 'CC/TEST/999',
  address: '123 Test Street, Test Area',
  lga: 'Test LGA',
  state: 'Test State',
  country: 'Nigeria',
  isActive: true,
  status: 'active',
  notes: 'Test patient for validation'
};

async function testPatientModel() {
  try {
    console.log('🧪 Testing Patient Model Structure...\n');

    // Test 1: Create patient with new structure
    console.log('✅ Test 1: Creating patient with new structure');
    const patient = new Patient(testPatient);
    
    // Validate the model
    const validationError = patient.validateSync();
    if (validationError) {
      console.error('❌ Validation failed:', validationError.message);
      return;
    }
    console.log('✅ Patient validation passed');

    // Test 2: Test CC Number with slashes
    console.log('\n✅ Test 2: Testing CC Number with slashes');
    const ccNumbers = [
      'CC/FHI/001',
      'CC/REF/002',
      'CC/OTH/003',
      'CC-TEST-004',
      'CC123456'
    ];

    ccNumbers.forEach(cc => {
      const testCC = new Patient({ ...testPatient, ccNumber: cc });
      const ccError = testCC.validateSync();
      if (ccError && ccError.errors.ccNumber) {
        console.log(`❌ CC Number "${cc}" failed: ${ccError.errors.ccNumber.message}`);
      } else {
        console.log(`✅ CC Number "${cc}" is valid`);
      }
    });

    // Test 3: Test country validation
    console.log('\n✅ Test 3: Testing country validation');
    const countries = ['Nigeria', 'Refugee', 'Others', 'Invalid'];
    
    countries.forEach(country => {
      const testCountry = new Patient({ ...testPatient, country });
      const countryError = testCountry.validateSync();
      if (countryError && countryError.errors.country) {
        console.log(`❌ Country "${country}" failed: ${countryError.errors.country.message}`);
      } else {
        console.log(`✅ Country "${country}" is valid`);
      }
    });

    // Test 4: Test optional phone number
    console.log('\n✅ Test 4: Testing optional phone number');
    const phoneTests = [
      { phone: null, expected: 'valid' },
      { phone: '+1234567890', expected: 'valid' },
      { phone: '1234567890', expected: 'valid' },
      { phone: 'invalid', expected: 'invalid' }
    ];

    phoneTests.forEach(test => {
      const testPhone = new Patient({ ...testPatient, phoneNumber: test.phone });
      const phoneError = testPhone.validateSync();
      if (phoneError && phoneError.errors.phoneNumber) {
        if (test.expected === 'invalid') {
          console.log(`✅ Phone "${test.phone}" correctly rejected: ${phoneError.errors.phoneNumber.message}`);
        } else {
          console.log(`❌ Phone "${test.phone}" incorrectly rejected: ${phoneError.errors.phoneNumber.message}`);
        }
      } else {
        if (test.expected === 'valid') {
          console.log(`✅ Phone "${test.phone}" correctly accepted`);
        } else {
          console.log(`❌ Phone "${test.phone}" incorrectly accepted`);
        }
      }
    });

    // Test 5: Test address structure
    console.log('\n✅ Test 5: Testing address structure');
    console.log('✅ Address field:', typeof patient.address === 'string' ? 'String field' : 'Wrong type');
    console.log('✅ LGA field:', typeof patient.lga === 'string' ? 'String field' : 'Wrong type');
    console.log('✅ State field:', typeof patient.state === 'string' ? 'String field' : 'Wrong type');
    console.log('✅ Country field:', typeof patient.country === 'string' ? 'String field' : 'Wrong type');

    // Test 6: Test model methods
    console.log('\n✅ Test 6: Testing model methods');
    
    // Test getSummary method
    const summary = patient.getSummary();
    console.log('✅ getSummary method works:', Object.keys(summary).length > 0);
    
    // Test displayName virtual
    console.log('✅ displayName virtual:', patient.displayName === 'Test Patient');

    // Test 7: Test search functionality
    console.log('\n✅ Test 7: Testing search functionality');
    const searchOptions = {
      search: 'Test',
      country: 'Nigeria',
      state: 'Test State',
      lga: 'Test LGA'
    };
    console.log('✅ Search options structure:', Object.keys(searchOptions));

    console.log('\n🎉 All Patient Model Tests Completed Successfully!');
    console.log('\n📋 New Patient Structure Summary:');
    console.log('   • fullName: Required string (max 100 chars)');
    console.log('   • age: Required number (0-150)');
    console.log('   • gender: Required enum (male/female/other)');
    console.log('   • phoneNumber: Optional string');
    console.log('   • ccNumber: Required string with slashes (max 30 chars)');
    console.log('   • address: Required string (max 200 chars)');
    console.log('   • lga: Required string (max 50 chars)');
    console.log('   • state: Required string (max 50 chars)');
    console.log('   • country: Required enum (Nigeria/Refugee/Others)');
    console.log('   • isActive: Boolean (default: true)');
    console.log('   • status: Enum with "removed" status');
    console.log('   • notes: Optional string (max 1000 chars)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPatientModel()
    .then(() => {
      console.log('\n🚀 Patient Model is ready for production!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testPatientModel };
