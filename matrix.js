const PRODAMUS_IFRAME_CLASS = "prodamus-payform-widget";
const PRODAMUS_IFRAME_CLASS_V3 = "prodamus-payform-widget_v3";
const PRODAMUS_WHITE_LABEL_CLASS = "prodamus-white-label-widget";

// up to 2% of browsers need prefix
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

const createElem = (tag = "div", className = null, attributes = null) => {
  const elem = document.createElement(tag);
  if (className) {
    elem.className = className;
  }
  if (attributes) {
    Object.keys(attributes).forEach(key => {
      elem.setAttribute(key, attributes[key]);
    });
  }
  return elem;
};

const openIframe = (
  urlPath = null,
  containerId = null,
  version = "default",
  securePayform,
) => {
  if (!urlPath) return;
  let domain = "widget.prodamus.ru";
  let protocol = "https";
  let className = containerId
    ? PRODAMUS_WHITE_LABEL_CLASS
    : PRODAMUS_IFRAME_CLASS;

  if (version === "beauty") {
    if (!securePayform) return;
    domain = securePayform;
    // className = PRODAMUS_IFRAME_CLASS_V3;
  } else {
    if (window.location.href.indexOf("widget.dev.prodamus.ru") > -1) {
      domain = "widget.dev.prodamus.ru";
    } else if (
      window.location.href.indexOf("localhost:") > -1 &&
      (window.location.pathname === "/src/demo/" ||
        window.location.pathname === "/demo/")
    ) {
      protocol = "http";
      domain = window.location.hostname + ":" + window.location.port;
    }
  }

  const iframe = createElem("iframe", null, {
    class: className,
    frameBorder: "0",
    src: protocol + "://" + domain + "/?" + urlPath,
    "data-id": PRODAMUS_IFRAME_CLASS,
  });

  const container = containerId
    ? document.querySelector(`#${containerId}`)
    : document.body;

  const oldIframe = container.querySelector(
    `iframe[data-id=${PRODAMUS_IFRAME_CLASS}]`,
  );

  if (oldIframe) {
    oldIframe.remove();
  }

  container.appendChild(iframe);
  containerId && container.scrollIntoView(false);
};

const serializeArray = products => {
  let serializedString = "";
  products.forEach((product, i) => {
    Object.entries(product).forEach(([key, value]) => {
      if (key === "tax") {
        Object.entries(value).forEach(([key, value]) => {
          serializedString += `&products[${i}][tax][${encodeURIComponent(
            key,
          )}]=${encodeURIComponent(value)}`;
        });
      } else
        serializedString += `&products[${i}][${encodeURIComponent(
          key,
        )}]=${encodeURIComponent(value)}`;
    });
  });
  return serializedString;
};

const payformInit = async (payformDomain = null, params = {}) => {
  if (!payformDomain) return;

  const newParams = { ...params };
  newParams.customer_phone = (newParams.customer_phone || "").replace(
    /[^+\d]/g,
    "",
  );
  newParams.customer_email = (newParams.customer_email || "").replaceAll(
    "+",
    "%2b",
  );

  let version = newParams.version;
  delete newParams["version"];
  let securePayform = "";
  if (version && version === "beauty") {
    securePayform = payformDomain.replace(
      /(^|\.)(payform)(\.|$)/g,
      "$1securepayform$3",
    );
    newParams.widget = 1;
  }

  let payformContainerId = "";
  if (newParams.white_label_container && newParams.white_label) {
    payformContainerId = newParams.white_label_container;
    delete newParams["white_label_container"];
  } else if (newParams.white_label) {
    console.error(
      "Р”Р»СЏ РІСЂРµР·РєРё РІРёРґР¶РµС‚Р° С‚СЂРµР±СѓРµС‚СЃСЏ СѓРєР°Р·Р°С‚СЊ РјРµСЃС‚Рѕ РІСЂРµР·РєРё, РїРµСЂРµРґР°РІ РїР°СЂР°РјРµС‚СЂ white_label_container." +
        "\n РџР°СЂР°РјРµС‚СЂ white_label Р±СѓРґРµС‚ РїСЂРѕРёРіРЅРѕСЂРёСЂРѕРІР°РЅ",
    );
  } else {
    delete newParams["white_label_container"];
    delete newParams["white_label"];
  }

  const products = newParams["products"];
  delete newParams["products"];

  let str = new URLSearchParams(newParams).toString();
  const url = new URL(window.location.href);

  if (products) str += serializeArray(products);

  openIframe(
    `${
      version === "beauty" ? "domain" : "payform"
    }=${payformDomain}&do=link&${str}&source=${url.host}`,
    payformContainerId,
    version,
    securePayform,
  );
};

const prodamusMessageListener = (event = null) => {
  if (
    !event ||
    typeof event.data !== "object" ||
    !("status" in event.data) ||
    !("source" in event.data)
  )
    return;
  if (event.data.source === "prodamus" && event.data.status === "close") {
    const iframe = document.querySelector("." + PRODAMUS_IFRAME_CLASS);
    if (iframe) iframe.remove();
  }
};
window.addEventListener("message", prodamusMessageListener);

/**
 * pre-requisites:
 * window.prodamusDomain = 'some.payform.ru';
 * window.prodamusCurrency = 'rub';
 */
let prodamusPay = (order_sum, order_currency = null) => {
  if (!("prodamusDomain" in window)) {
    console.error("Prodamus domain must be set.");
    return;
  }
  const currency = order_currency || window.prodamusCurrency;
  if (!currency) {
    console.error("Prodamus currency must be set.");
    return;
  }
  if (isNaN(order_sum) || typeof order_sum !== "number") {
    console.error("Prodamus price is not a number");
    return;
  }

  payformInit(window.prodamusDomain, {
    order_sum,
    currency,
  });
};

const handleProdamusPay = e => {
  e.preventDefault();

  const currency =
    e.target.getAttribute("data-currency") || window.prodamusCurrency;
  const price = parseFloat(e.target.getAttribute("data-prodamusprice"));

  prodamusPay(price, currency);
};

const attachProdamusButtonsListener = () => {
  if (!("prodamusDomain" in window)) return;

  // for dynamically created elements too
  document.addEventListener("click", function (e) {
    if (e.target.matches("[data-prodamusprice]")) {
      handleProdamusPay(e);
    }
  });
};
if (document.readyState === "complete") {
  attachProdamusButtonsListener();
} else {
  window.addEventListener("DOMContentLoaded", attachProdamusButtonsListener);
}

window.prodamusPay = prodamusPay;
window.payformInit = payformInit;
