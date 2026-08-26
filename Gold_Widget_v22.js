
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: #D4AF37; icon-glyph: chart-bar;

// Gold Widget v22 — responsive rendering and reliable source order

var PREVIEW_MODE = "medium";
var ACCESSORY_USE_BG = false;

var CFG = {
  debug: false,
  alertsEnabled: false,
  alertPct: 0.5,
  alertCooldownMinutes: 60,
  refreshHomeMinutes: 5,
  refreshLargeMinutes: 3,
  refreshLockMinutes: 3,
  // Avoid repeated API calls when iOS redraws the widget frequently.
  minFetchIntervalMinutes: 3,
  maxCacheAgeMinutes: 360,
  maxSourceAgeMinutes: 30
};

var TROY = 31.1034768;
var FX = 3.75;
var CACHE_FILE = "gold_widget_v20_cache.json";
var CACHE_SCHEMA = 2;
// Requested Saudi Riyal glyph. Keep the original symbol used by the widget.
var RIYAL = "\u20C1";

var C = {
  gold: new Color("#E6BE45"),
  red: new Color("#FF6B78"),
  white: Color.white(),
  secondary: new Color("#A7ADBC"),
  tertiary: new Color("#71798B"),
  card: new Color("#FFFFFF", 0.065)
};

var SOURCES = [
  {
    name: "gold-api.com",
    url: "https://api.gold-api.com/price/XAU/USD",
    headers: {
      "Accept": "application/json"
    },
    parse: function (r) {
      return r &&
        r.symbol === "XAU" &&
        r.currency === "USD"
        ? makeQuote(
            r.price,
            "gold-api.com",
            parseTime(r.updatedAt)
          )
        : null;
    }
  },
  {
    name: "goldprice.dev",
    url: "https://api.goldprice.dev/v1/spot/XAU-USD-SPOT",
    headers: {
      "Accept": "application/json"
    },
    parse: function (r) {
      return r &&
        r.symbol === "XAU" &&
        r.quote_currency === "USD" &&
        r.unit === "troy_ounce" &&
        r.is_stale !== true
        ? makeQuote(
            r.price,
            "goldprice.dev",
            parseTime(r.computed_at)
          )
        : null;
    }
  },
  {
    name: "aurumrates",
    url: "https://aurumrates.com/api/v1/spot",
    headers: {
      "Accept": "application/json"
    },
    parse: function (r) {
      var x = r && r.data && r.data.gold;

      return r &&
        r.status === "ok" &&
        r.currency === "USD" &&
        x
        ? makeQuote(
            x.price,
            "aurumrates",
            normalizeEpoch(x.timestamp)
          )
        : null;
    }
  },
  {
    name: "goldprice.org",
    url: "https://data-asg.goldprice.org/dbXRates/USD",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Referer": "https://goldprice.org/"
    },
    parse: function (r) {
      var x = r && r.items && r.items[0];
      return x
        ? makeQuote(x.xauPrice, "goldprice.org")
        : null;
    }
  }
];

var openHub = Boolean(
  !config.runsInWidget &&
  args.queryParameters &&
  args.queryParameters._g === "1"
);

