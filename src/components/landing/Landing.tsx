import type { SVGProps } from "react";
import CtaLink from "@/components/landing/CtaLink";
import Faq, { type FaqItem } from "@/components/landing/Faq";
import LandingTracker from "@/components/landing/LandingTracker";
import PhoneFrame from "@/components/landing/PhoneFrame";
import Section from "@/components/landing/Section";
import { startTarget } from "@/components/landing/cta";
import PublicShell from "@/components/public/PublicShell";
import {
  Bolt,
  BookIcon,
  ClipboardIcon,
  Dumbbell,
  Mark,
  MapPin,
  Sparkle,
  Waves,
  Wind,
} from "@/components/icons";
import { googleAuthEnabled } from "@/lib/google-auth";
import { BLOCK_LABELS, blockLabel } from "@/components/landing/block-labels";
import { translator, type Locale, type T } from "@/i18n";
import { displayPrefs } from "@/i18n/server";

/**
 * טיפוס אייקון פנימי משותף — עד סבב 41 חי ב-src/components/method/types.ts
 * (עמוד "השיטה" הציבורי, D-8: נמחק). דף הנחיתה הוא הצרכן היחיד שנשאר,
 * ולכן הטיפוס עבר לכאן במקום להישאר תלוי בקובץ שאינו קיים יותר.
 */
type IconType = (
  props: SVGProps<SVGSVGElement> & { size?: number },
) => React.JSX.Element;

// דף הנחיתה הציבורי (D-13). רכיב שרת: הוא לא שואל את המסד כלום, רק את
// דגל כניסת גוגל — ולכן הוא זול ובטוח להצגה לכל אורח.
//
// שלושה כללים שמנחים את כל הקופי כאן:
// • גוף שני זכר, עברית פשוטה, בלי ז'רגון קרוספיט (CLAUDE.md, "שפת המוצר").
// • שמות הבלוקים מגיעים מ-BLOCK_LABELS ולא נכתבים קשיח (tests/landing.test.ts
//   אוכף שאין מופע קשיח שלהם כאן).
// • שם הבלוק האינטנסיבי (BLOCK_LABELS.metcon) אף פעם לא מופיע בלי משפט
//   שמסביר מה זה — גם ברשימת הבלוקים, גם בשאלות הנפוצות.

const navLinks = (t: T) => [{ href: "#faq", label: t("שאלות", "Questions") }];

const steps = (t: T): { title: string; detail: string }[] => [
  {
    title: t("בוחרים מה מתאים היום", "Choose what suits today"),
    detail: t(
      "בוחרים זמן, מקום ואיך הגוף מרגיש היום.",
      "Choose your time, place and how you feel today.",
    ),
  },
  {
    title: t("רואים את האימון מראש", "See the workout in advance"),
    detail: t(
      "רואים את התרגילים והסדר. אפשר לקרוא הוראות או לשנות את הבחירות.",
      "See the exercises and order. Read instructions or change your choices.",
    ),
  },
  {
    title: t("מתקדמים צעד אחרי צעד", "Progress step by step"),
    detail: t(
      "עובדים לפי התחנות והטיימר. הביצוע נשמר ומכוון את האימון הבא.",
      "Follow the stations and timer. Saved work shapes your next workout.",
    ),
  },
];

const blocks = (t: T, locale: Locale): { icon: IconType; label: string; detail: string }[] => [
  {
    icon: Waves,
    label: blockLabel("warmup", locale),
    detail: t(
      "מכינים את הגוף לתרגילים של היום.",
      "Prepare for today’s exercises.",
    ),
  },
  {
    icon: Dumbbell,
    label: blockLabel("strength", locale),
    detail: t(
      "תרגיל מרכזי, עם כמויות לפי היכולת שלך.",
      "A main exercise, with amounts based on your ability.",
    ),
  },
  {
    icon: Bolt,
    label: blockLabel("metcon", locale),
    detail: t(
      "קטע קצר מול שעון: סבבים בזמן קצוב או רשימת תרגילים.",
      "A timed challenge: rounds or a list of exercises.",
    ),
  },
  {
    icon: Sparkle,
    label: t(`סיבולת או ${BLOCK_LABELS.cardio}`, `Endurance or ${blockLabel("cardio", "en").toLowerCase()}`),
    detail: t(
      "התחנות מותאמות למקום ולציוד שבחרת.",
      "Stations adapt to your place and equipment.",
    ),
  },
  {
    icon: Wind,
    label: blockLabel("cooldown", locale),
    detail: t(
      "מסיימים בהורדת קצב.",
      "Wind down at the end.",
    ),
  },
];

