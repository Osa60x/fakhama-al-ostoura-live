import { lazy, Suspense, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { formatOunce, formatTime } from "./lib/format";
import { toNumber, useDashboard, type ChartRange, type Freshness, type HistoryPoint } from "./hooks/useDashboard";
import "./chart.css";

const AdminPage = lazy(async () => ({ default: (await import("./AdminPage")).AdminPage }));
type IconName = "share" | "refresh" | "chart" | "arrow" | "plus";
const RIYAL = "⃁";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, ReactNode> = {
    share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4M4 7V3m0 4h4M4 13a8 8 0 0 0 14.8 4M20 17v4m0-4h-4"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function FreshnessBadge({ value, loading }: { value: Freshness; loading: boolean }) {
  const label = loading ? "جارٍ التحديث" : value === "fresh" ? "السوق مباشر" : value === "stale" ? "آخر قراءة محفوظة" : "بانتظار السعر";
  return <span className={`freshness freshness-${value}`}><i />{label}</span>;
}

function PriceChart({ points, range }: { points: HistoryPoint[]; range: ChartRange }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartPoints = points.map(point => ({ ...point, value: toNumber(point.price_sar) })).filter((point): point is HistoryPoint & { value: number } => point.value !== null);
  if (chartPoints.length < 2) return <div className="chart-empty"><Icon name="chart" size={30}/><strong>بانتظار قراءات السوق</strong><span>سيظهر المسار عند وصول البيانات التاريخية.</span></div>;
  const values = chartPoints.map(point => point.value), min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, .01);
  const coords = chartPoints.map((point, index) => ({ ...point, x: 12 + index / (chartPoints.length - 1) * 276, y: 82 - (point.value - min) / span * 58 }));
  const line = coords.map(point => `${point.x},${point.y}`).join(" "), active = hovered === null ? null : coords[hovered];
  return <div className="chart-wrap" onMouseLeave={() => setHovered(null)}><svg viewBox="0 0 300 100" role="img" aria-label={`مخطط سعر الذهب للفترة ${range}`}><defs><linearGradient id="editorialChartFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path className="chart-grid-line" d="M10 22H290M10 52H290M10 82H290"/><path d={`M12,88 ${coords.map(point => `L${point.x},${point.y}`).join(" ")} L288,88 Z`} fill="url(#editorialChartFill)"/><polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>{coords.map((point, index) => <circle key={`${point.bucket}-${index}`} cx={point.x} cy={point.y} r="7" fill="transparent" tabIndex={0} aria-label={`${point.value.toFixed(2)} ${RIYAL}`} onMouseEnter={() => setHovered(index)} onFocus={() => setHovered(index)}/>)}</svg>{active ? <div className="chart-tooltip" style={{ left: `${Math.max(8, Math.min(92, active.x / 3))}%` }}><b>{active.value.toFixed(2)} {RIYAL}</b><span>{formatTime(active.bucket)}</span></div> : null}<div className="chart-axis"><span>{formatTime(chartPoints[0].bucket)}</span><span>{formatTime(chartPoints[chartPoints.length - 1].bucket)}</span></div></div>;
}

function PriceCard({ karat, grade, value, loading, index }: { karat: string; grade: string; value: number | null; loading: boolean; index: string }) {
  return <article className="price-card" style={{ "--card-index": `'${index}'` } as CSSProperties}><div className="card-number">{index}</div><div className="card-top"><span>{karat}K</span><small>{grade}</small></div><strong>{loading ? "—" : value?.toFixed(2)}</strong><b>{RIYAL}<em>/ جرام</em></b><div className="card-sweep"/></article>;
}

export function App() {
  const adminRoute = window.location.pathname === "/admin" || new URLSearchParams(window.location.search).get("admin") === "1";
  if (adminRoute) return <Suspense fallback={<main className="app-shell"><p>جارٍ تحميل الإدارة…</p></main>}><AdminPage /></Suspense>;
  const [range, setRange] = useState<ChartRange>("day");
  const { loading, reply } = useDashboard(range);
  const [copied, setCopied] = useState(false), data = reply?.data, freshness = reply?.freshness ?? "unavailable";
  const prices = { "24": toNumber(data?.final_24_sar), "21": toNumber(data?.final_21_sar), "18": toNumber(data?.final_18_sar) };
  const shareText = useMemo(() => data ? `سبائك الفخامة للذهب والمجوهرات\nسعر الأونصة: ${formatOunce(toNumber(data.xau_usd))} $\n24K: ${prices["24"]?.toFixed(2)} ${RIYAL} / جرام\n21K: ${prices["21"]?.toFixed(2)} ${RIYAL} / جرام\n18K: ${prices["18"]?.toFixed(2)} ${RIYAL} / جرام\nآخر تحديث: ${formatTime(data.fetched_at)}\n${window.location.origin}` : null, [data, prices]);
  const copyShare = async () => { if (!shareText || !navigator.clipboard) return; await navigator.clipboard.writeText(shareText); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const dynamicStyle = { "--obsidian-bg": "url(./obsidian-gold-brushed-bg.webp)" } as CSSProperties;
  return <main className="app-shell" data-skin="atelier-market" style={dynamicStyle}>
    <div className="ambient ambient-one" aria-hidden="true"/><div className="ambient ambient-two" aria-hidden="true"/><div className="gold-dust" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
    <header className="topbar" id="top"><a className="brand-lockup" href="#top" aria-label="العودة إلى بداية الموقع"><img className="brand-logo" src="./sabaaek-logo-user.png" alt="سبائك الفخامة للذهب والمجوهرات" width="112" height="76"/><span className="brand-divider"/><div><span>أسعار الذهب الفورية</span><h1>سبائك الفخامة</h1></div></a><nav aria-label="التنقل الرئيسي"><a className="active" href="#prices">السوق</a><a href="#history">السجل</a><a href="#contact">المتجر</a></nav><span className="live-mark"><i/> XAU/USD</span></header>
    <section className="hero-stage" aria-labelledby="hero-heading"><div className="hero-media"><video autoPlay muted loop playsInline preload="metadata" poster="./gold-wave.jpg" aria-label="خلفية متحركة من الذهب"><source src="./gold-motion.mp4" type="video/mp4"/></video><div className="media-gradient"/><div className="media-caption"><span>GOLD / 24</span><small>مشهد من خامات الذهب</small></div></div><div className="hero-copy"><div className="hero-kicker"><FreshnessBadge value={freshness} loading={loading}/><span>مؤشر عالمي مباشر</span></div><p className="eyebrow">سعر الأونصة بالدولار</p><h2 id="hero-heading">{loading ? "—" : `${formatOunce(toNumber(data?.xau_usd))} $`}</h2><div className="hero-meta"><span>آخر تحديث</span><time>{formatTime(data?.fetched_at)}</time></div><p className="hero-intro">قراءة واضحة للسوق، بواجهة تحمل ثقل المعدن ولمعانه.</p><div className="hero-actions"><a className="gold-button" href="#prices">عرض أسعار العيارات <Icon name="arrow" size={16}/></a><button className="ghost-button" onClick={() => window.location.reload()}><Icon name="refresh" size={16}/>تحديث</button></div></div><div className="hero-index">01<br/><span>السوق الآن</span></div></section>
    <section className="ticker" aria-label="ملخص السوق"><span>سبائك الفخامة</span><i/> <b>XAU/USD</b><span>ذهب نقي · بيانات فورية</span><i/> <b>{loading ? "—" : `${formatOunce(toNumber(data?.xau_usd))} $`}</b><span>السعر العالمي المرجعي</span></section>
    <section className="prices-section" id="prices" aria-labelledby="prices-heading"><div className="section-heading"><div><p className="eyebrow">قراءة السوق</p><h2 id="prices-heading">قيمة الجرام</h2></div><div className="section-note">ثلاث درجات، قراءة واحدة واضحة</div><button className="ghost-button share-button" disabled={!shareText} onClick={copyShare}><Icon name="share" size={16}/>{copied ? "تم النسخ" : "مشاركة الأسعار"}</button></div><div className="price-grid"><PriceCard index="01" karat="24" grade="نقي 999.9" value={prices["24"]} loading={loading}/><PriceCard index="02" karat="21" grade="875" value={prices["21"]} loading={loading}/><PriceCard index="03" karat="18" grade="750" value={prices["18"]} loading={loading}/></div></section>
    <section className="visual-strip" aria-label="خامات الذهب"><figure><img src="./gold-wave.jpg" alt="موجات ذهبية لامعة"/><figcaption>لمعة / 01</figcaption></figure><figure className="strip-feature"><img src="./gold-bars.webp" alt="سبائك ذهبية مرتبة"/><figcaption>المعدن / 02</figcaption></figure><figure><img src="./gold-stripe.jpg" alt="خط ذهبي على خلفية داكنة"/><figcaption>تفصيل / 03</figcaption></figure></section>
    <section className="history-section" id="history" aria-labelledby="history-heading"><div className="section-heading"><div><p className="eyebrow">تتبّع الحركة</p><h2 id="history-heading"><Icon name="chart" size={21}/> مسار السعر</h2></div><div className="range-tabs" aria-label="الفترة الزمنية">{(["day", "week", "month"] as ChartRange[]).map(item => <button key={item} className={range === item ? "active" : ""} aria-pressed={range === item} onClick={() => setRange(item)}>{item === "day" ? "24 ساعة" : item === "week" ? "شهر" : "سنة"}</button>)}</div></div><div className="chart-card"><div className="chart-context"><span>{reply?.history?.length ? `${reply.history.length} نقطة فعلية محفوظة` : "بانتظار القراءات"}</span><small>{formatOunce(toNumber(data?.xau_usd))} $ آخر قراءة</small></div><PriceChart points={reply?.history ?? []} range={range}/></div></section>
    <section className="contact-section" id="contact"><div className="contact-copy"><p className="eyebrow">زيارة / تواصل</p><h2>قطعة ذهبية تستحق <span>عينًا خبيرة.</span></h2><p>سبائك الفخامة للذهب والمجوهرات — النسيم، أسواق حجاب.</p><div className="contact-actions"><a className="gold-button" href="https://wa.me/966550441259" target="_blank" rel="noreferrer">تواصل عبر واتساب <Icon name="arrow" size={16}/></a><a className="ghost-button" href="tel:+966550441259">اتصال هاتفي</a></div></div><div className="business-card"><img src="./sabaaek-site-qr.png" width="108" height="108" alt="رمز QR لفتح موقع سبائك الفخامة"/><div><b>سبائك الفخامة</b><span>السجل التجاري 7016710969</span><span>النسيم — أسواق حجاب</span></div></div></section>
    <footer><span>سبائك الفخامة للذهب والمجوهرات</span><div><a href="https://wa.me/966550441259" target="_blank" rel="noreferrer">واتساب</a><a href="/admin">الإدارة</a><a href="https://wa.me/Osa60x" target="_blank" rel="noreferrer">@Osa60x</a></div></footer>
  </main>;
}