if (openHub) {
  await presentContactHub();
  Script.complete();
} else {
  var fm = FileManager.local();

  var cachePath = fm.joinPath(
    fm.documentsDirectory(),
    CACHE_FILE
  );

  var cache = readCache();
  // Manual runs may refresh immediately; widget runs respect the cache gate.
  var shouldNetworkFetch =
    !config.runsInWidget ||
    shouldFetch(cache);
  var gold = shouldNetworkFetch
    ? await fetchGold()
    : null;

  if (gold) {
    var nextCache = {
      schema: CACHE_SCHEMA,
      oz: gold.ozUsd,
      fetchedAt: gold.fetchedAt,
      sourceUpdatedAt: gold.sourceUpdatedAt,
      source: gold.source,
      lastAlert: cache
        ? Number(cache.lastAlert) || 0
        : 0
    };

    await maybeNotify(cache, nextCache);
    writeCache(nextCache);
  } else if (isUsableCache(cache)) {
    gold = {
      ozUsd: Number(cache.oz),
      fetchedAt: Number(cache.fetchedAt),
      sourceUpdatedAt:
        Number(cache.sourceUpdatedAt) || 0,
      source: String(cache.source || "saved"),
      fromCache: true
    };
  }

  var family = config.runsInWidget
    ? (config.widgetFamily || "medium")
    : PREVIEW_MODE;

  var widget = new ListWidget();

  applyBackground(widget, family);

  var sealOK = verifySeal();

  if (!sealOK) {
    buildSealError(widget, family);
  } else if (
    gold &&
    validPrice(gold.ozUsd)
  ) {
    if (family === "small") {
      buildSmall(widget);
    } else if (
      family === "large" ||
      family === "extraLarge"
    ) {
      buildLarge(widget);
    } else if (
      family === "accessoryRectangular"
    ) {
      buildLockRect(widget);
    } else if (
      family === "accessoryInline"
    ) {
      buildInline(widget);
    } else if (
      family === "accessoryCircular"
    ) {
      buildCircular(widget);
    } else {
      buildMedium(widget);
    }
  } else {
    buildError(widget, family);
  }

  if (sealOK) {
    widget.url = contactHubURL();
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else if (family === "small") {
    await widget.presentSmall();
  } else if (family === "large") {
    await widget.presentLarge();
  } else if (family === "extraLarge") {
    await widget.presentExtraLarge();
  } else if (
    family === "accessoryRectangular"
  ) {
    await widget.presentAccessoryRectangular();
  } else if (
    family === "accessoryInline"
  ) {
    await widget.presentAccessoryInline();
  } else if (
    family === "accessoryCircular"
  ) {
    await widget.presentAccessoryCircular();
  } else {
    await widget.presentMedium();
  }

  Script.complete();
}

// CONTACT HUB

async function presentContactHub() {
  if (!verifySeal()) {
    await presentIntegrityAlert();
    return;
  }

  var links = contactLinks();

  if (!links) {
    await presentIntegrityAlert();
    return;
  }

  var table = new UITable();
  table.showSeparators = false;

  var header = new UITableRow();
  header.height = 94;
  header.backgroundColor = new Color("#0B0E14");

  var headerText = header.addText(
    "واتساب",
    "تواصل مباشر مع صاحب الويدجت"
  );
  headerText.centerAligned();
  headerText.titleFont = Font.blackSystemFont(28);
  headerText.titleColor = C.gold;
  headerText.subtitleFont = Font.mediumSystemFont(13);
  headerText.subtitleColor = C.secondary;
  table.addRow(header);

  addContactRow(table, {
    title: "واتساب",
    detail: "967774059807",
    symbol: "message.fill",
    background: "#DDF8E7"
  }, links[0]);

  var footer = new UITableRow();
  footer.height = 54;
  footer.backgroundColor = new Color("#111620");

  var footerText = footer.addText(
    "فتح واتساب",
    "اضغط على البطاقة للانتقال مباشرة"
  );
  footerText.centerAligned();
  footerText.titleFont = Font.boldSystemFont(13);
  footerText.titleColor = C.gold;
  footerText.subtitleFont = Font.systemFont(10);
  footerText.subtitleColor = C.secondary;
  table.addRow(footer);

  await table.present(false);
}

function addContactRow(
  table,
  item,
  url
) {
  var row = new UITableRow();

  row.height = 67;
  row.cellSpacing = 10;
  row.backgroundColor =
    new Color(item.background);
  row.dismissOnSelect = true;

  row.onSelect = function () {
    Safari.open(url);
  };

  var symbol =
    SFSymbol.named(item.symbol);

  if (!symbol) {
    symbol = SFSymbol.named("link");
  }

  symbol.applyFont(
    Font.boldSystemFont(23)
  );

  var icon = row.addImage(
    symbol.image
  );

  icon.widthWeight = 15;
  icon.centerAligned();

  var text = row.addText(
    item.title,
    item.detail
  );

  text.widthWeight = 75;
  text.titleFont =
    Font.boldSystemFont(18);
  text.titleColor =
    new Color("#111318");
  text.subtitleFont =
    Font.mediumSystemFont(11);
  text.subtitleColor =
    new Color("#5D6470");
  text.rightAligned();

  var arrowSymbol =
    SFSymbol.named("chevron.left");

  arrowSymbol.applyFont(
    Font.boldSystemFont(14)
  );

  var arrow = row.addImage(
    arrowSymbol.image
  );

  arrow.widthWeight = 10;
  arrow.centerAligned();

  table.addRow(row);
}

async function presentIntegrityAlert() {
  var alert = new Alert();

  alert.title =
    "تعذر فتح مركز التواصل";

  alert.message =
    "بيانات هذه النسخة غير سليمة أو تعرضت للتغيير.";

  alert.addCancelAction("إغلاق");

  await alert.presentAlert();
}

function contactLinks() {
  try {
    var links = JSON.parse(
      sealedValue(1)
    );

    return (
      Array.isArray(links) &&
      links.length === 1
    )
      ? links
      : null;
  } catch (e) {
    return null;
  }
}

function contactHubURL() {
  var url =
    URLScheme.forRunningScript();

  var separator =
    url.indexOf("?") >= 0
      ? "&"
      : "?";

  return (
    url +
    separator +
    "_g=1"
  );
}

// SMALL

function buildSmall(w) {
  w.setPadding(-2, 4, 1, 4);

  var header = w.addStack();

  header.layoutHorizontally();
  header.centerAlignContent();
  header.size = new Size(0, 12);
  header.setPadding(0, 3, 0, 3);
  header.addSpacer(14);

  var update = header.addText(
    lastUpdateText(false)
  );

  update.font =
    Font.boldSystemFont(10);

  update.textColor =
    gold.fromCache
      ? C.tertiary
      : C.secondary;

  update.lineLimit = 1;
  update.minimumScaleFactor = 0.76;

  header.addSpacer();

  var brand = header.addText(
    sealedValue(0)
  );

  brand.font =
    Font.boldSystemFont(10);

  brand.textColor = C.secondary;
  brand.lineLimit = 1;
  brand.minimumScaleFactor = 0.76;

  header.addSpacer(2);
  w.addSpacer(2);

  var heroRow = w.addStack();

  heroRow.layoutHorizontally();
  heroRow.bottomAlignContent();
  heroRow.addSpacer();

  var ounce = heroRow.addText(
    ltr(
      "$" +
      money(gold.ozUsd)
    )
  );

  ounce.font =
    Font.blackSystemFont(48);

  ounce.textColor = C.white;
  ounce.centerAlignText();
  ounce.lineLimit = 1;
  ounce.minimumScaleFactor = 0.52;

  heroRow.addSpacer();
  w.addSpacer(6);

  var prices =
    karatPrices(gold.ozUsd);

  addSmallHorizontalCard(
    w,
    "21K",
    prices.g21
  );

  w.addSpacer(2);

  addSmallHorizontalCard(
    w,
    "18K",
    prices.g18
  );

  setRefresh(
    w,
    CFG.refreshHomeMinutes
  );
}

function addSmallHorizontalCard(
  w,
  karat,
  value
) {
  var outer = w.addStack();

  outer.layoutHorizontally();
  outer.addSpacer();

  var card = outer.addStack();

  card.layoutHorizontally();
  card.centerAlignContent();
  // Content-driven width prevents clipping on compact devices.
  card.size = new Size(0, 44);
  card.cornerRadius = 11;
  card.backgroundColor = C.card;
  card.setPadding(1, 3, 1, 3);

  var priceGroup = card.addStack();

  priceGroup.layoutHorizontally();
  priceGroup.bottomAlignContent();

  var price = priceGroup.addText(
    ltr(gramMoney(value))
  );

  price.font =
    Font.boldSystemFont(38);

  price.textColor = C.white;
  price.lineLimit = 1;
  price.minimumScaleFactor = 0.72;

  priceGroup.addSpacer(1);

  var riyal =
    priceGroup.addText(RIYAL);

  riyal.font =
    Font.boldSystemFont(34);

  riyal.textColor = C.white;
  riyal.lineLimit = 1;

  card.addSpacer(3);

  var title =
    card.addText(karat);

  title.font =
    Font.boldSystemFont(17);

  title.textColor = C.gold;
  title.lineLimit = 1;

  outer.addSpacer();
}

// MEDIUM

function buildMedium(w) {
  w.setPadding(3, 8, 4, 8);

  var prices =
    karatPrices(gold.ozUsd);

  var header = w.addStack();

  header.layoutHorizontally();
  header.centerAlignContent();
  header.addSpacer(6);

  var update = header.addText(
    lastUpdateText(false)
  );

  update.font =
    Font.boldSystemFont(11);

  update.textColor =
    gold.fromCache
      ? C.tertiary
      : C.secondary;

  update.lineLimit = 1;
  update.minimumScaleFactor = 0.82;

  header.addSpacer();

  var brand = header.addText(
    sealedValue(0)
  );

  brand.font =
    Font.boldSystemFont(11);

  brand.textColor = C.secondary;
  brand.lineLimit = 1;
  brand.minimumScaleFactor = 0.82;

  header.addSpacer(6);
  w.addSpacer(1);

  var hero = w.addStack();

  hero.layoutHorizontally();
  hero.centerAlignContent();
  hero.addSpacer();

  var ounce = hero.addText(
    ltr(
      "$" +
      money(gold.ozUsd)
    )
  );

  ounce.font =
    Font.blackSystemFont(50);

  ounce.textColor = C.white;
  ounce.lineLimit = 1;
  ounce.minimumScaleFactor = 0.72;

  hero.addSpacer();
  w.addSpacer(4);

  var cards = w.addStack();

  cards.layoutHorizontally();
  cards.addSpacer();

  addMediumCard(
    cards,
    "21K",
    prices.g21
  );

  cards.addSpacer(6);

  addMediumCard(
    cards,
    "18K",
    prices.g18
  );

  cards.addSpacer();

  setRefresh(
    w,
    CFG.refreshHomeMinutes
  );
}

function addMediumCard(
  row,
  karat,
  value
) {
  var card = row.addStack();

  card.layoutVertically();
  card.centerAlignContent();
  // Content-driven width prevents clipping on compact devices.
  card.size = new Size(0, 84);
  card.cornerRadius = 13;
  card.backgroundColor = C.card;
  card.setPadding(5, 5, 4, 5);

  var title =
    card.addText(karat);

  title.font =
    Font.boldSystemFont(19);

  title.textColor = C.gold;
  title.centerAlignText();
  title.lineLimit = 1;

  card.addSpacer(1);

  var priceRow = card.addStack();

  priceRow.layoutHorizontally();
  priceRow.bottomAlignContent();
  priceRow.addSpacer();

  var price = priceRow.addText(
    ltr(gramMoney(value))
  );

  price.font =
    Font.boldSystemFont(39);

  price.textColor = C.white;
  price.lineLimit = 1;
  price.minimumScaleFactor = 0.75;

  priceRow.addSpacer(2);

  var riyal =
    priceRow.addText(RIYAL);

  riyal.font =
    Font.boldSystemFont(34);

  riyal.textColor = C.white;
  riyal.lineLimit = 1;

  priceRow.addSpacer();
}

// LARGE

function buildLarge(w) {
  w.setPadding(2, 9, 5, 9);

  var prices =
    karatPrices(gold.ozUsd);

  var header = w.addStack();

  header.layoutHorizontally();
  header.centerAlignContent();
  header.size = new Size(0, 17);
  header.setPadding(0, 5, 0, 5);
  header.addSpacer(8);

  var update = header.addText(
    lastUpdateText(true)
  );

  update.font =
    Font.boldSystemFont(13);

  update.textColor =
    gold.fromCache
      ? C.tertiary
      : C.secondary;

  update.lineLimit = 1;
  update.minimumScaleFactor = 0.84;

  header.addSpacer();

  var brand = header.addText(
    sealedValue(0)
  );

  brand.font =
    Font.boldSystemFont(13);

  brand.textColor = C.secondary;
  brand.lineLimit = 1;
  brand.minimumScaleFactor = 0.84;

  header.addSpacer(5);
  w.addSpacer(4);

  var ounceRow = w.addStack();

  ounceRow.layoutHorizontally();
  ounceRow.bottomAlignContent();
  ounceRow.size = new Size(0, 82);
  ounceRow.addSpacer();

  var ounce = ounceRow.addText(
    ltr(
      "$" +
      money(gold.ozUsd)
    )
  );

  ounce.font =
    Font.blackSystemFont(74);

  ounce.textColor = C.white;
  ounce.centerAlignText();
  ounce.lineLimit = 1;
  ounce.minimumScaleFactor = 0.76;

  ounceRow.addSpacer();
  w.addSpacer(9);

  addLargeHorizontalCard(
    w,
    "21K",
    prices.g21
  );

  w.addSpacer(6);

  addLargeHorizontalCard(
    w,
    "18K",
    prices.g18
  );

  setRefresh(
    w,
    CFG.refreshLargeMinutes
  );
}

function addLargeHorizontalCard(
  w,
  karat,
  value
) {
  var outer = w.addStack();

  outer.layoutHorizontally();
  outer.addSpacer();

  var card = outer.addStack();

  card.layoutVertically();
  // Content-driven width prevents clipping across iPhone and iPad sizes.
  card.size = new Size(0, 125);
  card.cornerRadius = 16;
  card.backgroundColor = C.card;
  card.setPadding(6, 12, 7, 12);

  var titleRow = card.addStack();

  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  titleRow.addSpacer();

  var title =
    titleRow.addText(karat);

  title.font =
    Font.boldSystemFont(27);

  title.textColor = C.gold;
  title.lineLimit = 1;

  titleRow.addSpacer(4);

  var priceRow = card.addStack();

  priceRow.layoutHorizontally();
  priceRow.bottomAlignContent();
  priceRow.addSpacer();

  var price = priceRow.addText(
    ltr(gramMoney(value))
  );

  price.font =
    Font.boldSystemFont(66);

  price.textColor = C.white;
  price.lineLimit = 1;
  price.minimumScaleFactor = 0.92;

  priceRow.addSpacer(3);

  var riyal =
    priceRow.addText(RIYAL);

  riyal.font =
    Font.boldSystemFont(53);

  riyal.textColor = C.white;
  riyal.lineLimit = 1;

  priceRow.addSpacer();
  outer.addSpacer();
}

// LOCK SCREEN RECTANGULAR

function buildLockRect(w) {
  w.setPadding(-3, 2, -2, 2);

  var prices =
    karatPrices(gold.ozUsd);

  var root = w.addStack();

  root.layoutVertically();
  root.size = new Size(0, 72);

  var header = root.addStack();

  header.layoutHorizontally();
  header.centerAlignContent();
  header.size = new Size(0, 11);
  header.setPadding(0, 3, 0, 3);

  var update = header.addText(
    lockUpdateText()
  );

  update.font =
    Font.boldSystemFont(9);

  update.textColor =
    gold.fromCache
      ? C.tertiary
      : C.secondary;

  update.lineLimit = 1;
  update.minimumScaleFactor = 0.75;

  header.addSpacer();

  var brand = header.addText(
    sealedValue(0)
  );

  brand.font =
    Font.boldSystemFont(9);

  brand.textColor = C.secondary;
  brand.lineLimit = 1;
  brand.minimumScaleFactor = 0.84;

  root.addSpacer(1);

  var ounceRow = root.addStack();

  ounceRow.layoutHorizontally();
  ounceRow.bottomAlignContent();
  ounceRow.size = new Size(0, 33);
  ounceRow.addSpacer();

  var ounce = ounceRow.addText(
    ltr(
      "$" +
      money(gold.ozUsd)
    )
  );

  ounce.font =
    Font.blackSystemFont(28);

  ounce.textColor = C.white;
  ounce.lineLimit = 1;
  ounce.minimumScaleFactor = 0.84;

  ounceRow.addSpacer();
  root.addSpacer(1);

  var gramRow = root.addStack();

  gramRow.layoutHorizontally();
  gramRow.bottomAlignContent();
  gramRow.size = new Size(0, 26);
  gramRow.addSpacer();

  var karat =
    gramRow.addText("21K");

  karat.font =
    Font.boldSystemFont(11);

  karat.textColor = C.white;
  karat.lineLimit = 1;

  gramRow.addSpacer(4);

  var price = gramRow.addText(
    ltr(
      gramMoney(prices.g21)
    )
  );

  price.font =
    Font.boldSystemFont(22);

  price.textColor = C.white;
  price.lineLimit = 1;
  price.minimumScaleFactor = 0.90;

  gramRow.addSpacer(2);

  var riyal =
    gramRow.addText(RIYAL);

  riyal.font =
    Font.boldSystemFont(19);

  riyal.textColor = C.white;
  riyal.lineLimit = 1;

  gramRow.addSpacer();

  setRefresh(
    w,
    CFG.refreshLockMinutes
  );
}

// LOCK SCREEN INLINE

function buildInline(w) {
  var prices =
    karatPrices(gold.ozUsd);

  var text = w.addText(
    "Gold $" +
    money(gold.ozUsd) +
    " · 21K " +
    gramMoney(prices.g21) +
    " " +
    RIYAL
  );

  text.font =
    Font.boldSystemFont(13);
  text.textColor = C.white;
  text.lineLimit = 1;
  text.minimumScaleFactor = 0.70;

  setRefresh(
    w,
    CFG.refreshLockMinutes
  );
}

// LOCK SCREEN CIRCULAR

function buildCircular(w) {
  var prices =
    karatPrices(gold.ozUsd);

  var title =
    w.addText("21K");

  title.font =
    Font.boldSystemFont(8);

  title.textColor = C.white;
  title.centerAlignText();

  w.addSpacer(1);

  var value = w.addText(
    integer(prices.g21)
  );

  value.font =
    Font.blackSystemFont(16);

  value.textColor = C.white;
  value.centerAlignText();
  value.lineLimit = 1;
  value.minimumScaleFactor = 0.50;

  setRefresh(
    w,
    CFG.refreshLockMinutes
  );
}

// ERROR DISPLAY

function buildError(
  w,
  familyName
) {
  var accessory =
    isAccessory(familyName);

  if (accessory) {
    w.setPadding(4, 5, 4, 5);

    var lockError = w.addText(
      "تعذر التحديث · سيُعاد تلقائيًا"
    );

    lockError.font =
      Font.boldSystemFont(11);

    lockError.textColor = C.white;
    lockError.centerAlignText();
  } else {
    w.setPadding(16, 16, 16, 16);
    w.addSpacer();

    var title = w.addText(
      "تعذر جلب سعر الذهب"
    );

    title.font =
      Font.boldSystemFont(15);

    title.textColor = C.red;
    title.centerAlignText();

    w.addSpacer(6);

    var help = w.addText(
      "سيحاول الويدجت التحديث تلقائيًا"
    );

    help.font =
      Font.mediumSystemFont(10);

    help.textColor = C.secondary;
    help.centerAlignText();

    w.addSpacer();
  }

  setRefresh(
    w,
    CFG.refreshHomeMinutes
  );
}

function buildSealError(
  w,
  familyName
) {
  w.setPadding(8, 8, 8, 8);
  w.addSpacer();

  var message =
    isAccessory(familyName)
      ? "بيانات النسخة غير سليمة"
      : "تعذر التحقق من سلامة النسخة";

  var text =
    w.addText(message);

  text.font =
    Font.boldSystemFont(
      isAccessory(familyName)
        ? 10
        : 14
    );

  text.textColor = C.red;
  text.centerAlignText();
  text.lineLimit = 2;

  w.addSpacer();

  setRefresh(
    w,
    CFG.refreshHomeMinutes
  );
}

// DATA

function makeQuote(
  price,
  source,
  sourceUpdatedAt
) {
  return {
    ozUsd: Number(price),
    source: source,
    fetchedAt: Date.now(),
    sourceUpdatedAt:
      Number(sourceUpdatedAt) || 0
  };
}

async function fetchGold() {
  var suspicious = null;

  for (
    var i = 0;
    i < SOURCES.length;
    i++
  ) {
    var source = SOURCES[i];

    try {
      var request =
        new Request(source.url);

      request.method = "GET";
      request.timeoutInterval = 8;
      request.headers = source.headers;

      var json =
        await request.loadJSON();

      var quote =
        source.parse(json);

      if (!validQuote(quote)) {
        continue;
      }

      if (
        isLargeJumpFromCache(quote)
      ) {
        if (
          suspicious &&
          quotesAgree(
            suspicious,
            quote
          )
        ) {
          debug(
            "Confirmed large move: " +
            suspicious.source +
            " + " +
            quote.source
          );

          return quote;
        }

        suspicious = quote;

        debug(
          "Waiting for confirmation of " +
          "large move from " +
          quote.source
        );

        continue;
      }

      debug(
        "OK " +
        source.name
      );

      return quote;
    } catch (e) {
      debug(
        "FAIL " +
        source.name +
        ": " +
        e
      );
    }
  }

  return null;
}

function validQuote(q) {
  return Boolean(
    q &&
    validPrice(q.ozUsd) &&
    sourceIsFresh(q.sourceUpdatedAt)
  );
}

function sourceIsFresh(timestamp) {
  var value = Number(timestamp) || 0;

  // A source without a timestamp cannot be age-checked; retain it as a fallback.
  if (value <= 0) {
    return true;
  }

  var age = Date.now() - value;
  var maxAge =
    CFG.maxSourceAgeMinutes *
    60 *
    1000;

  return age >= -300000 && age <= maxAge;
}

function isLargeJumpFromCache(q) {
  if (!isUsableCache(cache)) {
    return false;
  }

  var oldPrice =
    Number(cache.oz);

  var newPrice =
    Number(q.ozUsd);

  var jump =
    Math.abs(
      newPrice - oldPrice
    ) /
    oldPrice *
    100;

  return jump > 20;
}

function quotesAgree(a, b) {
  var first =
    Number(a.ozUsd);

  var second =
    Number(b.ozUsd);

  var midpoint =
    (first + second) / 2;

  var spread =
    Math.abs(first - second) /
    midpoint *
    100;

  return (
    Number.isFinite(spread) &&
    spread <= 2
  );
}

function validPrice(value) {
  var number =
    Number(value);

  return (
    Number.isFinite(number) &&
    number >= 100 &&
    number < 200000
  );
}

function validAmount(value) {
  var number =
    Number(value);

  return (
    Number.isFinite(number) &&
    number > 0 &&
    number < 200000
  );
}

function readCache() {
  try {
    if (!fm.fileExists(cachePath)) {
      return null;
    }

    var parsed = JSON.parse(
      fm.readString(cachePath)
    );

    if (
      !parsed ||
      !validPrice(parsed.oz)
    ) {
      return null;
    }

    if (
      parsed.schema !== 1 &&
      parsed.schema !== CACHE_SCHEMA
    ) {
      return null;
    }

    return parsed;
  } catch (e) {
    debug(
      "Cache read failed: " + e
    );

    return null;
  }
}

function writeCache(value) {
  try {
    fm.writeString(
      cachePath,
      JSON.stringify(value)
    );
  } catch (e) {
    debug(
      "Cache write failed: " + e
    );
  }
}

function shouldFetch(value) {
  if (!isUsableCache(value)) {
    return true;
  }

  var age = Date.now() - Number(value.fetchedAt);
  var minimumAge =
    CFG.minFetchIntervalMinutes *
    60 *
    1000;

  return age >= minimumAge;
}

function isUsableCache(value) {
  if (
    !value ||
    !validPrice(value.oz)
  ) {
    return false;
  }

  var age =
    Date.now() -
    Number(value.fetchedAt);

  var maxAge =
    CFG.maxCacheAgeMinutes *
    60 *
    1000;

  return (
    Number.isFinite(age) &&
    age >= -300000 &&
    age <= maxAge
  );
}

async function maybeNotify(
  previous,
  next
) {
  if (
    !CFG.alertsEnabled ||
    !previous ||
    !validPrice(previous.oz)
  ) {
    return;
  }

  var pct = Math.abs(
    (next.oz - previous.oz) /
    previous.oz *
    100
  );

  var last =
    Number(previous.lastAlert) || 0;

  var cooldown =
    CFG.alertCooldownMinutes *
    60 *
    1000;

  if (
    pct < CFG.alertPct ||
    Date.now() - last <= cooldown
  ) {
    return;
  }

  next.lastAlert = Date.now();

  try {
    var notification =
      new Notification();

    var up =
      next.oz > previous.oz;

    notification.title =
      up ? "Gold ▲" : "Gold ▼";

    notification.body =
      "$" +
      money(next.oz) +
      " (" +
      (up ? "+" : "-") +
      pct.toFixed(2) +
      "%)";

    notification.sound = "default";

    await notification.schedule();
  } catch (e) {
    debug(
      "Notification failed: " + e
    );
  }
}

function karatPrices(ounceUsd) {
  var gram24 =
    Number(ounceUsd) *
    FX /
    TROY;

  return {
    g21: gram24 * 21 / 24,
    g18: gram24 * 18 / 24
  };
}

function parseTime(value) {
  if (!value) {
    return 0;
  }

  var timestamp =
    new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function normalizeEpoch(value) {
  var number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return 0;
  }

  return number < 100000000000
    ? number * 1000
    : number;
}

// APPEARANCE

function applyBackground(
  w,
  familyName
) {
  if (isAccessory(familyName)) {
    w.addAccessoryWidgetBackground =
      ACCESSORY_USE_BG;

    return;
  }

  var gradient =
    new LinearGradient();

  gradient.colors = [
    new Color("#080A10"),
    new Color("#101520"),
    new Color("#080A10")
  ];

  gradient.locations = [
    0,
    0.52,
    1
  ];

  w.backgroundGradient = gradient;
}

function isAccessory(familyName) {
  return (
    familyName ===
      "accessoryRectangular" ||
    familyName ===
      "accessoryInline" ||
    familyName ===
      "accessoryCircular"
  );
}

// FORMATTING

function money(value) {
  return formatNumber(value, 2);
}

function gramMoney(value) {
  return formatNumber(value, 1);
}

function formatNumber(
  value,
  decimals
) {
  if (!validAmount(value)) {
    return "--";
  }

  return Number(value).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }
  );
}