const differences = (t: T): { icon: IconType; title: string; detail: React.ReactNode }[] => [
  {
    icon: MapPin,
    title: t("התחנה תפוסה? יש חלופות", "Station taken? There are alternatives"),
    detail: t(
      "מחליפים לתרגיל תקף ושומרים על רצף האימון.",
      "Swap for a valid exercise and keep your plan on track.",
    ),
  },
  {
    icon: Waves,
    title: t("חימום שנגזר מהאימון עצמו", "A warm-up built from the workout itself"),
    detail: t(
      "החימום מותאם לתרגילים של היום.",
      "Your warm-up is based on today’s exercises.",
    ),
  },
  {
    icon: Mark,
    title: t("אפשר להבין את הבחירות", "You can understand the choices"),
    detail: t(
      "אפשר לראות למה האימון נבחר.",
      "See why a workout was chosen.",
    ),
  },
  {
    icon: ClipboardIcon,
    title: t("הנתונים בשליטתך", "Your data, in your control"),
    detail: t(
      "אף מתאמן אחר לא רואה את האימונים, הכיול וההתקדמות שלך. מפעיל הפיילוט, אדם פרטי אחד, רואה אותם לתפעול בלבד. אפשר לייצא או למחוק בכל עת מתפריט החשבון.",
      "Other trainees cannot see your workouts, calibration or progress. The pilot operator, one private individual, sees them only to run the pilot. Export or delete your account anytime from the account menu.",
    ),
  },
  {
    icon: BookIcon,
    title: t("בלי ז'רגון", "No jargon"),
    detail: t(
      "הוראות פשוטות, גם למונחים מקצועיים.",
      "Plain instructions explain the terms you need.",
    ),
  },
];

const forYou = (t: T) => [
  t("מי שרוצה לדעת מה לעשות היום", "Anyone who wants a clear plan"),
  t("מי שמתאמן לבד ורוצה מבנה", "People who train alone and want structure"),
  t("מי שמתאמן בבית או בפארק", "People training at home or in a park"),
  t("מי שרוצה גיוון בלי לתכנן כל שבוע", "Anyone who wants variety without weekly planning"),
];

const notForYou = (t: T) => [
  t("מי שצריך מאמן צמוד או תוכנית תחרות", "People who need close coaching or a competition plan"),
  t("בשיקום או עם מגבלה רפואית — יש להתייעץ קודם עם רופא או פיזיותרפיסט", "For injury rehab or a medical restriction, consult a doctor or physiotherapist first"),
  t("מי שמתחת לגיל 18", "Anyone under 18"),
];

