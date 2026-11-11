import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import useAsync from "../hooks/useAsync";
import ErrorState from "../components/ErrorState";
import GlitchText from "../components/GlitchText";
import { groupSponsors } from "../utils";

/**
 * Sponsors page — Broken Space-Time Multiverse Theme
 * - Title, Gold, and Diamond sponsors have static, dedicated positions in dimensional rift frames.
 * - Partner sponsors flow in one by one on scroll with a prominent [ SPONSOR ] tag.
 */
export default function Sponsors() {
  const { data, error, reload } = useAsync(api.getSponsors, []);
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState([]);
  const [gold, setGold] = useState([]);
  const [diamond, setDiamond] = useState([]);
  const [silver, setSilver] = useState([]);
  const [partners, setPartner] = useState([]);
  const flowRef = useRef(null);

  // IntersectionObserver to reveal flowing sponsors on scroll
  useEffect(() => {
    if (!flowRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" },
    );

    const cards = flowRef.current.querySelectorAll(".st-sponsor-flow-card");
    cards.forEach((card, idx) => {
      card.style.transitionDelay = `${(idx % 6) * 0.08}s`;
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (data) {
      const { title, gold, diamond, silver, partner } = groupSponsors(data);
      setTitle(title);
      setGold(gold);
      setDiamond(diamond);
      setSilver(silver);
      setPartner(partner);

      console.log(data);
      console.log(groupSponsors(data));
    }

    return () => {};
  }, [data]);

  if (error) {
    return (
      <section className="page st-page-enter">
        <ErrorState message={error.message} onRetry={reload} />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="page st-page-enter st-sponsors">
        <h1 className="st-page-title">
          <GlitchText text="SPONSORS" tag="span" />
        </h1>
        <div className="grid-cards" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 160 }} />
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="page st-page-enter st-sponsors">
      {isAdmin && (
        <Link
          to="/admin?tab=sponsors"
          className="edit-pencil static"
          aria-label="Edit sponsors"
        >
          ✎
        </Link>
      )}

      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 className="st-page-title">
          <GlitchText text="SPONSORS & PARTNERS" tag="span" />
        </h1>
        <p
          style={{
            fontFamily: "Courier New, monospace",
            color: "#00ff88",
            letterSpacing: "0.25em",
            fontSize: "0.9rem",
            marginTop: "-1rem",
          }}
        >
          [ INTERDIMENSIONAL ALLIANCE MATRIX ]
        </p>
      </div>

      {/* 1. TITLE SPONSOR (STATIC DEDICATED PORTAL) */}
      {title.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label title">✦ TITLE SPONSOR ✦</div>
          <div className="flex justify-center gap-7">
            {title.map((s) => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="h-96 border p-2 rounded-lg flex flex-col items-center justify-center bg-[rgba(0,204,255,0.2)] hover:shadow-2xl hover:-translate-y-1 shadow-[rgba(0,204,255,0.3)] hover:border-2 transition duration-200"
              >
                <span>{s.name}</span>
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  className="w-64 rounded-lg"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 2. GOLD SPONSORS (STATIC DEDICATED ROW) */}
      {gold.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label gold">◆ GOLD SPONSORS ◆</div>
          <div className="flex justify-center gap-7">
            {gold.map((s) => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="border-[rgba(255,215,0,1)] border p-2 rounded-lg flex flex-col items-center justify-center bg-[rgba(255,217,0,0.17)] hover:shadow-2xl hover:-translate-y-1 shadow-[rgba(255,215,0,0.3)] transition duration-200 hover:border-2"
              >
                <span className="text-[rgba(255,215,0)]">{s.name}</span>
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  className="w-64 rounded-lg"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 3. DIAMOND SPONSORS (STATIC DEDICATED ROW) */}
      {diamond.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label diamond">
            ❖ DIAMOND SPONSORS ❖
          </div>
          <div className="flex justify-center gap-7">
            {diamond.map((s) => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="border border-[rgba(0,240,255,1)] p-2 rounded-lg flex flex-col items-center justify-center bg-[rgba(0,240,255,0.1)] hover:shadow-2xl hover:-translate-y-1 shadow-[rgba(0,240,255,0.3)] hover:border-2 transition duration-200"
              >
                <span>{s.name}</span>
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  className="w-64 rounded-lg"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 4. SILVER SPONSORS (STATIC ROW) */}
      {silver.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label silver">
            ◇ SILVER SPONSORS ◇
          </div>
          <div className="flex justify-center gap-7">
            {silver.map((s) => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="border border-[#c0c0c0] p-2 rounded-lg flex flex-col items-center justify-center bg-[rgba(192,192,192,0.1)] hover:shadow-2xl hover:-translate-y-1 shadow-[rgba(192,192,192,0.3)] hover:border-2 transition duration-200"
              >
                <span>{s.name}</span>

                <img
                  src={s.logoUrl}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  className="w-64 rounded-lg"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 5. PARTNERS (FLOWING ONE BY ONE ON SCROLL WITH SPONSOR TAG) */}
      {partners.length > 0 && (
        <div className="st-sponsor-tier">
          <div className="st-sponsor-tier-label partner">
            ● FLOWING PARTNER NETWORK ●
          </div>
          <div className="flex justify-center gap-7" ref={flowRef}>
            {partners.map((s) => (
              <a
                key={s.id}
                href={s.websiteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="border border-[rgba(0,255,136,1)] p-2 rounded-lg flex flex-col items-center justify-center bg-[rgba(0,255,136,0.1)] hover:shadow-2xl hover:-translate-y-1 shadow-[rgba(0,255,136,0.3)] hover:border-2 transition duration-200"
              >
                <span>{s.name}</span>

                <img
                  src={s.logoUrl}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  className="w-64 rounded-lg"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
