/**
 * Deterministic, idempotent seed for The Small Web.
 * Run from repo root: npm run seed
 * (builds @small-web/shared first via the workspace script)
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import mongoose, { Types } from "mongoose";

// Load env from common locations so seeding needs no undocumented manual step.
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(__dirname, "../../../.env") });

import createDOMPurify from "isomorphic-dompurify";
import { JSDOM } from "jsdom";
import { sanitizePublishedHtml } from "@small-web/shared";
import {
  Person,
  PersonSchema,
} from "../src/people/schemas/person.schema";
import { Site, SiteSchema } from "../src/sites/schemas/site.schema";
import { Visit, VisitSchema } from "../src/visits/schemas/visit.schema";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/small-web";

const purify = createDOMPurify;
const documentFactory = new JSDOM("").window.document.implementation;

function clean(html: string, titleHint?: string) {
  return sanitizePublishedHtml(html, purify, { titleHint, documentFactory });
}

const PEOPLE = [
  { seedKey: "person:mira", name: "Mira Chen" },
  { seedKey: "person:jonas", name: "Jonas Reed" },
  { seedKey: "person:aisha", name: "Aisha Okonkwo" },
  { seedKey: "person:elio", name: "Elio Vargas" },
  { seedKey: "person:nora", name: "Nora Hale" },
] as const;

type SiteSeed = {
  seedKey: string;
  address: string;
  authorSeed: string;
  title: string;
  html: string;
};

const SITES: SiteSeed[] = [
  {
    seedKey: "site:tidepool",
    address: "tidepool.zz",
    authorSeed: "person:mira",
    title: "Tidepool Notes",
    html: `<h1>Tidepool Notes</h1>
<p>At low tide the pool becomes a shallow mirror. Crabs write temporary maps in the sand and the water remembers every ripple.</p>
<p>Travelers start here often, then wander inland toward the trees when the wind turns dry.</p>
<p>Continue to the <a href="forest.zz">quiet forest</a>, or skip ahead to the <a href="moonlight.zz">moonlit ridge</a>.</p>
<p>A faded sign also points to <a href="coralruins.zz">coral ruins</a> that nobody has mapped.</p>
<p>Below the waterline the kelp keeps its own calendar. Each frond ticks a different hour of the tide, and the stones collect stories the way pockets collect sand.</p>
<p>Guidebooks insist you wait for the second stillness — the pause after the first wave of tourists leaves — before reading the pool for omens. Patience is its own weather.</p>
<p>Farther along the shelf, barnacles argue in tiny clicks. A child once counted them until the numbers became a song; the song still hangs here on foggy mornings.</p>
<p>If you bring a notebook, leave the last page blank. The tidepool prefers unfinished sentences. That blank is where return visits find their place.</p>
<p id="tidepool-deep">Deep marker: this paragraph sits far enough down the page that scrolling here is genuine content height, not a viewer chrome trick.</p>
<p>From the deep marker you can still climb back toward the links above, or close your eyes and listen for the forest calling inland.</p>`,
  },
  {
    seedKey: "site:forest",
    address: "forest.zz",
    authorSeed: "person:jonas",
    title: "The Listening Forest",
    html: `<h1>The Listening Forest</h1>
<p>Moss softens every footfall. If you stand still long enough, the canopy seems to answer in a language of leaves.</p>
<p>Paths braid and unbraid. One leads back to salt air; another climbs toward cooler light.</p>
<p>Return to <a href="tidepool.zz">the tidepool</a>, climb toward <a href="mountain.zz">the mountain</a>, or rest in the <a href="garden.zz">walled garden</a>.</p>`,
  },
  {
    seedKey: "site:moonlight",
    address: "moonlight.zz",
    authorSeed: "person:mira",
    title: "Moonlight Observatory",
    html: `<h1>Moonlight Observatory</h1>
<p>Silver dust hangs in the air after dusk. The dome is open to anyone who can name three constellations without looking up.</p>
<p>From here you can study charts in the <a href="astronomy.zz">astronomy loft</a>, or follow a lantern down to the <a href="library.zz">night library</a>.</p>
<p>Some maps still mention <a href="phantomharbor.zz">phantom harbor</a>.</p>`,
  },
  {
    seedKey: "site:library",
    address: "library.zz",
    authorSeed: "person:aisha",
    title: "The Night Library",
    html: `<h1>The Night Library</h1>
<p>Shelves lean like tired travelers. Catalog cards smell of cedar and rain. Every aisle ends in a window that shows a different weather.</p>
<p>Borrow a history of coastlines in <a href="history.zz">history.zz</a>, or step into the workshop for bookbinding tips at <a href="workshop.zz">workshop.zz</a>.</p>
<p>A quiet door returns you to <a href="moonlight.zz">moonlight.zz</a>.</p>`,
  },
  {
    seedKey: "site:garden",
    address: "garden.zz",
    authorSeed: "person:nora",
    title: "Walled Garden",
    html: `<h1>Walled Garden</h1>
<p>Stone walls keep the wind honest. Lavender rows draw bees into deliberate figure-eights, and the fountain never quite repeats the same note.</p>
<p>A gravel path leads toward the <a href="ocean.zz">ocean overlook</a>. Another slips back under the trees to <a href="forest.zz">forest.zz</a>.</p>`,
  },
  {
    seedKey: "site:mountain",
    address: "mountain.zz",
    authorSeed: "person:jonas",
    title: "Mountain Switchback",
    html: `<h1>Mountain Switchback</h1>
<p>Altitude edits the air. Switchbacks teach patience; cairns teach trust. Above the tree line, silence has a texture.</p>
<p>Look down toward the <a href="forest.zz">forest</a>, or aim your compass at the <a href="astronomy.zz">astronomy loft</a> after sunset.</p>
<p>Climbers whisper about <a href="skybridge.zz">skybridge.zz</a>, which does not appear on any survey.</p>`,
  },
  {
    seedKey: "site:ocean",
    address: "ocean.zz",
    authorSeed: "person:elio",
    title: "Ocean Overlook",
    html: `<h1>Ocean Overlook</h1>
<p>The horizon is a long held breath. Gulls argue over nothing important. Below the cliff, kelp forests move like slow applause.</p>
<p>Follow the coast back to <a href="tidepool.zz">tidepool.zz</a>, or take the inland road to the <a href="garden.zz">walled garden</a>.</p>
<p>Storm notes continue in <a href="history.zz">history.zz</a>.</p>`,
  },
  {
    seedKey: "site:astronomy",
    address: "astronomy.zz",
    authorSeed: "person:mira",
    title: "Astronomy Loft",
    html: `<h1>Astronomy Loft</h1>
<p>Charts pinned to cedar beams claim the sky is a patient archive. Tonight Jupiter is a calm bright nail.</p>
<p>Cross-reference with the <a href="moonlight.zz">observatory</a>, then descend toward the <a href="library.zz">night library</a> for older catalogs.</p>
<p>A scribbled margin mentions <a href="cometfarm.zz">cometfarm.zz</a>.</p>`,
  },
  {
    seedKey: "site:history",
    address: "history.zz",
    authorSeed: "person:aisha",
    title: "Coastal Histories",
    html: `<h1>Coastal Histories</h1>
<p>Flood markers climb the breakwater like a timeline. Fishermen's diaries disagree on dates but agree on the taste of copper in the air before a squall.</p>
<p>Compare notes with the <a href="ocean.zz">ocean overlook</a>, or repair a binding at <a href="workshop.zz">workshop.zz</a>.</p>
<p>Return to stacks via <a href="library.zz">library.zz</a>.</p>`,
  },
  {
    seedKey: "site:workshop",
    address: "workshop.zz",
    authorSeed: "person:elio",
    title: "Harbor Workshop",
    html: `<h1>Harbor Workshop</h1>
<p>Sawdust floats in sunbeams. Someone is teaching a hinge to behave. On the bench: brass screws, beeswax, and a half-finished sign for a place that may not exist.</p>
<p>Trade tools with readers from <a href="library.zz">library.zz</a>, or walk uphill toward <a href="mountain.zz">mountain.zz</a> for timber that still smells like weather.</p>
<p>The sign on the wall points to <a href="missingdock.zz">missingdock.zz</a>.</p>`,
  },
];

/** Fixed origin: 2024-06-01T12:00:00.000Z — one hour of history from here. */
const HISTORY_ORIGIN = Date.UTC(2024, 5, 1, 12, 0, 0);