const faqItems = (t: T, locale: Locale): FaqItem[] => [
  {
    q: t("כמה זה עולה?", "How much does it cost?"),
    a: t(
      "כלום. הפיילוט פתוח וחינם, בלי כרטיס אשראי, בלי תקופת ניסיון שנגמרת ובלי גרסה בתשלום שמסתתרת מאחורי כפתור.",
      "Nothing. The pilot is open and free, with no credit card, no trial that runs out and no paid version hiding behind a button.",
    ),
  },
  {
    q: t("איזה ציוד אני צריך?", "What equipment do I need?"),
    a: t(
      "מה שיש לך. אתה מגדיר את המקום שאתה מתאמן בו ומסמן איזה ציוד זמין שם — משקולות, מוט, גומיות או כלום חוץ מהגוף. המנוע בונה רק ממה שסימנת.",
      "Whatever you have. You set where you train and mark the equipment available there — dumbbells, a bar, bands or nothing but your body. The engine builds only from what you marked.",
    ),
  },
  {
    q: t("אני מתחיל לגמרי. זה בשבילי?", "I'm a complete beginner. Is this for me?"),
    a: t(
      "אפשר להתחיל עם דיווח יכולת — כמה חזרות ומשקל מתאימים לך — כדי לכוון את הכמויות. קיימת גם אפשרות לדלג בינתיים ולקבל אימון שמרני. הוראות התרגילים זמינות לפני ובמהלך האימון.",
      "You can start with an ability report — how many reps and how much weight suit you — to tune the amounts. You can also skip it for now and get a conservative workout. Exercise instructions are available before and during the workout.",
    ),
  },
  {
    q: t("כמה זמן לוקח אימון?", "How long does a workout take?"),
    a:
      locale === "he" ? (
        <>
          אתה קובע, בין <span className="num">10</span> ל-
          <span className="num">90</span> דקות. המנוע מרכיב את כל חלקי האימון
          לתוך הזמן שנתת לפי המסגרת שבחרת.
        </>
      ) : (
        <>
          You decide, between <span className="num">10</span> and <span className="num">90</span> minutes. The engine fits every part of
          the workout into the time you gave.
        </>
      ),
  },
  {
    q: t(`מה זה "${BLOCK_LABELS.metcon}"?`, `What is "${blockLabel("metcon", "en")}"?`),
    a: t(
      `זה השם שלנו לחלק הקצר והאינטנסיבי של האימון — קטע שנמדד מול שעון: או שאתה עושה כמה שיותר סבבים בזמן קצוב, או שאתה מסיים רשימת תרגילים כמה שיותר מהר. זה מה שמעלה את הדופק, וזה מתחלף כמעט בכל אימון כדי שהגוף לא יתרגל.`,
      "It's our name for the short, intense part of the workout — timed against a clock: either as many rounds as possible in a set time, or finishing a list of exercises as fast as you can. It raises your heart rate, and it changes almost every workout so your body doesn't get used to it.",
    ),
  },
  {
    q: t("מה עם הפרטיות שלי?", "What about my privacy?"),
    a: t(
      "האימונים, הכיול וההתקדמות שלך לא נראים לאף מתאמן אחר. המפעיל — אדם פרטי אחד — רואה אותם לצורכי תפעול הפיילוט בלבד, וזה כתוב במפורש במדיניות הפרטיות. אין פרסומות, אין מכירת נתונים ואין מעקב אחריך באתרים אחרים. אפשר לייצא את כל הנתונים לקובץ ולמחוק את החשבון בעצמך, בכל רגע, מתפריט החשבון.",
      "Your workouts, calibration and progress aren't visible to any other trainee. The operator — one private individual — sees them only to run the pilot, and the privacy policy says so explicitly. No ads, no selling of data and no tracking you on other sites. You can export all your data to a file and delete your account yourself, anytime, from the account menu.",
    ),
  },
  {
    q: t("אפשר להתקין את זה כאפליקציה?", "Can I install it as an app?"),
    a: t(
      "כן. זה אתר, אבל אפשר להוסיף אותו למסך הבית של הטלפון והוא ייפתח כמו אפליקציה — במסך מלא, בלי שורת כתובת. אין מה להוריד מחנות.",
      "Yes. It's a website, but you can add it to your phone's home screen and it opens like an app — full screen, without an address bar. Nothing to download from a store.",
    ),
  },
];

const pilotPoints = (t: T) => [
  t("נבנה על ידי אדם אחד. אין כאן חברה, אין מחלקת שיווק ואין הבטחות גדולות.", "Built by one person. No company, no marketing department and no big promises."),
  t("חינם כרגע, ובלי כרטיס אשראי. אם זה ישתנה אי-פעם — תדע לפני, לא אחרי.", "Free for now, with no credit card. If that ever changes, you'll know before, not after."),
  t("לומדים מכל אימון: מה נבנה, מה הוחלף באמצע ומה נזרק. זה מה שמשפר את המנוע.", "Every workout teaches us something: what was built, what was swapped mid-way and what was dropped. That's what improves the engine."),
  t("יש כפתור משוב בתוך האפליקציה, וכל הודעה נקראת. זה באמת משנה מה נבנה אחר כך.", "There's a feedback button inside the app, and every message is read. It really shapes what gets built next."),
];