function integer(value) {
  return validAmount(value)
    ? String(
        Math.round(Number(value))
      )
    : "--";
}

function timeText(timestamp) {
  if (!timestamp) {
    return "--:--";
  }

  var date =
    new Date(timestamp);

  var hours =
    String(date.getHours());

  var minutes =
    String(date.getMinutes())
      .padStart(2, "0");

  return hours + ":" + minutes;
}

function lastUpdateText(longForm) {
  var prefix = gold.fromCache
    ? (
        longForm
          ? "سعر محفوظ "
          : "محفوظ "
      )
    : (
        longForm
          ? "آخر تحديث "
          : "تحديث "
      );

  return (
    prefix +
    timeText(gold.fetchedAt)
  );
}

function lockUpdateText() {
  return (
    gold.fromCache
      ? "محفوظ "
      : ""
  ) + timeText(gold.fetchedAt);
}

function ltr(value) {
  return (
    "\u2066" +
    value +
    "\u2069"
  );
}

// Lightweight tamper deterrence for
// embedded identity and contact values.

function sealedValue(slot) {
  var data = slot === 0
    ? [
        237,
        157,
        132,
        125,
        119,
        86,
        243
      ]
    : [
        0, 162, 205, 190, 155, 100,
        74, 100, 172, 135, 186, 147,
        57, 81, 4, 169, 146, 230,
        194, 45, 8, 80, 185, 155,
        234, 192, 45, 117, 69, 209
      ];

  var seed =
    slot === 0 ? 173 : 91;

  var result = "";

  for (
    var i = 0;
    i < data.length;
    i++
  ) {
    result += String.fromCharCode(
      data[i] ^
      (
        (
          seed +
          i * 37
        ) &
        255
      )
    );
  }

  return slot === 0
    ? ltr(result)
    : result;
}

function verifySeal() {
  return (
    sealHash(
      unframe(sealedValue(0))
    ) === 2630043090 &&
    sealHash(
      sealedValue(1)
    ) === 2196180126 &&
    Boolean(contactLinks())
  );
}

function unframe(value) {
  return String(value).replace(
    /[\u2066\u2069]/g,
    ""
  );
}

function sealHash(value) {
  var hash = 2166136261;

  for (
    var i = 0;
    i < value.length;
    i++
  ) {
    hash ^= value.charCodeAt(i);

    hash = Math.imul(
      hash,
      16777619
    ) >>> 0;
  }

  return hash >>> 0;
}

function setRefresh(
  w,
  minutes
) {
  w.refreshAfterDate =
    new Date(
      Date.now() +
      minutes *
      60 *
      1000
    );
}

function debug(message) {
  if (CFG.debug) {
    console.log(message);
  }
}