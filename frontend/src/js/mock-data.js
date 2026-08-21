/**
 * LifeLink Admin Portal — Mock & Fallback Datasets
 * Only used in development/staging builds for resilient offline previews.
 * In production, this file is not loaded to ensure real admins only see live data.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MockAdminData = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const defaultUsers = [
    { id:'usr_admin_1', name:'System Administrator', email:'admin@lifelink.org', phone:'+251911001001', role:'ADMIN', isActive:true, lastLogin:'2026-08-18T12:30:00Z', createdAt:'2026-01-10T08:00:00Z' },
    { id:'usr_hosp_1', name:'St. Jude Memorial Hospital', email:'contact@stjude-memorial.med', phone:'+251911223344', role:'HOSPITAL', isActive:true, lastLogin:'2026-08-18T10:15:00Z', createdAt:'2026-02-14T09:30:00Z' },
    { id:'usr_hosp_2', name:'City General Hospital', email:'admin@citygeneral.org', phone:'+251911445566', role:'HOSPITAL', isActive:true, lastLogin:'2026-08-17T16:45:00Z', createdAt:'2026-02-20T11:00:00Z' },
    { id:'usr_bb_1', name:'Red Cross Central Blood Bank', email:'info@redcross-bank.org', phone:'+251911778899', role:'BLOOD_BANK', isActive:true, lastLogin:'2026-08-18T11:00:00Z', createdAt:'2026-01-15T14:20:00Z' },
    { id:'usr_bb_2', name:'Addis National Blood Center', email:'contact@addisblood.et', phone:'+251912112233', role:'BLOOD_BANK', isActive:true, lastLogin:'2026-08-16T15:20:00Z', createdAt:'2026-03-01T10:00:00Z' },
    { id:'usr_dnr_1', name:'Alexander Wright', email:'alex.w@example.com', phone:'+251913334455', role:'DONOR', isActive:true, lastLogin:'2026-08-18T09:00:00Z', createdAt:'2026-03-12T08:45:00Z' },
    { id:'usr_dnr_2', name:'Elena Rostova', email:'elena.r@example.com', phone:'+251914556677', role:'DONOR', isActive:true, lastLogin:'2026-08-17T14:10:00Z', createdAt:'2026-03-18T13:20:00Z' },
    { id:'usr_dnr_3', name:'Marcus Vance', email:'marcus.v@example.com', phone:'+251915778899', role:'DONOR', isActive:true, lastLogin:'2026-08-15T11:30:00Z', createdAt:'2026-04-02T16:00:00Z' },
    { id:'usr_dnr_4', name:'Sophia Chen', email:'sophia.c@example.com', phone:'+251916990011', role:'DONOR', isActive:false, lastLogin:'2026-07-20T10:00:00Z', createdAt:'2026-04-10T12:15:00Z' },
    { id:'usr_dnr_5', name:'Dawit Bekele', email:'dawit.b@example.com', phone:'+251917223344', role:'DONOR', isActive:true, lastLogin:'2026-08-18T08:20:00Z', createdAt:'2026-04-25T09:10:00Z' }
  ];

  const defaultHospitals = [
    { id:'hosp_1', hospitalName:'St. Jude Memorial Hospital', licenseNumber:'HL-2024-001', city:'Addis Ababa', contactPerson:'Dr. Sarah Jenkins', phone:'+251911223344', verificationStatus:'VERIFIED', _count:{ bloodRequests: 14 }, user:{ email:'contact@stjude-memorial.med', phone:'+251911223344' }, createdAt:'2026-02-14T09:30:00Z' },
    { id:'hosp_2', hospitalName:'City General Hospital', licenseNumber:'HL-2026-088', city:'Dire Dawa', contactPerson:'Dr. Robert Chen', phone:'+251911445566', verificationStatus:'PENDING', _count:{ bloodRequests: 4 }, user:{ email:'admin@citygeneral.org', phone:'+251911445566' }, createdAt:'2026-08-18T08:00:00Z' },
    { id:'hosp_3', hospitalName:'St. Mary Medical Center', licenseNumber:'HL-2023-012', city:'Hawassa', contactPerson:'Nurse Maria Vance', phone:'+251913003003', verificationStatus:'VERIFIED', _count:{ bloodRequests: 8 }, user:{ email:'info@stmarymedical.net', phone:'+251913003003' }, createdAt:'2026-03-05T10:00:00Z' },
    { id:'hosp_4', hospitalName:'Tikur Anbessa Hospital', licenseNumber:'HL-2020-004', city:'Addis Ababa', contactPerson:'Dr. Abebe Worku', phone:'+251911004004', verificationStatus:'VERIFIED', _count:{ bloodRequests: 22 }, user:{ email:'info@tikuranbessa.et', phone:'+251911004004' }, createdAt:'2026-01-20T12:00:00Z' }
  ];

  const defaultBloodBanks = [
    { id:'bb_1', bankName:'Red Cross Central Blood Bank', licenseNumber:'BB-2022-001', city:'Addis Ababa', contactPerson:'Alemayehu Tadesse', phone:'+251911778899', verificationStatus:'VERIFIED', user:{ email:'info@redcross-bank.org', phone:'+251911778899' }, createdAt:'2026-01-15T14:20:00Z' },
    { id:'bb_2', bankName:'Addis National Blood Center', licenseNumber:'BB-2023-045', city:'Addis Ababa', contactPerson:'Hiwot Bekele', phone:'+251912112233', verificationStatus:'VERIFIED', user:{ email:'contact@addisblood.et', phone:'+251912112233' }, createdAt:'2026-03-01T10:00:00Z' },
    { id:'bb_3', bankName:'Dire Dawa Regional Blood Bank', licenseNumber:'BB-2025-012', city:'Dire Dawa', contactPerson:'Yonas Girma', phone:'+251913445566', verificationStatus:'PENDING', user:{ email:'contact@dd-bloodbank.org', phone:'+251913445566' }, createdAt:'2026-08-17T11:00:00Z' }
  ];

  const defaultDonors = [
    { id:'dnr_1', bloodType:'O_NEG', city:'Addis Ababa', address:'Bole, Ward 03', availabilityStatus:'AVAILABLE', isVerified:true, totalDonations:8, user:{ name:'Alexander Wright', email:'alex.w@example.com', phone:'+251913334455', isActive:true }, createdAt:'2026-03-12T08:45:00Z' },
    { id:'dnr_2', bloodType:'A_POS', city:'Dire Dawa', address:'Kebele 02', availabilityStatus:'AVAILABLE', isVerified:true, totalDonations:12, user:{ name:'Elena Rostova', email:'elena.r@example.com', phone:'+251914556677', isActive:true }, createdAt:'2026-03-18T13:20:00Z' },
    { id:'dnr_3', bloodType:'B_POS', city:'Addis Ababa', address:'Kazanchis', availabilityStatus:'UNAVAILABLE', isVerified:false, totalDonations:5, user:{ name:'Marcus Vance', email:'marcus.v@example.com', phone:'+251915778899', isActive:true }, createdAt:'2026-08-16T14:00:00Z' },
    { id:'dnr_4', bloodType:'AB_NEG', city:'Hawassa', address:'Tabor, Street 4', availabilityStatus:'UNAVAILABLE', isVerified:false, totalDonations:2, user:{ name:'Sophia Chen', email:'sophia.c@example.com', phone:'+251916990011', isActive:false }, createdAt:'2026-04-10T12:15:00Z' },
    { id:'dnr_5', bloodType:'O_POS', city:'Mekelle', address:'Kedamay Weyane', availabilityStatus:'AVAILABLE', isVerified:true, totalDonations:17, user:{ name:'Dawit Bekele', email:'dawit.b@example.com', phone:'+251917223344', isActive:true }, createdAt:'2026-08-18T08:00:00Z' }
  ];

  const defaultRequests = [
    { id:'REQ-8491', hospitalId:'hosp_1', bloodType:'A_POS', unitsRequired:3, urgency:'CRITICAL_EMERGENCY', status:'PENDING', location:'Addis Ababa', createdAt:'2026-08-18T10:00:00Z', hospital:{ hospitalName:'St. Jude Memorial Hospital' }, donorResponses:[{id:1},{id:2}] },
    { id:'REQ-8488', hospitalId:'hosp_2', bloodType:'O_NEG', unitsRequired:2, urgency:'CRITICAL_EMERGENCY', status:'PENDING', location:'Dire Dawa', createdAt:'2026-08-18T08:30:00Z', hospital:{ hospitalName:'City General Hospital' }, donorResponses:[] },
    { id:'REQ-8480', hospitalId:'hosp_3', bloodType:'B_POS', unitsRequired:4, urgency:'URGENT', status:'PROCESSING', location:'Hawassa', createdAt:'2026-08-17T15:20:00Z', hospital:{ hospitalName:'St. Mary Medical Center' }, donorResponses:[{id:1}] },
    { id:'REQ-8420', hospitalId:'hosp_1', bloodType:'O_POS', unitsRequired:5, urgency:'NORMAL', status:'FULFILLED', location:'Addis Ababa', createdAt:'2026-08-16T11:00:00Z', hospital:{ hospitalName:'St. Jude Memorial Hospital' }, donorResponses:[{id:1},{id:2},{id:3}] },
    { id:'REQ-8401', hospitalId:'hosp_4', bloodType:'AB_POS', unitsRequired:2, urgency:'URGENT', status:'CANCELLED', location:'Addis Ababa', createdAt:'2026-08-15T14:00:00Z', hospital:{ hospitalName:'Tikur Anbessa Hospital' }, donorResponses:[] }
  ];

  const defaultDonations = [
    { id:'DON-0021', donorId:'dnr_5', units:2, status:'COMPLETED', donationDate:'2026-08-18T09:00:00Z', createdAt:'2026-08-18T09:00:00Z', requestId:'REQ-8420', donor:{ bloodType:'O_POS', user:{ name:'Dawit Bekele' } }, hospital:{ hospitalName:'St. Jude Memorial Hospital' } },
    { id:'DON-0020', donorId:'dnr_1', units:1, status:'COMPLETED', donationDate:'2026-08-17T11:30:00Z', createdAt:'2026-08-17T11:30:00Z', requestId:'REQ-8420', donor:{ bloodType:'O_NEG', user:{ name:'Alexander Wright' } }, hospital:{ hospitalName:'Tikur Anbessa Hospital' } },
    { id:'DON-0019', donorId:'dnr_2', units:2, status:'SCHEDULED', donationDate:'2026-08-19T10:00:00Z', createdAt:'2026-08-16T10:00:00Z', requestId:'REQ-8480', donor:{ bloodType:'A_POS', user:{ name:'Elena Rostova' } }, hospital:{ hospitalName:'St. Mary Medical Center' } }
  ];

  const defaultAuditLogs = [
    { id:'log_1', action:'VERIFY_HOSPITAL', entity:'Hospital', entityId:'hosp_1', createdAt:'2026-08-18T11:20:00Z', user:{ name:'System Administrator', email:'admin@lifelink.org' }, changes:{ verificationStatus:'VERIFIED' } },
    { id:'log_2', action:'CREATE_BLOOD_BANK', entity:'BloodBank', entityId:'bb_1', createdAt:'2026-08-18T09:45:00Z', user:{ name:'System Administrator', email:'admin@lifelink.org' }, changes:{ bankName:'Red Cross Central Blood Bank' } },
    { id:'log_3', action:'VERIFY_DONOR', entity:'Donor', entityId:'dnr_5', createdAt:'2026-08-17T16:00:00Z', user:{ name:'System Administrator', email:'admin@lifelink.org' }, changes:{ isVerified:true } },
    { id:'log_4', action:'UPDATE_USER', entity:'User', entityId:'usr_dnr_4', createdAt:'2026-08-17T14:30:00Z', user:{ name:'System Administrator', email:'admin@lifelink.org' }, changes:{ isActive:false } }
  ];

  const defaultNotifications = [
    { id:'notif_1', title:'Critical Blood Shortage', message:'Urgent requirement for O- blood at City General Hospital.', isRead:false, createdAt:'2026-08-18T12:00:00Z' },
    { id:'notif_2', title:'New Hospital Registration', message:'City General Hospital accreditation pending verification.', isRead:false, createdAt:'2026-08-18T10:30:00Z' },
    { id:'notif_3', title:'Donation Completed', message:'Dawit Bekele completed 2 units O+ blood donation.', isRead:true, createdAt:'2026-08-17T15:00:00Z' }
  ];

  const defaultInventoryStats = {
    categories: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    series: [
      { type: 'A+', donated: 24, issued: 18, inStock: 6 },
      { type: 'A-', donated: 14, issued: 11, inStock: 3 },
      { type: 'B+', donated: 20, issued: 15, inStock: 5 },
      { type: 'B-', donated: 10, issued: 8,  inStock: 2 },
      { type: 'AB+',donated: 16, issued: 12, inStock: 4 },
      { type: 'AB-',donated: 8,  issued: 7,  inStock: 1 },
      { type: 'O+', donated: 38, issued: 26, inStock: 12 },
      { type: 'O-', donated: 22, issued: 19, inStock: 3 }
    ]
  };

  const defaultSignupsStats = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: {
      bloodBanks: [1, 0, 1, 0, 2, 1, 1],
      hospitals:  [2, 3, 1, 4, 2, 1, 3],
      donors:     [12, 18, 15, 24, 20, 28, 31]
    }
  };

  const defaultRequestTypes = {
    total: 34,
    series: [
      { key: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', count: 10, percentage: 29.4, color: '#dc2626' },
      { key: 'URGENT', label: 'Urgent', count: 14, percentage: 41.2, color: '#d97706' },
      { key: 'NORMAL', label: 'Normal', count: 10, percentage: 29.4, color: '#2563eb' }
    ]
  };

  // Helper to filter items according to timeframe
  function getTimeframeCutoff(timeframe) {
    if (!timeframe || timeframe === 'all' || timeframe === 'alltime') return null;
    const now = new Date('2026-08-18T23:59:59Z'); // anchored reference date matching mock data
    if (timeframe === 'today') {
      return new Date('2026-08-18T00:00:00Z');
    }
    if (timeframe === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    if (timeframe === 'month') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return null;
  }

  function filterByTime(list, cutoff, dateField = 'createdAt') {
    if (!cutoff) return [...list];
    return list.filter(item => {
      const dateVal = item[dateField] || item.createdAt || item.donationDate;
      if (!dateVal) return true;
      return new Date(dateVal) >= cutoff;
    });
  }

  function filterMockDataByTimeframe(timeframe) {
    const cutoff = getTimeframeCutoff(timeframe);
    return {
      timeframe: timeframe || 'alltime',
      users: filterByTime(defaultUsers, cutoff),
      hospitals: filterByTime(defaultHospitals, cutoff),
      bloodBanks: filterByTime(defaultBloodBanks, cutoff),
      donors: filterByTime(defaultDonors, cutoff),
      requests: filterByTime(defaultRequests, cutoff),
      donations: filterByTime(defaultDonations, cutoff, 'donationDate'),
      auditLogs: filterByTime(defaultAuditLogs, cutoff)
    };
  }

  function getMockRequestTypesForTimeframe(timeframe) {
    if (timeframe === 'today') {
      return {
        timeframe: 'today',
        total: 2,
        series: [
          { key: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', count: 2, percentage: 100.0, color: '#dc2626' },
          { key: 'URGENT', label: 'Urgent', count: 0, percentage: 0, color: '#d97706' },
          { key: 'NORMAL', label: 'Normal', count: 0, percentage: 0, color: '#2563eb' }
        ]
      };
    }
    if (timeframe === 'week') {
      return {
        timeframe: 'week',
        total: 5,
        series: [
          { key: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', count: 2, percentage: 40.0, color: '#dc2626' },
          { key: 'URGENT', label: 'Urgent', count: 2, percentage: 40.0, color: '#d97706' },
          { key: 'NORMAL', label: 'Normal', count: 1, percentage: 20.0, color: '#2563eb' }
        ]
      };
    }
    if (timeframe === 'month') {
      return {
        timeframe: 'month',
        total: 18,
        series: [
          { key: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', count: 6, percentage: 33.3, color: '#dc2626' },
          { key: 'URGENT', label: 'Urgent', count: 7, percentage: 38.9, color: '#d97706' },
          { key: 'NORMAL', label: 'Normal', count: 5, percentage: 27.8, color: '#2563eb' }
        ]
      };
    }
    return defaultRequestTypes;
  }

  function getMockInventoryForTimeframe(timeframe) {
    if (timeframe === 'today') {
      return {
        categories: defaultInventoryStats.categories,
        series: defaultInventoryStats.series.map(s => ({
          type: s.type,
          donated: Math.max(0, Math.round(s.donated * 0.15)),
          issued: Math.max(0, Math.round(s.issued * 0.12)),
          inStock: s.inStock
        }))
      };
    }
    if (timeframe === 'week') {
      return {
        categories: defaultInventoryStats.categories,
        series: defaultInventoryStats.series.map(s => ({
          type: s.type,
          donated: Math.max(0, Math.round(s.donated * 0.45)),
          issued: Math.max(0, Math.round(s.issued * 0.40)),
          inStock: s.inStock
        }))
      };
    }
    if (timeframe === 'month') {
      return {
        categories: defaultInventoryStats.categories,
        series: defaultInventoryStats.series.map(s => ({
          type: s.type,
          donated: Math.max(0, Math.round(s.donated * 0.85)),
          issued: Math.max(0, Math.round(s.issued * 0.80)),
          inStock: s.inStock
        }))
      };
    }
    return defaultInventoryStats;
  }

  const defaultFulfillmentStats = {
    overallRate: 88.2,
    totalRequests: 34,
    fulfilledRequests: 30,
    breakdown: [
      { urgency: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', color: '#dc2626', total: 10, fulfilled: 9, pending: 1, cancelled: 0, rate: 90.0, avgTurnaroundHours: 1.4 },
      { urgency: 'URGENT', label: 'Urgent', color: '#d97706', total: 14, fulfilled: 12, pending: 1, cancelled: 1, rate: 85.7, avgTurnaroundHours: 3.8 },
      { urgency: 'NORMAL', label: 'Normal', color: '#2563eb', total: 10, fulfilled: 9, pending: 1, cancelled: 0, rate: 90.0, avgTurnaroundHours: 12.5 }
    ]
  };

  const defaultGeographicStats = {
    totalRegions: 4,
    regions: [
      { city: 'Addis Ababa', donors: 84, requests: 22, hospitals: 8, balance: 62, status: 'SURPLUS' },
      { city: 'Dire Dawa', donors: 28, requests: 6, hospitals: 2, balance: 22, status: 'SURPLUS' },
      { city: 'Hawassa', donors: 20, requests: 4, hospitals: 2, balance: 16, status: 'SURPLUS' },
      { city: 'Mekelle', donors: 16, requests: 2, hospitals: 1, balance: 14, status: 'SURPLUS' }
    ]
  };

  function getMockFulfillmentForTimeframe(timeframe) {
    if (timeframe === 'today') {
      return {
        timeframe: 'today',
        overallRate: 100.0,
        totalRequests: 2,
        fulfilledRequests: 2,
        breakdown: [
          { urgency: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', color: '#dc2626', total: 2, fulfilled: 2, pending: 0, cancelled: 0, rate: 100.0, avgTurnaroundHours: 0.9 },
          { urgency: 'URGENT', label: 'Urgent', color: '#d97706', total: 0, fulfilled: 0, pending: 0, cancelled: 0, rate: 100.0, avgTurnaroundHours: 0 },
          { urgency: 'NORMAL', label: 'Normal', color: '#2563eb', total: 0, fulfilled: 0, pending: 0, cancelled: 0, rate: 100.0, avgTurnaroundHours: 0 }
        ]
      };
    }
    if (timeframe === 'week') {
      return {
        timeframe: 'week',
        overallRate: 80.0,
        totalRequests: 5,
        fulfilledRequests: 4,
        breakdown: [
          { urgency: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', color: '#dc2626', total: 2, fulfilled: 2, pending: 0, cancelled: 0, rate: 100.0, avgTurnaroundHours: 1.1 },
          { urgency: 'URGENT', label: 'Urgent', color: '#d97706', total: 2, fulfilled: 1, pending: 1, cancelled: 0, rate: 50.0, avgTurnaroundHours: 4.0 },
          { urgency: 'NORMAL', label: 'Normal', color: '#2563eb', total: 1, fulfilled: 1, pending: 0, cancelled: 0, rate: 100.0, avgTurnaroundHours: 11.2 }
        ]
      };
    }
    return defaultFulfillmentStats;
  }

  const defaultSummaryStats = {
    totals: {
      totalDonors: 148,
      verifiedDonors: 142,
      totalHospitals: 13,
      verifiedHospitals: 11,
      totalBloodBanks: 8,
      verifiedBloodBanks: 7,
      totalUsers: 172,
      activeUsers: 168,
      totalBloodRequests: 34,
      fulfilledRequests: 30,
      totalDonations: 48,
      completedDonations: 45,
      totalUnitsDonated: 92
    },
    summaryTable: [
      { entity: 'Registered Users', total: 172, active: 168, metricLabel: '168 Active Accounts', status: 'Live DB' },
      { entity: 'Donors', total: 148, active: 142, metricLabel: '142 Verified Donors', status: 'Live DB' },
      { entity: 'Hospitals', total: 13, active: 11, metricLabel: '11 Verified Facilities', status: 'Live DB' },
      { entity: 'Blood Banks', total: 8, active: 7, metricLabel: '7 Verified Centers', status: 'Live DB' },
      { entity: 'Blood Requests', total: 34, active: 30, metricLabel: '30 Fulfilled Requests', status: 'Live DB' },
      { entity: 'Donations Recorded', total: 48, active: 45, metricLabel: '92 Units Donated', status: 'Live DB' }
    ]
  };

  function getMockGeographicStats() {
    return defaultGeographicStats;
  }

  function getMockSummaryStats() {
    return defaultSummaryStats;
  }

  function getMockSignupsForPeriod(period) {
    if (period === 'yearly') {
      return {
        period: 'yearly',
        labels: ['2023', '2024', '2025', '2026'],
        series: {
          bloodBanks: [12, 28, 45, 62],
          hospitals:  [24, 52, 88, 135],
          donors:     [320, 680, 1240, 1950]
        }
      };
    }
    if (period === 'monthly') {
      return {
        period: 'monthly',
        labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        series: {
          bloodBanks: [3, 4, 2, 5, 4, 6, 5, 7, 6, 8, 7, 9],
          hospitals:  [5, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 18],
          donors:     [80, 95, 110, 130, 125, 150, 165, 190, 185, 220, 240, 275]
        }
      };
    }
    if (period === 'weekly') {
      return {
        period: 'weekly',
        labels: ['W-1', 'W-2', 'W-3', 'W-4', 'W-5', 'W-6', 'W-7', 'W-8', 'W-9', 'W-10', 'W-11', 'W-12'],
        series: {
          bloodBanks: [1, 2, 0, 1, 3, 1, 2, 2, 1, 3, 2, 4],
          hospitals:  [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8],
          donors:     [25, 30, 28, 42, 38, 55, 48, 62, 58, 70, 75, 88]
        }
      };
    }
    // Default: daily
    return {
      period: 'daily',
      labels: ['Aug 5', 'Aug 6', 'Aug 7', 'Aug 8', 'Aug 9', 'Aug 10', 'Aug 11', 'Aug 12', 'Aug 13', 'Aug 14', 'Aug 15', 'Aug 16', 'Aug 17', 'Aug 18'],
      series: {
        bloodBanks: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 2, 1, 1],
        hospitals:  [1, 0, 2, 1, 0, 1, 3, 2, 1, 0, 2, 1, 4, 3],
        donors:     [5, 8, 12, 9, 14, 11, 18, 15, 20, 16, 22, 25, 28, 31]
      }
    };
  }

  return {
    defaultUsers,
    defaultHospitals,
    defaultBloodBanks,
    defaultDonors,
    defaultRequests,
    defaultDonations,
    defaultAuditLogs,
    defaultNotifications,
    defaultInventoryStats,
    defaultSignupsStats,
    defaultRequestTypes,
    defaultFulfillmentStats,
    defaultGeographicStats,
    defaultSummaryStats,
    filterMockDataByTimeframe,
    getMockRequestTypesForTimeframe,
    getMockInventoryForTimeframe,
    getMockFulfillmentForTimeframe,
    getMockGeographicStats,
    getMockSummaryStats,
    getMockSignupsForPeriod
  };
}));

