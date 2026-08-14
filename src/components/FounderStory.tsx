import Image from "next/image";

const PHOTOS = [
  { src: "/story/lake-travis-snap.jpg", width: 1125, height: 1525, alt: "Lake Travis offensive lineman snapping the ball during a night game" },
  { src: "/story/stauffacher-jersey.jpg", width: 1179, height: 769, alt: "Black-and-white photo of a Lake Travis player's jersey, name plate reading Stauffacher" },
  { src: "/story/three-point-stance.jpg", width: 1333, height: 2000, alt: "Lake Travis defensive lineman set in a three-point stance before a snap" },
  { src: "/story/relay-handoff.jpg", width: 1125, height: 1381, alt: "Close-up black-and-white photo of a track relay baton handoff" },
];

export function FounderStory() {
  return (
    <section className="px-6 md:px-10 py-24 md:py-32 border-t border-[var(--border-soft)]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-start">
        <div className="reveal">
          <div className="eyebrow">The story behind MENTA</div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-8 leading-tight">
            I didn&rsquo;t reach the next level.
            <br />
            So I built the system I wish I had.
          </h2>

          <div className="space-y-5 text-text-2 text-[15px] leading-relaxed max-w-xl">
            <p>
              My name is <strong className="text-text-1 font-semibold">Elias Chavez</strong>, and
              MENTA started with a dream I had growing up:{" "}
              <strong className="text-text-1 font-semibold">
                I wanted to take my athletic career to the next level.
              </strong>
            </p>
            <p>
              Like a lot of high school athletes, I dreamed about playing at the next level. I
              went to <strong className="text-text-1 font-semibold">Lake Travis High School</strong>,
              one of the strongest football programs in Texas, where the competition was extremely
              high. There were bigger, stronger, and more developed athletes competing for the
              same opportunities I wanted.
            </p>
            <p>But looking back, I realized it wasn&rsquo;t just about talent.</p>
            <p>
              I didn&rsquo;t have the proper training or performance resources. My sleep and
              recovery weren&rsquo;t where they needed to be. My mindset wasn&rsquo;t where it
              needed to be. My grades were bad, and I didn&rsquo;t pay enough attention to
              academics. I didn&rsquo;t really understand recruiting, and I didn&rsquo;t think
              enough about athlete safety and preparation.
            </p>
            <p>
              Eventually,{" "}
              <strong className="text-text-1 font-semibold">
                I didn&rsquo;t reach the next level I had dreamed about.
              </strong>
            </p>
            <p>That experience became the reason I started thinking differently.</p>
            <p>
              I kept asking myself:{" "}
              <strong className="text-text-1 font-semibold">
                What if there had been one place that helped me with everything?
              </strong>
            </p>
            <p>
              A place that could help an athlete train better, recover better, sleep better,
              build a stronger mindset, stay on top of school, understand recruiting, analyze
              performance, connect with opportunities, and become more prepared for the
              challenges that come with being an athlete.
            </p>
            <p>
              That&rsquo;s where <strong className="text-text-1 font-semibold">MENTA</strong> was
              born.
            </p>
            <p>
              MENTA isn&rsquo;t just another sports app. It&rsquo;s my attempt to build the system
              I wish I had when I was a high school athlete.
            </p>
            <p>
              The goal is simple:{" "}
              <strong className="text-text-1 font-semibold">
                give athletes the tools, guidance, and support they need to reach their
                potential — before they realize they&rsquo;re missing them.
              </strong>
            </p>
            <p>I didn&rsquo;t make it to the next level.</p>
            <p>But I don&rsquo;t want that experience to be the end of my story.</p>
            <p>
              <strong className="text-text-1 font-semibold">
                I want to build something that helps the next athlete get there.
              </strong>
            </p>
          </div>

          <p className="serif-italic text-2xl md:text-3xl mt-10 signal-text w-fit">
            MENTA — The Athlete Operating System.
          </p>
        </div>

        <div className="reveal grid grid-cols-2 gap-3 md:gap-4">
          {PHOTOS.map((photo) => (
            <div
              key={photo.src}
              className="relative aspect-[3/4] rounded-[var(--r-lg)] overflow-hidden border border-[var(--border)]"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 768px) 25vw, 45vw"
                className="object-cover"
              />
            </div>
          ))}
          <div className="col-span-2 mono text-text-3 text-xs pt-1">
            Elias Chavez — Lake Travis High School
          </div>
        </div>
      </div>
    </section>
  );
}
