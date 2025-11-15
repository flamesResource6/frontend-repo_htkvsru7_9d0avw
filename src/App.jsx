import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

function Login({ onAuth }) {
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('password')
  const [role, setRole] = useState('user')
  const [mode, setMode] = useState('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, name: role==='user'?'Sample User':'', pharmacy_name: role==='pharmacist'?'Sample Pharmacy':'', license_no: role==='pharmacist'?'LIC123':'' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Signup failed')
        onAuth({ token: data.access_token, role })
      } else {
        const body = new URLSearchParams()
        body.set('username', email)
        body.set('password', password)
        const res = await fetch(`${API_BASE}/auth/login`, { method:'POST', headers: { 'Content-Type':'application/x-www-form-urlencoded' }, body })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Login failed')
        // role is embedded in token; keep previous selection for demo
        onAuth({ token: data.access_token, role })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">PharmaSure</h2>
      <div className="flex gap-2 mb-3">
        <button className={`px-3 py-1 rounded ${mode==='signup'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setMode('signup')}>Sign up</button>
        <button className={`px-3 py-1 rounded ${mode==='login'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setMode('login')}>Log in</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <select className="w-full border rounded px-3 py-2" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="pharmacist">Pharmacist</option>
        </select>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">{loading? 'Please wait...': (mode==='signup'?'Create account':'Log in')}</button>
      </form>
    </div>
  )
}

function Dashboard({ auth, onLogout }) {
  const [hello, setHello] = useState('')
  const [notifications, setNotifications] = useState([])
  const [scanCode, setScanCode] = useState('1234567890')
  const [scanResult, setScanResult] = useState(null)
  const [userMeds, setUserMeds] = useState({items:[], warnings: []})
  const [orderId, setOrderId] = useState(null)

  const headers = { 'Authorization': `Bearer ${auth.token}` }

  useEffect(() => {
    fetch(`${API_BASE}/test`).then(r=>r.json()).then(d=>setHello(JSON.stringify(d)))
  }, [])

  const checkNotifications = async () => {
    const res = await fetch(`${API_BASE}/notifications`, { headers })
    const data = await res.json()
    setNotifications(data.items || [])
  }

  const doScan = async () => {
    const res = await fetch(`${API_BASE}/medicines/scan`, { method:'POST', headers: { ...headers, 'Content-Type':'application/json' }, body: JSON.stringify({ barcode: scanCode }) })
    const data = await res.json()
    setScanResult(data)
  }

  const addMedicine = async () => {
    const med = { user_id: 'me', name: 'Sample Med', dosage: '1 tab', frequency: 'daily', reminders: ['08:00'], expiry_date: new Date(Date.now()+1000*60*60*24*20).toISOString() }
    const res = await fetch(`${API_BASE}/users/me/medicines`, { method:'POST', headers: { ...headers, 'Content-Type':'application/json' }, body: JSON.stringify(med) })
    const data = await res.json()
    await listMeds()
    return data
  }

  const listMeds = async () => {
    const res = await fetch(`${API_BASE}/users/me/medicines?expiry_threshold_days=30`, { headers })
    const data = await res.json()
    setUserMeds(data)
  }

  const uploadPrescription = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/prescriptions`, { method: 'POST', headers, body: form })
    const data = await res.json()
    alert('Uploaded prescription: ' + (data.file_url || ''))
  }

  const createOrder = async () => {
    const body = { items: [{ name:'Item A', qty:1, price:10 }] }
    const res = await fetch(`${API_BASE}/orders`, { method:'POST', headers: { ...headers, 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setOrderId(data.id)
  }

  useEffect(() => { checkNotifications() }, [])

  return (
    <div className="max-w-3xl w-full bg-white p-6 rounded-xl shadow space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Welcome ({auth.role})</h2>
        <button onClick={onLogout} className="text-sm text-red-600">Logout</button>
      </div>
      <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{hello}</pre>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4 space-y-2">
          <h3 className="font-medium">Scan Medicine (demo)</h3>
          <input className="border px-2 py-1 rounded w-full" value={scanCode} onChange={e=>setScanCode(e.target.value)} />
          <button onClick={doScan} className="bg-blue-600 text-white px-3 py-1 rounded">Scan</button>
          <pre className="bg-gray-50 p-2 text-xs rounded overflow-auto">{JSON.stringify(scanResult, null, 2)}</pre>
        </div>

        <div className="border rounded p-4 space-y-2">
          <h3 className="font-medium">My Medicines</h3>
          <div className="flex gap-2">
            <button onClick={addMedicine} className="bg-green-600 text-white px-3 py-1 rounded">Add sample</button>
            <button onClick={listMeds} className="bg-gray-600 text-white px-3 py-1 rounded">Refresh</button>
          </div>
          <pre className="bg-gray-50 p-2 text-xs rounded overflow-auto">{JSON.stringify(userMeds, null, 2)}</pre>
        </div>

        <div className="border rounded p-4 space-y-2">
          <h3 className="font-medium">Prescription Upload</h3>
          <input type="file" onChange={uploadPrescription} />
        </div>

        <div className="border rounded p-4 space-y-2">
          <h3 className="font-medium">Orders</h3>
          <button onClick={createOrder} className="bg-blue-600 text-white px-3 py-1 rounded">Create order</button>
          {orderId && <p className="text-sm">Latest order id: {orderId}</p>}
        </div>

        <div className="border rounded p-4 space-y-2 md:col-span-2">
          <h3 className="font-medium">Notifications</h3>
          <pre className="bg-gray-50 p-2 text-xs rounded overflow-auto">{JSON.stringify(notifications, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [auth, setAuth] = useState(null)

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <Login onAuth={setAuth} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Dashboard auth={auth} onLogout={() => setAuth(null)} />
    </div>
  )
}

export default App
