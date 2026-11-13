'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, Check, CheckCircle, CircleAlert, CircleHelp, Copy, CreditCard, Download, Gift,
  ImageUp, Landmark, Loader2, Lock, LogIn, PlayCircle, ShieldCheck, ShoppingBag, Tag, UserPlus, Wallet, X,
} from 'lucide-react';
import { checkoutResult } from '@/lib/payments/checkout-result';
import { authHref } from '@/lib/safe-redirect';
import { formatNumber } from '@/lib/format';
import styles from './Checkout.module.css';

type Method = 'STRIPE' | 'PAYPAL' | 'TABBY' | 'TAMARA' | 'WALLET' | 'MANUAL';
type Preview = {
  course: { id: string; title: string; price: number; priceSYP: number; thumbnail: string | null; instructor: { name: string | null } | null };
  methods: Method[];
  viewer: { authenticated: boolean; enrolled: boolean };
};
type Load = { state: 'loading' } | { state: 'ready'; data: Preview } | { state: 'error'; status: number; message: string };
type Done = { kind: 'pending' | 'purchased'; message: string };
type TrackingWindow = Window & { fbq?: (action: string, event: string, payload: { value: number; currency: string }) => void };

const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
/** Decoded size the purchase endpoint accepts. */
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
/** Photos straight from a phone camera are accepted, then shrunk before upload. */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** Small images are sent untouched so screenshots stay pixel-sharp. */
const KEEP_ORIGINAL_BYTES = 400 * 1024;
const RECEIPT_MAX_SIDE = 1600;
/** Slow connections get a reassurance first, then a clear, retryable error. */
const SLOW_HINT_MS = 12_000;
const REQUEST_TIMEOUT_MS = 90_000;

const dataUrlBytes = (url: string) => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4);

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read')));
    reader.onerror = () => reject(reader.error ?? new Error('read'));
    reader.readAsDataURL(file);
  });
}

/**
 * The receipt travels inside the purchase request, so a multi-megabyte photo can
 * take minutes on a slow connection. Re-encode large images as a compact JPEG
 * (still sharp enough to read every digit) that the server accepts as-is.
 */
async function prepareReceipt(file: File): Promise<string> {
  if (file.size <= KEEP_ORIGINAL_BYTES) return readAsDataUrl(file);
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, RECEIPT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      context.fillStyle = '#ffffff'; // transparent screenshots become white, not black
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.7, 0.6]) {
        const url = canvas.toDataURL('image/jpeg', quality);
        if (url.startsWith('data:image/jpeg') && dataUrlBytes(url) <= MAX_RECEIPT_BYTES) return url;
      }
    } finally {
      bitmap.close();
    }
  } catch {
    /* Decoding unavailable: fall back to the original file below. */
  }
  if (file.size > MAX_RECEIPT_BYTES) throw new Error('too-large');
  return readAsDataUrl(file);
}

const METHOD_INFO: Record<Method, { name: string; hint: string }> = {
  STRIPE: { name: 'البطاقة الائتمانية', hint: 'دفع فوري عبر بوابة آمنة' },
  PAYPAL: { name: 'باي بال (PayPal)', hint: 'دفع فوري عبر حسابك في PayPal' },
  TABBY: { name: 'قسمها على 4 بدون فوائد', hint: 'عبر تابي (Tabby)' },
  TAMARA: { name: 'قسمها على 3 بدون فوائد', hint: 'عبر تمارا (Tamara)' },
  WALLET: { name: 'المحفظة الداخلية', hint: 'خصم فوري من رصيدك' },
  MANUAL: { name: 'تحويل بنكي / يدوي', hint: 'شام كاش · سيرتيل كاش · الهرم · بينانس' },
};

/** Existing manual-transfer destinations, unchanged. */
const MANUAL_ACCOUNTS: { title: string; color: string; notes?: string[]; copy: string; display: string; qr?: boolean }[] = [
  { title: '1. شام كاش (Sham Cash)', color: '#3EEDC4', copy: 'f698bd6104ecfc91435335321b7978fc', display: 'f698bd6104ecfc91435335321b7978fc', qr: true },
  { title: '2. بينانس (Binance)', color: '#f59e0b', copy: '1014947222', display: 'Pay ID: 1014947222' },
  { title: '3. سيرتيل كاش (Syriatel Cash)', color: '#ef4444', notes: ['باسم: قاسم السخني'], copy: '0983635096', display: '0983635096' },
  { title: '4. شركة الهرم للحوالات', color: '#3b82f6', notes: ['الاسم: قاسم عبد السلام السخني', 'المحافظة: دمشق'], copy: '0983635096', display: '0983635096' },
];

