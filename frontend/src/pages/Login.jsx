import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { getInitialTheme, applyTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';

// ─── Shared: Google SVG ───────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon({ color }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c4.418 0 8 3.582 8 8 0 3.867-2.742 7.09-6.395 7.827V15.5h2.25l.375-2.5H13.5v-1.5c0-.69.345-1.25 1.375-1.25H16V8.125S15.018 8 13.987 8C11.994 8 10.5 9.344 10.5 11.688V13H8.25v2.5H10.5v4.327C6.742 19.09 4 15.867 4 12c0-4.418 3.582-8 8-8z" />
    </svg>
  );
}

function Spinner({ color = 'white' }) {
  return (
    <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${color} transparent transparent transparent` }} />
  );
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle, light = false }) {
  return (
    <button
      onClick={onToggle}
      className={`btn-theme flex items-center justify-center w-9 h-9 rounded-full ${
        light
          ? 'text-[#9f656f] hover:text-[#ff8d87] hover:bg-[#ff8d87]/10'
          : 'text-[#db9aa4] hover:text-[#ff8d87] hover:bg-[#ff8d87]/10'
      }`}
      title="Toggle theme"
    >
      <span className="material-symbols-outlined text-xl">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}

// ─── Dark layout ──────────────────────────────────────────────────────────────
function DarkLayout({ form, onToggle, skipAnim = false }) {
  const { showPassword, setShowPassword, rememberMe, setRememberMe,
    serverError, register, handleSubmit, errors, isSubmitting, onSubmit } = form;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#24020a' }}>
      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden rounded-[2rem] shadow-[0_20px_40px_rgba(101,0,10,0.4)]">

        {/* Left branding */}
        <section className={`hidden md:flex md:col-span-7 relative flex-col justify-between p-12 ${skipAnim ? '' : 'animate-slide-in-left'}`}
          style={{ backgroundColor: '#350814' }}>
          <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7dkJKLCRz-UlTwTKEj-FNYx-gs1NhJnMOR19KIW1y6isRH-vaCegPBy61ir7_K-sV4prCcVT0Sr01rM2H4ah2Z9Pp5QVjitdNrw_HA7crKsJ9BPw3-pExegBTY6uxctgqLCfXoZuNNatux8jR0g8wg_6ObFuoSfKBQ4NyCe1-8CLELIFzXieqA6y1assencq3P8TUXJDWwncMKe86-zd4j72DyilUBfCRmQBDr8l96VfegFhtdhqBxPbn-y1ygSDOK7I5F0Jft20S"
              alt="" className="w-full h-full object-cover" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl" style={{ color: '#ff8d87', fontVariationSettings: "'FILL' 1" }}>flare</span>
              <span className="text-2xl font-black tracking-tighter uppercase" style={{ color: '#ff8d87' }}>Flare</span>
            </div>
            <ThemeToggle isDark={true} onToggle={onToggle} />
          </div>

          <div className={`relative z-10 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.15s' }}>
            <h1 className="text-6xl lg:text-8xl font-extrabold tracking-tight leading-none" style={{ color: '#ffdde1' }}>
              The <br />
              <span className="text-gradient-dark">Real-Time</span>{' '}<br />
              Experience.
            </h1>
          </div>

          <div className={`relative z-10 ${skipAnim ? '' : 'animate-fade-in'}`} style={skipAnim ? {} : { animationDelay: '0.3s' }}>
            <p className="max-w-sm font-light text-lg leading-relaxed" style={{ color: '#db9aa4' }}>
              Instant messages. Vibrant communities. Discord-style servers — all in one place built for people who love to connect.
            </p>
            <div className="flex gap-4 mt-8">
              <div className="h-1 w-12 rounded-full" style={{ backgroundColor: '#ff8d87' }} />
              <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(219,154,164,0.3)' }} />
              <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(219,154,164,0.3)' }} />
            </div>
          </div>
        </section>

        {/* Right form */}
        <section className={`col-span-1 md:col-span-5 p-8 md:p-16 flex flex-col justify-center ${skipAnim ? '' : 'animate-slide-in-right'}`}
          style={{ backgroundColor: '#2c040f' }}>
          <div className="md:hidden flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl" style={{ color: '#ff8d87', fontVariationSettings: "'FILL' 1" }}>flare</span>
              <span className="text-xl font-black tracking-tighter" style={{ color: '#ff8d87' }}>Flare</span>
            </div>
            <ThemeToggle isDark={true} onToggle={onToggle} />
          </div>

          <div className={`mb-12 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.1s' }}>
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#ffdde1' }}>Log In</h2>
            <p className="text-sm" style={{ color: '#db9aa4' }}>Welcome back. Enter your credentials to continue.</p>
          </div>

          <form className={`space-y-6 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.2s' }} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#9f656f' }}>Email Address</label>
              <div className="relative">
                <input type="email" placeholder="you@flare.app"
                  className="pill-input-dark w-full rounded-full px-6 py-4 border-none font-medium placeholder:opacity-40"
                  style={{ backgroundColor: '#350814', color: '#ffdde1', transition: 'box-shadow 0.2s ease' }}
                  {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 opacity-60" style={{ color: '#db9aa4' }}>alternate_email</span>
              </div>
              {errors.email && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9f656f' }}>Password</label>
                <a className="text-xs font-bold hover:underline cursor-pointer" style={{ color: '#ff8d87' }}>Forgot Password?</a>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  className="pill-input-dark w-full rounded-full px-6 py-4 pr-14 border-none font-medium placeholder:opacity-40"
                  style={{ backgroundColor: '#350814', color: '#ffdde1', transition: 'box-shadow 0.2s ease' }}
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="btn-icon absolute right-5 top-1/2 -translate-y-1/2" style={{ color: '#db9aa4' }}>
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-3 px-4">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded accent-[#ff8d87]" style={{ backgroundColor: '#350814' }} />
              <span className="text-sm" style={{ color: '#db9aa4' }}>Keep me signed in for 30 days</span>
            </div>

            {serverError && <p className="text-sm font-medium text-center" style={{ color: '#ff7351' }}>{serverError}</p>}

            <button type="submit" disabled={isSubmitting}
              className="btn-primary w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a', boxShadow: '0 10px 20px rgba(101,0,10,0.15)' }}>
              {isSubmitting ? <Spinner color="#65000a" /> : <><span>Log In</span><span className="material-symbols-outlined text-sm">arrow_forward</span></>}
            </button>
          </form>

          <div className="mt-12 space-y-8">
            <div className="relative flex items-center">
              <div className="flex-grow border-t" style={{ borderColor: 'rgba(107,57,66,0.3)' }} />
              <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#9f656f' }}>or connect with</span>
              <div className="flex-grow border-t" style={{ borderColor: 'rgba(107,57,66,0.3)' }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="btn-social flex items-center justify-center gap-2 py-3 rounded-full border text-sm font-semibold"
                style={{ backgroundColor: '#350814', borderColor: 'rgba(107,57,66,0.2)', color: '#ffdde1' }}>
                <GoogleIcon />Google
              </button>
              <button className="btn-social flex items-center justify-center gap-2 py-3 rounded-full border text-sm font-semibold"
                style={{ backgroundColor: '#350814', borderColor: 'rgba(107,57,66,0.2)', color: '#ffdde1' }}>
                <AppleIcon color="#ffdde1" />Apple
              </button>
            </div>
            <p className="text-center text-sm" style={{ color: '#db9aa4' }}>
              New to Flare?{' '}
              <Link to="/register" className="font-bold hover:underline ml-1" style={{ color: '#ff8d87' }}>Create an Account</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Light layout ─────────────────────────────────────────────────────────────
function LightLayout({ form, onToggle, skipAnim = false }) {
  const { showPassword, setShowPassword, rememberMe, setRememberMe,
    serverError, register, handleSubmit, errors, isSubmitting, onSubmit } = form;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f6ff' }}>
      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden rounded-[2rem] shadow-[0_20px_40px_rgba(181,8,77,0.12)]">

        {/* Left branding */}
        <section className={`hidden md:flex md:col-span-7 relative flex-col justify-between p-12 ${skipAnim ? '' : 'animate-slide-in-left'}`}
          style={{ backgroundColor: '#ebf1ff' }}>
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7dkJKLCRz-UlTwTKEj-FNYx-gs1NhJnMOR19KIW1y6isRH-vaCegPBy61ir7_K-sV4prCcVT0Sr01rM2H4ah2Z9Pp5QVjitdNrw_HA7crKsJ9BPw3-pExegBTY6uxctgqLCfXoZuNNatux8jR0g8wg_6ObFuoSfKBQ4NyCe1-8CLELIFzXieqA6y1assencq3P8TUXJDWwncMKe86-zd4j72DyilUBfCRmQBDr8l96VfegFhtdhqBxPbn-y1ygSDOK7I5F0Jft20S"
              alt="" className="w-full h-full object-cover grayscale" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl" style={{ color: '#ff8d87', fontVariationSettings: "'FILL' 1" }}>flare</span>
              <span className="text-2xl font-black tracking-tighter uppercase" style={{ color: '#ff8d87' }}>Flare</span>
            </div>
            <ThemeToggle isDark={false} onToggle={onToggle} light />
          </div>

          <div className={`relative z-10 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.15s' }}>
            <h1 className="text-6xl lg:text-8xl font-extrabold tracking-tight leading-none" style={{ color: '#1a2f4d' }}>
              The <br />
              <span className="text-gradient-light">Real-Time</span>{' '}<br />
              Experience.
            </h1>
          </div>

          <div className={`relative z-10 ${skipAnim ? '' : 'animate-fade-in'}`} style={skipAnim ? {} : { animationDelay: '0.3s' }}>
            <p className="max-w-sm font-light text-lg leading-relaxed" style={{ color: '#485c7d' }}>
              Instant messages. Vibrant communities. Discord-style servers — all in one place built for people who love to connect.
            </p>
            <div className="flex gap-4 mt-8">
              <div className="h-1 w-12 rounded-full" style={{ backgroundColor: '#ff8d87' }} />
              <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(153,174,210,0.4)' }} />
              <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(153,174,210,0.4)' }} />
            </div>
          </div>
        </section>

        {/* Right form */}
        <section className={`col-span-1 md:col-span-5 p-8 md:p-16 flex flex-col justify-center ${skipAnim ? '' : 'animate-slide-in-right'}`}
          style={{ backgroundColor: '#ffffff' }}>
          <div className="md:hidden flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl" style={{ color: '#ff8d87', fontVariationSettings: "'FILL' 1" }}>flare</span>
              <span className="text-xl font-black tracking-tighter" style={{ color: '#ff8d87' }}>Flare</span>
            </div>
            <ThemeToggle isDark={false} onToggle={onToggle} light />
          </div>

          <div className={`mb-12 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.1s' }}>
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#1a2f4d' }}>Log In</h2>
            <p className="text-sm" style={{ color: '#485c7d' }}>Welcome back. Enter your credentials to continue.</p>
          </div>

          <form className={`space-y-6 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.2s' }} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#485c7d' }}>Email Address</label>
              <div className="relative">
                <input type="email" placeholder="you@flare.app"
                  className="pill-input-light w-full rounded-full px-6 py-4 border-none font-medium placeholder:opacity-40"
                  style={{ backgroundColor: '#f4f6ff', color: '#1a2f4d', transition: 'box-shadow 0.2s ease' }}
                  {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: '#485c7d' }}>alternate_email</span>
              </div>
              {errors.email && <p className="text-xs ml-4" style={{ color: '#b31b25' }}>{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#485c7d' }}>Password</label>
                <a className="text-xs font-bold hover:underline cursor-pointer" style={{ color: '#ff8d87' }}>Forgot Password?</a>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  className="pill-input-light w-full rounded-full px-6 py-4 pr-14 border-none font-medium placeholder:opacity-40"
                  style={{ backgroundColor: '#f4f6ff', color: '#1a2f4d', transition: 'box-shadow 0.2s ease' }}
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="btn-icon absolute right-5 top-1/2 -translate-y-1/2" style={{ color: '#485c7d' }}>
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-xs ml-4" style={{ color: '#b31b25' }}>{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-3 px-4">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded accent-[#ff8d87]" />
              <span className="text-sm" style={{ color: '#485c7d' }}>Keep me signed in for 30 days</span>
            </div>

            {serverError && <p className="text-sm font-medium text-center" style={{ color: '#b31b25' }}>{serverError}</p>}

            <button type="submit" disabled={isSubmitting}
              className="btn-primary w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a', boxShadow: '0 10px 20px rgba(255,141,135,0.3)' }}>
              {isSubmitting ? <Spinner color="#65000a" /> : <><span>Log In</span><span className="material-symbols-outlined text-sm">arrow_forward</span></>}
            </button>
          </form>

          <div className="mt-12 space-y-8">
            <div className="relative flex items-center">
              <div className="flex-grow border-t" style={{ borderColor: '#dde3f5' }} />
              <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#637899' }}>or connect with</span>
              <div className="flex-grow border-t" style={{ borderColor: '#dde3f5' }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="btn-social flex items-center justify-center gap-2 py-3 rounded-full border text-sm font-semibold hover:bg-[#f4f6ff]"
                style={{ backgroundColor: '#ffffff', borderColor: '#dde3f5', color: '#1a2f4d' }}>
                <GoogleIcon />Google
              </button>
              <button className="btn-social flex items-center justify-center gap-2 py-3 rounded-full border text-sm font-semibold hover:bg-[#f4f6ff]"
                style={{ backgroundColor: '#ffffff', borderColor: '#dde3f5', color: '#1a2f4d' }}>
                <AppleIcon color="#1a2f4d" />Apple
              </button>
            </div>
            <p className="text-center text-sm" style={{ color: '#485c7d' }}>
              Need an account?{' '}
              <Link to="/register" className="font-bold hover:underline ml-1" style={{ color: '#ff8d87' }}>Create one now</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Main Login ───────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuth();
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [reveal, setReveal] = useState(null);
  // After the first theme switch, skip entrance animations forever
  const hasAnimated = useRef(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState('');

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await axios.post('/api/auth/login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      navigate(searchParams.get('redirect') || '/');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const form = { showPassword, setShowPassword, rememberMe, setRememberMe, serverError, register, handleSubmit, errors, isSubmitting, onSubmit };

  const handleToggle = (e) => {
    if (reveal) return;
    setReveal({ x: e.clientX, y: e.clientY });
  };

  const onRevealEnd = () => {
    const next = !isDark;
    applyTheme(next);
    // Mark that initial animations have already played — must be set
    // before the state updates so the next render reads the updated value
    hasAnimated.current = true;
    setIsDark(next);
    setReveal(null);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Current theme */}
      {isDark
        ? <DarkLayout form={form} onToggle={handleToggle} skipAnim={hasAnimated.current} />
        : <LightLayout form={form} onToggle={handleToggle} skipAnim={hasAnimated.current} />
      }

      {/* Reveal overlay — new theme clips in from click point */}
      {reveal && (
        <div
          className="reveal-overlay"
          style={{ '--rx': `${reveal.x}px`, '--ry': `${reveal.y}px` }}
          onAnimationEnd={onRevealEnd}
        >
          {isDark
            ? <LightLayout form={form} onToggle={handleToggle} skipAnim />
            : <DarkLayout form={form} onToggle={handleToggle} skipAnim />
          }
        </div>
      )}
    </div>
  );
}
