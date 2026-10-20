# แผนเวอร์ชัน Flutter (ส่งวิชา 273387)

ร่าง 12 ต.ค. 2569 ยังเป็นข้อเสนอ รอทั้งกลุ่มยืนยันก่อนลง [DECISIONS.md](DECISIONS.md) ของงานวิชา (แยกจากของเดโม)

เป้าหมายตั้งต้น: ทำฟังก์ชันเดียวกับเดโม PWA ด้วยวิธีที่อาจารย์สอนในบทที่ 1 ถึง 16 ให้มากที่สุด ส่วนที่บทเรียนไม่มีแต่จำเป็น (สแกน QR, GPS, Excel) ใช้แพ็กเกจเพิ่มจาก pub.dev ใกล้วันส่งจะตัดให้เล็กลงได้ ตัดอะไรบันทึกใน DECISIONS.md ของงานวิชา

## สิ่งที่วิชาสอน และจะใช้ตรงไหน

| บท | เรื่อง | ใช้ในแอพตรงไหน |
| --- | --- | --- |
| 2, 2.1 | Dart, OOP | model ทุกตัวเป็น class มี `fromMap` / `toMap`, enum ประเภทชั่วโมง |
| 2.2, 12 | async, Future, Stream, FutureBuilder | โหลดข้อมูลจาก DB, ฟัง GPS, ฟังกล้องสแกน |
| 3 ถึง 6 | widget, Row/Column, ListView, Stack | การ์ดกิจกรรม, โปสเตอร์ซ้อนตัวหนังสือ, บัตรยืนยันแบบตั๋ว |
| 4 | assets, google_fonts | รูปโปสเตอร์ตัวอย่าง, ตรา มน., ฟอนต์ Anuphan |
| 7 | StatefulWidget, setState | state ในหน้าจอเดียว เช่น PIN pad, ตัวกรอง, นับถอยหลัง QR |
| 8 | Form, TextFormField, validator | สมัคร (รหัสนิสิต 8 หลัก, PIN 6 หลัก), ฟอร์มสร้างกิจกรรม, เพิ่มชื่อเอง |
| 9 | Navigator, named routes, onGenerateRoute | `app/routes.dart` จุดเดียว ส่ง argument เช่น activityId |
| 10, 11 | Provider, ChangeNotifier, Consumer, MultiProvider, ProxyProvider | state ทั้งแอพ แทน zustand ในเดโม |
| 12 | http, service class | แยก service layer (ถ้าต่อ Firebase ใช้ SDK แทน http) |
| 13 | sqflite, DatabaseHelper, Repository | เก็บข้อมูลในเครื่อง และคิวรับชั่วโมงตอนเน็ตหลุด |
| 14 ถึง 16 | วางแผน, รวม DB, widget test | โครงโฟลเดอร์ตามบทนี้, เขียน test |

## แพ็กเกจ

ที่บทเรียนใช้: `provider`, `sqflite`, `path`, `http`, `intl`, `google_fonts`, `flutter_test`

ที่ต้องเพิ่ม:

| แพ็กเกจ | ใช้ทำอะไร |
| --- | --- |
| `mobile_scanner` | สแกน QR ด้วยกล้อง |
| `qr_flutter` | แสดง QR บนจอผู้คุม |
| `geolocator` | ตำแหน่ง GPS และคำนวณระยะ |
| `crypto` | HMAC-SHA256 เซ็นและตรวจ QR token (ใช้สูตรเดียวกับ `src/lib/qr.ts`) |
| `image_picker` | เลือกรูปโปสเตอร์และรูปในประกาศ |
| `excel` + `path_provider` + `share_plus` | สร้าง .xlsx แล้วแชร์ออกไป |
| `url_launcher` | เปิด Google Maps, โทร, เปิด LINE OpenChat |
| `flutter_local_notifications` | แจ้งเตือนบนเครื่อง |
| `wakelock_plus` | จอไม่ดับตอนเปิด QR |
| `shared_preferences` | จำว่า login อยู่ และค่าตั้งแจ้งเตือน |
| ระยะ 2: `firebase_core`, `cloud_firestore`, `firebase_auth` | ข้อมูลข้ามเครื่อง |

## ฐานข้อมูล: ทำ 2 ระยะ

ระยะ 1 SQLite อย่างเดียว (ตรงกับบทที่ 13 ถึง 15)
- เดโมหลักยังใช้ข้ามเครื่องได้ เพราะ QR เซ็นในตัวเอง เครื่องนิสิตตรวจได้โดยไม่ต้องมีเซิร์ฟเวอร์ (แบบเดียวกับเดโม PWA ตอนนี้)
- สิ่งที่ยังไม่ข้ามเครื่อง: กิจกรรมที่สร้างใหม่, รายชื่อสดฝั่งผู้คุม, แชท