type VisitSeed = {
  seedKey: string;
  personSeed: string;
  address: string;
  offsetMinutes: number;
  navigationType:
    | "address-bar"
    | "link"
    | "back"
    | "forward"
    | "history-jump"
    | "search";
  status: "success" | "not-found";
};

function buildVisits(): VisitSeed[] {
  const visits: VisitSeed[] = [];
  let n = 0;
  const add = (
    personSeed: string,
    address: string,
    offsetMinutes: number,
    navigationType: VisitSeed["navigationType"],
    status: VisitSeed["status"] = "success",
  ) => {
    n += 1;
    visits.push({
      seedKey: `visit:${String(n).padStart(3, "0")}`,
      personSeed,
      address,
      offsetMinutes,
      navigationType,
      status,
    });
  };

  // Mira: long trail covering nearly every site (~hour)
  const miraTrail = [
    "tidepool.zz",
    "forest.zz",
    "mountain.zz",
    "astronomy.zz",
    "moonlight.zz",
    "library.zz",
    "history.zz",
    "workshop.zz",
    "garden.zz",
    "ocean.zz",
    "tidepool.zz",
    "coralruins.zz",
  ];
  miraTrail.forEach((address, i) => {
    add(
      "person:mira",
      address,
      i * 4,
      i === 0 ? "address-bar" : "link",
      address.includes("coral") ? "not-found" : "success",
    );
  });
  // Mira repeats and uses search/history
  add("person:mira", "library.zz", 50, "search");
  add("person:mira", "workshop.zz", 52, "history-jump");
  add("person:mira", "forest.zz", 55, "back");
  add("person:mira", "mountain.zz", 56, "forward");

  // Jonas: shorter focused trail
  add("person:jonas", "forest.zz", 5, "address-bar");
  add("person:jonas", "garden.zz", 10, "link");
  add("person:jonas", "ocean.zz", 15, "link");
  add("person:jonas", "tidepool.zz", 20, "link");
  add("person:jonas", "forest.zz", 25, "address-bar");
  add("person:jonas", "skybridge.zz", 30, "link", "not-found");

  // Aisha: library-centric with repeats
  add("person:aisha", "library.zz", 2, "address-bar");
  add("person:aisha", "history.zz", 8, "link");
  add("person:aisha", "library.zz", 12, "back");
  add("person:aisha", "workshop.zz", 18, "link");
  add("person:aisha", "history.zz", 28, "search");
  add("person:aisha", "library.zz", 40, "history-jump");

  // Elio
  add("person:elio", "workshop.zz", 3, "address-bar");
  add("person:elio", "mountain.zz", 14, "link");
  add("person:elio", "missingdock.zz", 22, "link", "not-found");
  add("person:elio", "ocean.zz", 35, "address-bar");

  // Nora
  add("person:nora", "garden.zz", 6, "address-bar");
  add("person:nora", "forest.zz", 16, "link");
  add("person:nora", "garden.zz", 26, "back");
  add("person:nora", "ocean.zz", 36, "link");
  add("person:nora", "garden.zz", 48, "history-jump");

  return visits;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const PersonModel = mongoose.model(Person.name, PersonSchema);
  const SiteModel = mongoose.model(Site.name, SiteSchema);
  const VisitModel = mongoose.model(Visit.name, VisitSchema);

  const personIds = new Map<string, Types.ObjectId>();

  for (const person of PEOPLE) {
    const doc = await PersonModel.findOneAndUpdate(
      { seedKey: person.seedKey },
      { $set: { name: person.name, seedKey: person.seedKey } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();
    personIds.set(person.seedKey, doc!._id as Types.ObjectId);
  }

  const siteIds = new Map<string, Types.ObjectId>();
  const siteByAddress = new Map<string, { id: Types.ObjectId; title: string }>();

  for (const site of SITES) {
    const authorId = personIds.get(site.authorSeed);
    if (!authorId) throw new Error(`Missing author ${site.authorSeed}`);
    const sanitized = clean(site.html, site.title);
    const doc = await SiteModel.findOneAndUpdate(
      { seedKey: site.seedKey },
      {
        $set: {
          seedKey: site.seedKey,
          address: site.address,
          title: sanitized.title,
          html: sanitized.html,
          textContent: sanitized.textContent,
          authorId,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();
    siteIds.set(site.seedKey, doc!._id as Types.ObjectId);
    siteByAddress.set(site.address, {
      id: doc!._id as Types.ObjectId,
      title: doc!.title,
    });
  }

  for (const visit of buildVisits()) {
    const personId = personIds.get(visit.personSeed);
    if (!personId) throw new Error(`Missing person ${visit.personSeed}`);
    const site = siteByAddress.get(visit.address);
    await VisitModel.findOneAndUpdate(
      { seedKey: visit.seedKey },
      {
        $set: {
          seedKey: visit.seedKey,
          personId,
          address: visit.address,
          timestamp: new Date(HISTORY_ORIGIN + visit.offsetMinutes * 60_000),
          navigationType: visit.navigationType,
          status: visit.status,
          siteId: site?.id ?? null,
          title:
            site?.title ??
            (visit.status === "not-found" ? "Not found" : null),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();
  }

  const counts = {
    people: await PersonModel.countDocuments(),
    sites: await SiteModel.countDocuments(),
    visits: await VisitModel.countDocuments(),
  };

  // eslint-disable-next-line no-console
  console.log("Seed complete:", counts);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
