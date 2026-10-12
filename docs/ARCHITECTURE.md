# โครงสร้างโค้ด

## Stack

- Vite 8 + React 19 + TypeScript (build ไม่ type-check, ใช้ `vite build` อย่างเดียว)
- `motion` (import จาก `motion/react`) สำหรับ animation
- `zustand` v5 + persist ลง localStorage (key `nuat-demo-v1`)
- `react-router-dom` แบบ HashRouter (GitHub Pages ไม่มี server rewrite)
- `qr-scanner` สแกน, `qrcode` สร้าง QR เป็น SVG, `@noble/hashes` ทำ HMAC/SHA-256 (ใช้ได้แม้ไม่ใช่ https)
- `write-excel-file/browser` export .xlsx, `sonner` toast, `@phosphor-icons/react` ไอคอน
- PWA เขียนเอง: `public/manifest.webmanifest`, `public/sw.js` (network-first cache + notificationclick)

## ไฟล์

```
src/
  main.tsx              เรียก rebase() และ registerSW() แล้ว render App + Toaster
  App.tsx               routes, page transition, tab bar, route guard
  store.ts              state + actions ทั้งหมด (ตรงนี้คือจุดที่จะเปลี่ยนเป็น Firebase)
  styles.css            design tokens light/dark + คลาส UI ทั้งหมด
  data/types.ts         Activity, Student, Registration, Credit, ChatMsg, Notice
  data/seed.ts          ข้อมูลจำลอง กิจกรรม 12 อัน นิสิต 96 คน แชท ประกาศ หน่วยงาน
  lib/qr.ts             สร้างและตรวจ token ของ QR, hashPin
  lib/geo.ts            getFix, watchFix, distanceM, RADIUS_M = 150
  lib/device.ts         haptic, ย่อรูป, service worker, notification, wake lock
  lib/format.ts         วันที่ไทย (พ.ศ.), relDay, timeAgo, phase()
  lib/hooks.ts          useNow, useSessionState
  ui/kit.tsx            Page, TopBar, Sheet, Segmented, Switch, Stepper, Avatar, PinPad, CountUp, PosterCard, Lightbox, Empty
  screens/student/      Welcome, Home, ActivityDetail, Chat, Scan, Claim (+Ticket, TicketView), Mine, Inbox, NotifySettings, Me
  screens/sup/          SupLogin, SupHome, Editor, Manage, Presenter
public/posters/         รูปกิจกรรมตัวอย่าง 13 รูป
public/nu-emblem.png    ตรามหาวิทยาลัยจาก nu.ac.th
scripts/deploy.mjs      deploy ไป gh-pages
scripts/e2e/            สคริปต์ทดสอบ Playwright (Python)
```

## Routes

| path | หน้า | ประเภท transition |
| --- | --- | --- |
| `/welcome` | สมัครและเข้าระบบ | root |
| `/`, `/mine`, `/inbox`, `/me` | 4 แท็บของนิสิต (มี tab bar) | root (fade) |
| `/a/:id`, `/a/:id/chat`, `/ticket/:id`, `/settings/notify` | รายละเอียด แชท บัตร ตั้งค่า | stack (สไลด์ข้าง) |
| `/scan`, `/claim?t=` | สแกนและตรวจ QR | modal (สไลด์ขึ้น) |
| `/sup/login`, `/sup` | ผู้คุม | root |
| `/sup/new`, `/sup/edit/:id`, `/sup/a/:id`, `/sup/a/:id/chat` | สร้าง แก้ จัดการ แชท | stack |
| `/sup/a/:id/qr` | หน้าจอ QR | modal |

Guard: ยังไม่มีบัญชีนิสิตจะเด้งไป `/welcome` ยกเว้นเส้นทาง `/sup` (ผู้คุมไม่ต้องมีบัญชีนิสิต) ถ้าเปิดลิงก์ `/claim` ก่อนสมัคร ระบบจำ token ไว้ใน sessionStorage แล้วพากลับมาหลังสมัครเสร็จ

## ข้อมูลจำลอง

- กิจกรรม `a-blood` (บริจาคโลหิต) ตั้งให้กำลังจัดอยู่เสมอ ใช้เดโมการสแกน
- กิจกรรมที่มี `seed: true` จะเลื่อนเวลาไปข้างหน้าอัตโนมัติ (`rebase()` ใน store) ถ้าข้อมูลเก่ากว่า 3 ชั่วโมง เดโมเลยมีกิจกรรมกำลังจัดทุกครั้งที่เปิด
- ตอนสมัคร (`signUp`) นิสิตใหม่จะถูกลงทะเบียน `a-blood`, `a-wai`, `a-river` และได้ชั่วโมงย้อนหลัง 3 กิจกรรม (รวม 13 ชม.) เพื่อให้ Transcript ไม่ว่าง
- `extraReg` เติมจำนวนคนลงทะเบียนของงานใหญ่ให้ตัวเลขดูจริง (นิสิตจำลองมี 96 คน)
- หน่วยงานและรหัส: `ORGS` ใน `data/seed.ts`

## QR รับชั่วโมง

QR คือ URL `<เว็บ>#/claim?t=<token>` เปิดด้วยกล้องปกติของมือถือได้ หรือสแกนในแอพ

```
token   = base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, body))[ตัด 12 byte]
payload = { v:1, a: activityId, n: ชื่อ 20 ตัวแรก, h: ชั่วโมง, c: ประเภท, w: floor(เวลา / 10 วิ), la, lo, ac: ตำแหน่งและความแม่นยำของผู้คุม }
```

