import { useEffect, useMemo, useRef } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BellIcon, HouseIcon, QrCodeIcon, TicketIcon, UserCircleIcon } from '@phosphor-icons/react'
import { useStore } from './store'
import { useNow } from './lib/hooks'
import { EASE_DRAWER } from './ui/kit'
import { haptic } from './lib/device'
import Welcome from './screens/student/Welcome'
import Home from './screens/student/Home'
import Mine from './screens/student/Mine'
import Inbox from './screens/student/Inbox'
import Me from './screens/student/Me'
import NotifySettings from './screens/student/NotifySettings'
import ActivityDetail from './screens/student/ActivityDetail'
import ChatScreen from './screens/student/Chat'
import DirectMessage from './screens/student/DirectMessage'
import Scan from './screens/student/Scan'
import Claim, { TicketView } from './screens/student/Claim'
import SupLogin from './screens/sup/SupLogin'
import SupHome from './screens/sup/SupHome'
import Editor from './screens/sup/Editor'
import Manage from './screens/sup/Manage'
import Presenter from './screens/sup/Presenter'
import AdminHome, { AdminActivity } from './screens/sup/Admin'

type Mode = 'push' | 'pop' | 'up' | 'down' | 'fade' | 'none'
type Kind = 'root' | 'stack' | 'modal'

const TAB_PATHS = ['/', '/mine', '/inbox', '/me']

function kindOf(path: string): Kind {
  if (TAB_PATHS.includes(path) || path === '/sup' || path === '/sup/admin' || path === '/welcome' || path === '/sup/login') return 'root'
  if (/^\/(scan|claim)/.test(path) || /\/qr$/.test(path)) return 'modal'
  return 'stack'
}

function pickMode(from: string, to: string, pop: boolean): Mode {
  if (from === to) return 'none'
  const fk = kindOf(from)
  const tk = kindOf(to)
  if (fk === 'modal' && tk === 'modal') return 'fade'
  if (pop) return fk === 'modal' ? 'down' : fk === 'stack' ? 'pop' : 'fade'
  if (tk === 'modal') return 'up'
  if (fk === 'modal') return 'down'
  if (tk === 'stack') return to.startsWith(from) || fk === 'root' || from.split('/').length <= to.split('/').length ? 'push' : 'pop'
  if (fk === 'stack') return 'pop'
  return 'fade'
}

const D = { duration: 0.46, ease: EASE_DRAWER }
const variants = {
  initial: (m: Mode) =>
    ({
      push: { transform: 'translateX(100%)', zIndex: 2 },
      pop: { transform: 'translateX(-30%)', zIndex: 1 },
      up: { transform: 'translateY(100%)', zIndex: 3 },
      down: { opacity: 1, zIndex: 1 },
      fade: { opacity: 0, zIndex: 2 },
      none: { opacity: 1 },
    })[m],
  animate: (m: Mode) =>
    ({
      push: { transform: 'translateX(0%)', zIndex: 2, transition: D },
      pop: { transform: 'translateX(0%)', zIndex: 1, transition: D },
      up: { transform: 'translateY(0%)', zIndex: 3, transition: D },
      down: { opacity: 1, zIndex: 1, transition: { duration: 0.01 } },
      fade: { opacity: 1, zIndex: 2, transition: { duration: 0.2, ease: 'easeOut' } },
      none: { opacity: 1, transition: { duration: 0 } },
    })[m],
  exit: (m: Mode) =>
    ({
      push: { transform: 'translateX(-30%)', zIndex: 1, transition: D },
      pop: { transform: 'translateX(100%)', zIndex: 2, transition: D },
      up: { opacity: 0.999, zIndex: 1, transition: D },
      down: { transform: 'translateY(100%)', zIndex: 3, transition: { duration: 0.4, ease: EASE_DRAWER } },
      fade: { opacity: 0, zIndex: 1, transition: { duration: 0.14 } },
      none: { opacity: 0, transition: { duration: 0 } },
    })[m],
}

