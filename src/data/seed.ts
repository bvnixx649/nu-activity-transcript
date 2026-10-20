import type { Activity, ChatMsg, Credit, DirectMsg, Notice, Registration, Student } from './types'

const H = 3600_000
const MIN = 60_000

export const ORGS: Record<string, string> = {
  NUVOL26: 'ชมรมอาสาพัฒนา มน.',
  SCI2569: 'สโมสรนิสิตคณะวิทยาศาสตร์',
  NUSA69: 'กองกิจการนิสิต',
  CAMP69: 'ชมรมค่ายอาสาพัฒนาชนบท',
}

export const FACULTIES = [
  'วิทยาศาสตร์',
  'วิศวกรรมศาสตร์',
  'มนุษยศาสตร์',
  'สังคมศาสตร์',
  'บริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร',
  'เภสัชศาสตร์',
  'พยาบาลศาสตร์',
  'แพทยศาสตร์',
  'สหเวชศาสตร์',
  'ศึกษาศาสตร์',
  'นิติศาสตร์',
  'เกษตรศาสตร์ ทรัพยากรธรรมชาติและสิ่งแวดล้อม',
  'สถาปัตยกรรมศาสตร์ ศิลปะและการออกแบบ',
  'วิทยาศาสตร์การแพทย์',
]

const FIRST = [
  'ปัณณวัฒน์', 'นภัสสร', 'ธนกฤต', 'กมลชนก', 'ภูมิรพี', 'ปวีณ์ธิดา', 'กันตพงศ์', 'ณิชาภัทร', 'ศุภกร', 'พิชญาภา',
  'พีรพัฒน์', 'ศิรประภา', 'วรเมธ', 'อรปรียา', 'ชยพล', 'ธัญชนก', 'ธีรภัทร', 'เบญญาภา', 'กฤติน', 'ชนิดาภา',
  'ธนภัทร', 'สุพิชชา', 'สิรวิชญ์', 'ภัทรานิษฐ์', 'ณัฐนนท์', 'ปุณยวีร์', 'อชิรวิทย์', 'ณัฐวรา', 'จิรายุ', 'อภิชญา',
  'ปกรณ์', 'วริศรา', 'ศรัณย์', 'ชลธิชา', 'ภาคิน', 'ขวัญข้าว', 'ธีธัช', 'มนัสนันท์', 'ก้องภพ', 'พรรษชล',
]
const LAST = [
  'ศรีสุข', 'แก้วประเสริฐ', 'บุญมา', 'ทองดี', 'จันทร์เพ็ญ', 'สุวรรณรัตน์', 'พรหมมา', 'อินทร์แก้ว', 'วงศ์ใหญ่',
  'มณีวงศ์', 'ปัญญาดี', 'เรืองศรี', 'คำแสน', 'สมบูรณ์ชัย', 'นาคสวัสดิ์', 'ประเสริฐสุข', 'พุ่มพวง', 'ใจดี',
  'ชัยมงคล', 'ทองคำ', 'พิมพ์ทอง', 'อ่อนศรี', 'สายสุด', 'กันทะวงศ์', 'เพชรรัตน์', 'บัวขาว', 'ศรีวิชัย',
]

