import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useNav } from '../context/NavContext'
import { StatusBar, HelpyLogo } from '../components/shared'
import { requestLoginOtp } from '../api/auth'

export default function LoginPage() {
  const { navigate } = useNav()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    const value = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await requestLoginOtp(value)
      navigate('verify', { email: value })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send the verification code.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="relative flex flex-col flex-1 overflow-hidden bg-[#d8edff]">
      <img src="/assets/home-wave-background.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-top opacity-65" />
      <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px]" />
      <div className="absolute left-1/2 top-[62px] h-[110px] w-[110px] -translate-x-1/2 rounded-full bg-white/85 blur-2xl" />
      <StatusBar />
      <div className="relative z-10 flex-1 overflow-y-auto px-7 pb-6">
        <div className="pt-14 flex justify-center"><HelpyLogo size="lg" /></div>
        <div className="text-center mt-5 mb-7">
          <h1 className="text-[27px] font-black tracking-tight text-[#10112f]">Welcome back</h1>
          <p className="mt-2 text-[14px] leading-5 text-[#7a8394] font-medium">Sign in to continue and explore services near you.</p>
        </div>

        <div className="space-y-2.5">
          <div className="h-[50px] rounded-[17px] border border-[#d7e7ff] bg-white/90 flex items-center px-4 gap-3 shadow-sm">
            <Mail size={20} className="text-[#7b8396]" />
            <input value={email} onChange={event => setEmail(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-[#8b93a6]" placeholder="Email address" type="email" autoComplete="email" />
          </div>
        </div>
        <p className="mt-3 mb-4 text-[13px] font-semibold leading-5 text-[#68758b]">We’ll send a secure 6-digit verification code to your email.</p>
        {error && <p role="alert" className="mb-3 text-[13px] font-bold text-red-500">{error}</p>}
        <button onClick={submit} disabled={loading} className="w-full h-[52px] rounded-[17px] bg-gradient-to-r from-[#0679ff] to-[#0059d9] text-white text-[16px] font-black shadow-[0_14px_28px_rgba(0,96,222,0.22)] disabled:cursor-wait disabled:opacity-70">{loading ? 'Sending code…' : 'Sign In'}</button>
      </div>
    </div>
  )
}