function TabBar({ hidden }: { hidden: boolean }) {
  const unread = useStore((s) => s.notices.filter((n) => !n.read).length)
  const navigate = useNavigate()
  const tabs = [
    { to: '/', label: 'หน้าแรก', Icon: HouseIcon },
    { to: '/mine', label: 'ของฉัน', Icon: TicketIcon },
    null,
    { to: '/inbox', label: 'แจ้งเตือน', Icon: BellIcon, badge: unread },
    { to: '/me', label: 'โปรไฟล์', Icon: UserCircleIcon },
  ]
  return (
    <nav className="tabbar" data-hidden={hidden} aria-hidden={hidden}>
      {tabs.map((t, i) =>
        t === null ? (
          <button
            key="scan"
            className="tab-scan"
            aria-label="สแกน QR รับชั่วโมง"
            onClick={() => {
              haptic.tap()
              navigate('/scan')
            }}
          >
            <QrCodeIcon size={28} weight="bold" />
          </button>
        ) : (
          <NavLink key={t.to} to={t.to} end replace className="tab" onClick={() => haptic.tap()}>
            {({ isActive }) => (
              <>
                <t.Icon size={26} weight={isActive ? 'fill' : 'regular'} />
                <span>{t.label}</span>
                {!!t.badge && <span className="badge num">{t.badge}</span>}
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}

function Shell() {
  const location = useLocation()
  const navType = useNavigationType()
  const me = useStore((s) => s.me)
  const sup = useStore((s) => s.sup)
  const checkReminders = useStore((s) => s.checkReminders)
  const tick = useNow(15_000)
  useEffect(() => checkReminders(), [tick, checkReminders])
  const prev = useRef(location.pathname)
  const path = location.pathname

  const mode = useMemo(() => pickMode(prev.current, path, navType === 'POP'), [path]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    prev.current = path
  }, [path])

  // remember a scanned link while the student signs up first
  if (!me && path === '/claim' && location.search) sessionStorage.setItem('nuat-pending-claim', location.search)

  let redirect: string | null = null
  if (!me && path !== '/welcome' && !path.startsWith('/sup')) redirect = '/welcome'
  else if (me && path === '/welcome') redirect = '/'
  else if (path.startsWith('/sup') && path !== '/sup/login' && !sup) redirect = '/sup/login'
  else if (sup?.admin && path === '/sup') redirect = '/sup/admin'
  else if (sup && !sup.admin && path.startsWith('/sup/admin')) redirect = '/sup'

  const showTabs = !!me && TAB_PATHS.includes(path)

  if (redirect) return <Navigate to={redirect} replace />

  return (
    <div className={`shell ${path.startsWith('/sup/admin') ? 'wide' : ''}`}>
      <AnimatePresence initial={false} custom={mode}>
        <motion.div
          key={path}
          className="layer"
          custom={mode}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          data-shadow={mode === 'push' || mode === 'pop'}
        >
          <Routes location={location}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/" element={<Home />} />
            <Route path="/mine" element={<Mine />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/me" element={<Me />} />
            <Route path="/settings/notify" element={<NotifySettings />} />
            <Route path="/a/:id" element={<ActivityDetail />} />
            <Route path="/a/:id/chat" element={<ChatScreen role="student" />} />
            <Route path="/a/:id/dm" element={<DirectMessage role="student" />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/ticket/:id" element={<TicketView />} />
            <Route path="/sup/login" element={<SupLogin />} />
            <Route path="/sup" element={<SupHome />} />
            <Route path="/sup/new" element={<Editor />} />
            <Route path="/sup/edit/:id" element={<Editor />} />
            <Route path="/sup/a/:id" element={<Manage />} />
            <Route path="/sup/a/:id/chat" element={<ChatScreen role="sup" />} />
            <Route path="/sup/a/:id/dm/:sid" element={<DirectMessage role="sup" />} />
            <Route path="/sup/a/:id/qr" element={<Presenter />} />
            <Route path="/sup/admin" element={<AdminHome />} />
            <Route path="/sup/admin/a/:id" element={<AdminActivity />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <TabBar hidden={!showTabs} />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
