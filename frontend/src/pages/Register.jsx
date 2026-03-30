import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { getInitialTheme, applyTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';

function Spinner({ color = '#65000a' }) {
  return (
    <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${color} transparent transparent transparent` }} />
  );
}

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`btn-theme flex items-center justify-center w-9 h-9 rounded-full ${
        isDark
          ? 'text-[#db9aa4] hover:text-[#ff8d87] hover:bg-[#ff8d87]/10'
          : 'text-[#9f656f] hover:text-[#ff8d87] hover:bg-[#ff8d87]/10'
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
  const { showPassword, setShowPassword, serverError,
    register, handleSubmit, errors, isSubmitting, onSubmit } = form;

  return (
    <main
      className="relative min-h-screen flex flex-col md:flex-row"
      style={{ backgroundColor: '#24020a' }}
    >
      {/* ── Left branding panel ── */}
      <section className={`hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-between p-12 lg:p-20 relative overflow-hidden ${skipAnim ? '' : 'animate-slide-in-left'}`}
        style={{ backgroundColor: '#350814' }}>

        {/* Background image */}
        <div className="absolute bottom-0 right-0 w-full h-1/2 opacity-20 pointer-events-none">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBz0wdT_kN3awEru8icrAUMQ0AzMAYnSdlhf-R4sUDFVAMKxoyqoUrVuzPZQSsZUINP2hCiQjcOnCo1u_qj1glNY4FJDHpPB20SQzOLANyDhHQ9wo23oaCodfPG1QXFD3rzz3nTTk_ZtQo3iLJW3dL_KqdLLihUIOCB1BsGW2Vbujfr6Z3ydseGBkezIJkdVGaOg7LVAKZTU4tweL6Dk7-bRSgKPVbKWBHK13vCvODsqjpBj6T35Z5Gr7ibew7CntmW48exzcpM"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)' }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: '#65000a', fontVariationSettings: "'FILL' 1" }}>flare</span>
            </div>
            <span className="text-2xl font-black tracking-tighter" style={{ color: '#ff8d87' }}>Flare</span>
          </div>
          <ThemeToggle isDark={true} onToggle={onToggle} />
        </div>

        <div className={`relative z-10 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.15s' }}>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9]" style={{ color: '#ffdde1' }}>
            CHAT. <br /> CONNECT. <br />
            <span className="text-gradient-dark">BELONG.</span>
          </h1>
        </div>

        <div className={`relative z-10 ${skipAnim ? '' : 'animate-fade-in'}`} style={skipAnim ? {} : { animationDelay: '0.3s' }}>
          <p className="text-xl leading-relaxed font-medium max-w-md" style={{ color: '#db9aa4' }}>
            Real-time chats, group threads, and Discord-style servers — all ignited in one place.
          </p>
          <div className="flex gap-4 mt-8">
            <div className="h-1 w-12 rounded-full" style={{ backgroundColor: '#ff8d87' }} />
            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(219,154,164,0.3)' }} />
            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(219,154,164,0.3)' }} />
          </div>
        </div>
      </section>

      {/* ── Right form panel ── */}
      <section className={`flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-24 ${skipAnim ? '' : 'animate-slide-in-right'}`}
        style={{ backgroundColor: '#2c040f' }}>
        <div className="w-full max-w-md">

          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl" style={{ color: '#ff8d87', fontVariationSettings: "'FILL' 1" }}>flare</span>
              <span className="text-xl font-black tracking-tighter" style={{ color: '#ff8d87' }}>Flare</span>
            </div>
            <ThemeToggle isDark={true} onToggle={onToggle} />
          </div>

          <div className={`mb-12 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.1s' }}>
            <h2 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: '#ffdde1' }}>
              Create Account
            </h2>
            <p className="font-medium" style={{ color: '#db9aa4' }}>
              Your next great conversation starts here.
            </p>
          </div>

          <form className={`space-y-6 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.2s' }} onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#9f656f' }}>
                Username
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined" style={{ color: '#9f656f' }}>
                  alternate_email
                </span>
                <input
                  type="text"
                  placeholder="flareuser"
                  className="pill-input-dark w-full rounded-[1rem] pl-14 pr-6 py-4 border-none font-medium placeholder:opacity-40 outline-none"
                  style={{ backgroundColor: '#350814', color: '#ffdde1', transition: 'box-shadow 0.2s ease' }}
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'At least 3 characters' },
                    maxLength: { value: 20, message: 'At most 20 characters' },
                    pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Letters, numbers and underscores only' },
                  })}
                />
              </div>
              {errors.username && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#9f656f' }}>
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined" style={{ color: '#9f656f' }}>
                  mail
                </span>
                <input
                  type="email"
                  placeholder="you@flare.app"
                  className="pill-input-dark w-full rounded-[1rem] pl-14 pr-6 py-4 border-none font-medium placeholder:opacity-40 outline-none"
                  style={{ backgroundColor: '#350814', color: '#ffdde1', transition: 'box-shadow 0.2s ease' }}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                  })}
                />
              </div>
              {errors.email && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#9f656f' }}>
                Password
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined" style={{ color: '#9f656f' }}>
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="pill-input-dark w-full rounded-[1rem] pl-14 pr-14 py-4 border-none font-medium placeholder:opacity-40 outline-none"
                  style={{ backgroundColor: '#350814', color: '#ffdde1', transition: 'box-shadow 0.2s ease' }}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    pattern: { value: /\d/, message: 'Must contain at least one number' },
                  })}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="btn-icon absolute right-5 top-1/2 -translate-y-1/2" style={{ color: '#db9aa4' }}>
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.password.message}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 px-2 pt-2">
              <div className="flex items-center h-5">
                <input type="checkbox" className="w-5 h-5 rounded accent-[#ff8d87]"
                  style={{ backgroundColor: '#350814' }}
                  {...register('terms', { required: 'You must accept the terms to continue' })} />
              </div>
              <p className="text-sm leading-tight" style={{ color: '#db9aa4' }}>
                I agree to the{' '}
                <a href="#" className="font-semibold hover:underline" style={{ color: '#ff8d87' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="font-semibold hover:underline" style={{ color: '#ff8d87' }}>Privacy Policy</a>.
              </p>
            </div>
            {errors.terms && <p className="text-xs ml-4 -mt-4" style={{ color: '#ff7351' }}>{errors.terms.message}</p>}

            {serverError && (
              <p className="text-sm font-medium text-center" style={{ color: '#ff7351' }}>{serverError}</p>
            )}

            <button type="submit" disabled={isSubmitting}
              className="btn-primary w-full py-5 rounded-full font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a', boxShadow: '0 10px 30px rgba(255,141,135,0.3)' }}>
              {isSubmitting ? <Spinner /> : <><span>Join Flare</span><span className="material-symbols-outlined">arrow_forward</span></>}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-12 text-center">
            <p className="font-medium" style={{ color: '#db9aa4' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-bold ml-1 hover:underline inline-flex items-center gap-1 group" style={{ color: '#ff8d87' }}>
                Back to Login
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">login</span>
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-20 flex justify-center gap-8 opacity-20">
            {[{ icon: 'shield_lock', label: 'Security' }, { icon: 'token', label: 'Protocol' }, { icon: 'verified_user', label: 'Encrypted' }].map(({ icon, label }, i) => (
              <div key={label} className="flex items-center gap-8">
                {i > 0 && <div className="w-[1px] h-12" style={{ backgroundColor: 'rgba(219,154,164,0.3)' }} />}
                <div className="flex flex-col items-center" style={{ color: '#db9aa4' }}>
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase mb-2">{label}</span>
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Light layout ─────────────────────────────────────────────────────────────
function LightLayout({ form, onToggle, skipAnim = false }) {
  const { showPassword, setShowPassword, serverError,
    register, handleSubmit, errors, isSubmitting, onSubmit } = form;

  return (
    <main
      className="relative min-h-screen flex flex-col md:flex-row"
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: 'radial-gradient(circle at 2px 2px, #f0f0f0 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* ── Left branding panel ── */}
      <section className={`hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-between p-12 lg:p-20 relative overflow-hidden ${skipAnim ? '' : 'animate-slide-in-left'}`}
        style={{ backgroundColor: '#fafafa' }}>

        {/* Background image */}
        <div className="absolute bottom-0 right-0 w-full h-1/2 opacity-10 pointer-events-none">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBz0wdT_kN3awEru8icrAUMQ0AzMAYnSdlhf-R4sUDFVAMKxoyqoUrVuzPZQSsZUINP2hCiQjcOnCo1u_qj1glNY4FJDHpPB20SQzOLANyDhHQ9wo23oaCodfPG1QXFD3rzz3nTTk_ZtQo3iLJW3dL_KqdLLihUIOCB1BsGW2Vbujfr6Z3ydseGBkezIJkdVGaOg7LVAKZTU4tweL6Dk7-bRSgKPVbKWBHK13vCvODsqjpBj6T35Z5Gr7ibew7CntmW48exzcpM"
            alt=""
            className="w-full h-full object-cover grayscale"
          />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)' }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: '#65000a', fontVariationSettings: "'FILL' 1" }}>flare</span>
            </div>
            <span className="text-2xl font-black tracking-tighter" style={{ color: '#ff8d87' }}>Flare</span>
          </div>
          <ThemeToggle isDark={false} onToggle={onToggle} />
        </div>

        <div className={`relative z-10 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.15s' }}>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-background">
            CHAT. <br /> CONNECT. <br />
            <span className="text-gradient-light">BELONG.</span>
          </h1>
        </div>

        <div className={`relative z-10 ${skipAnim ? '' : 'animate-fade-in'}`} style={skipAnim ? {} : { animationDelay: '0.3s' }}>
          <p className="text-xl leading-relaxed font-medium max-w-md" style={{ color: '#9f656f' }}>
            Real-time chats, group threads, and Discord-style servers — all ignited in one place.
          </p>
          <div className="flex gap-4 mt-8">
            <div className="h-1 w-12 rounded-full" style={{ backgroundColor: '#ff8d87' }} />
            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(153,174,210,0.4)' }} />
            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(153,174,210,0.4)' }} />
          </div>
        </div>
      </section>

      {/* ── Right form panel ── */}
      <section className={`flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-24 ${skipAnim ? '' : 'animate-slide-in-right'}`}>
        <div className="w-full max-w-md">

          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl" style={{ color: '#ff8d87', fontVariationSettings: "'FILL' 1" }}>flare</span>
              <span className="text-xl font-black tracking-tighter" style={{ color: '#ff8d87' }}>Flare</span>
            </div>
            <ThemeToggle isDark={false} onToggle={onToggle} />
          </div>

          <div className={`mb-12 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.1s' }}>
            <h2 className="text-4xl font-extrabold tracking-tight mb-3 text-on-background">
              Create Account
            </h2>
            <p className="font-medium" style={{ color: '#9f656f' }}>
              Your next great conversation starts here.
            </p>
          </div>

          <form className={`space-y-6 ${skipAnim ? '' : 'animate-slide-up'}`} style={skipAnim ? {} : { animationDelay: '0.2s' }} onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface ml-4">
                Username
              </label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-[#ff8d87] transition-colors">
                  alternate_email
                </span>
                <input
                  type="text"
                  placeholder="flareuser"
                  className="w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-[1rem] focus:ring-2 text-on-background placeholder:text-outline/50 transition-all font-medium outline-none"
                  style={{ '--tw-ring-color': 'rgba(255,141,135,0.2)' }}
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'At least 3 characters' },
                    maxLength: { value: 20, message: 'At most 20 characters' },
                    pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Letters, numbers and underscores only' },
                  })}
                />
              </div>
              {errors.username && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface ml-4">
                Email Address
              </label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-[#ff8d87] transition-colors">
                  mail
                </span>
                <input
                  type="email"
                  placeholder="you@flare.app"
                  className="w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-[1rem] focus:ring-2 text-on-background placeholder:text-outline/50 transition-all font-medium outline-none"
                  style={{ '--tw-ring-color': 'rgba(255,141,135,0.2)' }}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                  })}
                />
              </div>
              {errors.email && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface ml-4">
                Password
              </label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-[#ff8d87] transition-colors">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="w-full pl-14 pr-14 py-4 bg-surface-container-low border-none rounded-[1rem] focus:ring-2 text-on-background placeholder:text-outline/50 transition-all font-medium outline-none"
                  style={{ '--tw-ring-color': 'rgba(255,141,135,0.2)' }}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    pattern: { value: /\d/, message: 'Must contain at least one number' },
                  })}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="btn-icon absolute right-5 top-1/2 -translate-y-1/2 text-outline hover:text-[#ff8d87]">
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-xs ml-4" style={{ color: '#ff7351' }}>{errors.password.message}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 px-2 pt-2">
              <div className="flex items-center h-5">
                <input type="checkbox" className="w-5 h-5 rounded border-outline/30 bg-surface-container accent-[#ff8d87]"
                  {...register('terms', { required: 'You must accept the terms to continue' })} />
              </div>
              <p className="text-sm text-outline leading-tight">
                I agree to the{' '}
                <a href="#" className="font-semibold hover:underline" style={{ color: '#ff8d87' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="font-semibold hover:underline" style={{ color: '#ff8d87' }}>Privacy Policy</a>.
              </p>
            </div>
            {errors.terms && <p className="text-xs ml-4 -mt-4" style={{ color: '#ff7351' }}>{errors.terms.message}</p>}

            {serverError && (
              <p className="text-sm font-medium text-center" style={{ color: '#ff7351' }}>{serverError}</p>
            )}

            <button type="submit" disabled={isSubmitting}
              className="btn-primary w-full py-5 rounded-full font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #ff8d87, #ff7670)', color: '#65000a', boxShadow: '0 10px 30px rgba(255,141,135,0.3)' }}>
              {isSubmitting ? <Spinner /> : <><span>Join Flare</span><span className="material-symbols-outlined">arrow_forward</span></>}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-12 text-center">
            <p className="text-outline font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold ml-1 hover:underline inline-flex items-center gap-1 group" style={{ color: '#ff8d87' }}>
                Back to Login
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">login</span>
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-20 flex justify-center gap-8 opacity-20">
            {[{ icon: 'shield_lock', label: 'Security' }, { icon: 'token', label: 'Protocol' }, { icon: 'verified_user', label: 'Encrypted' }].map(({ icon, label }, i) => (
              <div key={label} className="flex items-center gap-8">
                {i > 0 && <div className="w-[1px] h-12 bg-outline-variant" />}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase mb-2">{label}</span>
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Main Register ────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [reveal, setReveal] = useState(null);
  const hasAnimated = useRef(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await axios.post('/api/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      navigate('/');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const form = { showPassword, setShowPassword, serverError, register, handleSubmit, errors, isSubmitting, onSubmit };

  const handleToggle = (e) => {
    if (reveal) return;
    setReveal({ x: e.clientX, y: e.clientY });
  };

  const onRevealEnd = () => {
    const next = !isDark;
    applyTheme(next);
    hasAnimated.current = true;
    setIsDark(next);
    setReveal(null);
  };

  return (
    <div className="relative overflow-hidden">
      {isDark
        ? <DarkLayout form={form} onToggle={handleToggle} skipAnim={hasAnimated.current} />
        : <LightLayout form={form} onToggle={handleToggle} skipAnim={hasAnimated.current} />
      }

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