ระยะ 2 Firestore (บทที่ 16 บอกเป็นขั้นต่อไป)
- เปลี่ยนแค่ไฟล์ใน `repositories/` หน้าจอกับ provider ไม่ต้องแก้ ถ้าทุกคนเรียกข้อมูลผ่าน repository เท่านั้น
- SQLite ยังใช้ต่อเป็น cache และคิวรับชั่วโมงที่สแกนตอนไม่มีเน็ต แล้วส่งขึ้นเมื่อเน็ตกลับมา (สถานที่จัดกิจกรรมสัญญาณมักไม่ดี)
- collection ตามแผนใน ARCHITECTURE.md

ตาราง SQLite:

```
students        (student_id PK, name, faculty, pin_hash)
orgs            (code PK, name)
activities      (id PK, title, kind, org_code, start_at, end_at, place, lat, lng,
                 hours, capacity, phone, detail, poster_path, chat_open, line_url)
registrations   (activity_id, student_id, registered_at, PK(activity_id, student_id))
credits         (activity_id, student_id, hours, kind, method, distance_m,
                 ref, verified_at, synced, PK(activity_id, student_id))
announcements   (id PK, activity_id, text, images_json, created_at)
messages        (id PK, activity_id, sender_id, sender_name, is_sup, text, sent_at)
notices         (id PK, type, activity_id, title, body, created_at, read)
```

## โครงโฟลเดอร์

ตามแบบบทที่ 11, 13, 15 (`models / providers / screens / widgets / helpers / repositories / services`)

```
lib/
  main.dart                     MultiProvider + MaterialApp
  app/
    routes.dart                 ชื่อ route ทั้งหมด + onGenerateRoute
    theme.dart                  สี มน. light/dark, ฟอนต์, มุมโค้ง
  models/
    student.dart  activity.dart  registration.dart  credit.dart
    announcement.dart  chat_message.dart  app_notice.dart  org.dart
  helpers/
    database_helper.dart        เปิด DB สร้างตาราง ใส่ข้อมูลตัวอย่าง
    seed_data.dart              แปลงจาก src/data/seed.ts
  repositories/                 ทางเดียวที่หน้าจอใช้เข้าถึงข้อมูล
    auth_repository.dart  activity_repository.dart  registration_repository.dart
    credit_repository.dart  chat_repository.dart  notice_repository.dart
  services/
    qr_token_service.dart       สร้างและตรวจ token
    location_service.dart       getFix, distanceM, RADIUS_M = 150
    notification_service.dart
    excel_export_service.dart
    image_service.dart          เลือกและย่อรูป
  providers/
    auth_provider.dart          นิสิตที่ login อยู่ และโหมดผู้คุม
    activity_provider.dart      รายการ กรอง สร้าง แก้
    registration_provider.dart  ลงทะเบียน ยกเลิก ที่ว่าง
    credit_provider.dart        ชั่วโมงสะสม Transcript ผลตรวจ QR
    chat_provider.dart
    notice_provider.dart        แจ้งเตือน ตัวเลขยังไม่อ่าน ค่าตั้ง
    roster_provider.dart        รายชื่อฝั่งผู้คุม ค้นหา กรอง
  screens/
    student/  welcome, home, activity_detail, chat, scan, claim_result,
              ticket, mine, inbox, notify_settings, profile
    supervisor/ sup_login, sup_home, activity_editor, manage, qr_presenter
  widgets/
    activity_card.dart  poster_header.dart  hours_summary.dart  ticket_card.dart
    pin_pad.dart  confirm_sheet.dart  hour_stepper.dart  empty_state.dart
    bottom_nav.dart
  utils/
    thai_date.dart              วันที่ พ.ศ., วันนี้ พรุ่งนี้ อีก x วัน
    validators.dart             รหัสนิสิต 8 หลัก, PIN, เบอร์โทร
test/
  qr_token_test.dart  distance_test.dart  validators_test.dart
  widgets/home_screen_test.dart
```

กติกากลุ่ม:
- หน้าจอห้ามเรียก `DatabaseHelper` ตรง ต้องผ่าน provider และ repository เท่านั้น
- model กับ interface ของ repository ตกลงกันวันแรก แล้วห้ามแก้โดยไม่บอกกลุ่ม
- 1 คน 1 branch ตั้งชื่อ `feat/<ชื่อ>-<เรื่อง>` merge เข้า `main` ผ่าน PR ให้อีกคนดู

## หน้าจอเดิม (React) กับไฟล์ใหม่

