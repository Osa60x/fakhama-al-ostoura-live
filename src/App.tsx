import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatOunce, formatSar, formatTime } from "./lib/format";
import { toNumber, useDashboard, type ChartRange, type Freshness, type HistoryPoint } from "./hooks/useDashboard";
import { STORE_THEMES, resolveStoreTheme } from "./lib/store-theme";
import "./chart.css";

const AdminPage = lazy(async () => ({ default: (await import("./AdminPage")).AdminPage }));

type IconName = "diamond" | "share" | "refresh" | "chart" | "calc" | "pin" | "arrow" | "spark";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, React.ReactNode> = {
    diamond: <><path d="m12 3 7 5-7 13L5 8l7-5Z"/><path d="m5 8 7 3 7-3M12 11v10"/></>,
    share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4M4 7V3m0 4h4M4 13a8 8 0 0 0 14.8 4M20 17v4m0-4h-4"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    calc: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h1M8 16h1M12 16h1M16 16h1"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></>
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function FreshnessBadge({ value, loading }: { value: Freshness; loading: boolean }) {
  const label = loading ? "جارٍ تحميل اللقطة الموثقة" : value === "fresh" ? "لقطة سعر موثقة" : value === "stale" ? "آخر لقطة متاحة" : "لا توجد لقطة موثقة";
  return <span className={`freshness freshness-${value}`}><i />{label}</span>;
}

function MiniChart({ points }: { points: HistoryPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = points.map(point => toNumber(point.price_sar)).filter((value): value is number => value !== null);
  if (values.length < 2) return <div className="chart-empty"><Icon name="chart" size={34}/><p>يعرض المخطط بعد توافر لقطات تاريخية موثقة.</p></div>;
  const min = Math.min(...values);
  const span = Math.max(Math.max(...values) - min, .01);
  const chartPoints = values.map((value, index) => ({ x: 10 + (index / (values.length - 1)) * 280, y: 82 - ((value - min) / span) * 62, value }));
  const line = chartPoints.map(point => `${point.x},${point.y}`).join(" ");
  const active = hovered === null ? null : chartPoints[hovered];
  return <div className="mini-chart" onMouseLeave={() => setHovered(null)}><svg viewBox="0 0 300 100" role="img" aria-label="مخطط سعر عيار 24 التاريخي"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="currentColor" stopOpacity=".24"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d={`M10,88 ${line.split(" ").map(point => `L${point}`).join(" ")} L290,88 Z`} fill="url(#chartFill)"/><polyline points={line} fill="none" stroke="currentColor" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/>{chartPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="7" fill="transparent" onMouseEnter={() => setHovered(index)}/>)}</svg>{active ? <span className="chart-tooltip" style={{ left: `${Math.max(8, Math.min(82, active.x / 3))}%` }}>{formatSar(active.value)} ⃁</span> : null}</div>;
}

export function App() {
  const adminRoute = window.location.pathname === "/admin" || new URLSearchParams(window.location.search).get("admin") === "1";
  if (adminRoute) return <Suspense fallback={<main className="app-shell"><p>جارٍ تحميل الإدارة…</p></main>}><AdminPage /></Suspense>;
  const [range, setRange] = useState<ChartRange>("day");
  const [introVisible, setIntroVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);
  const { loading, reply } = useDashboard(range);
  const [grams, setGrams] = useState("10");
  const [carat, setCarat] = useState<"24" | "21" | "18">("21");
  const [copied, setCopied] = useState(false);
  const data = reply?.data;
  const skin = resolveStoreTheme(data?.palette);
  const logoUrl = data?.logo_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/branding/${data.logo_path}` : null;
  const freshness = reply?.freshness ?? "unavailable";
  const prices = { "24": toNumber(data?.final_24_sar), "21": toNumber(data?.final_21_sar), "18": toNumber(data?.final_18_sar) };
  const weight = Number(grams);
  const estimate = Number.isFinite(weight) && weight > 0 && prices[carat] !== null ? weight * (prices[carat] ?? 0) : null;
  const shareText = useMemo(() => data && prices["24"] !== null && prices["21"] !== null && prices["18"] !== null ? [
    data.site_name ?? "فخامة الأسطورة",
    `سعر الأونصة: ${formatOunce(toNumber(data.xau_usd))} $`,
    `24K: ${formatSar(prices["24"])} ⃁ / جرام`,
    `21K: ${formatSar(prices["21"])} ⃁ / جرام`,
    `18K: ${formatSar(prices["18"])} ⃁ / جرام`,
    `وقت اللقطة: ${formatTime(data.fetched_at)}`,
    window.location.origin
  ].join("\n") : null, [data, prices]);
  const copyShare = async () => {
    if (!shareText || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const dynamicStyle = {
    "--title-color": data?.title_color ?? "#624519",
    "--subtitle-color": data?.subtitle_color ?? "#6B6255",
    "--title-font": data?.title_font ?? "Cairo",
    "--title-size": `${data?.title_size ?? 34}px`,
    "--title-weight": data?.title_weight ?? 800,
    "--subtitle-size": `${data?.subtitle_size ?? 15}px`,
    "--subtitle-weight": data?.subtitle_weight ?? 500
  } as CSSProperties;

  return <main className={`app-shell${introVisible ? " intro-active" : ""}`} data-skin={skin} style={dynamicStyle}>
    {introVisible ? <div className="intro-screen" role="status" aria-label="جارٍ تجهيز لوحة أسعار الذهب"><div className="intro-emblem"><Icon name="diamond" size={42}/></div><p>فخامة الأسطورة</p><span>نحو رؤية أوضح للذهب</span><button onClick={() => setIntroVisible(false)}>الدخول الآن</button></div> : null}
    <header className="topbar surface">
      <a className="brand-lockup" href="#top" aria-label="العودة إلى البداية">{logoUrl ? <img className="brand-logo" src={logoUrl} alt="شعار المتجر" width="52" height="52" /> : <span className="brand-mark"><Icon name="diamond" size={22}/></span>}<div><p>أسعار الذهب</p><h1>{data?.site_name ?? "فخامة الأسطورة"}</h1></div></a>
      <nav aria-label="التنقل الرئيسي"><a href="#prices">الأسعار</a><a href="#story">الحكاية</a><a href="#calculator">الحاسبة</a></nav>
      <span className="skin-label" aria-label={`ثيمة المتجر: ${STORE_THEMES[skin].label}`}>{STORE_THEMES[skin].label}</span>
    </header>
    <section className="hero" id="top" aria-labelledby="hero-heading"><div className="hero-copy"><span className="hero-kicker"><Icon name="spark" size={14}/> مرجعك اليومي للذهب</span><h2 id="hero-heading">كل لحظة<br/><em>تستحق ذهبًا.</em></h2><p>لقطة موثقة للسوق، تُقدّم بهدوء يليق بقراراتك الثمينة.</p><a className="hero-cta" href="#prices">اكتشف سعر اليوم <Icon name="arrow" size={17}/></a><div className="hero-note"><span>01</span><span>السوق بوضوح</span><span className="line"/><span>آخر تحديث {formatTime(data?.fetched_at)}</span></div></div><div className="hero-art" role="img" aria-label="تشكيلة مجوهرات ذهبية فاخرة"><div className="hero-art-caption"><small>THE ESSENTIAL</small><strong>24K</strong></div></div></section>

    <section className="market-summary surface market-strip" aria-labelledby="market-heading">
      <div><FreshnessBadge value={freshness} loading={loading}/><p className="eyebrow">سعر أونصة الذهب</p><h2 id="market-heading">{loading ? "…" : `${formatOunce(toNumber(data?.xau_usd))} $`}</h2><p className="market-meta">آخر لقطة: <time>{formatTime(data?.fetched_at)}</time></p></div>
      <div className="market-aside"><span>الذهب</span><Icon name="diamond" size={62}/><b>قيمة<br/>تتوارثها الأجيال</b></div>
    </section>

    <section className="prices-section" id="prices" aria-labelledby="prices-heading">
      <div className="section-heading"><div><p className="eyebrow">سعر الجرام</p><h2 id="prices-heading">العيارات المتاحة</h2></div><div className="actions"><button className="button" disabled={!shareText} onClick={copyShare} aria-live="polite"><Icon name="share" size={17}/>{copied ? "تم النسخ" : "مشاركة"}</button><button className="button" onClick={() => window.location.reload()}><Icon name="refresh" size={17}/>تحديث العرض</button></div></div>
      <div className="price-grid">{(["24", "21", "18"] as const).map((item, index) => <article className={`price-card surface price-card-${index + 1}`} key={item}><div className="card-top"><span>{item}K</span><small>{index === 0 ? "الأعلى نقاءً" : index === 1 ? "الأكثر طلبًا" : "لمسة يومية"}</small></div><strong>{loading ? "…" : formatSar(prices[item])}</strong><b>⃁ <em>/ جرام</em></b><small className="price-status">{freshness === "fresh" ? "سعر استرشادي" : freshness === "stale" ? "آخر سعر متاح" : "بانتظار لقطة موثقة"}</small></article>)}</div>
    </section>

    <section className="manifesto surface" id="story"><div className="manifesto-number">02</div><div><p className="eyebrow">فلسفة الأسطورة</p><h2>نؤمن أن الذهب<br/><em>ليس سعرًا فقط.</em></h2></div><p>إنه وعدٌ بالجودة، وذكرى تُصاغ بعناية، وقيمة تعرف كيف تبقى. لذلك نصنع لك لوحة واضحة، هادئة، وموثوقة في كل زيارة.</p></section>
    <section className="collections" aria-labelledby="collections-heading"><div className="section-heading"><div><p className="eyebrow">03 / من المشغل</p><h2 id="collections-heading">تفاصيل تستحق التوقف</h2></div><span className="section-index">مختارات بصرية</span></div><div className="collection-grid"><article className="collection-card collection-necklace"><img src="/collection-necklace.jpg" alt="قلادة ذهبية رقيقة على حرير عاجي"/><div><small>01 — هدوء الخط</small><h3>ذهب يُشبه الضوء</h3></div></article><article className="collection-card collection-ring"><img src="/collection-ring.jpg" alt="خاتم ذهبي منحوت على مخمل داكن"/><div><small>02 — قوة التفاصيل</small><h3>حضور بلا ضجيج</h3></div></article></div></section>

    <section className="insights-grid" id="calculator">
      <article className="chart-card surface"><div className="section-heading"><div><p className="eyebrow">متابعة مرئية</p><h2><Icon name="chart" size={20}/> مخطط السعر</h2></div><div className="range-tabs" aria-label="نطاق المخطط">{(["day", "week", "month"] as ChartRange[]).map(item => <button key={item} className={range === item ? "active" : ""} aria-pressed={range === item} onClick={() => setRange(item)}>{item === "day" ? "يومي" : item === "week" ? "أسبوعي" : "شهري"}</button>)}</div></div><MiniChart points={reply?.history ?? []}/></article>
      <article className="calculator-card surface"><p className="eyebrow"><Icon name="calc" size={17}/> أداة استرشادية</p><h2>حاسبة قيمة الذهب</h2><label>الوزن بالجرام<input name="grams" autoComplete="off" inputMode="decimal" value={grams} onChange={event => setGrams(event.target.value)} /></label><label>العيار<select name="carat" value={carat} onChange={event => setCarat(event.target.value as "24" | "21" | "18")}><option value="24">عيار 24</option><option value="21">عيار 21</option><option value="18">عيار 18</option></select></label><div className="estimate"><span>القيمة التقديرية</span><strong>{formatSar(estimate)} <b>⃁</b></strong></div><p>لا تشمل المصنعية أو الضريبة أو فروقات المتاجر.</p></article>
    </section>

    <aside className="disclosure"><b>تنبيه</b> الأسعار استرشادية وليست عرض بيع أو شراء نهائياً. تحقق من السعر لدى المتجر قبل اتخاذ قرار.</aside>
    <footer><div>{data?.show_address !== false && data?.address ? <><Icon name="pin" size={17}/><span>{data.address}</span></> : null}</div><div className="footer-links"><a href="https://wa.me/966551677479" target="_blank" rel="noreferrer">@Osa60x</a><a className="admin-entry" href="/admin">الإدارة</a></div></footer>
  </main>;
}