export function seedStudents(): Student[] {
  const out: Student[] = []
  const seen = new Set<string>()
  for (let i = 0; out.length < 96; i++) {
    const year = 64 + (i % 4)
    const id = `${year}${String((i * 79139 + 31337) % 1000000).padStart(6, '0')}`
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`,
      faculty: FACULTIES[(i * 5) % FACULTIES.length],
    })
  }
  return out
}

const at = (dayOffset: number, hh: number, mm = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

const P = (name: string) => `./posters/${name}.jpg`

export function seedActivities(now = Date.now()): Activity[] {
  const hourNow = new Date(now)
  hourNow.setMinutes(0, 0, 0)
  const h0 = hourNow.getTime()

  const base = {
    announcements: [] as Activity['announcements'],
    createdAt: now - 6 * 24 * H,
    seed: true,
    chatEnabled: false,
  }

  return [
    {
      ...base,
      id: 'a-blood',
      title: 'จิตอาสางานบริจาคโลหิต ครั้งที่ 4/2569',
      category: 'volunteer',
      org: ORGS.NUVOL26,
      orgCode: 'NUVOL26',
      poster: P('blood'),
      description:
        'ช่วยงานหน่วยรับบริจาคโลหิตร่วมกับสภากาชาดไทย ดูแลจุดลงทะเบียน แจกน้ำและขนมให้ผู้บริจาค และพาผู้บริจาคไปยังจุดคัดกรอง\n\nแต่งกายชุดนิสิต สวมรองเท้าผ้าใบ มีอาหารกลางวันให้',
      place: 'โรงพยาบาลมหาวิทยาลัยนเรศวร โถงชั้น 1',
      lat: 16.7458,
      lng: 100.1926,
      start: h0 - 2 * H,
      end: h0 + 2 * H,
      hours: 5,
      capacity: 30,
      supervisor: { name: 'ณัฐธิดา ศรีสุข', phone: '089-512-7743' },
      chatEnabled: true,
      announcements: [
        {
          id: 'n-blood-1',
          text: 'วันนี้ผู้บริจาคมาเยอะกว่าที่คิดมากค่ะ ใครว่างช่วงบ่ายแวะมาช่วยจุดลงทะเบียนเพิ่มได้เลย ก่อนกลับอย่าลืมสแกน QR กับพี่ที่โต๊ะหน้าห้องนะคะ',
          images: [],
          at: now - 50 * MIN,
        },
      ],
    },
    {
      ...base,
      id: 'a-wai',
      title: 'พิธีไหว้ครูคณะวิทยาศาสตร์ ประจำปีการศึกษา 2569',
      category: 'faculty',
      org: ORGS.SCI2569,
      orgCode: 'SCI2569',
      poster: P('wai'),
      description:
        'นิสิตชั้นปีที่ 1 ร่วมพิธีไหว้ครูและรับพานไหว้ครูจากรุ่นพี่ นิสิตชั้นปีอื่นที่ลงทะเบียนเป็นสตาฟช่วยดูแลแถวและจุดรับลงทะเบียน\n\nแต่งกายชุดนิสิตถูกระเบียบ มาถึงก่อนเวลา 30 นาที',
      place: 'หอประชุมคณะวิทยาศาสตร์ อาคาร SC2',
      lat: 16.7489,
      lng: 100.1912,
      start: at(1, 8),
      end: at(1, 12),
      hours: 5,
      capacity: 200,
      supervisor: { name: 'พีรพัฒน์ มณีวงศ์', phone: '062-318-4490' },
    },
    {
      ...base,
      id: 'a-river',
      title: 'เก็บขยะริมแม่น้ำน่าน หน้าวัดใหญ่',
      category: 'volunteer',
      org: ORGS.NUVOL26,
      orgCode: 'NUVOL26',
      poster: P('river'),
      description:
        'เก็บขยะและคัดแยกขยะริมตลิ่งแม่น้ำน่าน ช่วงหน้าวัดพระศรีรัตนมหาธาตุวรมหาวิหาร ร่วมกับเทศบาลนครพิษณุโลก ขยะรีไซเคิลทั้งหมดจะนำไปขายเข้ากองทุนชมรม\n\nมีรถสองแถวรับส่งจากหน้าหอพักนิสิต',
      place: 'ริมแม่น้ำน่าน หน้าวัดใหญ่ พิษณุโลก',
      lat: 16.8262,
      lng: 100.2622,
      start: at(2, 7),
      end: at(2, 11),
      hours: 5,
      capacity: 50,
      supervisor: { name: 'ภูมิพัฒน์ แก้วประเสริฐ', phone: '081-947-2236' },
      chatEnabled: true,
      openChatUrl: 'https://line.me/ti/g2/nu-volunteer-river-demo',
      announcements: [
        {
          id: 'n-river-2',
          text: 'ย้ายจุดนัดพบเป็นลานจอดรถริมน้ำ ฝั่งตรงข้ามวัดใหญ่ เจอกัน 06:45 น. รถสองแถวออกจากหน้าหอพักนิสิต 06:15 น. ใครไปเองจอดรถฝั่งตลาดได้เลยครับ',
          images: [P('river-meet')],
          at: now - 70 * MIN,
        },
        {
          id: 'n-river-1',
          text: 'เตรียมหมวก ครีมกันแดด และกระบอกน้ำส่วนตัวมาด้วยนะครับ ทางชมรมมีถุงมือ ถุงขยะ และที่คีบให้ครบทุกคน',
          images: [],
          at: now - 26 * H,
        },
      ],
    },
    {
      ...base,
      id: 'a-teach',
      title: 'สอนการบ้านน้อง โรงเรียนบ้านท่าโพธิ์',
      category: 'volunteer',
      org: ORGS.CAMP69,
      orgCode: 'CAMP69',
      poster: P('teach'),
      description:
        'สอนการบ้านคณิตศาสตร์และภาษาอังกฤษให้น้องชั้น ป.4 ถึง ป.6 ทุกบ่ายวันเสาร์ กลุ่มละ 4 ถึง 5 คน มีใบงานเตรียมไว้ให้แล้ว',
      place: 'โรงเรียนบ้านท่าโพธิ์ ต.ท่าโพธิ์',
      lat: 16.7612,
      lng: 100.1871,
      start: at(4, 13),
      end: at(4, 17),
      hours: 5,
      capacity: 20,
      supervisor: { name: 'ชลธิชา บัวขาว', phone: '093-207-1185' },
      announcements: [
        {
          id: 'n-teach-1',
          text: 'รอบนี้เต็มแล้วนะคะ ขอบคุณทุกคนที่สมัครเข้ามา รอบหน้าจะเปิดรับวันจันทร์ 18:00 น.',
          images: [],
          at: now - 5 * H,
        },
      ],
    },
    {
      ...base,
      id: 'a-paint',
      title: 'ทาสีห้องเรียนและวาดภาพกับน้องอนุบาล',
      category: 'volunteer',
      org: ORGS.CAMP69,
      orgCode: 'CAMP69',
      poster: P('paint'),
      description:
        'ทาสีผนังห้องเรียนอนุบาลใหม่ และจัดกิจกรรมวาดภาพระบายสีกับน้อง ๆ ช่วงบ่าย ใครวาดรูปได้มาช่วยร่างลายบนผนังด้วยจะดีมาก',
      place: 'โรงเรียนวัดจันทร์ตะวันออก',
      lat: 16.7964,
      lng: 100.2689,
      start: at(6, 8, 30),
      end: at(6, 15, 30),
      hours: 5,
      capacity: 25,
      supervisor: { name: 'ชลธิชา บัวขาว', phone: '093-207-1185' },
    },
    {
      ...base,
      id: 'a-tree',
      title: 'ปลูกป่าต้นน้ำ เขื่อนแควน้อยบำรุงแดน',
      category: 'volunteer',
      org: ORGS.NUVOL26,
      orgCode: 'NUVOL26',
      poster: P('tree'),
      description:
        'ปลูกกล้าไม้ท้องถิ่น 1,200 ต้น บริเวณป่าต้นน้ำเหนือเขื่อน ร่วมกับกรมป่าไม้ เดินทางด้วยรถบัสของมหาวิทยาลัย มีอาหารเช้าและกลางวัน',
      place: 'เขื่อนแควน้อยบำรุงแดน อ.วัดโบสถ์',
      lat: 17.1337,
      lng: 100.4284,
      start: at(9, 6, 30),
      end: at(9, 15),
      hours: 9,
      capacity: 60,
      supervisor: { name: 'ภูมิพัฒน์ แก้วประเสริฐ', phone: '081-947-2236' },
      createdAt: now - 3 * H,
    },
    {
      ...base,
      id: 'a-grad',
      title: 'จิตอาสางานพิธีพระราชทานปริญญาบัตร',
      category: 'volunteer',
      org: ORGS.NUSA69,
      orgCode: 'NUSA69',
      poster: P('grad'),
      description:
        'ช่วยงานพิธีพระราชทานปริญญาบัตร ดูแลจุดลงทะเบียนบัณฑิต จุดปฐมพยาบาล และนำทางผู้ปกครอง ต้องเข้าซ้อมใหญ่ 1 ครั้งก่อนวันงาน',
      place: 'หอประชุมสมเด็จพระนเรศวรมหาราช',
      lat: 16.7441,
      lng: 100.1957,
      start: at(12, 6),
      end: at(12, 18),
      hours: 9,
      capacity: 120,
      supervisor: { name: 'อาจารย์กมลวรรณ ทองคำ', phone: '055-961-208' },
      chatEnabled: true,
      announcements: [
        {
          id: 'n-grad-1',
          text: 'ซ้อมใหญ่วันพุธ 13:00 น. ที่หอประชุมสมเด็จพระนเรศวรมหาราช แต่งกายชุดนิสิตถูกระเบียบ ใครมาซ้อมไม่ได้แจ้งในแชทก่อนวันอังคารนะคะ',
          images: [],
          at: now - 20 * H,
        },
      ],
    },
    {
      ...base,
      id: 'a-camp',
      title: 'ค่าย Young Coder ครั้งที่ 7 พี่เลี้ยงประจำกลุ่ม',
      category: 'faculty',
      org: ORGS.SCI2569,
      orgCode: 'SCI2569',
      poster: P('camp'),
      description:
        'ค่ายสอนเขียนโปรแกรมเบื้องต้นให้นักเรียนมัธยมปลาย 2 วัน 1 คืน พี่เลี้ยงดูแลน้องกลุ่มละ 6 คน ช่วยตอบคำถามระหว่าง workshop และคุมเวลากิจกรรมกลุ่ม\n\nรับนิสิตภาควิชาวิทยาการคอมพิวเตอร์และเทคโนโลยีสารสนเทศเป็นหลัก',
      place: 'อาคารวิทยาศาสตร์ SC2 ห้องปฏิบัติการคอมพิวเตอร์',
      lat: 16.7491,
      lng: 100.1917,
      start: at(15, 8),
      end: at(16, 16),
      hours: 18,
      capacity: 24,
      supervisor: { name: 'พีรพัฒน์ มณีวงศ์', phone: '062-318-4490' },
      chatEnabled: true,
    },
    {
      ...base,
      id: 'a-open',
      title: 'Open House คณะวิทยาศาสตร์ ผู้ช่วยประจำบูธ',
      category: 'faculty',
      org: ORGS.SCI2569,
      orgCode: 'SCI2569',
      poster: P('openhouse'),
      description:
        'แนะนำหลักสูตรและพาน้องมัธยมเดินชมห้องปฏิบัติการ แต่ละภาควิชาต้องการผู้ช่วยบูธ 4 ถึง 6 คน มีเสื้อสตาฟให้',
      place: 'ลานกิจกรรมคณะวิทยาศาสตร์',
      lat: 16.7486,
      lng: 100.1909,
      start: at(20, 8, 30),
      end: at(20, 15, 30),
      opensAt: at(1, 18),
      hours: 5,
      capacity: 40,
      supervisor: { name: 'ณัฐวรา ใจดี', phone: '064-775-0932' },
    },
    // past
    {
      ...base,
      id: 'p-dorm',
      title: 'Big Cleaning Day หอพักนิสิต',
      category: 'volunteer',
      org: ORGS.NUSA69,
      orgCode: 'NUSA69',
      poster: P('dorm'),
      description: 'ทำความสะอาดพื้นที่ส่วนกลางหอพักนิสิตและคัดแยกขยะก่อนเปิดภาคเรียน',
      place: 'หอพักนิสิต มหาวิทยาลัยนเรศวร',
      start: at(-12, 8),
      end: at(-12, 11),
      closedAt: at(-12, 13),
      submittedAt: at(-9, 10),
      hours: 5,
      capacity: 80,
      supervisor: { name: 'อาจารย์กมลวรรณ ทองคำ', phone: '055-961-208' },
    },
    {
      ...base,
      id: 'p-orient',
      title: 'ปฐมนิเทศนิสิตใหม่ คณะวิทยาศาสตร์ (สตาฟ)',
      category: 'faculty',
      org: ORGS.SCI2569,
      orgCode: 'SCI2569',
      poster: P('orient'),
      description: 'สตาฟดูแลจุดลงทะเบียนและพาน้องใหม่เดินชมคณะ',
      place: 'หอประชุมคณะวิทยาศาสตร์ อาคาร SC2',
      start: at(-34, 8),
      end: at(-34, 16),
      closedAt: at(-34, 17),
      submittedAt: at(-30, 9),
      recordedAt: at(-25, 15),
      hours: 9,
      capacity: 60,
      supervisor: { name: 'พีรพัฒน์ มณีวงศ์', phone: '062-318-4490' },
    },
    {
      ...base,
      id: 'p-mural',
      title: 'ทาสีกำแพงโรงเรียนบ้านสระโคล่',
      category: 'volunteer',
      org: ORGS.CAMP69,
      orgCode: 'CAMP69',
      poster: P('mural'),
      description: 'ทาสีกำแพงรอบโรงเรียนและวาดภาพจิตรกรรมฝาผนังร่วมกับนักเรียน',
      place: 'โรงเรียนบ้านสระโคล่ อ.วังทอง',
      start: at(-48, 8),
      end: at(-48, 13),
      closedAt: at(-48, 14),
      submittedAt: at(-44, 9),
      recordedAt: at(-40, 11),
      hours: 5,
      capacity: 30,
      supervisor: { name: 'ชลธิชา บัวขาว', phone: '093-207-1185' },
    },
    // ended, supervisor still has work to do (demo login NUVOL26)
    {
      ...base,
      id: 'p-milk',
      title: 'คัดแยกและล้างกล่องนม ส่งโครงการหลังคาเขียว',
      category: 'volunteer',
      org: ORGS.NUVOL26,
      orgCode: 'NUVOL26',
      poster: P('dorm'),
      description: 'ล้าง ตัด และตากกล่องนมที่เก็บจากโรงอาหาร เพื่อส่งต่อทำแผ่นหลังคาให้ชุมชน',
      place: 'ลานกิจกรรมหน้าอาคารกองกิจการนิสิต',
      start: h0 - 27 * H,
      end: h0 - 22 * H,
      hours: 5,
      capacity: 40,
      supervisor: { name: 'ภูมิพัฒน์ แก้วประเสริฐ', phone: '081-947-2236' },
    },
    {
      ...base,
      id: 'p-bottle',
      title: 'เก็บขวดพลาสติกรอบหอพัก แลกชั่วโมงจิตอาสา',
      category: 'volunteer',
      org: ORGS.NUVOL26,
      orgCode: 'NUVOL26',
      poster: P('river'),
      description: 'เก็บขวดพลาสติกรอบหอพักนิสิต ส่งที่โต๊ะชมรมพร้อมสแกน QR',
      place: 'หอพักนิสิต มหาวิทยาลัยนเรศวร',
      start: at(-26, 8),
      end: at(-26, 16),
      closedAt: at(-26, 17),
      hours: 5,
      capacity: 60,
      supervisor: { name: 'ภูมิพัฒน์ แก้วประเสริฐ', phone: '081-947-2236' },
    },
    ...history(now),
  ]
}

/** Past activities since the start of the activity year, so stats and charts have data. */
function history(now: number): Activity[] {
  const y0 = new Date(now)
  const startYear = y0.getMonth() >= 4 ? y0.getFullYear() : y0.getFullYear() - 1
  const day = (n: number, hh: number) => new Date(startYear, 4, 1 + n, hh).getTime()
  const rows: [string, string, keyof typeof ORGS, string, number, number, number][] = [
    // title, place, org, poster, day from 1 May, hours, capacity
    ['ปลูกต้นไม้รอบอ่างเก็บน้ำมหาวิทยาลัย', 'อ่างเก็บน้ำ มน.', 'NUVOL26', 'tree', 9, 5, 60],
    ['จิตอาสางานบริจาคโลหิต ครั้งที่ 1/2569', 'โรงพยาบาลมหาวิทยาลัยนเรศวร', 'NUVOL26', 'blood', 16, 5, 30],
    ['ทาสีอาคารเรียนโรงเรียนบ้านวังส้มซ่า', 'โรงเรียนบ้านวังส้มซ่า', 'CAMP69', 'paint', 23, 9, 30],
    ['ต้อนรับนิสิตใหม่ วันรายงานตัว', 'หอประชุมสมเด็จพระนเรศวรมหาราช', 'NUSA69', 'orient', 31, 5, 80],
    ['สตาฟงานลงทะเบียนนิสิตใหม่ คณะวิทยาศาสตร์', 'อาคาร SC2', 'SCI2569', 'wai', 38, 5, 40],
    ['จัดเก้าอี้งานปฐมนิเทศ', 'หอประชุมสมเด็จพระนเรศวรมหาราช', 'NUSA69', 'grad', 44, 1, 50],
    ['ช่วยเก็บผักตบชวา ร่วมกับ อบต.ท่าโพธิ์', 'คลองท่าโพธิ์', 'NUVOL26', 'river', 52, 9, 50],
    ['สอนการบ้านน้อง โรงเรียนบ้านท่าโพธิ์ รอบ 1', 'โรงเรียนบ้านท่าโพธิ์', 'CAMP69', 'teach', 59, 5, 20],
    ['จิตอาสางานบริจาคโลหิต ครั้งที่ 2/2569', 'โรงพยาบาลมหาวิทยาลัยนเรศวร', 'NUVOL26', 'blood', 66, 5, 30],
    ['ค่ายอาสาพัฒนาชนบท บ้านห้วยเจริญ', 'บ้านห้วยเจริญ อ.ชาติตระการ', 'CAMP69', 'camp', 74, 18, 35],
    ['เก็บกล่องนมรอบโรงอาหาร', 'โรงอาหารกลาง มน.', 'NUVOL26', 'dorm', 81, 1, 60],
    ['พี่เลี้ยงค่ายวิทยาศาสตร์ ม.ต้น', 'อาคาร SC2', 'SCI2569', 'camp', 89, 9, 24],
    ['ทาสีกำแพงวัดจันทร์ตะวันตก', 'วัดจันทร์ตะวันตก', 'CAMP69', 'mural', 97, 5, 30],
    ['จิตอาสางานบริจาคโลหิต ครั้งที่ 3/2569', 'โรงพยาบาลมหาวิทยาลัยนเรศวร', 'NUVOL26', 'blood', 104, 5, 30],
    ['เก็บขยะริมแม่น้ำน่าน รอบเดือนสิงหาคม', 'ริมแม่น้ำน่าน หน้าวัดใหญ่', 'NUVOL26', 'river', 111, 5, 50],
    ['สตาฟงาน Science Day', 'ลานกิจกรรมคณะวิทยาศาสตร์', 'SCI2569', 'openhouse', 118, 5, 40],
    ['ซ่อมแซมห้องสมุดโรงเรียนบ้านสระโคล่', 'โรงเรียนบ้านสระโคล่', 'CAMP69', 'mural', 126, 9, 25],
    ['ทำความสะอาดหอพักก่อนสอบกลางภาค', 'หอพักนิสิต', 'NUSA69', 'dorm', 133, 1, 80],
    ['สอนการบ้านน้อง โรงเรียนบ้านท่าโพธิ์ รอบ 2', 'โรงเรียนบ้านท่าโพธิ์', 'CAMP69', 'teach', 140, 5, 20],
  ]
  const sup: Record<string, { name: string; phone: string }> = {
    NUVOL26: { name: 'ภูมิพัฒน์ แก้วประเสริฐ', phone: '081-947-2236' },
    SCI2569: { name: 'พีรพัฒน์ มณีวงศ์', phone: '062-318-4490' },
    NUSA69: { name: 'อาจารย์กมลวรรณ ทองคำ', phone: '055-961-208' },
    CAMP69: { name: 'ชลธิชา บัวขาว', phone: '093-207-1185' },
  }
  return rows
    .map(([title, place, code, poster, d, hours, capacity], i): Activity => {
      const start = day(d, 8)
      const end = day(d, hours >= 9 ? 17 : 12)
      const age = (now - end) / (24 * H)
      return {
        id: `h-${i}`,
        title,
        category: code === 'SCI2569' ? 'faculty' : 'volunteer',
        org: ORGS[code],
        orgCode: code,
        poster: P(poster),
        description: '',
        place,
        start,
        end,
        hours,
        capacity,
        supervisor: sup[code],
        chatEnabled: false,
        announcements: [],
        createdAt: start - 10 * 24 * H,
        closedAt: end + 2 * H,
        submittedAt: age > 6 ? end + 3 * 24 * H : undefined,
        recordedAt: age > 45 ? end + 9 * 24 * H : undefined,
        seed: true,
      }
    })
    .filter((a) => a.end < now - 2 * 24 * H)
}

/** How many demo students already registered per activity. */
const REG_COUNT: Record<string, number> = {
  'a-blood': 26,
  'a-wai': 164,
  'a-river': 37,
  'a-teach': 20,
  'a-paint': 9,
  'a-tree': 22,
  'a-grad': 87,
  'a-camp': 18,
  'a-open': 0,
  'p-dorm': 41,
  'p-orient': 52,
  'p-mural': 24,
  'p-milk': 34,
  'p-bottle': 47,
}

export function seedRegistrations(students: Student[], activities: Activity[]): { regs: Registration[]; credits: Credit[] } {
  const regs: Registration[] = []
  const credits: Credit[] = []
  activities.forEach((a, ai) => {
    const n = Math.min(REG_COUNT[a.id] ?? (a.id.startsWith('h-') ? Math.round(a.capacity * (0.7 + (ai % 4) * 0.08)) : 0), a.capacity)
    for (let k = 0; k < n; k++) {
      const s = students[(ai * 17 + k * 5) % students.length]
      // 96 demo students; big events reuse some, dedupe below
      if (regs.some((r) => r.activityId === a.id && r.studentId === s.id)) continue
      regs.push({ activityId: a.id, studentId: s.id, at: a.createdAt + k * 37 * MIN })
      if (a.end < Date.now() && k % 9 !== 4) {
        credits.push({
          activityId: a.id,
          studentId: s.id,
          hours: a.hours,
          category: a.category,
          title: a.title,
          at: a.end - (k % 30) * MIN,
          method: 'qr',
          distance: 12 + ((k * 13) % 70),
        })
      }
    }
  })
  return { regs, credits }
}

// a-wai has more seats than demo students; pad the count so the numbers read true.
export const EXTRA_REGISTERED: Record<string, number> = { 'a-wai': 164 - 96 }

export function seedChats(students: Student[], now = Date.now()): ChatMsg[] {
  const s = (i: number) => students[i]
  const m = (activityId: string, i: number | 'sup', text: string, minsAgo: number, supName = ''): ChatMsg => ({
    id: `c-${activityId}-${minsAgo}`,
    activityId,
    authorId: i === 'sup' ? 'sup' : s(i).id,
    authorName: i === 'sup' ? supName : s(i).name,
    text,
    at: now - minsAgo * MIN,
    sup: i === 'sup',
  })
  const river = 'ภูมิพัฒน์ แก้วประเสริฐ'
  const grad = 'อาจารย์กมลวรรณ ทองคำ'
  return [
    m('a-river', 3, 'พี่ครับ ถ้าไปเองจอดรถตรงไหนได้บ้างครับ', 300),
    m('a-river', 'sup', 'จอดฝั่งตลาดได้เลยครับ แล้วเดินข้ามมาลานจอดรถริมน้ำ ประมาณ 3 นาที', 290, river),
    m('a-river', 11, 'ต้องเอาถุงมือไปเองไหมคะ', 180),
    m('a-river', 'sup', 'ชมรมมีให้ครับ เอาหมวกกับกระบอกน้ำมาก็พอ', 176, river),
    m('a-river', 6, 'ขึ้นรถสองแถวหน้าหอ 06:15 ใช่ไหมครับ', 64),
    m('a-river', 'sup', 'ใช่ครับ รถออกตรงเวลา ใครสายตามไปเองนะ', 60, river),
    m('a-river', 19, 'รับทราบค่ะ', 42),
    m('a-blood', 'sup', 'ใครเลิกเวรแล้วมาสแกน QR ที่โต๊ะหน้าห้องได้เลยนะคะ', 25, 'ณัฐธิดา ศรีสุข'),
    m('a-blood', 8, 'ช่วงบ่ายยังต้องการคนเพิ่มอยู่ไหมคะ', 18),
    m('a-blood', 'sup', 'ต้องการค่ะ จุดแจกน้ำขาด 2 คน', 15, 'ณัฐธิดา ศรีสุข'),
    m('a-grad', 'sup', 'ทุกคนเข้าแชทนี้ไว้นะคะ จะแจ้งตำแหน่งประจำจุดก่อนวันซ้อม', 1500, grad),
    m('a-grad', 24, 'ซ้อมใหญ่ต้องใส่ชุดนิสิตไหมครับ', 1200),
    m('a-grad', 'sup', 'ใส่ชุดนิสิตค่ะ รองเท้าคัทชูหรือรองเท้าหนังสีดำ', 1180, grad),
  ]
}

export function personalNotices(now = Date.now()): Notice[] {
  return [
    {
      id: 'nt-river',
      kind: 'announce',
      title: 'เก็บขยะริมแม่น้ำน่าน หน้าวัดใหญ่',
      body: 'ย้ายจุดนัดพบเป็นลานจอดรถริมน้ำ ฝั่งตรงข้ามวัดใหญ่ เจอกัน 06:45 น.',
      activityId: 'a-river',
      at: now - 70 * MIN,
      read: false,
    },
    {
      id: 'nt-tree',
      kind: 'new',
      title: 'กิจกรรมใหม่จากชมรมอาสาพัฒนา มน.',
      body: 'ปลูกป่าต้นน้ำ เขื่อนแควน้อยบำรุงแดน ได้รับ 9 ชั่วโมงจิตอาสา',
      activityId: 'a-tree',
      at: now - 3 * H,
      read: false,
    },
    {
      id: 'nt-wai',
      kind: 'reminder',
      title: 'พรุ่งนี้มีกิจกรรมที่คุณลงทะเบียนไว้',
      body: 'พิธีไหว้ครูคณะวิทยาศาสตร์ เริ่ม 08:00 น. ที่หอประชุมคณะวิทยาศาสตร์',
      activityId: 'a-wai',
      at: now - 6 * H,
      read: true,
    },
    {
      id: 'nt-dorm',
      kind: 'credit',
      title: 'ได้รับ 5 ชั่วโมงจิตอาสา',
      body: 'Big Cleaning Day หอพักนิสิต',
      activityId: 'p-dorm',
      at: now - 12 * 24 * H,
      read: true,
    },
  ]
}

export const PERSONAL_REGS = ['a-blood', 'a-wai', 'a-river']
export const PERSONAL_CREDITS = ['p-dorm', 'p-orient', 'p-mural']
export const PERSONAL_NOSHOW = ['p-bottle']

/** A student explaining a missed activity, so the supervisor demo has an unread private message. */
export function seedDms(st: Student | undefined, now = Date.now()): DirectMsg[] {
  if (!st) return []
  return [
    {
      id: 'dm-milk-1',
      activityId: 'p-milk',
      studentId: st.id,
      fromSup: false,
      authorName: st.name,
      text: 'ขอโทษครับพี่ เมื่อวานผมไม่สบาย มีไข้ตั้งแต่เช้าเลยไปร่วมกิจกรรมไม่ได้ มีใบรับรองแพทย์จากหน่วยบริการสุขภาพครับ',
      at: now - 3 * H,
      read: false,
    },
  ]
}