| React (`src/screens/`) | Flutter (`lib/screens/`) |
| --- | --- |
| student/Welcome | student/welcome_screen.dart |
| student/Home | student/home_screen.dart |
| student/ActivityDetail | student/activity_detail_screen.dart |
| student/Chat, sup chat | student/chat_screen.dart (ใช้ร่วมกัน) |
| student/Scan | student/scan_screen.dart |
| student/Claim + Ticket | student/claim_result_screen.dart, student/ticket_screen.dart |
| student/Mine | student/mine_screen.dart |
| student/Inbox, NotifySettings | student/inbox_screen.dart, student/notify_settings_screen.dart |
| student/Me | student/profile_screen.dart |
| sup/SupLogin, SupHome | supervisor/sup_login_screen.dart, supervisor/sup_home_screen.dart |
| sup/Editor | supervisor/activity_editor_screen.dart |
| sup/Manage | supervisor/manage_screen.dart |
| sup/Presenter | supervisor/qr_presenter_screen.dart |

## แบ่งงาน 4 คน

แบ่งตามฟีเจอร์ทั้งเส้น (model ถึงหน้าจอ) ทุกคนจะได้ใช้ Provider, Form และ DB ของตัวเอง ตอนนำเสนอและสอบถามจะอธิบายได้ทุกคน

| | คนที่ 1 โครงสร้างระบบ ฐานข้อมูล และบัญชีผู้ใช้ | คนที่ 2 ส่วนงานนิสิต | คนที่ 3 ระบบยืนยันการเข้าร่วมกิจกรรม | คนที่ 4 ส่วนงานผู้คุมกิจกรรม |
| --- | --- | --- | --- | --- |
| หน้าจอ | welcome (สมัคร, login PIN), profile + Transcript, inbox, notify_settings, bottom_nav | home, activity_detail, confirm_sheet ลงทะเบียน/ยกเลิก, mine, chat | scan, claim_result, ticket, qr_presenter | sup_login, sup_home, activity_editor, manage (รายชื่อ, เพิ่มเอง, ประกาศ) |
| provider | auth, notice | activity (ส่วนอ่าน), registration, chat | credit | activity (ส่วนสร้าง/แก้), roster |
| ข้อมูล | `database_helper`, `seed_data`, model ทั้งหมด, auth_repository, notice_repository | activity_repository, registration_repository, chat_repository | credit_repository, คิวส่งชั่วโมงตอนเน็ตหลุด | ใช้ repository ของคนที่ 2 เพิ่มเมธอดเขียน |
| service | notification_service, theme, routes | `url_launcher` แผนที่ โทร LINE | qr_token_service, location_service, wakelock | image_service, excel_export_service |
| test | validators_test | widget test หน้า home | qr_token_test, distance_test | test export ได้คอลัมน์ครบ |
| บทที่ใช้หนัก | 8, 9, 13 | 5, 6, 10, 11 | 2.2, 12 | 8, 11, 13 |
| ระยะ 2 | ตั้ง Firebase, Auth | ย้าย repo ของตัวเองไป Firestore | ย้ายการตรวจ nonce ไป Firestore rules | ย้าย repo ของตัวเองไป Firestore |

ทำไมแบ่งแบบนี้: คนที่ 3 ได้ส่วนที่ยากที่สุดแต่ไฟล์น้อย ทำทั้งฝั่งสร้าง QR และฝั่งสแกนในคนเดียว token จะตรงกันแน่นอน ส่วนคนที่ 1 ต้องเริ่มก่อนเพราะทุกคนรอ model กับ routes

## ลำดับทำ

1. วันแรก ทั้งกลุ่ม: ตกลง model, ชื่อ route, ตาราง DB และหน้าตา repository (เมธอดอะไร คืนค่าอะไร)
2. คนที่ 1: `flutter create`, ใส่แพ็กเกจ, theme, routes, model, database_helper พร้อมข้อมูลตัวอย่าง push ขึ้น main ให้เร็วที่สุด ระหว่างนี้คนอื่นทำ UI ด้วยข้อมูลปลอมใน widget ไปก่อน
3. ทุกคนต่อ UI เข้ากับ provider และ SQLite ของตัวเอง
4. ทดสอบรวมบน Android 2 เครื่อง: ผู้คุมเปิด QR นิสิตสแกน (ใกล้, ไกล, ซ้ำ, ภาพเก่า)
5. ระยะ 2 Firestore ถ้ามีเวลาก่อนสัปดาห์นำเสนอ
6. widget test, ขัดเกลา, เตรียมนำเสนอ

## ข้อจำกัดที่ต้องรู้

- ลงแอพบน iPhone/iPad จาก Windows ไม่ได้ ต้องมี Mac ทดสอบบน Android เป็นหลัก หรือ build เป็น Flutter web เปิดบน iPad
- แจ้งเตือนข้ามเครื่องตอนปิดแอพต้องมีเซิร์ฟเวอร์ส่ง (Cloud Functions ต้องผูกบัตร หรือ Cloudflare Worker) ระยะ 1 ทำแจ้งเตือนในเครื่องเดียว
- secret ของ QR อยู่ในแอพ ใช้ได้แค่เดโม ระยะ 2 ย้ายไปตรวจด้วย Firestore rules ตามแผนใน ARCHITECTURE.md
