// src/pages/HomePage.tsx
import React, { useState, useEffect } from "react";
import mainImage from "../assets/main.png";
import uploadImage from "../assets/upload.svg";
import generateImage from "../assets/generate.svg";
import hashtagIcon from "../assets/hashtag.gif";
import searchIcon from "../assets/search.gif";
import aiIcon from "../assets/ai.gif";
import sarahProfile from "../assets/sarah.jpg";
import davidProfile from "../assets/david.jpg";
import "../styles/homepage.css";

const HomePage: React.FC = () => {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.pageYOffset > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* HERO */}
      <section id="hero" className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>
              <span className="highlight">Drive</span> the conversation,
              <br />
              <span className="highlight">Shape</span> the narrative
            </h1>
            <p>
              In a crowded social feed, relevance and timing are everything.
              Agendify gives you the edge on X (formerly Twitter) by selecting
              your topic, fetching the hottest tweets, and auto-generating
              replies that put your agenda front and center.
            </p>
            <p>
              Then, with one seamless click, publish your batch of AI-crafted
              comments in bulk—so you hit peak engagement without missing a
              beat.
            </p>
            <a href="#features" className="btn primary">
              Explore Features
            </a>
          </div>
          <div className="hero-image">
            <img src={mainImage} alt="Team planning strategy" />
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about">
        <h2>About Agendify</h2>
        <p>
          In today’s fast-moving social space, timing and relevance are
          everything. Agendify combines AI-driven analytics with intuitive tools
          so you can:
        </p>
        <ul className="about-list">
          <li>Identify peak engagement windows on X</li>
          <li>Auto-generate on-brand comments</li>
          <li>Publish your replies in bulk with one click</li>
        </ul>
        <div className="about-images">
          <img
            src={generateImage}
            alt="User generating content"
            className="about-image medium"
          />
          <img
            src={uploadImage}
            alt="User uploading content"
            className="about-image medium"
          />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features">
        <h2>Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <img
              src={hashtagIcon}
              alt="Topic Selection"
              className="feature-icon"
            />
            <h3>Topic Selection</h3>
            <p>
              Choose any subject or hashtag you want to promote—Agendify centers
              your campaign around it.
            </p>
          </div>
          <div className="feature-card">
            <img
              src={searchIcon}
              alt="Tweet Fetching"
              className="feature-icon"
            />
            <h3>Tweet Fetching</h3>
            <p>
              Instantly pull the most relevant and recent tweets on your topic
              to see what’s resonating now.
            </p>
          </div>
          <div className="feature-card">
            <img
              src={aiIcon}
              alt="AI-Generated Replies"
              className="feature-icon"
            />
            <h3>AI-Generated Replies & Bulk Upload</h3>
            <p>
              Automatically craft on-message comments and publish them to X in
              one seamless click.
            </p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="testimonials">
        <h2>What Our Users Say</h2>
        <div className="testimonial-cards">
          <div className="testimonial-card">
            <p>
              "Using Agendify, we pinpointed the perfect topics, fetched the
              right tweets, and saw our engagement triple within a week."
            </p>
            <img
              src={sarahProfile}
              alt="Sarah M."
              className="testimonial-avatar"
            />
            <h4>Sarah M., Campaign Director</h4>
          </div>
          <div className="testimonial-card">
            <p>
              "Bulk uploading AI-generated replies saved our team hours and kept
              our messaging consistent across thousands of tweets."
            </p>
            <img
              src={davidProfile}
              alt="David R."
              className="testimonial-avatar"
            />
            <h4>David R., Social Media Strategist</h4>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing">
        <h2>Choose Your Plan</h2>
        <div className="pricing-grid">
          {[
            {
              title: "Free",
              features: [
                "3 posts/month",
                "Basic hashtag suggestions",
                "Community support",
              ],
              button: "Start Free",
              highlight: false,
            },
            {
              title: "Pro",
              features: [
                "Up to 5,000 actions/month",
                "Advanced analytics",
                "Bulk reply uploads",
                "Email support",
              ],
              button: "Get Pro",
              highlight: true,
            },
            {
              title: "Enterprise",
              features: [
                "Custom volume & SLAs",
                "Dedicated account manager",
                "Priority trend alerts",
                "API access",
              ],
              button: "Contact Sales",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.title}
              className={`card ${plan.highlight ? "highlight-card" : ""}`}
            >
              <h3>{plan.title}</h3>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className="btn primary">{plan.button}</button>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Agendify. All rights reserved.</p>
      </footer>

      {/* BACK TO TOP */}
      {showTopBtn && (
        <button
          className="scroll-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </>
  );
};

export default HomePage;