const usd = (value: number) => `$${value.toFixed(2)}`;

function MethodIcon({ method }: { method: Method }) {
  if (method === 'TABBY') return <span className={styles.brandChip} style={{ background: '#3EEDC4', color: '#000' }}>tabby</span>;
  if (method === 'TAMARA') return <span className={styles.brandChip} style={{ background: '#F18070', color: '#fff' }}>tamara</span>;
  const Icon = method === 'WALLET' ? Wallet : method === 'MANUAL' ? Landmark : CreditCard;
  return <span className={styles.methodIcon}><Icon size={24} aria-hidden="true" /></span>;
}

function Band({ courseId, step }: { courseId: string; step: 1 | 2 | 3 }) {
  const steps = ['الحساب', 'طريقة الدفع', 'تأكيد الطلب'];
  return (
    <header className={styles.band}>
      <div className={styles.bandInner}>
        <Link href={courseId ? `/courses/${encodeURIComponent(courseId)}` : '/courses'} className={styles.back}>
          <ArrowRight size={16} aria-hidden="true" /> {courseId ? 'العودة إلى الكورس' : 'العودة للكورسات'}
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>الدفع الآمن</h1>
          <span className={styles.secure}><Lock size={14} aria-hidden="true" /> معاملة آمنة ومشفرة بالكامل</span>
        </div>
        <ol className={styles.steps} aria-label="مراحل الشراء">
          {steps.map((label, index) => {
            const number = (index + 1) as 1 | 2 | 3;
            const state = number < step ? 'done' : number === step ? 'current' : 'upcoming';
            return (
              <li key={label} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                <span className={styles.stepDot}>{state === 'done' ? <Check size={14} aria-hidden="true" /> : number}</span>
                <span className={styles.stepLabel}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}

function StateCard({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="kq-section-light" style={{ background: 'transparent', paddingInline: 'var(--gutter)' }}>
      <div className={styles.state} role="status">
        <span className={styles.stateIcon} aria-hidden="true">{icon}</span>
        <h2 className={styles.stateTitle}>{title}</h2>
        {text ? <p className={styles.muted}>{text}</p> : null}
        {children ? <div className={styles.stateActions}>{children}</div> : null}
      </div>
    </div>
  );
}

function CheckoutContent() {
  const courseId = useSearchParams()?.get('courseId') ?? '';
  const { data: session, status: sessionStatus } = useSession();

  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [walletUSD, setWalletUSD] = useState<number | null>(null);
  const [walletFailed, setWalletFailed] = useState(false);
  const [chosen, setChosen] = useState<Method | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [receipt, setReceipt] = useState<{ dataUrl: string; name: string } | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [preparingReceipt, setPreparingReceipt] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const submitting = useRef(false);
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
  const tracked = useRef(false);

  const checkoutPath = `/checkout?courseId=${encodeURIComponent(courseId)}`;
  const learnPath = `/courses/${encodeURIComponent(courseId)}/learn`;

  // One public summary for guests and members; re-read when the session settles
  // so the "already enrolled" flag reflects the signed-in customer.
  useEffect(() => {
    if (!courseId || sessionStatus === 'loading') return;
    const controller = new AbortController();
    fetch(`/api/checkout/preview?courseId=${encodeURIComponent(courseId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLoad({ state: 'error', status: res.status, message: body.error || 'تعذّر تحميل بيانات الدفع' });
          return;
        }
        setLoad({ state: 'ready', data: body as Preview });
        if (!tracked.current && body.course?.price > 0) {
          tracked.current = true;
          (window as TrackingWindow).fbq?.('track', 'InitiateCheckout', { value: body.course?.price, currency: 'USD' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoad({ state: 'error', status: 0, message: 'تعذّر الاتصال بالخادم، تحقّق من الإنترنت ثم أعد المحاولة' });
        }
      });
    return () => controller.abort();
  }, [courseId, sessionStatus]);

  const data = load.state === 'ready' ? load.data : null;
  const authenticated = Boolean(data?.viewer.authenticated) && !sessionExpired;
  const walletOffered = Boolean(data?.methods.includes('WALLET'));

  // The wallet balance is private: only requested for a signed-in customer.
  useEffect(() => {
    if (!authenticated || !walletOffered || !courseId) return;
    const controller = new AbortController();
    fetch(`/api/checkout/info?courseId=${encodeURIComponent(courseId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        if (res.status === 401) { setSessionExpired(true); return; }
        const body = res.ok ? await res.json().catch(() => null) : null;
        if (body?.wallet) setWalletUSD(Number(body.wallet.walletUSD) || 0);
        else setWalletFailed(true);
      })
      .catch(() => { if (!controller.signal.aborted) setWalletFailed(true); });
    return () => controller.abort();
  }, [authenticated, walletOffered, courseId]);

  const methods = data?.methods ?? [];
  const method = chosen && methods.includes(chosen) ? chosen : methods[0] ?? null;
  const price = data?.course.price ?? 0;
  const discount = applied?.discount ?? 0;
  const total = Math.round(price * (1 - discount / 100) * 100) / 100;
  const sypTotal = data && data.course.priceSYP > 0 ? Math.round(data.course.priceSYP * (1 - discount / 100)) : null;
  const walletShort = method === 'WALLET' && walletUSD !== null && walletUSD < total;
  const walletPending = method === 'WALLET' && walletUSD === null;
  const walletBlocked = method === 'WALLET' && walletFailed;

  const copy = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(current => (current === index ? null : current)), 2000);
    } catch {
      /* Clipboard unavailable: the value stays visible for manual copying. */
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || checkingCoupon) return;
    setCheckingCoupon(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, courseId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.discount === 'number') {
        // The validator matches the upper-cased code; send exactly that at purchase.
        setApplied({ code: code.toUpperCase(), discount: body.discount });
        setCouponInput('');
      } else {
        setApplied(null);
        setCouponError(body.error || 'كود الخصم غير صالح أو غير موجود');
      }
    } catch {
      setCouponError('خطأ في التحقق من الكوبون');
    } finally {
      setCheckingCoupon(false);
    }
  };

  const pickReceipt = async (file: File | undefined) => {
    if (!file) return;
    if (!RECEIPT_TYPES.includes(file.type)) {
      setReceiptError('صيغة الصورة غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WebP');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setReceiptError('حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 15 ميغابايت');
      return;
    }
    setReceiptError('');
    setPreparingReceipt(true);
    try {
      setReceipt({ dataUrl: await prepareReceipt(file), name: file.name });
    } catch {
      setReceiptError('تعذّر تجهيز الصورة، يرجى اختيار صورة أخرى بصيغة JPG أو PNG');
    } finally {
      setPreparingReceipt(false);
    }
  };

  const pay = async () => {
    if (!data || !method || !authenticated || submitting.current || done || preparingReceipt) return;
    if (method === 'MANUAL' && !receipt) {
      setReceiptError('يرجى إرفاق صورة الإيصال لإتمام طلب التحويل اليدوي');
      document.getElementById('receipt-upload')?.focus();
      return;
    }
    submitting.current = true;
    setProcessing(true);
    setError('');
    // Never leave the customer on an endless spinner: reassure after a few
    // seconds, then stop waiting. Retrying is safe: the gateway request reuses the
    // same operation id, and the wallet endpoint never charges an owned course twice.
    const controller = new AbortController();
    const slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    const timeoutTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      if (method === 'WALLET') {
        const res = await fetch('/api/checkout/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, paymentCurrency: 'USD', couponCode: applied?.code }),
          signal: controller.signal,
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) { setSessionExpired(true); return; }
        if (!res.ok) { setError(body.error || 'فشلت عملية الدفع من المحفظة'); return; }
        (window as TrackingWindow).fbq?.('track', 'Purchase', { value: total, currency: 'USD' });
        setDone({ kind: 'purchased', message: 'تم الشراء بنجاح، جاري تحويلك إلى الكورس...' });
        setTimeout(() => window.location.assign(learnPath), 1500);
        return;
      }

      const fingerprint = JSON.stringify([courseId, method, applied?.code ?? '', receipt?.dataUrl ?? '']);
      if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, id: crypto.randomUUID() };
      const res = await fetch('/api/checkout/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          provider: method,
          operationId: operation.current.id,
          couponCode: applied?.code,
          receiptImage: method === 'MANUAL' ? receipt?.dataUrl : undefined,
        }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) { setSessionExpired(true); return; }
      if (!res.ok) { setError(body.error || 'حدث خطأ في تجهيز بوابة الدفع'); return; }
      const result = checkoutResult(body, method);
      if (result.kind === 'redirect') window.location.assign(result.url);
      else if (result.kind === 'enrolled') window.location.assign(learnPath);
      else setDone({ kind: 'pending', message: 'تم إرسال طلب الدفع وهو قيد المراجعة. سيُفعّل الوصول بعد تأكيد الدفع.' });
    } catch (caught) {
      if (controller.signal.aborted) {
        setError('استغرق الطلب وقتاً أطول من المعتاد بسبب بطء الاتصال، ولم يصلنا تأكيد بعد. اضغط «إتمام الشراء» مرة أخرى للتحقق من حالة طلبك؛ لن يُنشأ طلب مكرر ولن يُخصم المبلغ مرتين.');
      } else if (caught instanceof TypeError) {
        setError('تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم اضغط «إتمام الشراء» مرة أخرى؛ لن يُنشأ طلب مكرر.');
      } else {
        setError(caught instanceof Error ? caught.message : 'تعذّر تأكيد الطلب. أعد المحاولة بنفس البيانات للتحقق من حالته.');
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      setSlow(false);
      submitting.current = false;
      setProcessing(false);
    }
  };

  /* ----------------------------- Page states ----------------------------- */
  if (!courseId) {
    return (
      <div className={styles.page}>
        <Band courseId="" step={1} />
        <StateCard icon={<ShoppingBag size={32} />} title="الكورس غير محدد" text="اختر الكورس الذي تريده من صفحة الكورسات، ثم اضغط «اشترِ الآن» لإتمام الشراء.">
          <Link href="/courses" className="btn btn-solid">تصفح كل الكورسات</Link>
        </StateCard>
      </div>
    );
  }

  if (load.state === 'error') {
    const unavailable = load.status === 404;
    return (
      <div className={styles.page}>
        <Band courseId={courseId} step={1} />
        <StateCard icon={<CircleAlert size={32} />} title={unavailable ? 'الكورس غير متاح للشراء حالياً' : 'تعذّر تحميل صفحة الدفع'} text={load.message}>
          {!unavailable ? <button type="button" className="btn btn-solid" onClick={() => window.location.reload()}>إعادة المحاولة</button> : null}
          <Link href="/courses" className="btn btn-outline">العودة للكورسات</Link>
        </StateCard>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page} aria-busy="true">
        <Band courseId={courseId} step={1} />
        <div className={styles.layout}>
          <div className={styles.main}>
            {[0, 1].map(i => (
              <div key={i} className={`${styles.card} kq-section-light`} style={{ display: 'grid', gap: '0.8rem' }}>
                <div className={`kq-skeleton ${styles.skeletonLine}`} style={{ width: '40%' }} />
                <div className={`kq-skeleton ${styles.skeletonLine}`} style={{ width: '90%' }} />
                <div className={`kq-skeleton ${styles.skeletonLine}`} style={{ width: '70%' }} />
              </div>
            ))}
          </div>
          <div className={styles.summary} style={{ display: 'grid', gap: '0.8rem' }}>
            <div className={`kq-skeleton ${styles.skeletonLine}`} style={{ width: '50%' }} />
            <div className={`kq-skeleton ${styles.skeletonLine}`} style={{ height: 60 }} />
            <div className={`kq-skeleton ${styles.skeletonLine}`} style={{ height: 48 }} />
          </div>
        </div>
        <span className="sr-only" role="status">جارٍ تحميل صفحة الدفع...</span>
      </div>
    );
  }

  if (data.viewer.enrolled && !sessionExpired) {
    return (
      <div className={styles.page}>
        <Band courseId={courseId} step={3} />
        <StateCard icon={<BadgeCheck size={32} />} title="أنت مشترك في هذا الكورس" text={`لديك وصول كامل إلى «${data.course.title}»، لا حاجة للدفع مرة أخرى.`}>
          <Link href={learnPath} className="btn btn-solid"><PlayCircle size={18} aria-hidden="true" /> متابعة التعلم</Link>
          <Link href="/dashboard" className="btn btn-outline">لوحة التحكم</Link>
        </StateCard>
      </div>
    );
  }

  // Same rule as lesson access (`isPublicLesson`): a course priced at zero in both
  // currencies is open to every signed-in learner, and the payment endpoints
  // reject a zero amount, so there is nothing to pay here.
  if (data.course.price === 0 && data.course.priceSYP === 0) {
    return (
      <div className={styles.page}>
        <Band courseId={courseId} step={authenticated ? 3 : 1} />
        <StateCard
          icon={<Gift size={32} />}
          title="هذا الكورس مجاني"
          text={authenticated
            ? `يمكنك البدء في «${data.course.title}» مباشرة دون أي دفع.`
            : `«${data.course.title}» مجاني بالكامل، سجّل دخولك أو أنشئ حساباً لتبدأ التعلم فوراً.`}
        >
          {authenticated ? (
            <Link href={learnPath} className="btn btn-solid"><PlayCircle size={18} aria-hidden="true" /> ابدأ التعلم الآن</Link>
          ) : (
            <>
              <Link href={authHref('/login', learnPath)} className="btn btn-solid"><LogIn size={18} aria-hidden="true" /> تسجيل الدخول</Link>
              <Link href={authHref('/register', learnPath)} className="btn btn-outline"><UserPlus size={18} aria-hidden="true" /> إنشاء حساب جديد</Link>
            </>
          )}
        </StateCard>
      </div>
    );
  }

  const step: 1 | 2 | 3 = done ? 3 : authenticated ? 2 : 1;
  const loginHref = authHref('/login', checkoutPath);
  const registerHref = authHref('/register', checkoutPath);
  const userName = session?.user?.name || 'حسابك';

  return (
    <div className={styles.page}>
      <Band courseId={courseId} step={step} />

      <div className={styles.layout}>
        <div className={`${styles.main} kq-section-light`}>
          {/* 1 — Account */}
          <section className={styles.card} aria-labelledby="checkout-account">
            <div className={styles.cardHead}>
              <span className={styles.cardNumber} aria-hidden="true">1</span>
              <h2 id="checkout-account" className={styles.cardTitle}>الحساب</h2>
            </div>
            {authenticated ? (
              <div className={styles.account}>
                <div className={styles.accountWho}>
                  <span className={styles.avatar} aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.accountName}>{userName}</div>
                    <span className={styles.accountMeta}><CheckCircle size={14} aria-hidden="true" /> سيُضاف الكورس إلى حسابك فور تأكيد الدفع</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.account}>
                <p className={styles.muted} style={{ flex: '1 1 280px' }}>
                  {sessionExpired ? 'انتهت جلستك. ' : ''}سجّل الدخول أو أنشئ حساباً جديداً خلال ثوانٍ لإتمام الشراء، وستعود إلى هذه الصفحة تلقائياً.
                </p>
                <div className={styles.accountActions}>
                  <Link href={loginHref} className="btn btn-solid btn-sm"><LogIn size={16} aria-hidden="true" /> تسجيل الدخول</Link>
                  <Link href={registerHref} className="btn btn-outline btn-sm"><UserPlus size={16} aria-hidden="true" /> إنشاء حساب</Link>
                </div>
              </div>
            )}
          </section>

          {/* 2 — Payment method */}
          <section className={styles.card} aria-labelledby="checkout-method">
            <div className={styles.cardHead}>
              <span className={styles.cardNumber} aria-hidden="true">2</span>
              <h2 id="checkout-method" className={styles.cardTitle}>اختر طريقة الدفع</h2>
            </div>

            {methods.length === 0 ? (
              <p className={styles.muted}>لا توجد طرق دفع متاحة حالياً. يرجى التواصل معنا عبر واتساب لإتمام الاشتراك.</p>
            ) : (
              <fieldset className={styles.methods}>
                <legend className="sr-only">طريقة الدفع</legend>
                {methods.map(item => (
                  <label key={item} className={styles.method} data-checked={method === item ? 'true' : 'false'}>
                    <input type="radio" name="payment-method" value={item} checked={method === item} onChange={() => setChosen(item)} />
                    {method === item ? <span className={styles.methodCheck} aria-hidden="true"><Check size={14} /></span> : null}
                    <MethodIcon method={item} />
                    <span className={styles.methodName}>{METHOD_INFO[item].name}</span>
                    <span className={styles.methodHint}>{METHOD_INFO[item].hint}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {method ? (
                <motion.div
                  key={method}
                  className={styles.panel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {(method === 'STRIPE' || method === 'PAYPAL') && (
                    <>
                      <h3 className={styles.panelTitle}>الدفع عبر {METHOD_INFO[method].name}</h3>
                      <p className={styles.muted}>سيتم توجيهك إلى بوابة الدفع الآمنة لإدخال تفاصيل الدفع الخاصة بك. جميع بياناتك مشفرة بالكامل ولا نقوم بتخزين أي معلومات متعلقة ببطاقتك.</p>
                    </>
                  )}

                  {(method === 'TABBY' || method === 'TAMARA') && (
                    <>
                      <h3 className={styles.panelTitle}>الدفع بالتقسيط عبر {method === 'TABBY' ? 'تابي (Tabby)' : 'تمارا (Tamara)'}</h3>
                      <p className={styles.muted}>سيتم توجيهك إلى صفحة {method === 'TABBY' ? 'تابي' : 'تمارا'} الآمنة لإتمام عملية الشراء بنظام التقسيط المريح بدون أي فوائد إضافية. يتطلب ذلك إدخال رقم هاتفك وبعض التفاصيل الأساسية.</p>
                    </>
                  )}

                  {method === 'WALLET' && (
                    <>
                      <h3 className={styles.panelTitle}>الدفع عبر المحفظة الداخلية</h3>
                      {!authenticated ? (
                        <p className={styles.muted}>سجّل الدخول لعرض رصيد محفظتك والدفع منها مباشرة.</p>
                      ) : (
                        <>
                          {walletFailed ? (
                            <p className={`${styles.note} ${styles.noteWarn}`}>
                              <CircleAlert size={18} aria-hidden="true" /> تعذّر تحميل رصيد المحفظة. اختر طريقة دفع أخرى أو أعد تحميل الصفحة.
                            </p>
                          ) : null}
                          <div className={styles.walletRow} hidden={walletFailed}>
                            <span>رصيدك الحالي:</span>
                            {walletUSD === null
                              ? <span className={`kq-skeleton ${styles.skeletonLine}`} style={{ width: 90, height: 22 }} aria-label="جارٍ تحميل الرصيد" />
                              : <span className={styles.walletBalance}>{usd(walletUSD)}</span>}
                          </div>
                          {walletUSD !== null && (walletShort ? (
                            <p className={`${styles.note} ${styles.noteWarn}`}>
                              <CircleAlert size={18} aria-hidden="true" />
                              <span>رصيدك غير كافٍ لإتمام عملية الشراء. يرجى شحن محفظتك أولاً. <Link href="/dashboard/wallet" className={styles.inlineLink}>شحن المحفظة</Link></span>
                            </p>
                          ) : (
                            <p className={`${styles.note} ${styles.noteOk}`}>
                              <CheckCircle size={18} aria-hidden="true" /> رصيدك يكفي لإتمام هذه العملية. سيتم الخصم مباشرة عند التأكيد.
                            </p>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {method === 'MANUAL' && (
                    <>
                      <h3 className={styles.panelTitle}>تعليمات التحويل اليدوي</h3>
                      <p className={styles.muted}>
                        يرجى تحويل المبلغ الإجمالي إلى أحد الحسابات التالية. <strong>اضغط على أي نص لنسخه.</strong>
                        <br />المبلغ المطلوب: <strong style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{usd(total)}</strong>
                        {sypTotal ? <> (ما يعادل <strong>{formatNumber(sypTotal)} ل.س</strong>)</> : null}
                      </p>
                      <ul className={styles.accounts}>
                        {MANUAL_ACCOUNTS.map((account, index) => (
                          <li key={account.title} className={styles.payAccount}>
                            <div className={styles.payAccountName}>
                              <span className={styles.payAccountDot} style={{ background: account.color }} aria-hidden="true" />
                              {account.title}
                            </div>
                            {account.notes?.map(note => <p key={note} className={styles.payAccountNote} style={{ margin: 0 }}>{note}</p>)}
                            <button
                              type="button"
                              className={styles.copyRow}
                              data-copied={copied === index ? 'true' : 'false'}
                              onClick={() => copy(index, account.copy)}
                              aria-label={`نسخ ${account.display}`}
                              style={{ marginTop: account.notes ? '0.5rem' : 0 }}
                            >
                              <span className={styles.copyValue}>{account.display}</span>
                              <span className={styles.copyState} aria-live="polite">
                                {copied === index ? <><Check size={14} aria-hidden="true" /> تم النسخ!</> : <><Copy size={14} aria-hidden="true" /> نسخ</>}
                              </span>
                            </button>
                            {account.qr ? (
                              <div className={styles.qr}>
                                <Image src="/images/sham-cash-barcode.jpg" alt="Sham Cash Barcode" width={200} height={200} className={styles.qrImage} unoptimized />
                                <a href="/images/sham-cash-barcode.jpg" download="sham-cash-barcode.jpg" className={styles.qrDownload}>
                                  <Download size={16} aria-hidden="true" /> تحميل الباركود (Download)
                                </a>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>

                      {authenticated ? (
                        <div>
                          <label htmlFor="receipt-upload" className={styles.uploadLabel}>إرفاق صورة الإيصال (إجباري)</label>
                          <div className={styles.dropzone} data-filled={receipt ? 'true' : 'false'}>
                            <input
                              id="receipt-upload"
                              type="file"
                              accept={RECEIPT_TYPES.join(',')}
                              onChange={event => { void pickReceipt(event.target.files?.[0]); event.target.value = ''; }}
                              aria-describedby="receipt-hint"
                              disabled={preparingReceipt || processing}
                            />
                            <span className={styles.dropIcon} aria-hidden="true">
                              {preparingReceipt
                                ? <Loader2 size={24} className="spin" />
                                : receipt ? <Image src={receipt.dataUrl} alt="" width={52} height={52} unoptimized /> : <ImageUp size={24} />}
                            </span>
                            <span className={styles.dropText} aria-live="polite">
                              {preparingReceipt ? 'جاري تجهيز الصورة...' : receipt ? receipt.name : 'انقر هنا لاختيار صورة الإيصال (jpg, png)'}
                              <span id="receipt-hint" className={styles.dropHint}>JPG أو PNG أو WebP — تُضغط الصور الكبيرة تلقائياً لرفع أسرع</span>
                            </span>
                            {receipt ? (
                              <button type="button" className={styles.removeReceipt} onClick={() => setReceipt(null)} aria-label="إزالة صورة الإيصال">
                                <X size={16} aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                          {receiptError ? <p className={styles.couponError} role="alert">{receiptError}</p> : null}
                        </div>
                      ) : (
                        <p className={styles.muted}>بعد التحويل، سجّل الدخول لإرفاق صورة الإيصال وإرسال طلبك للمراجعة.</p>
                      )}
                    </>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          {/* Coupon */}
          <section className={styles.card} aria-labelledby="checkout-coupon">
            <div className={styles.cardHead}>
              <span className={styles.cardNumber} aria-hidden="true"><Tag size={14} /></span>
              <h2 id="checkout-coupon" className={styles.cardTitle}>لديك كوبون خصم؟</h2>
            </div>
            <form className={styles.couponRow} onSubmit={event => { event.preventDefault(); applyCoupon(); }}>
              <div className={styles.couponField}>
                <Tag size={18} className={styles.couponIcon} aria-hidden="true" />
                <label htmlFor="coupon-code" className="sr-only">كود الخصم</label>
                <input
                  id="coupon-code"
                  type="text"
                  placeholder="أدخل الرمز هنا"
                  value={couponInput}
                  onChange={event => { setCouponInput(event.target.value); setCouponError(''); }}
                  className={styles.couponInput}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={100}
                />
              </div>
              <button type="submit" className="btn btn-outline" disabled={!couponInput.trim() || checkingCoupon}>
                {checkingCoupon ? <Loader2 size={18} className="spin" aria-hidden="true" /> : null} تطبيق
              </button>
            </form>
            {applied ? (
              <div className={styles.couponApplied} role="status">
                <span><CheckCircle size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> تم تطبيق الكوبون <bdi>{applied.code}</bdi> — خصم {applied.discount}%</span>
                <button type="button" className={styles.textButton} onClick={() => setApplied(null)}>إزالة</button>
              </div>
            ) : null}
            {couponError ? <p className={styles.couponError} role="alert">{couponError}</p> : null}
          </section>

          {/* FAQ */}
          <section className={styles.card} aria-labelledby="checkout-faq">
            <div className={styles.cardHead}>
              <span className={styles.cardNumber} aria-hidden="true"><CircleHelp size={15} /></span>
              <h2 id="checkout-faq" className={styles.cardTitle}>استفسارات شائعة حول الدفع</h2>
            </div>
            <div className={styles.faq}>
              <div>
                <h3 className={styles.faqQ}>هل بيانات بطاقتي آمنة؟</h3>
                <p className={styles.muted}>نعم، جميع معاملات البطاقات الائتمانية تتم معالجتها عبر مزود الخدمة المعتمد وهي مشفرة ولا يتم تخزينها في خوادمنا اطلاقاً.</p>
              </div>
              <div>
                <h3 className={styles.faqQ}>ماذا لو فشلت عملية الدفع؟</h3>
                <p className={styles.muted}>سيتم إبلاغك فوراً، ولن يتم خصم أي مبلغ. يمكنك تجربة طريقة دفع أخرى كالتحويل اليدوي أو الدفع من المحفظة.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Order summary */}
        <aside className={styles.summary} aria-labelledby="checkout-summary">
          <h2 id="checkout-summary" className={styles.summaryTitle}>ملخص الطلب</h2>
          <div className={styles.product}>
            <div className={styles.thumb}>
              {data.course.thumbnail ? <Image src={data.course.thumbnail} alt="" fill unoptimized sizes="96px" /> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.productTitle}>{data.course.title}</div>
              {data.course.instructor?.name ? <div className={styles.productMeta}>{data.course.instructor.name}</div> : null}
            </div>
          </div>

          <ul className={styles.lines}>
            <li className={styles.line}><span>السعر الأصلي</span><span className={styles.lineValue}>{usd(price)}</span></li>
            {discount > 0 ? (
              <li className={`${styles.line} ${styles.lineDiscount}`}>
                <span>الخصم ({discount}%)</span>
                <span className={styles.lineValue}>- {usd(price - total)}</span>
              </li>
            ) : null}
          </ul>

          <div className={styles.total}>
            <span className={styles.totalLabel}>الإجمالي</span>
            <span className={styles.totalValue}>{usd(total)}</span>
          </div>
          <p className={styles.sypHint}>{sypTotal ? `ما يعادل ${formatNumber(sypTotal)} ل.س` : ' '}</p>

          {done ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              <CheckCircle size={18} aria-hidden="true" /> <span>{done.message}</span>
            </div>
          ) : null}
          {error ? (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              <CircleAlert size={18} aria-hidden="true" /> <span>{error}</span>
            </div>
          ) : null}

          {done?.kind === 'pending' ? (
            <Link href="/dashboard" className={`btn btn-solid btn-lg ${styles.cta}`}>الذهاب إلى لوحة التحكم</Link>
          ) : !authenticated ? (
            <div className={styles.altActions}>
              <div className={`${styles.alert} ${styles.alertInfo}`} style={{ marginBottom: 0 }}>
                <Lock size={16} aria-hidden="true" />
                <span>{sessionExpired ? 'انتهت جلستك، سجّل الدخول مجدداً لإكمال الطلب.' : 'سجّل الدخول لإتمام الشراء، وسنعيدك إلى هذه الصفحة مباشرة.'}</span>
              </div>
              <Link href={loginHref} className={`btn btn-solid btn-lg ${styles.cta}`}><LogIn size={20} aria-hidden="true" /> تسجيل الدخول للمتابعة</Link>
              <Link href={registerHref} className={`btn btn-outline ${styles.cta}`}><UserPlus size={18} aria-hidden="true" /> إنشاء حساب جديد</Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={pay}
              disabled={processing || preparingReceipt || Boolean(done) || !method || walletShort || (walletPending && !walletFailed) || walletBlocked || total <= 0}
              className={`btn btn-solid btn-lg ${styles.cta}`}
            >
              {processing
                ? <><Loader2 size={20} className="spin" aria-hidden="true" /> {method === 'MANUAL' ? 'جاري إرسال الطلب والإيصال' : 'جاري المعالجة'}</>
                : <><ShieldCheck size={22} aria-hidden="true" /> إتمام الشراء ({usd(total)})</>}
            </button>
          )}
          {processing && slow ? (
            <p className={`${styles.alert} ${styles.alertInfo}`} role="status" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <Loader2 size={16} className="spin" aria-hidden="true" />
              <span>الاتصال أبطأ من المعتاد، ما زلنا نعالج طلبك. يرجى إبقاء هذه الصفحة مفتوحة.</span>
            </p>
          ) : null}

          <p className={styles.secureNote}><Lock size={12} aria-hidden="true" /> معاملة آمنة ومشفرة بالكامل</p>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className={styles.page} aria-busy="true" />}>
      <CheckoutContent />
    </Suspense>
  );
}
