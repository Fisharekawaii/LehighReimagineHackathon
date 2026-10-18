import { fail } from "../logic.js";
const providers = [
  "airbnb.com",
  "airbnb.co.uk",
  "airbnb.ca",
  "airbnb.com.au",
  "expedia.com",
  "booking.com",
  "vrbo.com",
  "hotels.com",
  "uber.com", "lyft.com", "amtrak.com",
  "ubereats.com", "doordash.com", "opentable.com",
  "viator.com", "getyourguide.com", "eventbrite.com",
];
function allowed(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("Paste a valid booking link.");
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !providers.some((h) => url.hostname === h || url.hostname.endsWith("." + h))
  )
    fail("Use an HTTPS Airbnb, Expedia, Booking.com, Vrbo or Hotels.com link.");
  return url;
}
const decode = (s) =>
  String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();
export function extractBooking(html, url) {
  const meta = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const a of tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))
      attrs[a[1].toLowerCase()] = a[2];
    meta[attrs.property || attrs.name] = attrs.content;
  }
  const nodes = [];
  const walk = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      x.forEach(walk);
      return;
    }
    nodes.push(x);
    if (x["@graph"]) walk(x["@graph"]);
  };
  for (const script of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      walk(JSON.parse(script[1]));
    } catch {}
  }
  const node =
    nodes.find((x) => x.address || x.offers) || nodes.find((x) => x.name) || {};
  const address =
    typeof node.address === "string"
      ? node.address
      : [
          node.address?.streetAddress,
          node.address?.addressLocality,
          node.address?.addressRegion,
          node.address?.addressCountry,
        ]
          .filter(Boolean)
          .join(", ");
  const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
  const price =
    offer?.priceCurrency === "USD" && Number.isFinite(Number(offer?.price))
      ? Number(offer.price)
      : "";
  return {
    title: decode(
      meta["og:title"] ||
        node.name ||
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    ).slice(0, 100),
    location: decode(address).slice(0, 150),
    notes: decode(meta["og:description"] || node.description).slice(0, 500),
    price,
    quantity: 1,
    category: "Stays",
    url,
    priceType: "estimated",
  };
}
export async function bookingDraft(value, fetcher = fetch, category = "Stays") {
  if (!["Stays", "Transport", "Food & drinks", "Experiences", "Other"].includes(category)) fail("Choose a valid category.");
  // Unknown HTTPS sites are retained as references without a server-side fetch.
  let reference;
  try { reference = new URL(value); } catch { fail("Paste a valid HTTPS link."); }
  if (reference.protocol !== "https:" || reference.username || reference.password || reference.port) fail("Use an HTTPS link without credentials or a custom port.");
  if (!providers.some(h => reference.hostname === h || reference.hostname.endsWith("." + h))) {
    return {draft:{title:"",url:reference.href,category,quantity:1,price:"",notes:""},warning:"This site does not support autofill. Your link is saved; enter the details manually."};
  }
  let url = allowed(value);
  const original = url.href;
  const fallback = {
    title: "",
    url: original,
    category,
    quantity: 1,
    price: "",
    notes: "",
  };
  try {
    let response;
    for (let hop = 0; hop < 4; hop++) {
      response = await fetcher(url.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "text/html" },
      });
      if (response.status >= 300 && response.status < 400) {
        url = allowed(new URL(response.headers.get("location"), url).href);
        continue;
      }
      break;
    }
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error();
    let html = await readHtml(response);
    // Some booking providers return a successful HTML locale-redirect page,
    // rather than an HTTP redirect. Follow only explicit, allowlisted refreshes.
    const visited=new Set([url.href]);
    for(let hop=0;hop<3;hop++){
      const target=htmlRedirect(html);
      if(!target)break;
      const next=allowed(new URL(target,url).href);
      if(visited.has(next.href))throw new Error("Redirect loop");
      visited.add(next.href);url=next;
      response=await fetcher(url.href,{redirect:"manual",signal:AbortSignal.timeout(8000),headers:{Accept:"text/html"}});
      if(response.status>=300&&response.status<400){
        const next=allowed(new URL(response.headers.get("location"),url).href);
        html=`<meta http-equiv="refresh" content="0;url=${next.href}">`;continue;
      }
      if(!response.ok||!response.headers.get("content-type")?.includes("text/html"))throw new Error();
      html=await readHtml(response);
    }
    const draft = {...extractBooking(html, original), category};
    // Only explicit URL dates are used; availability and totals cannot be inferred.
    const date =
      url.searchParams.get("check_in") || url.searchParams.get("startDate");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date || "")) draft.date = date;
    const blocked =
      !draft.title ||
      /access denied|captcha|robot|just a moment|redirecting|redirect(?:ion)?\s+(?:to|in progress)|please wait|enable javascript/i.test(draft.title);
    return {
      draft: blocked ? fallback : draft,
      warning: blocked
        ? "This provider blocked preview access. Fill out the draft manually."
        : "Review every field. Prices may exclude fees, nights or taxes; only explicit USD prices are imported.",
    };
  } catch {
    return {
      draft: fallback,
      warning:
        "This listing could not be read. The link is saved in your draft; add the remaining details manually.",
    };
  }
}

function htmlRedirect(html){
  for(const tag of html.matchAll(/<meta\b[^>]*>/gi)){
    const attrs={};for(const a of tag[0].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g))attrs[a[1].toLowerCase()]=a[3];
    if(attrs["http-equiv"]?.toLowerCase()==="refresh"){
      const target=attrs.content?.match(/(?:^|;)\s*url\s*=\s*(.+)$/i)?.[1];
      if(target)return decode(target).replace(/^["']|["']$/g,"");
    }
  }
  return null;
}
async function readHtml(response){
  const reader=response.body.getReader();let html="",size=0;const decoder=new TextDecoder();
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1500000)break;html+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}
  return html;
}
