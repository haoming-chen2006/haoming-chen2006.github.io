
import React from 'react';
import { useState } from 'react';
import './main.css';

const ResearchCard = ({ title, content, image, website, duration, role }) => {
  const [show, setShow] = useState(false);

  const handleCardClick = () => {
    if (show) {
      window.open(website, '_blank');
    } else {
      setShow(true);
    }
  };

  if (!show) {
    return (
      <div className="research-image-only" onClick={handleCardClick}>
        <img src={image} alt={title} />
        <div className="research-overlay">
          <h3>{title}</h3>
          <p>Click to see details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="research-card">
      <div className="research-background-image">
        <img src={image} alt={title} />
      </div>
      <div className="research-content">
        <h3 className="research-title">{title}</h3>
        <p className="research-role">{role}</p>
        <p className="research-duration">{duration}</p>
        <div className="research-description">
          {content}
        </div>
        <div className="research-actions">
          <button 
            className="research-link-btn" 
            onClick={handleCardClick}
          >
            Visit Website →
          </button>
          <button 
            className="research-close-btn" 
            onClick={() => setShow(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
const Research = () => {
  const researchData = [
    {
      title: "Language Model for High Energy Physics",
      role: "Research Intern under Lawrence Berkeley National Laboratory, ATLAS group", 
      content: (
        <div>
          <p>
            The ambition of this project is to build a <strong>GPT-3 for particle physics data</strong> with zero-shot generalization capabilities. This revolutionary approach means we won't need to train separate models for each particle physics task.
          </p>
          <p>
            An example was to tokenize, reconstruct, and possibly understand the semantic meaning of complex particle traces, like the traces of Higgs Boson experiments showed below
          </p>
          <img src={"plot.png"} alt={"plot"} />
          <h4>What I built:</h4>
          <ul>
            <li>Custom dataloader for particle physics data</li>
            <li>Conditional Vectorized Quantized Autoencoders as tokenizers</li>
            <li>Integration into innovative language models</li>
            <li>Experiments using newest vision/language model techniques</li>
          </ul>
          <p>
            Learn more about the tokenizers I made public: 
            <a href="https://github.com/haoming-chen2006/LLM4Tracking" style={{color: '#667eea', marginLeft: '5px'}}>
              LLM for Jet and Particle Tokenization
            </a>
          </p>
          <p>
            Read relevant papers: 
            <a href="https://www.researchgate.net/publication/377919900_Generative_machine_learning_for_detector_response_modeling_with_a_conditional_normalizing_flow" style={{color: '#667eea', marginLeft: '5px'}}>
              Generative Machinee Learning
            </a>
            <br/>
            <a href="https://arxiv.org/abs/2403.05618">
            Omnijet Experiment
            </a>
          </p>
        </div>
      ),
      duration: "June 2025 - Present",
      image: "htobb.webp",
      website: "https://github.com/haoming-chen2006/LLM4Tracking"
    },
    {
      title: "Education and Organization Lab",
      role: "Research Apprentice, advised by professor Eos Trinidad",
      content: (
        <div>
          <p>
            Conducting research on trends about <strong>networks of nonprofits</strong> that focus on education.
          </p>
          <p>
            This URAP supported research program.
          </p>
          <h4>What I made:</h4>
          <ul>
            <li>250,000+ nonprofit dataset augmented with rich info added using webscraping </li>
            <li>Exploratory data analysis, machine learning, and outlier detection applied on the dataset</li>
            <li>Extensive literature review</li>
            <li>Production of interactive plots</li>
          </ul>
          <img 
            src="web.jpg" 
            alt="WeLeap AI Demo" 
            style={{width: '100%', maxWidth: '400px', borderRadius: '8px', margin: '1rem 0'}}
          />
          <p>
            Read the book about the research: 
          </p>
          <a href = "https://www.amazon.com/Subtle-Webs-Local-Organizations-Education/dp/0197786081">Subtle webs</a>
        </div>
      ),
      duration: "May 2025 - Present", 
      image: "network.jpg",
      website: "https://sites.google.com/view/eostrinidad/research"
    },
    {
      title: "Computer Vision for Particle Detection",
      role: "Research Intern",
      content: (
        <div>
          <p>
            Developing <strong>deep learning algorithms</strong> for real-time particle detection with 95% accuracy in classification tasks.
          </p>
          <p>
            This project focuses on implementing advanced CNN architectures for particle tracking in high-energy physics experiments.
          </p>
          <h4>Research Highlights:</h4>
          <ul>
            <li>Real-time particle detection and tracking</li>
            <li>95% accuracy in particle classification</li>
            <li>Integration with particle accelerator data streams</li>
            <li>Novel CNN architecture optimizations</li>
          </ul>
          <blockquote style={{borderLeft: '4px solid #667eea', paddingLeft: '1rem', fontStyle: 'italic', color: '#555'}}>
            "This work has the potential to significantly impact future physics research by enabling more precise and efficient particle detection in experimental setups."
          </blockquote>
          <p>
            <strong>Collaboration:</strong> Working with graduate students and postdocs at UC Berkeley Physics Department.
          </p>
        </div>
      ),
      duration: "April 2025 - Present",
      image: "/urap.jpeg", 
      website: "https://example.com"
    }
  ];

  return (
    <div className="main-content">
      <h2>Research Projects</h2>
      <div className="research-container">
        {researchData.map((research, index) => (
          <ResearchCard
            key={index}
            title={research.title}
            role={research.role}
            duration={research.duration}
            content={research.content}
            image={research.image}
            website={research.website}
          />
        ))}
      </div>
    </div>
  );
};

export default Research;