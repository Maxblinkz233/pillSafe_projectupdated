export const currentUser = {
  id: '1',
  name: 'Maxwell',
  email: 'maxwell@example.com',
  avatar: null,
};

export const medications = [
  {
    id: '1',
    name: 'Lisinopril',
    dosage: '10mg',
    category: 'Blood Pressure',
    slot: 'Slot A',
    time: '07:00',
    period: 'MORNING',
    status: 'taken',
    takenAt: '07:05',
  },
  {
    id: '2',
    name: 'Atorvastatin',
    dosage: '20mg',
    category: 'Cholesterol',
    slot: 'Slot B',
    time: '08:00',
    period: 'MORNING',
    status: 'pending',
  },
  {
    id: '3',
    name: 'Metformin',
    dosage: '500mg',
    category: 'Diabetes',
    slot: 'Slot C',
    time: '06:00',
    period: 'MORNING',
    status: 'missed',
  },
  {
    id: '4',
    name: 'Metformin',
    dosage: '500mg',
    category: 'Diabetes',
    slot: 'Slot B',
    time: '14:00',
    period: 'AFTERNOON',
    status: 'pending',
  },
];

export const dashboardStats = {
  todayDoses: 3,
  totalDoses: 4,
  adherence: 92,
  missed: 1,
  deviceStatus: 'Online',
};

export const nextDispense = {
  time: '08:00 AM',
  medication: 'Atorvastatin',
  dosage: '20mg',
  category: 'Cholesterol',
  slot: 'Slot B',
};

export const alerts = [
  {
    id: '1',
    type: 'MISSED DOSE',
    title: 'Metformin (500mg)',
    message: 'Morning dose not dispensed at 08:00 AM. Please take action immediately or verify the device status.',
    time: '2m ago',
    isNew: true,
  },
  {
    id: '2',
    type: 'DOSE DISPENSED',
    title: 'Lisinopril (10mg)',
    message: 'Evening dose successfully dispensed at 06:15 PM. Patient adherence logged for today.',
    time: '1h ago',
    isNew: false,
  },
  {
    id: '3',
    type: 'IDENTITY VERIFIED',
    title: 'Biometric Scan Successful',
    message: 'Device unlocked for Metformin refill. Access granted via face recognition.',
    time: '3h ago',
    isNew: false,
  },
  {
    id: '4',
    type: 'DEVICE ALERT',
    title: 'Low Battery Warning',
    message: 'Your PillSafe Hub is at 15% battery. Please connect the charging cable to ensure scheduled doses.',
    time: '8h ago',
    isNew: false,
  },
];

export const caregiver = {
  name: 'Sarah Mitchell',
  role: 'Primary Caregiver',
  smsLog: [
    { message: 'Dose Taken: Lisinopril', time: '08:02 AM' },
    { message: 'Device Battery Low (15%)', time: 'Yesterday' },
  ],
};

export const recentEvents = [
  {
    id: '1',
    title: 'Morning Dose Taken',
    subtitle: 'Lisinopril 10mg • 08:02 AM',
    status: 'On Time',
    statusColor: 'green',
  },
  {
    id: '2',
    title: 'Evening Dose Missed',
    subtitle: 'Atorvastatin • Yesterday, 09:00 PM',
    status: 'Missed',
    statusColor: 'red',
  },
  {
    id: '3',
    title: 'Schedule Updated',
    subtitle: 'Modified by Sarah Mitchell • Yesterday',
    status: 'Updated',
    statusColor: 'blue',
  },
];

export const slots = [
  { id: 'A', status: 'available' },
  { id: 'B', status: 'inuse' },
  { id: 'C', status: 'available' },
  { id: 'D', status: 'available' },
  { id: 'E', status: 'inuse' },
  { id: 'F', status: 'available' },
];