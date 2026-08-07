// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // ===== CREATE ADMIN =====
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@lifelink.com' },
      update: {},
      create: {
        name: 'System Administrator',
        email: 'admin@lifelink.com',
        password: adminPassword,
        phone: '+251911111111',
        role: 'ADMIN',
        isActive: true
      }
    });
    console.log('✅ Admin created:', admin.email);

    // ===== CREATE BLOOD BANK =====
    const bankPassword = await bcrypt.hash('bank123', 10);
    const bloodBankUser = await prisma.user.upsert({
      where: { email: 'bank@lifelink.com' },
      update: {},
      create: {
        name: 'Central Blood Bank',
        email: 'bank@lifelink.com',
        password: bankPassword,
        phone: '+251922222222',
        role: 'BLOOD_BANK',
        isActive: true,
        bloodBank: {
          create: {
            bankName: 'Central Blood Bank',
            licenseNumber: 'BB-2024-001',
            address: 'Bole Road, Addis Ababa',
            city: 'Addis Ababa',
            phone: '+251922222222',
            verificationStatus: 'VERIFIED',
            isActive: true
          }
        }
      }
    });
    console.log('✅ Blood Bank created:', bloodBankUser.email);

    // ===== CREATE HOSPITALS =====
    const hospitalPassword = await bcrypt.hash('hospital123', 10);
    const hospitalUser = await prisma.user.upsert({
      where: { email: 'hospital@lifelink.com' },
      update: {},
      create: {
        name: 'Black Lion Hospital',
        email: 'hospital@lifelink.com',
        password: hospitalPassword,
        phone: '+251933333333',
        role: 'HOSPITAL',
        isActive: true,
        hospital: {
          create: {
            hospitalName: 'Black Lion Hospital',
            licenseNumber: 'HL-2024-001',
            address: 'Mekanisa Road, Addis Ababa',
            city: 'Addis Ababa',
            phone: '+251933333333',
            verificationStatus: 'VERIFIED'
          }
        }
      }
    });
    console.log('✅ Hospital created:', hospitalUser.email);

    // Second Hospital
    const hospital2Password = await bcrypt.hash('hospital123', 10);
    const hospitalUser2 = await prisma.user.upsert({
      where: { email: 'hospital2@lifelink.com' },
      update: {},
      create: {
        name: 'Zewditu Hospital',
        email: 'hospital2@lifelink.com',
        password: hospital2Password,
        phone: '+251944444444',
        role: 'HOSPITAL',
        isActive: true,
        hospital: {
          create: {
            hospitalName: 'Zewditu Hospital',
            licenseNumber: 'HL-2024-002',
            address: 'Megenagna, Addis Ababa',
            city: 'Addis Ababa',
            phone: '+251944444444',
            verificationStatus: 'VERIFIED'
          }
        }
      }
    });
    console.log('✅ Second Hospital created:', hospitalUser2.email);

    // ===== CREATE DONORS =====
    const bloodTypes = ['A_POS', 'B_POS', 'O_POS', 'AB_POS', 'A_NEG', 'O_NEG'];
    const donorNames = ['John Doe', 'Sarah Smith', 'Michael Brown', 'Emily Wilson', 'David Lee', 'Anna Johnson'];
    const donorCities = ['Addis Ababa', 'Addis Ababa', 'Addis Ababa', 'Adama', 'Bahir Dar', 'Addis Ababa'];
    const donorGenders = ['Male', 'Female', 'Male', 'Female', 'Male', 'Female'];

    for (let i = 0; i < donorNames.length; i++) {
      const donorPassword = await bcrypt.hash('donor123', 10);
      const donorUser = await prisma.user.upsert({
        where: { email: `donor${i+1}@lifelink.com` },
        update: {},
        create: {
          name: donorNames[i],
          email: `donor${i+1}@lifelink.com`,
          password: donorPassword,
          phone: `+2519${String(100000000 + i).padStart(9, '0')}`,
          role: 'DONOR',
          isActive: true,
          donorProfile: {
            create: {
              age: Math.floor(Math.random() * 30) + 20,
              gender: donorGenders[i],
              bloodType: bloodTypes[i % bloodTypes.length],
              address: `${donorCities[i]}, Ethiopia`,
              city: donorCities[i],
              country: 'Ethiopia',
              isVerified: true,
              availabilityStatus: 'AVAILABLE',
              reliabilityScore: Math.floor(Math.random() * 30) + 60,
              totalDonations: Math.floor(Math.random() * 5),
              lastDonationDate: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : null
            }
          }
        }
      });
      console.log(`✅ Donor ${i+1} created:`, donorUser.email);
    }

    // ===== CREATE INVENTORY =====
    const bloodBank = await prisma.bloodBank.findFirst();
    
    if (bloodBank) {
      const allBloodTypes = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];
      
      for (const type of allBloodTypes) {
        await prisma.inventoryItem.upsert({
          where: {
            bloodBankId_bloodType: {
              bloodBankId: bloodBank.id,
              bloodType: type
            }
          },
          update: {
            unitsAvailable: Math.floor(Math.random() * 20) + 10,
            minStockLevel: 5
          },
          create: {
            bloodBankId: bloodBank.id,
            bloodType: type,
            unitsAvailable: Math.floor(Math.random() * 20) + 10,
            unitsReserved: 0,
            unitsExpired: 0,
            minStockLevel: 5,
            status: 'AVAILABLE'
          }
        });
      }
      console.log('✅ Inventory created with all blood types');
    }

    // ===== CREATE BLOOD REQUESTS =====
    const hospital = await prisma.hospital.findFirst({
      where: { hospitalName: 'Black Lion Hospital' }
    });

    if (hospital && bloodBank) {
      const requests = [
        {
          bloodType: 'O_POS',
          unitsRequired: 5,
          urgency: 'CRITICAL_EMERGENCY',
          location: 'Addis Ababa',
          description: 'Emergency surgery patient needs O+ blood',
          patientInfo: 'Patient admitted after car accident'
        },
        {
          bloodType: 'A_POS',
          unitsRequired: 3,
          urgency: 'URGENT',
          location: 'Addis Ababa',
          description: 'Anemia patient needs blood transfusion',
          patientInfo: 'Patient with severe anemia'
        },
        {
          bloodType: 'B_POS',
          unitsRequired: 2,
          urgency: 'NORMAL',
          location: 'Addis Ababa',
          description: 'Routine surgery scheduled',
          patientInfo: 'Elective surgery patient'
        }
      ];

      for (const reqData of requests) {
        await prisma.bloodRequest.create({
          data: {
            hospitalId: hospital.id,
            bloodBankId: bloodBank.id,
            bloodType: reqData.bloodType,
            unitsRequired: reqData.unitsRequired,
            unitsAllocated: 0,
            unitsFulfilled: 0,
            location: reqData.location,
            urgency: reqData.urgency,
            contactInformation: hospital.phone,
            description: reqData.description,
            patientInfo: reqData.patientInfo,
            status: reqData.urgency === 'CRITICAL_EMERGENCY' ? 'APPROVED' : 'PENDING',
            statusHistory: [{
              status: reqData.urgency === 'CRITICAL_EMERGENCY' ? 'APPROVED' : 'PENDING',
              timestamp: new Date(),
              notes: 'Request created'
            }]
          }
        });
      }
      console.log('✅ Blood requests created');
    }

    // ===== CREATE NOTIFICATIONS =====
    const donors = await prisma.donorProfile.findMany({
      include: { user: true }
    });

    const request = await prisma.bloodRequest.findFirst();

    if (donors.length > 0 && request) {
      for (const donor of donors.slice(0, 3)) {
        await prisma.notification.create({
          data: {
            userId: donor.userId,
            requestId: request.id,
            type: 'EMERGENCY',
            title: '🚨 Emergency Blood Request',
            message: `A CRITICAL request for ${request.bloodType} blood has been made in Addis Ababa. Please check the request details.`,
            isRead: false
          }
        });
      }
      console.log('✅ Notifications created');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:     admin@lifelink.com / admin123');
    console.log('   Blood Bank: bank@lifelink.com / bank123');
    console.log('   Hospital:  hospital@lifelink.com / hospital123');
    console.log('   Donor:     donor1@lifelink.com / donor123');
    console.log('');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();