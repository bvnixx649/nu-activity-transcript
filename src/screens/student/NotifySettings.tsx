import { toast } from 'sonner'
import { useStore } from '../../store'
import type { NotifySettings as Settings } from '../../data/types'
import { Page, Switch, TopBar } from '../../ui/kit'
import { enablePush } from './Inbox'

const ROWS: { key: keyof Omit<Settings, 'enabled'>; title: string; body: string }[] = [
  { key: 'newActivities', title: 'กิจกรรมใหม่ที่เปิดรับ', body: 'เมื่อผู้คุมโพสต์กิจกรรมจิตอาสาหรือกิจกรรมคณะใหม่' },
  { key: 'announcements', title: 'ประกาศจากกิจกรรมที่ลงทะเบียน', body: 'เปลี่ยนเวลา ย้ายจุดนัดพบ หรือสิ่งที่ต้องเตรียม' },
  { key: 'reminders', title: 'เตือนก่อนกิจกรรมเริ่ม', body: 'ล่วงหน้า 1 วัน และอีกครั้ง 1 ชั่วโมงก่อนเริ่ม' },
  { key: 'chat', title: 'ข้อความในห้องแชท', body: 'ปิดไว้เป็นค่าเริ่มต้นเพราะกิจกรรมใหญ่ข้อความเยอะ' },
]

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = window.matchMedia('(display-mode: standalone)').matches

export default function NotifySettings() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const notify = useStore((s) => s.notify)

  return (
    <Page>
      <TopBar title="การแจ้งเตือน" fallback="/inbox" />
      <div className="pad" style={{ paddingBottom: 48 }}>
        <h1 className="t-title">การแจ้งเตือน</h1>

        <div className="card row gap-12 mt-20" style={{ padding: '16px 18px' }}>
          <div className="stack grow">
            <span className="t-h3">รับการแจ้งเตือน</span>
            <span className="t-small">{settings.enabled ? 'ปิดได้ทุกเมื่อด้วยปุ่มนี้ปุ่มเดียว' : 'ตอนนี้ปิดอยู่ทั้งหมด'}</span>
          </div>
          <Switch
            label="รับการแจ้งเตือน"
            checked={settings.enabled}
            onChange={(v) => {
              if (v) enablePush(setSettings)
              else {
                setSettings({ enabled: false })
                toast('ปิดการแจ้งเตือนแล้ว')
              }
            }}
          />
        </div>

        <div className="card stack list mt-16" style={{ padding: '0 18px', opacity: settings.enabled ? 1 : 0.5, transition: 'opacity 200ms ease' }}>
          {ROWS.map((r) => (
            <div key={r.key} className="row gap-12" style={{ padding: '14px 0' }}>
              <div className="stack grow">
                <span className="t-strong">{r.title}</span>
                <span className="t-small">{r.body}</span>
              </div>
              <Switch label={r.title} checked={settings[r.key]} onChange={(v) => setSettings({ [r.key]: v })} />
            </div>
          ))}
        </div>

        {isIOS && !standalone && (
          <p className="t-small mt-16">
            บน iPhone และ iPad ต้องกดปุ่มแชร์ แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" ก่อน ถึงจะรับการแจ้งเตือนบนหน้าจอล็อกได้
          </p>
        )}

        <button
          className="btn btn-soft btn-block mt-24"
          disabled={!settings.enabled}
          onClick={() => {
            toast('จะส่งการแจ้งเตือนทดสอบใน 4 วินาที', { description: 'ลองล็อกหน้าจอดูได้' })
            setTimeout(
              () => notify('new', 'กิจกรรมใหม่จากชมรมอาสาพัฒนา มน.', 'ปลูกป่าต้นน้ำ เขื่อนแควน้อยบำรุงแดน ได้รับ 6 ชั่วโมงจิตอาสา', 'a-tree'),
              4000,
            )
          }}
        >
          ส่งการแจ้งเตือนทดสอบ
        </button>
      </div>
    </Page>
  )
}
