import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Bus, Building2, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, Headphones, LogIn, LogOut, Mail, MapPin, Menu, MessageCircle, Navigation, Phone, Plus, Search, ShieldCheck, Sparkles, Star, Ticket, Trash2, UserRound, WalletCards, Wifi, X, Zap } from 'lucide-react';
import bundledBusImage from '../../image/bus.jfif';
import ticketGuzoLogo from '../../image/TicketGuzo.png';
import './styles.css';

function EthiopianPaymentPage(){
  const {id}=useParams();
  const [booking,setBooking]=useState(null);
  const [reference,setReference]=useState('');
  const [loading,setLoading]=useState(true);
  const [processing,setProcessing]=useState(false);
  const [paid,setPaid]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    fetch(`${API}/bookings/${id}`)
      .then(async response=>{
        const data=await response.json();
        if(!response.ok) throw new Error(data.message||'Booking could not be found.');
        setBooking(data);
      })
      .catch(error=>setError(error.message))
      .finally(()=>setLoading(false));
  },[id]);

  const submitPayment=async event=>{
    event.preventDefault();
    setProcessing(true);
    setError('');

    try{
      const response=await fetch(`${API}/payments/chapa/initialize`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          booking_id:id,
          first_name:(booking.passenger_name||'TicketGuzo').split(' ')[0],
          last_name:(booking.passenger_name||'Customer').split(' ').slice(1).join(' ')||'Customer',
          email:booking.email||'customer@example.com',
          phone_number:booking.phone
        })
      });

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.message||
          data.error?.message||
          'Unable to initialize Chapa payment.'
        );
      }

      if(!data.checkout_url){
        throw new Error('Chapa did not return a checkout URL.');
      }

      setReference(data.transaction_ref||'');

      // Save payment information before redirecting to Chapa.
      sessionStorage.setItem('ticketguzo_payment', JSON.stringify({
        booking_id: id,
        tx_ref: data.transaction_ref || ''
      }));

      window.location.href=data.checkout_url;

    }catch(error){
      setError(error.message);
      setProcessing(false);
    }
  };

  if(loading) return <main className="page center"><Loader/></main>;

  if(error&&!booking) return <main className="page center"><div className="error"><X/> {error}</div></main>;

  if(!booking) return null;

  if(paid) return <main className="page paymentPage"><div className="ticketConfirm reveal"><CheckCircle2/><span className="eyebrow">PAYMENT CONFIRMED</span><h1>Your ticket is <em>ready.</em></h1><p>Your Chapa payment was recorded successfully.</p><div className="ticketCard"><div><span>Ticket reference</span><b>{reference}</b></div><div><span>Journey</span><b>{booking.origin} <ArrowRight/> {booking.destination}</b></div><div><span>Passenger</span><b>{booking.passenger_name}</b></div><div><span>Travel date</span><b>{String(booking.travel_date).slice(0,10)}</b></div><div className="receiptTotal"><span>Paid</span><b>{Number(booking.total_amount).toLocaleString()} ETB</b></div></div></div></main>;

  return <main className="page paymentPage"><div className="paymentWrap"><div className="paymentHero reveal"><span className="eyebrow">STEP 2 OF 2 PAYMENT</span><h1>Complete your <em>payment.</em></h1><p>Complete your payment with Chapa to confirm your booking.</p><div className="paymentRoute"><b>{booking.origin}</b><ArrowRight/><b>{booking.destination}</b></div></div><div className="paymentGrid"><form className="paymentForm reveal" onSubmit={submitPayment}><div className="paymentHeading"><div><span className="eyebrow">PAYMENT METHOD</span><h2>Pay securely with Chapa</h2></div><span className="paymentSelected"><Check/> Selected</span></div><div className="chapaOption"><span className="chapaIcon"><CreditCard/></span><span className="chapaDetails"><b>Chapa Pay</b><small>Complete your payment on Chapa's secure checkout.</small></span><Check className="chapaCheck"/></div><div className="paymentNote"><ShieldCheck/><span>You'll be redirected to Chapa to finish paying. Your ticket is confirmed after successful payment.</span></div>{error&&<div className="error"><X/> {error}</div>}<button className="primaryBtn full" disabled={processing}>{processing?'Redirecting to Chapa...':<>Continue to Chapa {Number(booking.total_amount).toLocaleString()} ETB <ArrowRight/></>}</button></form><div className="bookingReceipt reveal"><span className="eyebrow">BOOKING SUMMARY</span><h3>{booking.origin} <em><ArrowRight/></em> {booking.destination}</h3><div className="receiptLine"><span>Passenger</span><b>{booking.passenger_name}</b></div><div className="receiptLine"><span>Coach</span><b>{booking.coach||'Standard Coach'}</b></div><div className="receiptLine"><span>Seats</span><b>{booking.seats}</b></div><div className="receiptLine"><span>Travel date</span><b>{String(booking.travel_date).slice(0,10)}</b></div><div className="receiptTotal"><span>Total due</span><b>{Number(booking.total_amount).toLocaleString()} ETB</b></div></div></div></div></main>;
}
function PaymentSuccessPage(){
  const nav=useNavigate();
  const [status,setStatus]=useState('verifying');
  const [message,setMessage]=useState('Verifying your Chapa payment...');
  const [booking,setBooking]=useState(null);

  useEffect(()=>{
    const url = new URL(window.location.href);

    let bookingId = url.searchParams.get('booking_id');
    let txRef = url.searchParams.get('tx_ref');

    if (!bookingId || !txRef) {
      try {
        const saved = JSON.parse(sessionStorage.getItem('ticketguzo_payment') || 'null');
        if (saved) {
          bookingId = bookingId || saved.booking_id;
          txRef = txRef || saved.tx_ref;
        }
      } catch (e) {
        console.warn('Could not read saved payment information.');
      }
    }

console.log('Payment success URL:', window.location.href);
console.log('Booking ID:', bookingId);
console.log('Transaction Ref:', txRef);

    if(!bookingId||!txRef){
      setStatus('error');
      setMessage('Payment information is missing.');
      return;
    }

    const verifyPayment=async()=>{
      try{
        const response=await fetch(`${API}/payments/chapa/verify`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            booking_id:bookingId,
            tx_ref:txRef
          })
        });

        const data=await response.json();

        if(!response.ok){
          throw new Error(
            data.message||
            'Payment verification failed.'
          );
        }

        const bookingResponse=await fetch(`${API}/bookings/${bookingId}`);
        const bookingData=await bookingResponse.json();

        if(!bookingResponse.ok){
          throw new Error('Payment succeeded but booking details could not be loaded.');
        }

        setBooking(bookingData);
        setStatus('success');
        setMessage('Your Chapa payment was verified successfully.');
      }catch(error){
        setStatus('error');
        setMessage(error.message);
      }
    };

    verifyPayment();
  },[]);

  if(status==='verifying'){
    return <main className="page center"><div className="ticketConfirm reveal"><Loader/><span className="eyebrow">VERIFYING PAYMENT</span><h1>Please wait...</h1><p>{message}</p></div></main>;
  }

  if(status==='error'){
    return <main className="page center"><div className="ticketConfirm reveal"><X/><span className="eyebrow">PAYMENT NOT VERIFIED</span><h1>Payment verification <em>failed.</em></h1><p>{message}</p><button className="primaryBtn" onClick={()=>nav('/')}>Return home</button></div></main>;
  }

  return <main className="page paymentPage"><div className="ticketConfirm reveal"><CheckCircle2/><span className="eyebrow">PAYMENT CONFIRMED</span><h1>Your ticket is <em>ready.</em></h1><p>{message}</p><div className="ticketCard"><div><span>Ticket reference</span><b>{booking?.transaction_ref||'Verified'}</b></div><div><span>Journey</span><b>{booking?.origin} <ArrowRight/> {booking?.destination}</b></div><div><span>Passenger</span><b>{booking?.passenger_name}</b></div><div><span>Coach / seats</span><b>{booking?.coach||'Standard Coach'} / {booking?.seats}</b></div><div><span>Travel date</span><b>{String(booking?.travel_date||'').slice(0,10)}</b></div><div className="receiptTotal"><span>Paid</span><b>{Number(booking?.total_amount||0).toLocaleString()} ETB</b></div></div><button className="primaryBtn" onClick={()=>nav('/')}>Back to home</button></div></main>;
}
function PaymentPageFinal(){const {id}=useParams();const [booking,setBooking]=useState(null);const [method,setMethod]=useState('Chapa Pay');const [ref,setRef]=useState('');const [busy,setBusy]=useState(false);const [paid,setPaid]=useState(false);const [error,setError]=useState('');useEffect(()=>{fetch(`${API}/bookings/${id}`).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message);setBooking(data)}).catch(e=>setError(e.message))},[id]);if(error)return <main className="page center"><div className="error"><X/> {error}</div></main>;if(!booking)return <main className="page center"><Loader/></main>;const methods=['Chapa Pay','Bank Card','Cash at terminal'];const pay=async e=>{e.preventDefault();setBusy(true);setError('');try{const res=await fetch(API+'/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:id,payment_method:method,transaction_ref:ref||`CHAPA-${Date.now()}`})});const data=await res.json();if(!res.ok)throw new Error(data.message);setBooking({...booking,status:'paid',payment_method:method,transaction_ref:ref||`CHAPA-${Date.now()}`});setPaid(true)}catch(e){setError(e.message)}finally{setBusy(false)}};if(paid)return <main className="page paymentPage"><div className="ticketConfirm reveal"><CheckCircle2/><span className="eyebrow">PAYMENT CONFIRMED</span><h1>Your ticket is <em>ready.</em></h1><p>Demo payment completed with {booking.payment_method}. Present this reference at the terminal.</p><div className="ticketCard"><div><span>Ticket reference</span><b>{booking.transaction_ref}</b></div><div><span>Journey</span><b>{booking.origin} â†’ {booking.destination}</b></div><div><span>Passenger</span><b>{booking.passenger_name}</b></div><div><span>Coach / seats</span><b>{booking.coach||'Standard Coach'} / {booking.seats}</b></div><div><span>Travel date</span><b>{String(booking.travel_date).slice(0,10)}</b></div><div className="receiptTotal"><span>Paid</span><b>{Number(booking.total_amount).toLocaleString()} ETB</b></div></div></div></main>;return <main className="page paymentPage"><div className="paymentWrap"><div className="paymentHero reveal"><span className="eyebrow">STEP 2 OF 2</span><h1>Secure your <em>ticket.</em></h1><p>Choose an Ethiopian demo payment method. No real money is moved.</p><div className="paymentRoute"><b>{booking.origin}</b><ArrowRight/><b>{booking.destination}</b></div></div><div className="paymentGrid"><form className="paymentForm reveal" onSubmit={pay}><h2>Choose payment</h2><div className="methodGrid">{methods.map(item=><button type="button" key={item} className={method===item?'method active':'method'} onClick={()=>setMethod(item)}><CreditCard/>{item}<Check className="check"/></button>)}</div><label>{method==='Cash at terminal'?'Terminal payment reference':'Transaction/reference number'}<input value={ref} onChange={e=>setRef(e.target.value)} placeholder="e.g. CHAPA-123456"/></label>{error&&<div className="error"><X/> {error}</div>}<button className="primaryBtn full" disabled={busy}>{busy?'Processing...':<>Pay {Number(booking.total_amount).toLocaleString()} ETB <WalletCards/></>}</button></form><div className="bookingReceipt reveal"><span className="eyebrow">BOOKING SUMMARY</span><h3>{booking.origin} <em>â†’</em> {booking.destination}</h3><div className="receiptLine"><span>Passenger</span><b>{booking.passenger_name}</b></div><div className="receiptLine"><span>Coach</span><b>{booking.coach||'Standard Coach'}</b></div><div className="receiptLine"><span>Seats</span><b>{booking.seats}</b></div><div className="receiptLine"><span>Travel date</span><b>{String(booking.travel_date).slice(0,10)}</b></div><div className="receiptTotal"><span>Total due</span><b>{Number(booking.total_amount).toLocaleString()} ETB</b></div></div></div></div></main>}
function PaymentPageV2(){const {id}=useParams();const nav=useNavigate();const [booking,setBooking]=useState(null);const [method,setMethod]=useState('Chapa Pay');const [ref,setRef]=useState('');const [loading,setLoading]=useState(false);const [msg,setMsg]=useState('');useEffect(()=>{fetch(`${API}/bookings/${id}`).then(r=>r.json()).then(setBooking).catch(()=>{})},[id]);if(!booking)return <main className="page center"><Loader/></main>;const options=['Chapa Pay','Bank Card','Cash at terminal'];const pay=async e=>{e.preventDefault();setLoading(true);try{const res=await fetch(API+'/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:id,payment_method:method,transaction_ref:ref||`CHAPA-${Date.now()}`})});const data=await res.json();if(!res.ok)throw new Error(data.message);setMsg('Payment recorded successfully. Your ticket is confirmed.');setTimeout(()=>nav(`/payment/${id}?success=1`),500)}catch(err){setMsg(err.message)}finally{setLoading(false)}};return <main className="page paymentPage"><div className="paymentWrap"><div className="paymentHero reveal"><span className="eyebrow">STEP 2 OF 2</span><h1>Secure your <em>ticket.</em></h1><p>This is a demo checkout for your final project. No real money is moved.</p><div className="paymentRoute"><b>{booking.origin}</b><ArrowRight/><b>{booking.destination}</b></div></div><div className="paymentGrid"><form className="paymentForm reveal" onSubmit={pay}><h2>Choose payment</h2><div className="methodGrid">{options.map(option=><button type="button" key={option} className={method===option?'method active':'method'} onClick={()=>setMethod(option)}><CreditCard/>{option}<Check className="check"/></button>)}</div><label>{method==='Cash at terminal'?'Terminal payment reference':'Transaction/reference number'}<input value={ref} onChange={e=>setRef(e.target.value)} placeholder="e.g. CHAPA-123456"/></label>{msg&&<div className="success"><CheckCircle2/> {msg}</div>}<button className="primaryBtn full" disabled={loading}>{loading?'Processing...':<>Pay {Number(booking.total_amount).toLocaleString()} ETB <WalletCards/></>}</button></form><div className="bookingReceipt reveal"><span className="eyebrow">BOOKING SUMMARY</span><h3>{booking.origin} <em>â†’</em> {booking.destination}</h3><div className="receiptLine"><span>Passenger</span><b>{booking.passenger_name}</b></div><div className="receiptLine"><span>Coach</span><b>{booking.coach||'Standard Coach'}</b></div><div className="receiptLine"><span>Seats</span><b>{booking.seats}</b></div><div className="receiptLine"><span>Travel date</span><b>{booking.travel_date}</b></div><div className="receiptTotal"><span>Total due</span><b>{Number(booking.total_amount).toLocaleString()} ETB</b></div></div></div></div></main>}
function BookingPageV2Legacy(){const {id}=useParams();const nav=useNavigate();const [route,setRoute]=useState(null);const [form,setForm]=useState({passenger_name:'',phone:'',email:'',travel_date:'',seats:1,coach:''});const [loading,setLoading]=useState(false);const [msg,setMsg]=useState('');useEffect(()=>{fetch(`${API}/routes/${id}`).then(r=>r.json()).then(data=>{setRoute(data);setForm(prev=>({...prev,coach:data.class_type==='VIP'?'VIP Coach':'Standard Coach',travel_date:prev.travel_date||new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}))}).catch(()=>{})},[id]);if(!route)return <main className="page center"><Loader/></main>;const total=Number(route.price)*Number(form.seats);const coaches=route.class_type==='VIP'?['VIP Coach','Deluxe Coach','Executive Coach']:['Standard Coach','City Express','Business Coach'];const submit=async e=>{e.preventDefault();if(!form.passenger_name||!form.phone||!form.travel_date){setMsg('Please complete all required booking details.');return}setLoading(true);setMsg('');try{const res=await fetch(API+'/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,route_id:route.id,total_amount:total})});const data=await res.json();if(!res.ok)throw new Error(data.message);nav(`/payment/${data.id}`)}catch(err){setMsg(err.message)}finally{setLoading(false)}};return <main className="page bookingPage"><div className="bookingLayout"><div className="bookingSummary reveal"><span className="eyebrow">RESERVE YOUR JOURNEY</span><h1>{route.origin} <em>â†’</em> {route.destination}</h1><div className="summaryBus"><img src={BUS_IMG} alt="TicketGuzo bus"/></div><div className="journeyInfo"><span><CalendarDays/> Choose date</span><span><Clock3/> {route.departure_time} â€” {route.arrival_time}</span><span><Bus/> {route.class_type} coach</span></div><div className="priceBig">{Number(route.price).toLocaleString()} <small>ETB / seat</small></div></div><form className="bookingForm reveal" onSubmit={submit}><div className="formHead"><span>STEP 1 OF 2</span><b>Passenger details</b></div><label>Full name<input required value={form.passenger_name} onChange={e=>setForm({...form,passenger_name:e.target.value})} placeholder="Passenger name"/></label><label>Phone number<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="09..."/></label><label>Email (optional)<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><div className="formRow"><label>Travel date<input required type="date" value={form.travel_date} onChange={e=>setForm({...form,travel_date:e.target.value})}/></label><label>Seats<select value={form.seats} onChange={e=>setForm({...form,seats:Number(e.target.value)})}>{[1,2,3,4,5,6].map(num=><option key={num} value={num}>{num}</option>)}</select></label></div><label>Coach / bus<select value={form.coach} onChange={e=>setForm({...form,coach:e.target.value})}>{coaches.map(coach=><option key={coach} value={coach}>{coach}</option>)}</select></label>{msg&&<div className="error"><X/> {msg}</div>}<div className="bookingTotals"><div><span>Coach</span><b>{form.coach}</b></div><div><span>Seats</span><b>{form.seats}</b></div><div><span>Total</span><b>{Number(total).toLocaleString()} ETB</b></div></div><button className="primaryBtn full" disabled={loading}>{loading?'Creating booking...':<>Continue to payment <ArrowRight/></>}</button></form></div></main>}

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const API = API_BASE ? `${API_BASE}/api` : '/api';
const BUS_IMG = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80';
const BUS_IMG_2 = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80';
const BUS_IMG_3 = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
const BUS_IMG_4 = bundledBusImage;
const ADMIN_TOKEN_KEY = 'ticketguzo_admin_token';

function CursorBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    let particles = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2); w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.max(45, Math.floor(w / 14)));
      particles = Array.from({ length: count }, () => ({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25, r:1+Math.random()*2.5, a:.16+Math.random()*.4 }));
    };
    const move = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const tick = () => {
      const lightTheme = document.documentElement.classList.contains('light-theme');
      const particleColor = lightTheme ? '38,53,43' : '150,255,110';
      const particleCoreColor = lightTheme ? '38,53,43' : '220,255,210';
      ctx.clearRect(0,0,w,h);
      for (const p of particles) {
        const dx=p.x-mouse.x, dy=p.y-mouse.y, d=Math.hypot(dx,dy)||1;
        if(d<170){ const f=(170-d)/170; p.vx += dx/d*f*.055; p.vy += dy/d*f*.055; }
        p.vx*=.993; p.vy*=.993; p.x+=p.vx; p.y+=p.vy;
        if(p.x<-20)p.x=w+20; if(p.x>w+20)p.x=-20; if(p.y<-20)p.y=h+20; if(p.y>h+20)p.y=-20;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6); g.addColorStop(0,`rgba(${particleColor},${p.a})`); g.addColorStop(1,`rgba(${particleColor},0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(${particleCoreColor},${p.a})`; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      for(const p of particles){ const d=Math.hypot(p.x-mouse.x,p.y-mouse.y); if(d<180){ctx.strokeStyle=`rgba(${particleColor},${(1-d/180)*(lightTheme ? .24 : .2)})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mouse.x,mouse.y);ctx.stroke();}}
      raf=requestAnimationFrame(tick);
    };
    resize(); window.addEventListener('resize',resize); window.addEventListener('pointermove',move,{passive:true}); tick();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move)};
  },[]);
  return <canvas ref={ref} className="cursorBackground" aria-hidden="true"/>;
}

function useReveal(){
  const loc = useLocation();
  useEffect(()=>{
    const els=[...document.querySelectorAll('.reveal')];
    if(!els.length) return;
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show')}),{threshold:.08});
    els.forEach(e=>io.observe(e));
    const timer=setTimeout(()=>els.filter(e=>e.getBoundingClientRect().top < window.innerHeight).forEach(e=>e.classList.add('show')),80);
    return()=>{clearTimeout(timer);io.disconnect()};
  },[loc.pathname]);
}

function Navbar(){
  const [lightTheme,setLightTheme]=useState(()=>localStorage.getItem("ticketguzo-theme")==="light");

  useEffect(()=>{
    document.documentElement.classList.toggle("light-theme",lightTheme);
    localStorage.setItem("ticketguzo-theme",lightTheme?"light":"dark");
  },[lightTheme]);
  const [menu,setMenu]=useState(false); const loc=useLocation();
  const admin=Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
  useEffect(()=>setMenu(false),[loc.pathname]);
  return <nav className="nav"><Link className="brand" to="/"><img src={lightTheme ? "/logo2.png" : "/TicketGuzo.png"} alt="TicketGuzo" className="brandLogo" /><span className="brandText">TicketGuzo</span></Link>
    <div className={`links ${menu?'open':''}`}>{[['/','Home'],['/routes','Routes'],['/experience','Experience'],['/about','About'],['/partners','Partners'],['/contact','Contact']].map(([p,t])=><Link className={loc.pathname===p?'active':''} key={p} to={p}>{t}</Link>)}{admin&&<Link to="/admin">Admin</Link>}</div>
    <div className="navActions"><button className={`themeToggle ${lightTheme?'is-light':'is-dark'}`} type="button" onClick={()=>setLightTheme(!lightTheme)} aria-pressed={lightTheme} aria-label={lightTheme?"Switch to dark theme":"Switch to light theme"} title={lightTheme?"Dark mode":"Light mode"}><span className="themeIcon">{lightTheme?"☀":"☾"}</span><span className="themeLabel">{lightTheme?"Light":"Dark"}</span></button><Link className="adminLogin" to={admin?'/admin':'/admin/login'}>{admin?<LogIn/>:<ShieldCheck/>}{admin?'Dashboard':'Admin Login'}</Link><Link className="bookTop" to="/routes">Book a Trip <ArrowRight size={16}/></Link></div>
    <button className="hamb" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
  </nav>;
}

function Footer(){return <footer><div className="footerTop"><div><Link className="brand" to="/"><img src="/TicketGuzo.png" alt="TicketGuzo" className="brandLogo footerLogo" /><span className="brandText">TicketGuzo</span></Link><p>Modern intercity travel, designed for Ethiopia.</p></div><div><b>Explore</b><div className="footerLinks"><Link to="/routes">Routes</Link><Link to="/experience">Experience</Link><Link to="/about">About</Link></div></div><div><b>Support</b><div className="footerLinks"><Link to="/contact">Contact</Link><Link to="/admin/login">Admin</Link></div></div></div><div className="footerBottom"><span>Â© 2026 TicketGuzo. All rights reserved.</span><span>Travel smarter. Travel together.</span></div></footer>}

function App(){
  const [booting,setBooting]=useState(true);
  useEffect(()=>{
    const timer=window.setTimeout(()=>setBooting(false),2500);
    return ()=>window.clearTimeout(timer);
  },[]);
  return booting?<LoadingScreen/>:<MainApp/>;
}
function LoadingScreen(){
  return <main className="bootScreen" role="status" aria-label="Loading TicketGuzo">
    <div className="bootContent">
      <img className="bootLogo" src={ticketGuzoLogo} alt="" />
      <h1 className="bootTitle">TICKET GUZO</h1>
      <p>Your journey starts here</p>
      <div className="bootProgress" aria-hidden="true"><span/></div>
      <span className="bootStatus">GETTING YOUR JOURNEY READY</span>
    </div>
  </main>;
}
function MainApp(){useReveal();return <><CursorBackground/><Navbar/><PageRouter/><Footer/></>}
function PageRouter(){
  return (
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/routes" element={<RoutesPage/>}/>
      <Route path="/booking/:id" element={<BookingPageV2/>}/>
      <Route path="/payment/:id" element={<EthiopianPaymentPage/>}/>
      <Route path="/payment-success" element={<PaymentSuccessPage/>}/>
      <Route path="/experience" element={<ExperiencePage/>}/>
      <Route path="/about" element={<AboutPage/>}/>
      <Route path="/partners" element={<PartnersPage/>}/>
      <Route path="/contact" element={<ContactPage/>}/>
      <Route path="/admin/login" element={<AdminLogin/>}/>
      <Route path="/admin" element={<AdminPage/>}/>
      <Route path="*" element={<Home/>}/>
    </Routes>
  );
}

function Hero(){return <section className="hero"><div className="heroText reveal"><div className="pill"><span/> PREMIUM ETHIOPIAN TRANSPORT</div><h1>Move farther.<br/><em>Arrive better.</em></h1><p>TicketGuzo brings premium intercity bus travel, simple reservations and secure digital payments into one beautiful experience.</p><div className="heroBtns"><Link to="/routes" className="primaryBtn">Book Your Journey <ArrowRight/></Link><Link to="/experience" className="ghostBtn">Explore Experience</Link></div><div className="stats"><div><b>12+</b><span>Connected cities</span></div><div><b>45</b><span>Seats / coach</span></div><div><b>24/7</b><span>Support</span></div><div><b>100%</b><span>Digital booking</span></div></div></div><div className="heroVisual reveal"><div className="glow"/><div className="floatTag tag1"><ShieldCheck/> Safety checked</div><div className="floatTag tag2"><Wifi/> Wi-Fi + USB</div><div className="busImageCard"><img src={BUS_IMG} alt="Ethiopian intercity bus"/><div className="imageOverlay"><div><span>FEATURED COACH</span><b>Premium intercity service</b></div><span className="live"><i/> LIVE</span></div></div><div className="orbit orbit1"/><div className="orbit orbit2"/></div></section>}

function SearchBox(){const [routes,setRoutes]=useState([]),[from,setFrom]=useState(''),[to,setTo]=useState(''),[date,setDate]=useState(''),[passengers,setPassengers]=useState(1);const nav=useNavigate();useEffect(()=>{fetch(API+'/routes').then(r=>r.json()).then(data=>setRoutes(Array.isArray(data)?data:[])).catch(()=>setRoutes([]))},[]);const cities=useMemo(()=>[...new Set(routes.flatMap(r=>[r.origin,r.destination]))],[routes]);const go=()=>nav('/routes?'+new URLSearchParams({origin:from,destination:to,date,passengers}));return <section className="searchBox reveal"><div className="searchHead"><div><small>PLAN YOUR JOURNEY</small><h2>Where will you go?</h2></div><div className="secure"><ShieldCheck/> Secure booking</div></div><div className="searchGrid"><label><MapPin/>From<select value={from} onChange={e=>setFrom(e.target.value)}><option value="">Any city</option>{cities.map(x=><option key={x}>{x}</option>)}</select></label><label><Navigation/>To<select value={to} onChange={e=>setTo(e.target.value)}><option value="">Any destination</option>{cities.map(x=><option key={x}>{x}</option>)}</select></label><label><CalendarDays/>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label><UserRound/>Passengers<select value={passengers} onChange={e=>setPassengers(e.target.value)}>{[1,2,3,4,5,6].map(x=><option key={x}>{x}</option>)}</select></label><button onClick={go}><Search/>Search</button></div></section>}

function Home(){const [routes,setRoutes]=useState([]);useEffect(()=>{fetch(API+'/routes').then(r=>r.json()).then(data=>setRoutes(Array.isArray(data)?data:[])).catch(()=>setRoutes([]))},[]);return <><Hero/><SearchBox/><section className="section"><div className="sectionTop"><div><span className="eyebrow">OUR NETWORK</span><h2>Popular <em>Routes</em></h2></div><Link className="textBtn" to="/routes">View all routes <ArrowRight/></Link></div><div className="routeGrid">{routes.slice(0,6).map(r=><RouteCard key={r.id} r={r}/>)}</div></section><section className="featureBand reveal"><div><span className="eyebrow">THE TICKETGUZO DIFFERENCE</span><h2>A premium trip starts<br/><em>before you board.</em></h2><p>From discovery to arrival, TicketGuzo makes intercity travel clearer, faster and more comfortable.</p><Link className="primaryBtn" to="/experience">Explore the experience <ArrowRight/></Link></div><div className="featurePhoto"><img src={BUS_IMG_2} alt="Bus on an Ethiopian road"/><div className="photoBadge"><Star/> Premium coach experience</div></div></section><section className="process"><span className="eyebrow">SIMPLE PROCESS</span><h2>Book. Pay. <em>Go.</em></h2><div className="processGrid"><Step n="01" icon={<Search/>} title="Search routes" text="Choose your city pair and travel date."/><Step n="02" icon={<Ticket/>} title="Reserve a seat" text="Enter passenger details and choose your seats."/><Step n="03" icon={<WalletCards/>} title="Pay securely" text="Use a demo payment method and receive your ticket."/></div></section></>}
function Step({n,icon,title,text}){return <div className="step reveal"><span>{n}</span><div className="stepIcon">{icon}</div><b>{title}</b><p>{text}</p></div>}

function RouteCard({r}){return <article className="routeCard"><div className="routeTop"><span className={r.class_type==='VIP'?'vip':'standard'}>{r.class_type}</span><span>{r.frequency}</span></div><div className="routeCities"><div><b>{r.origin}</b><span>{r.departure_time}</span></div><div className="routeLine"><span/><i/><span/></div><div className="right"><b>{r.destination}</b><span>{r.arrival_time}</span></div></div><div className="routeMeta"><span><Clock3/> {r.duration}</span><span><Bus/> {r.seats_total} seats</span></div><div className="routeBottom"><strong>{Number(r.price).toLocaleString()} <small>ETB</small></strong><Link to={`/booking/${r.id}`}><Ticket/> Book seat</Link></div></article>}

function PageHero({title,sub}){return <section className="pageHero"><span className="eyebrow">TICKETGUZO NETWORK</span><h1>{title}</h1><p>{sub}</p></section>}
function RoutesPage(){const [routes,setRoutes]=useState([]),[filter,setFilter]=useState('All');const loc=useLocation();const params=new URLSearchParams(loc.search);useEffect(()=>{fetch(API+'/routes').then(r=>r.json()).then(data=>setRoutes(Array.isArray(data)?data:[])).catch(()=>setRoutes([]))},[]);const shown=routes.filter(r=>(!params.get('origin')||!r.origin.localeCompare(params.get('origin')))&&(!params.get('destination')||!r.destination.localeCompare(params.get('destination')))&&(filter==='All'||r.class_type===filter));return <main className="page"><PageHero title="Explore our routes" sub="Comfortable connections between Ethiopia's major cities, with clear prices and simple booking."/><SearchBox/><div className="routeToolbar"><div><span className="eyebrow">NETWORK</span><h2>{shown.length} routes <em>available</em></h2></div><div className="filters">{['All','VIP','Standard'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div></div><div className="routeGrid wide">{shown.map(r=><RouteCard key={r.id} r={r}/>)}</div></main>}

function BookingPageV2(){const {id}=useParams();const nav=useNavigate();const [route,setRoute]=useState(null);const [selectedSeats,setSelectedSeats]=useState([]);const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');const [form,setForm]=useState({passenger_name:'',phone:'',email:'',id_no:'',emergency:'',travel_date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)});useEffect(()=>{fetch(`${API}/routes/${id}`).then(r=>r.json()).then(data=>{setRoute(data);setForm(prev=>({...prev,travel_date:prev.travel_date||new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}));}).catch(()=>setMessage('Could not load route details.'))},[id]);if(!route)return <main className="page center"><Loader/></main>;const seatNumbers=Array.from({length:36},(_,i)=>i+1);const occupiedSeats=[3,7,8,14,19,22,25,31,33];const pricePerSeat=Number(route.price)||0;const subtotal=selectedSeats.length*pricePerSeat;const serviceFee=selectedSeats.length?25:0;const tax=Math.round(subtotal*0.15);const total=subtotal+serviceFee+tax;const toggleSeat=seat=>{setSelectedSeats(prev=>{const exists=prev.includes(seat);if(exists)return prev.filter(s=>s!==seat);if(prev.length>=6){window.alert('Maximum 6 seats allowed per booking transaction.');return prev;}return [...prev,seat].sort((a,b)=>a-b);});};const updateField=(key,value)=>setForm(prev=>({...prev,[key]:value}));const submitBooking=async e=>{e.preventDefault();if(!selectedSeats.length){setMessage('Please select at least one seat before continuing.');return;}if(!form.passenger_name||!form.phone||!form.travel_date){setMessage('Please complete the passenger details before continuing.');return;}const email=form.email.trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setMessage('Please enter a valid email address.');return;}setLoading(true);setMessage('');try{const body={route_id:Number(route.id),passenger_name:form.passenger_name,phone:form.phone,email,id_no:form.id_no,emergency:form.emergency,travel_date:form.travel_date,seats:selectedSeats.length,total_amount:total,coach:route.class_type==='VIP'?'VIP Coach':'Standard Coach'};const res=await fetch(API+'/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.message||'Booking creation failed');nav(`/payment/${data.id}`);}catch(err){setMessage(err.message||'Something went wrong while creating your booking.');}finally{setLoading(false);}};return <main className="page bookingPageShell"><section className="bookingMockup"><header className="bookingTopbar"><div><span className="eyebrow">TICKETGUZO ? BOOKING</span><h1>{route.origin} <span>?</span> {route.destination}</h1></div><div className="bookingStatus"><span className="statusDot"/><span>Secure checkout</span></div></header><div className="bookingProgress"><div className="progressItem active"><span>01</span> Select seats</div><div className="progressItem"><span>02</span> Travel details</div><div className="progressItem"><span>03</span> Payment</div></div><div className="bookingBody"><div className="bookingMain"><div className="panelCard"><div className="panelHeader"><div><span className="eyebrow">COACH LAYOUT</span><h2>Choose your seats</h2></div><div className="seatLegend"><span><i className="legend available"/>Available</span><span><i className="legend selected"/>Selected</span><span><i className="legend occupied"/>Booked</span></div></div><div className="busDeck"><div className="busCabin"><span>Driver</span></div><div className="seatGrid">{seatNumbers.map(seat=>{const occupied=occupiedSeats.includes(seat);const selected=selectedSeats.includes(seat);return <button type="button" key={seat} className={`seatButton ${selected?'selected':''} ${occupied?'occupied':''}`} disabled={occupied} onClick={()=>toggleSeat(seat)} aria-label={`Seat ${seat}`}>{seat}</button>;})}</div></div></div><form className="panelCard travelerCard" onSubmit={submitBooking}><div className="panelHeader"><div><span className="eyebrow">PASSENGER</span><h2>Traveler details</h2></div><span className="chip">{selectedSeats.length} seat{selectedSeats.length===1?'':'s'}</span></div><div className="inputRow"><label><input required aria-label="Full name" value={form.passenger_name} onChange={e=>updateField('passenger_name',e.target.value.replace(/[^\p{L}\p{M}\s'-]/gu,''))} autoComplete="name" maxLength={80} placeholder="Full name (letters only)"/></label><label><input required aria-label="Phone number" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={15} autoComplete="tel" value={form.phone} onChange={e=>updateField('phone',e.target.value.replace(/\D/g,''))} placeholder="Phone number (digits only)"/></label></div><div className="inputRow"><label><input aria-label="Email address" type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={e=>updateField('email',e.target.value.replace(/\s/g,''))} placeholder="Email address (you@example.com)"/></label><label><span>Travel date</span><input type="date" value={form.travel_date} onChange={e=>updateField('travel_date',e.target.value)}/></label></div><div className="inputRow full"><label><span>ID / Passport</span><input value={form.id_no} onChange={e=>updateField('id_no',e.target.value)} placeholder="Optional"/></label></div><div className="inputRow full"><label><span>Emergency contact</span><input value={form.emergency} onChange={e=>updateField('emergency',e.target.value)} placeholder="Name and phone number"/></label></div>{message&&<div className="bookingMessage">{message}</div>}</form></div><aside className="bookingSidebar"><div className="summaryCard"><div className="summaryHeader"><span className="eyebrow">SUMMARY</span><h3>Trip overview</h3></div><div className="summaryRoute"><div><small>From</small><b>{route.origin}</b></div><div className="routeArrow">?</div><div><small>To</small><b>{route.destination}</b></div></div><div className="summaryLine"><span>Departure</span><b>{route.departure_time}</b></div><div className="summaryLine"><span>Arrival</span><b>{route.arrival_time}</b></div><div className="summaryLine"><span>Coach</span><b>{route.class_type}</b></div><div className="summaryLine"><span>Seats</span><b>{selectedSeats.length ? selectedSeats.join(', ') : 'No seats selected'}</b></div><div className="divider"/><div className="priceRow"><span>Base Fare</span><b>{Number(subtotal).toLocaleString()} ETB</b></div><div className="priceRow"><span>Service fee</span><b>{Number(serviceFee).toLocaleString()} ETB</b></div><div className="priceRow"><span>Tax</span><b>{Number(tax).toLocaleString()} ETB</b></div><div className="priceTotal"><span>Total</span><strong>{Number(total).toLocaleString()} ETB</strong></div></div><div className="checkoutCard"><div className="checkoutRow"><span>Payment</span><b>Secure demo</b></div><div className="checkoutRow"><span>Refund policy</span><b>Flexible</b></div><button type="submit" className="primaryBtn full" onClick={submitBooking} disabled={loading}>{loading?'Processing...':'Continue to payment'}</button></div></aside></div></section></main>;}

function PaymentPage(){const {id}=useParams();const nav=useNavigate();const [booking,setBooking]=useState(null);const [method,setMethod]=useState('Chapa Pay');const [ref,setRef]=useState('');const [loading,setLoading]=useState(false);const [msg,setMsg]=useState('');useEffect(()=>{fetch(`${API}/bookings/${id}`).then(r=>r.json()).then(setBooking).catch(()=>{})},[id]);if(!booking)return <main className="page center"><Loader/></main>;const pay=async e=>{e.preventDefault();setLoading(true);try{const res=await fetch(API+'/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:id,payment_method:method,transaction_ref:ref||`CHAPA-${Date.now()}`})});const data=await res.json();if(!res.ok)throw new Error(data.message);setMsg('Payment recorded successfully. Your ticket is confirmed.');setTimeout(()=>nav(`/payment/${id}?success=1`),500)}catch(err){setMsg(err.message)}finally{setLoading(false)}};return <main className="page paymentPage"><div className="paymentWrap"><div className="paymentHero reveal"><span className="eyebrow">STEP 2 OF 2</span><h1>Secure your <em>ticket.</em></h1><p>This is a demo checkout for your final project. No real money is moved.</p><div className="paymentRoute"><b>{booking.origin}</b><ArrowRight/><b>{booking.destination}</b></div></div><div className="paymentGrid"><form className="paymentForm reveal" onSubmit={pay}><h2>Choose payment</h2><div className="methodGrid">{['Chapa Pay','Bank Card','Cash at terminal'].map(x=><button type="button" key={x} className={method===x?'method active':'method'} onClick={()=>setMethod(x)}><CreditCard/>{x}<Check className="check"/></button>)}</div><label>Transaction/reference number (optional)<input value={ref} onChange={e=>setRef(e.target.value)} placeholder="e.g. CHAPA-123456"/></label>{msg&&<div className="success"><CheckCircle2/> {msg}</div>}<button className="primaryBtn full" disabled={loading}>{loading?'Processing...':<>Pay {Number(booking.total_amount).toLocaleString()} ETB <WalletCards/></>}</button></form><aside className="ticketPreview reveal"><span className="eyebrow">BOOKING SUMMARY</span><div className="ticketShape"><div className="ticketLogo"><Bus/> TICKETGUZO</div><h3>{booking.origin} <span>â†’</span> {booking.destination}</h3><div className="ticketDetails"><span>Passenger<strong>{booking.passenger_name}</strong></span><span>Date<strong>{booking.travel_date}</strong></span><span>Seats<strong>{booking.seats}</strong></span><span>Class<strong>{booking.class_type}</strong></span></div><div className="ticketPrice"><span>Total</span><strong>{Number(booking.total_amount).toLocaleString()} ETB</strong></div><div className="ticketCode">CHAPA-{String(booking.id).padStart(6,'0')}</div></div></aside></div></div></main>}

function ExperiencePage(){return <main className="page"><PageHero title="Travel in a better class" sub="A coach experience built around comfort, safety and convenience."/><section className="experienceFull"><div className="experienceImage reveal"><img src={bundledBusImage} alt="Intercity bus"/></div><div className="reveal"><span className="eyebrow">PREMIUM EXPERIENCE</span><h2>Every kilometer should feel <em>worth it.</em></h2><p className="lead">TicketGuzo combines reliable schedules with practical features that make long-distance travel easier.</p><div className="featureGrid"><Feature icon={<ShieldCheck/>} title="Safety" text="Driver-focused safety and journey information."/><Feature icon={<Wifi/>} title="Connectivity" text="Wi-Fi and USB-friendly travel."/><Feature icon={<Zap/>} title="Simple booking" text="Search, reserve and pay in minutes."/><Feature icon={<Headphones/>} title="Support" text="Help when you need it."/></div></div></section></main>}
function Feature({icon,title,text}){return <div className="feature">{icon}<div><b>{title}</b><span>{text}</span></div></div>}
function AboutPage(){return <main className="page"><PageHero title="Built for Ethiopian journeys" sub="TicketGuzo is a project concept for modern, accessible intercity transportation."/><section className="aboutFull"><div className="reveal"><span className="eyebrow">OUR STORY</span><h2>Transport should be <em>simple.</em></h2><p>We designed TicketGuzo around a straightforward idea: passengers should be able to discover routes, understand prices, reserve seats and manage payment without confusion.</p><div className="values"><div><ShieldCheck/> Safety first</div><div><Star/> Better comfort</div><div><Sparkles/> Modern technology</div><div><MessageCircle/> Human support</div></div></div><div className="storyCard reveal"><img src={BUS_IMG_4} alt="Ethiopian bus"/><div><b>From Addis to the regions</b><span>A digital-first concept for intercity travel across Ethiopia.</span></div></div></section><section className="timeline"><div className="reveal"><span>01</span><b>Discover</b><p>Compare routes, times and fares.</p></div><div className="reveal"><span>02</span><b>Reserve</b><p>Enter passenger details and seats.</p></div><div className="reveal"><span>03</span><b>Travel</b><p>Arrive prepared with your digital booking.</p></div></section></main>}
function PartnersPage(){return <main className="page"><PageHero title="Build with TicketGuzo" sub="Partnership opportunities for transport operators, terminals, companies and technology providers."/><section className="partnerIntro"><div className="reveal"><span className="eyebrow">PARTNER PROGRAM</span><h2>Connect the <em>journey.</em></h2><p>TicketGuzo can provide a shared digital layer for routes, reservations and passenger support.</p><Link className="primaryBtn" to="/contact">Become a partner <ArrowRight/></Link></div><div className="partnerCards"><Partner icon={<Bus/>} title="Fleet partners" text="Bring your intercity fleet into a modern booking experience."/><Partner icon={<MapPin/>} title="Terminal partners" text="Coordinate passenger flow and departure information."/><Partner icon={<Building2/>} title="Corporate travel" text="Simplify recurring travel for organizations."/><Partner icon={<Zap/>} title="Technology" text="Integrate services around transport and payments."/></div></section></main>}
function Partner({icon,title,text}){return <div className="reveal">{icon}<b>{title}</b><span>{text}</span></div>}
function ContactPage(){
  const [form,setForm]=useState({name:'',email:'',message:''}),[msg,setMsg]=useState('');
  const submit=async e=>{e.preventDefault();const r=await fetch(API+'/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();setMsg(d.message);if(r.ok)setForm({name:'',email:'',message:''})};
  return <main className="page"><PageHero title="We're here to help" sub="Questions about routes, bookings or partnerships? Send us a message."/><section className="contactFull">
    <div className="contactInfo reveal">
      <span className="eyebrow">TICKETGUZO SUPPORT</span>
      <h2>Let’s make your next journey <em>easier.</em></h2>
      <p>Get in touch about routes, bookings, or partnership opportunities. We’d be glad to hear from you.</p>
      <div className="contactDetails">
        <div className="contactItem"><span className="contactItemIcon"><Phone/></span><div><small>CALL US</small><b>+251 900 000 000</b></div></div>
        <div className="contactItem"><span className="contactItemIcon"><Mail/></span><div><small>EMAIL</small><b>hello@ticketguzo.demo</b></div></div>
        <div className="contactItem"><span className="contactItemIcon"><MapPin/></span><div><small>OUR LOCATION</small><b>Addis Ababa, Ethiopia</b></div></div>
      </div>
      <div className="contactInfoNote"><ShieldCheck/><span>Contact requests are available to the TicketGuzo team through the admin dashboard.</span></div>
    </div>
    <form className="contactForm reveal" onSubmit={submit}>
      <div className="contactFormHeading"><span className="contactFormIcon"><MessageCircle/></span><div><span className="eyebrow">SEND A MESSAGE</span><h3>How can we help?</h3><p>Fill in the form and tell us what you need.</p></div></div>
      <label htmlFor="contact-name">Your name<input id="contact-name" required autoComplete="name" placeholder="e.g. Hana Alemu" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label htmlFor="contact-email">Email address<input id="contact-email" required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label htmlFor="contact-message">Your message<textarea id="contact-message" required rows="5" placeholder="Tell us how we can help..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label>
      {msg&&<div className="contactFeedback"><CheckCircle2/><span>{msg}</span></div>}
      <button className="primaryBtn">Send message <ArrowRight/></button>
      <small className="contactPrivacy"><ShieldCheck/> Please don’t include payment card details in your message.</small>
    </form>
  </section></main>
}

function AdminLogin(){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const nav=useNavigate();
  const login=async e=>{
    e.preventDefault(); setError(''); setLoading(true);
    try{
      const r=await fetch(API+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||'Incorrect username or password');
      localStorage.setItem(ADMIN_TOKEN_KEY,d.token); nav('/admin');
    }catch(err){setError(err.message||'Could not connect to the server.');}
    finally{setLoading(false)}
  };
  return <main className="page adminLoginPage">
    <div className="adminLoginShell">
      <div className="adminLoginGlow"/>
      <div className="adminCard adminCardVisible">
        <div className="adminIcon"><ShieldCheck/></div>
        <span className="eyebrow">TICKETGUZO CONTROL CENTER</span>
        <h1>Admin <em>Login</em></h1>
        <p>Secure access to bookings, passengers, routes, payments and customer messages.</p>
        <form onSubmit={login}>
          <label>Admin username<input autoFocus type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter admin username"/></label>
          <label>Admin password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter admin password"/></label>
          {error&&<div className="error"><X/> {error}</div>}
          <button disabled={loading} className="primaryBtn full">{loading?<><Loader/> Checking...</>:<><LogIn/> Enter dashboard</>}</button>
        </form>
        <div className="adminLoginFeatures"><span><ShieldCheck/> Protected</span><span><Ticket/> Booking control</span><span><Bus/> Route management</span></div>
      </div>
    </div>
  </main>
}

function AdminPage(){
  const [data,setData]=useState(null),[tab,setTab]=useState('overview'),[msg,setMsg]=useState(''),[error,setError]=useState('');
  const [replyDrafts,setReplyDrafts]=useState({});
  const [replySent,setReplySent]=useState({});
  const nav=useNavigate(); const token=localStorage.getItem(ADMIN_TOKEN_KEY);
  const load=async()=>{
    try{
      const r=await fetch(API+'/admin/dashboard',{headers:{Authorization:`Bearer ${token}`}});
      if(r.status===401){localStorage.removeItem(ADMIN_TOKEN_KEY);nav('/admin/login');return;}
      const d=await r.json(); if(!r.ok) throw new Error(d.message||'Dashboard failed');
      setData(d); setError('');
    }catch(e){setError(e.message||'Could not load dashboard');}
  };
  useEffect(()=>{load()},[]);
  const logout=async()=>{try{await fetch(API+'/admin/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}})}catch{} localStorage.removeItem(ADMIN_TOKEN_KEY);nav('/admin/login')};
  const update=async(id,status)=>{try{const r=await fetch(`${API}/admin/bookings/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({status})});if(!r.ok)throw new Error('Could not update booking');setMsg('Booking status updated');await load();setTimeout(()=>setMsg(''),2200)}catch(e){setError(e.message)}};
  const addRoute=async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const body=Object.fromEntries(f.entries());body.price=Number(body.price);body.seats_total=Number(body.seats_total||45);try{const r=await fetch(API+'/admin/routes',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.message||'Could not add route');setMsg('Route added successfully');form.reset();await load();setTimeout(()=>setMsg(''),2200)}catch(e){setError(e.message)}};
  const deleteRoute=async id=>{if(!confirm('Remove this route? This only removes the route record and may fail if bookings are attached.'))return;try{const r=await fetch(`${API}/admin/routes/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Could not remove route');setMsg('Route removed');await load();setTimeout(()=>setMsg(''),2200)}catch(e){setError(e.message)}};
  const sendReply=async messageId=>{
    const reply=(replyDrafts[messageId]||'').trim();
    if(!reply){ setError('Write a response before sending.'); return; }
    try{
      const r=await fetch(`${API}/admin/messages/${messageId}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||'Could not send reply');
      setData(prev=>prev ? {...prev, messages: prev.messages.filter(m=>m.id!==messageId)} : prev);
      setReplySent(prev=>({...prev,[messageId]:true}));
      setReplyDrafts(prev=>({...prev,[messageId]:''}));
      setMsg('Reply sent and message removed from inbox.');
      setTimeout(()=>setMsg(''),2200);
    }catch(e){setError(e.message||'Could not send reply');}
  };
  const deleteMessage=async messageId=>{
    const ok=window.confirm('Delete this customer message?');
    if(!ok) return;
    try{
      const r=await fetch(`${API}/admin/messages/${messageId}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||'Could not delete message');
      setData(prev=>prev ? {...prev, messages: prev.messages.filter(m=>m.id!==messageId)} : prev);
      setMsg('Message deleted.');
      setTimeout(()=>setMsg(''),2200);
    }catch(e){setError(e.message||'Could not delete message');}
  };
  if(!data && error)return <main className="page adminPage"><div className="adminErrorPanel"><ShieldCheck/><h1>Dashboard couldn't load</h1><p>{error}</p><button className="primaryBtn" onClick={load}>Try again</button></div></main>;
  if(!data)return <main className="page center"><Loader/></main>;
  const pending=data.bookings.filter(b=>b.status==='pending').length, confirmed=data.bookings.filter(b=>b.status==='confirmed').length;
  return <main className="page adminPage">
    <div className="adminHeader adminHeaderPro"><div><span className="eyebrow">TICKETGUZO â€¢ OPERATIONS</span><h1>Control <em>Center</em></h1><p>Manage your network, passenger bookings, payments and customer messages.</p></div><div className="adminHeaderActions"><span className="adminOnline"><i/> System online</span><button className="ghostBtn" onClick={logout}><LogOut/> Logout</button></div></div>
    {msg&&<div className="success toastInline"><CheckCircle2/>{msg}</div>}
    {error&&<div className="error adminError"><X/>{error}</div>}
    <div className="adminStats adminStatsPro">
      <Stat icon={<Ticket/>} label="Total bookings" value={data.stats.bookings}/>
      <Stat icon={<CheckCircle2/>} label="Paid bookings" value={data.stats.paid_bookings}/>
      <Stat icon={<WalletCards/>} label="Revenue" value={`${Number(data.stats.revenue).toLocaleString()} ETB`}/>
      <Stat icon={<Bus/>} label="Active routes" value={data.routes.length}/>
      <Stat icon={<Clock3/>} label="Pending" value={pending}/>
      <Stat icon={<ShieldCheck/>} label="Confirmed" value={confirmed}/>
    </div>
    <div className="adminTabs adminTabsPro">{[['overview','Overview'],['bookings','Passenger bookings'],['routes','Routes'],['messages','Customer messages']].map(([x,t])=><button className={tab===x?'active':''} key={x} onClick={()=>setTab(x)}>{t}</button>)}</div>
    {tab==='overview'&&<div className="adminOverviewGrid">
      <div className="adminTable"><div className="panelHeading"><div><span className="eyebrow">LIVE OPERATIONS</span><h2>Latest passenger bookings</h2></div><button className="textBtn" onClick={()=>setTab('bookings')}>View all <ArrowRight/></button></div><div className="tableWrap"><table><thead><tr><th>Passenger</th><th>Journey</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.bookings.slice(0,8).map(b=><tr key={b.id}><td><b>{b.passenger_name}</b><small>{b.phone}</small></td><td>{b.origin} â†’ {b.destination}</td><td>{b.travel_date}</td><td>{Number(b.total_amount).toLocaleString()} ETB</td><td><span className={`status ${b.status}`}>{b.status}</span></td></tr>)}</tbody></table>{!data.bookings.length&&<div className="emptyState"><Ticket/><b>No bookings yet</b><span>New passenger reservations will appear here.</span></div>}</div></div>
      <div className="adminQuick"><div className="panelHeading"><div><span className="eyebrow">QUICK ACTIONS</span><h2>Manage TicketGuzo</h2></div></div><button onClick={()=>setTab('routes')}><Bus/><span><b>Add or remove routes</b><small>Keep your network current</small></span><ArrowRight/></button><button onClick={()=>setTab('bookings')}><Ticket/><span><b>Review passengers</b><small>Change booking status</small></span><ArrowRight/></button><button onClick={()=>setTab('messages')}><Mail/><span><b>Read customer messages</b><small>Reply through your support channel</small></span><ArrowRight/></button></div>
    </div>}
    {tab==='bookings'&&<div className="adminTable"><div className="panelHeading"><div><span className="eyebrow">PASSENGER BOOKINGS</span><h2>All reservations</h2></div><span className="panelCount">{data.bookings.length} records</span></div><div className="tableWrap"><table><thead><tr><th>ID</th><th>Passenger</th><th>Journey</th><th>Date</th><th>Seats</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.bookings.map(b=><tr key={b.id}><td>#{b.id}</td><td><b>{b.passenger_name}</b><small>{b.phone}<br/>{b.email||'No email'}</small></td><td>{b.origin} â†’ {b.destination}<small>{b.departure_time}</small></td><td>{b.travel_date}</td><td>{b.seats}</td><td>{Number(b.total_amount).toLocaleString()} ETB</td><td>{b.payment_method||'Not paid'}<small>{b.transaction_ref||''}</small></td><td><span className={`status ${b.status}`}>{b.status}</span></td><td><select value={b.status} onChange={e=>update(b.id,e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table>{!data.bookings.length&&<div className="emptyState"><Ticket/><b>No passenger bookings</b><span>Bookings will appear after customers reserve a route.</span></div>}</div></div>}
    {tab==='routes'&&<div className="adminTwoCol adminRoutesPro"><div className="adminTable"><div className="panelHeading"><div><span className="eyebrow">NETWORK</span><h2>Manage routes</h2></div><span className="panelCount">{data.routes.length} routes</span></div><div className="tableWrap"><table><thead><tr><th>Route</th><th>Schedule</th><th>Class</th><th>Price</th><th>Seats</th><th></th></tr></thead><tbody>{data.routes.map(r=><tr key={r.id}><td><b>{r.origin} â†’ {r.destination}</b><small>{r.duration} â€¢ {r.frequency}</small></td><td>{r.departure_time}<small>to {r.arrival_time}</small></td><td><span className={r.class_type==='VIP'?'vip':'standard'}>{r.class_type}</span></td><td>{Number(r.price).toLocaleString()} ETB</td><td>{r.seats_total}</td><td><button className="iconBtn danger" onClick={()=>deleteRoute(r.id)} title="Remove route"><Trash2/></button></td></tr>)}</tbody></table></div></div><form className="addRoute addRoutePro" onSubmit={addRoute}><div className="panelHeading"><div><span className="eyebrow">NEW ROUTE</span><h2>Add route</h2></div><Plus/></div><input name="origin" required placeholder="Origin city"/><input name="destination" required placeholder="Destination city"/><div className="formRow"><input name="departure_time" required placeholder="06:00 AM"/><input name="arrival_time" required placeholder="04:00 PM"/></div><div className="formRow"><input name="duration" required placeholder="10h"/><input name="price" type="number" min="0" required placeholder="750 ETB"/></div><div className="formRow"><select name="class_type"><option>Standard</option><option>VIP</option></select><input name="frequency" placeholder="Daily" defaultValue="Daily"/></div><input name="seats_total" type="number" min="1" defaultValue="45" placeholder="Seats"/><button className="primaryBtn"><Plus/> Add route</button></form></div>}
    {tab==='messages'&&<div><div className="panelHeading messageHeading"><div><span className="eyebrow">CUSTOMER SUPPORT</span><h2>Customer messages</h2></div><span className="panelCount">{data.messages.length} messages</span></div><div className="messageGrid">{data.messages.map(m=><div className="messageCard" key={m.id}><div className="messageTop"><Mail/><button className="quietDelete" onClick={()=>deleteMessage(m.id)} title="Delete message"><Trash2/></button></div><b>{m.name}</b><small>{m.email}</small><p>{m.message}</p><span>{new Date(m.created_at).toLocaleString()}</span><div className="replyBox"><label>Reply</label><textarea value={replyDrafts[m.id]||''} onChange={e=>setReplyDrafts(prev=>({...prev,[m.id]:e.target.value}))} placeholder="Type your response to this customer..." rows="4"/><button className="primaryBtn full" onClick={()=>sendReply(m.id)}>{replySent[m.id]?'Reply sent':'Send reply'}</button></div></div>)}</div>{!data.messages.length&&<div className="adminTable emptyState"><Mail/><b>No customer messages</b><span>Messages submitted through Contact will appear here.</span></div>}</div>}
  </main>
}

function Stat({icon,label,value}){return <div className="statCard statCardPro"><div className="statIcon">{icon}</div><span>{label}</span><b>{value}</b></div>}
function Loader(){return <div className="loader"><span/><span/><span/></div>}

createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);