export default async function Landing({ deleted = false }: { deleted?: boolean }) {
  const { locale } = await displayPrefs();
  const t = translator(locale);
  const start = startTarget(googleAuthEnabled(), locale);

  const cta = (placement: string) => (
    <CtaLink
      href={start.href}
      placement={placement}
      className="inline-flex min-h-14 items-center justify-center rounded-(--r-m) bg-accent px-7 text-lg font-bold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi"
    >
      {start.label}
    </CtaLink>
  );

  const microcopy = (
    <p className="mt-3.5 text-xs leading-relaxed text-fg-3">
      {t("פיילוט פתוח · חינם · בלי כרטיס אשראי · לבני", "Open pilot · free · no credit card · ages")}{" "}
      <span className="num">18</span>{t(" ומעלה", "+")}
    </p>
  );

  return (
    <PublicShell wide cta links={navLinks(t)}>
      <LandingTracker />

      {deleted && (
        <p
          role="status"
          className="mt-5 rounded-(--r-s) border border-line bg-raised px-4 py-2.5 text-sm text-fg-2"
        >
          {t("החשבון נמחק. תודה שניסית.", "Your account was deleted. Thanks for trying.")}
        </p>
      )}

      {/* ================= Hero ================= */}
      <section className="animate-rise pt-10 md:grid md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-12 md:pt-16">
        <div>
          <p className="text-xs font-semibold tracking-wide text-accent">
            {t("פיילוט פתוח · חינם", "Open pilot · free")}
          </p>
          <h1 className="mt-3 text-[2.5rem] font-bold leading-[1.15] md:text-[4rem]">
            {t("מתאמנים", "Train")}
            <br />
            {t("בכיוון ברור", "with direction")}
          </h1>
          <p className="mt-4 max-w-[44ch] text-[1.05rem] leading-relaxed text-fg-2">
            {t("אימון לפי הזמן והציוד שלך, עם הוראות ברורות.", "A workout for your time and equipment, with clear instructions.")}
          </p>
          <div className="mt-7">{cta("hero")}</div>
          {microcopy}
        </div>
        <PhoneFrame
          className="mt-12 md:mt-0"
          src="/screenshots/home-2026-09-15.png"
          alt={t("צילום מסך אמיתי של המנוע: מסך הבית והפעולה לבניית אימון", "A real screenshot of the app: the home screen and the build-a-workout action")}
          priority
        />
      </section>

      {/* ================= איך זה עובד ================= */}
      <Section
        eyebrow={t("שלושה צעדים", "Three steps")}
        title={t("איך זה עובד", "How it works")}
        lead={t("בכניסה הראשונה מאשרים תנאים וממלאים שאלון בריאות. אחר כך בוחרים אימון.", "First, accept the terms and complete a health questionnaire. Then choose a workout.")}
      >
        <ol className="grid gap-4 md:grid-cols-3">
          {steps(t).map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]"
            >
              <span
                aria-hidden
                className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-accent"
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{step.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-fg-2">
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ================= מה יש בכל אימון ================= */}
      <Section
        eyebrow={t("המבנה", "The structure")}
        title={t("מה יש בכל אימון", "What's in every workout")}
        lead={t("אותן תחנות בכל פעם, תוכן אחר כמעט תמיד. זה מה שהופך אימון לאימון ולא לאוסף תרגילים.", "The same stations every time, different content almost always. That's what makes it a workout rather than a pile of exercises.")}
      >
        <ol className="divide-y divide-line overflow-hidden rounded-(--r-m) border border-line bg-raised [box-shadow:var(--raise-edge)]">
          {blocks(t, locale).map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex items-start gap-3.5 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--r-s) bg-accent-soft text-accent">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{label}</span>
                <span className="mt-1 block text-sm leading-relaxed text-fg-2">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ================= למה זה שונה ================= */}
      <Section
        eyebrow={t("ההבדל", "The difference")}
        title={t("תוכנית גמישה, עם כיוון ברור", "A flexible plan with clear direction")}
        lead={t("תמיד ברור מה הצעד הבא.", "Know what comes next.")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {differences(t).map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]"
            >
              <h3 className="flex items-center gap-2.5 text-[15px] font-bold">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--r-s) bg-accent-soft text-accent">
                  <Icon size={17} />
                </span>
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-2">{detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ================= צילומי מסך ================= */}
      <Section
        eyebrow={t("מבפנים", "Inside")}
        title={t("ככה זה נראה", "This is what it looks like")}
        lead={t("שני המסכים שתבלה בהם הכי הרבה זמן.", "The two screens you'll spend the most time on.")}
      >
        <div className="grid gap-10 sm:grid-cols-2">
          <figure>
            <PhoneFrame
              src="/screenshots/live-workout-2026-09-15.png"
              alt={t("מסך האימון החי: טיימר גדול, פס התקדמות בין חלקי האימון ורשימת התרגילים", "The live workout screen: a big timer, a progress bar across the workout parts and the exercise list")}
            />
            <figcaption className="mt-5 text-center text-sm leading-relaxed text-fg-2">
              {t("במהלך האימון: טיימר גדול שנקרא ממרחק, מה עכשיו ומה הבא בתור, וכל משקל וחזרה כבר מחושבים לך.", "During the workout: a big timer you can read from a distance, what's now and what's next, with every weight and rep already worked out for you.")}
            </figcaption>
          </figure>
          <figure>
            <PhoneFrame
              src="/screenshots/progress.png"
              alt={t("מסך ההתקדמות: מדד הכושר, גרף התחזית ומד הגיוון", "The progress screen: fitness index, forecast chart and variety meter")}
            />
            <figcaption className="mt-5 text-center text-sm leading-relaxed text-fg-2">
              {t("אחרי האימון: האימונים שנשמרו, המדדים וההתקדמות לאורך זמן.", "After the workout: saved workouts, benchmarks and progress over time.")}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* ================= למי זה מתאים ================= */}
      <Section
        eyebrow={t("בכנות", "Honestly")}
        title={t("למי זה מתאים, ולמי פחות", "Who it suits, and who less so")}
        lead={t("עדיף לדעת עכשיו מאשר אחרי שבועיים.", "Better to know now than after two weeks.")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]">
            <h3 className="text-sm font-bold text-ok">{t("מתאים לך אם", "It suits you if you are")}</h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-fg-2">
              {forYou(t).map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden className="text-ok">
                    ✓
                  </span>
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]">
            <h3 className="text-sm font-bold text-fg-3">{t("פחות מתאים אם", "Less suitable for")}</h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-fg-2">
              {notForYou(t).map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden className="text-fg-3">
                    —
                  </span>
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ================= בלוק הפיילוט ================= */}
      <Section eyebrow={t("גילוי נאות", "Full disclosure")} title={t("המנוע נמצא בפיילוט", "The app is in a pilot")}>
        <div className="rounded-(--r-m) border border-line bg-sunken p-5">
          <ul className="space-y-3 text-sm leading-relaxed text-fg-2">
            {pilotPoints(t).map((point) => (
              <li key={point} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ================= שאלות נפוצות ================= */}
      <Section id="faq" eyebrow={t("שאלות", "Questions")} title={t("שאלות נפוצות", "Frequently asked questions")}>
        <Faq items={faqItems(t, locale)} />
      </Section>

      {/* ================= CTA סופי ================= */}
      <section className="mt-16 rounded-(--r-l) border border-line bg-raised px-6 py-10 text-center [box-shadow:var(--raise-edge)]">
        <Mark size={34} className="mx-auto text-accent" />
        <h2 className="mt-4 text-[1.5rem] font-bold leading-snug">
          {t("אפשר להתחיל מהצעד הבא.", "You can start with the next step.")}
        </h2>
        <p className="mx-auto mt-2.5 max-w-[38ch] leading-relaxed text-fg-2">
          {t("מאשרים את הנדרש, בוחרים אימון ורואים אותו לפני שמתחילים.", "Complete the required steps, choose a workout and review it before starting.")}
        </p>
        <div className="mt-7">{cta("final")}</div>
        {microcopy}
      </section>
    </PublicShell>
  );
}