ฝั่งนิสิต (`screens/student/Claim.tsx`) ตรวจตามลำดับ:
1. ลายเซ็นถูก ไม่ใช่ขึ้น "QR นี้ใช้รับชั่วโมงไม่ได้"
2. `w` อยู่ในช่วง ปัจจุบัน-3 ถึง ปัจจุบัน+1 (ภาพเก่าเกินประมาณ 40 วิ หมดอายุ)
3. ยังไม่เคยรับชั่วโมงกิจกรรมนี้
4. ลงทะเบียนแล้ว (ถ้าเครื่องรู้จักกิจกรรมนี้)
5. ระยะจากผู้คุม ไม่เกิน 150 + min(100, ค่าคลาดเคลื่อนผู้คุม) + min(100, ค่าคลาดเคลื่อนนิสิต) เมตร

ผ่านแล้วบันทึก `Credit` พร้อมระยะ และเลขอ้างอิง (SHA-256 ของลายเซ็น 8 ตัว) หน้าจอ QR ใช้ error correction ระดับ L ให้ QR ไม่แน่นเกินไป

ข้อจำกัด: secret อยู่ในโค้ดฝั่ง client ใช้ได้แค่เดโม ตอนต่อ Firebase ต้องย้ายการตรวจไปฝั่ง server (ดูแผนข้างล่าง)

## แผนต่อ Firebase (ยังไม่ได้ทำ)

ทุกอย่างทำได้บน Spark plan (ฟรี ไม่ผูกบัตร):

- Auth: Email/Password โดยแปลงรหัสนิสิตเป็นอีเมล เช่น `66310452@nuat.app` และใช้ PIN (+ salt) เป็นรหัสผ่าน ผู้ใช้ไม่เห็นอีเมลนี้
- Firestore:
  - `students/{studentId}` ชื่อ คณะ uid
  - `activities/{id}` และ subcollection `announcements`, `registrations/{studentId}`, `credits/{studentId}`, `messages`
  - `orgCodes/{code}` อ่านได้เฉพาะแบบ get ตาม id (list ไม่ได้) ใช้ตรวจรหัสผู้คุมใน security rules
  - `qrSessions/{activityId}` เครื่องผู้คุมเขียน nonce ใหม่ทุก 10 วิ พร้อมตำแหน่ง แทน secret ฝั่ง client
- Security rules ตรวจตอนสร้าง `credits/{studentId}`: nonce ใน request ต้องตรงกับ nonce ปัจจุบันหรือก่อนหน้าใน `qrSessions` และต้องมี registration อยู่แล้ว
- จำกัดจำนวนลงทะเบียนด้วย transaction
- Push: Cloudflare Worker เก็บ service account ของ FCM มี endpoint ให้ client เรียกพร้อม Firebase ID token แล้วส่ง FCM ไป topic ต่อกิจกรรมและ topic กิจกรรมใหม่ บน iPhone ต้องเพิ่มแอพลงหน้าจอโฮมก่อน (iOS 16.4 ขึ้นไป)
- รูป: ย่อแล้วเก็บ Firestore (ไม่เกินราว 300 KB ต่อรูป) หรือ Cloudinary unsigned upload
- จุดที่ต้องแก้ในโค้ด: actions ใน `store.ts` แทบทั้งหมด หน้าจออ่านจาก store อยู่แล้วจึงแก้น้อย

## ดีไซน์ในโค้ด

- กฎมุมโค้ง: การ์ดและรูป 22px, input 14px, ปุ่มเป็น pill หรือวงกลมทั้งหมด
- Token สีอยู่บนสุดของ `styles.css` dark mode ใช้ `prefers-color-scheme` หน้าจอ QR ใส่คลาส `force-light` บน `<html>` ชั่วคราว
- ปุ่มกดมี `:active { scale(0.97) }`, hover ครอบด้วย `@media (hover: hover) and (pointer: fine)`
- ใช้ `100dvh`, safe-area inset, `overscroll-behavior: none`, input 16px (กัน iOS ซูม)
- easing: `--ease-out cubic-bezier(.23,1,.32,1)`, `--ease-drawer cubic-bezier(.32,.72,0,1)`
- ไม่ปิด animation ตาม prefers-reduced-motion (ผู้ใช้ขอเอง)

## จุดที่เคยพัง (กันพลาดซ้ำ)

- ชื่อไอคอน Phosphor ต้องลงท้ายด้วย `Icon` เช่น `HouseIcon` และบางชื่อไม่มีจริง (`MapPinSimpleSlashIcon` ไม่มี) Vite 8 build จะ fail ทันที
- zustand v5: selector ต้องคืนค่าเดิมเมื่อ state ไม่เปลี่ยน ห้ามคืน array หรือ object ใหม่ทุกครั้ง ให้ดึง slice ดิบแล้วคำนวณใน `useMemo`
- อย่าใส่ `transform` ใน CSS ให้ element ที่ motion animate `scale` เพราะจะถูกทับ ใช้ property `translate` แทน (เคยทำกรอบสแกนเพี้ยน)
- เขียนไฟล์ที่มีภาษาไทยด้วย heredoc ใน bash เคย parse พัง ให้ใช้เครื่องมือ Write
- กล้องและ `crypto.subtle` ไม่ทำงานบน http ที่ไม่ใช่ localhost
