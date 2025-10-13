import React, { useState } from 'react';
import './Help.css';

const Help = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Do I need a Spotify account?",
      answer: "Yes, you'll need to log in with Spotify to access playlists."
    },
    {
      question: "Can I save playlists?",
      answer: "Yes, you can open them directly in Spotify and save them to your library."
    },
    {
      question: "What if I can’t find the right playlist?",
      answer: "If you can't find a suitable playlist, try adjusting your mood, workload, or focus level settings. You can also contact support for personalized assistance."
    },
    {
      question: "What types of music genres are available?",
      answer: "The app pulls from Spotify's wide range of genres, including lo-fi, classical, jazz, ambient, pop, and more, depending on your study needs."
    },
    {
      question: "Can I use this web-app on my phone?",
      answer: "Yes, the app is web-based and can be accessed through your mobile browser."
    }
  ];

  return (
    <div className="help">
      <h1>FAQs</h1>
      <section className="faq-section">
        {faqs.map((faq, index) => (
          <div className="faq-item" key={index}>
            <button
              className="faq-question"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              {faq.question}
              <span className="faq-toggle">{openIndex === index ? '−' : '+'}</span>
            </button>
            {openIndex === index && <p className="faq-answer">{faq.answer}</p>}
          </div>
        ))}
      </section>
      <div className="support">
        <a href="mailto:ivette.saldanahernandez@gmail.com" className="support-button">Contact Support</a>
      </div>
    </div>
  );
};

export default Help;