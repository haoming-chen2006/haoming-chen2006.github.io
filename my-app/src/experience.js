import './main.css';

const ExperienceCard = ({ title, description, image, website, duration, role }) => {
  const handleCardClick = () => {
    window.open(website, '_blank');
  };

  return (
    <div className="experience-card" onClick={handleCardClick}>
      <div className="experience-image">
        <img src={image} alt={title} />
      </div>
      <div className="experience-content">
        <h3 className="experience-title">{title}</h3>
        <p className="experience-role">{role}</p>
        <p className="experience-duration">{duration}</p>
        <p className="experience-description">{description}</p>
        <div className="experience-link">
          <span>Click to visit →</span>
        </div>
      </div>
    </div>
  );
};

const Experiences = () => {
  const experienceData = [
    {
      title: "WeLeap. AI",
      role: "Software Engineer Intern",
      duration: "June 2025 - Present",
description: "Supported by Berkeley Skydeck startup incubator program. Orchestrated a multi-agent system to deliver personalized financial guidance using multimodal inputs such as documents, photos, and forms.",
      image: "/leap.jpg",
      website: "https://www.f6s.com/weleap"
    },
    {
      title: "CAL HACKS",
      role: "Participant",
      duration: "Julne 2023",
      description: "Had fun in the AI Hackathon, we built Kola coach, a wellness coach APP that gives phone calls, browse the web, and sends Email to users. Built at Cal Hack.",
      image: "/calhack.jpeg",
      website: "https://devpost.com/software/koacoach"
    },
    {
      title: "YC AI Startup School",
      role: "Participant",
      duration: "July 2025 ",
      description: "Joined the amazing YCombinator startup school event, listened to inspring talks from many of my heros, and had fun in after parties.",
      image: "/Y_comb.png",
      website: "https://events.ycombinator.com/ai-susm"
    },
    {
      title: "Berkeley CS C88C",
      role: "Course Staff",
      duration: "May 2025 - August 2026 ",
      description: "Helped organize Data C88C as UCS1 at Berkeley, organized teaching materials, instructed weekly sections, and hosted office hours for 400+ students.",
      image: "88.png",
      website: "https://c88c.org/su25/staff/"
    },
    
  ];

  return (
    <div className="main-content">
      <h2>Experiences</h2>
      <div className="experiences-container">
        {experienceData.map((experience, index) => (
          <ExperienceCard
            key={index}
            title={experience.title}
            role={experience.role}
            duration={experience.duration}
            description={experience.description}
            image={experience.image}
            website={experience.website}
          />
        ))}
      </div>
    </div>
  );
};

export default Experiences;