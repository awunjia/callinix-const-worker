import './App.css'
import Countdown from './Countdown.jsx'

export default function App() {
  return (
    <div className="page">
      <div className="bg" aria-hidden="true">
        <div className="bg-gradient" />
        <div className="bg-maze" />
        <div className="bg-maze bg-maze--offset" />
      </div>

      <main className="content">
        <img
          src="/callinx-mark.png"
          alt="Callinx"
          className="logo"
          width={120}
          height={120}
        />

        <p className="badge">Coming soon</p>

        <h1 className="title">
          Your AI voice receptionist
        </h1>

        <p className="lead">
          Callinx is your AI voice receptionist - every call gets answered, every
          conversation can become a lead, and customer questions are handled
          without your team picking up the phone.
        </p>

        <ul className="pillars">
          <li>
            <span className="pillar-icon" aria-hidden="true">◆</span>
            Never miss a call
          </li>
          <li>
            <span className="pillar-icon" aria-hidden="true">◆</span>
            Calls into leads
          </li>
          <li>
            <span className="pillar-icon" aria-hidden="true">◆</span>
            Customer queries answered
          </li>
        </ul>

        <Countdown />
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Callinx</span>
        <span className="footer-dot" aria-hidden="true">·</span>
        <span>Secure, fast - built in Finland</span>
      </footer>
    </div>
  )
}
